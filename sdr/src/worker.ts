import { loadConfig } from "./config.js";
import { OpenAiAgent } from "./infra/openai-agent.js";
import { EmailNotifier } from "./infra/notifier.js";
import {
  createConversationWorker,
  createKommoRetryWorker,
  KommoRetryQueue,
} from "./infra/queue.js";
import { SdrRepository } from "./infra/supabase-repository.js";
import { WahaClient } from "./infra/waha-client.js";
import { ConversationProcessor } from "./services/process-conversation.js";
import {
  KommoClient,
  type KommoStageConfiguration,
} from "./infra/kommo-client.js";
import { KommoSyncService } from "./services/kommo-sync.js";

const config = loadConfig();
if (!config.OPENAI_API_KEY) {
  throw new Error("Configuração inválida: OPENAI_API_KEY é obrigatória no worker");
}
const repository = new SdrRepository(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
);
const notifier = new EmailNotifier(
  config.RESEND_API_KEY,
  config.ALERT_EMAIL_FROM,
  config.ALERT_EMAIL_TO,
);
const kommoStages: KommoStageConfiguration | null = config.KOMMO_ENABLED
  ? {
      pipelineId: config.KOMMO_PIPELINE_ID!,
      newLeadStatusId: config.KOMMO_NEW_LEAD_STATUS_ID!,
      qualifiedStatusId: config.KOMMO_QUALIFIED_STATUS_ID!,
      interestedStatusId: config.KOMMO_INTERESTED_STATUS_ID!,
      negotiationStatusId: config.KOMMO_NEGOTIATION_STATUS_ID!,
      handoffStatusId: config.KOMMO_AWAITING_HUMAN_STATUS_ID!,
      dataCollectedStatusId: config.KOMMO_DATA_COLLECTED_STATUS_ID!,
    }
  : null;
const kommoInitialConfiguration = kommoStages
  ? {
      stages: kommoStages,
      enrollmentFields: {
        full_name: config.KOMMO_FIELD_FULL_NAME_ID!,
        whatsapp_phone: config.KOMMO_FIELD_WHATSAPP_PHONE_ID!,
        cpf: config.KOMMO_FIELD_CPF_ID!,
        birth_date: config.KOMMO_FIELD_BIRTH_DATE_ID!,
        marital_status: config.KOMMO_FIELD_MARITAL_STATUS_ID!,
        nationality: config.KOMMO_FIELD_NATIONALITY_ID!,
        birthplace: config.KOMMO_FIELD_BIRTHPLACE_ID!,
        cro: config.KOMMO_FIELD_CRO_ID!,
        email: config.KOMMO_FIELD_EMAIL_ID!,
        address: config.KOMMO_FIELD_ADDRESS_ID!,
        district: config.KOMMO_FIELD_DISTRICT_ID!,
        postal_code: config.KOMMO_FIELD_POSTAL_CODE_ID!,
      },
      handoff: {
        responsibleUserId: config.KOMMO_RESPONSIBLE_USER_ID!,
        taskTypeId: config.KOMMO_HANDOFF_TASK_TYPE_ID!,
        deadlineMinutes: config.KOMMO_HANDOFF_DEADLINE_MINUTES,
      },
    }
  : null;
const kommo = kommoStages
  ? new KommoSyncService(
      new KommoClient(
        config.KOMMO_SUBDOMAIN!,
        config.KOMMO_ACCESS_TOKEN!,
        kommoStages,
      ),
      repository,
      kommoInitialConfiguration!,
      async () => {
        const stored = await repository.getKommoConfiguration(config.WAHA_SESSION);
        return stored?.enabled ? stored : null;
      },
    )
  : null;
const kommoRetryQueue = kommo ? new KommoRetryQueue(config.REDIS_URL) : null;
const processor = new ConversationProcessor({
  repository,
  agent: new OpenAiAgent(config.OPENAI_API_KEY, config.OPENAI_MODEL),
  waha: new WahaClient(
    config.WAHA_BASE_URL,
    config.WAHA_API_KEY,
    config.WAHA_SESSION,
  ),
  notifier,
  model: config.OPENAI_MODEL,
  contextMessageLimit: config.SDR_CONTEXT_MESSAGE_LIMIT,
  developmentAllowedPhoneNumbers:
    config.NODE_ENV === "development"
      ? config.SDR_TEST_ALLOWED_PHONE_NUMBERS
      : null,
  kommo,
  kommoRetryQueue,
});

const runner = createConversationWorker(config.REDIS_URL, async (job) => {
  await processor.process(job.data.conversationId);
});

const kommoRetryRunner = kommo
  ? createKommoRetryWorker(config.REDIS_URL, async (job) => {
      const context = await repository.loadConversation(
        job.data.conversationId,
        config.SDR_CONTEXT_MESSAGE_LIMIT,
      );
      const binding = await repository.getCatalogBinding(context.wahaSession);
      if (!binding) throw new Error("Curso não vinculado durante retry do Kommo.");
      try {
        if (job.data.operation === "flow") {
          await kommo.syncFlow(
            context,
            job.data.patch,
            binding.snapshot,
            job.data.enrollmentData,
          );
          if (job.data.restoreHandoffStage) {
            const refreshed = await repository.loadConversation(
              job.data.conversationId,
              config.SDR_CONTEXT_MESSAGE_LIMIT,
            );
            await kommo.restoreHandoffStage(refreshed, binding.snapshot);
          }
        } else {
          await kommo.syncHandoff(context, binding.snapshot, job.data.reason);
        }
      } catch (error) {
        await repository.markKommoSyncFailed(
          context.conversationId,
          error instanceof Error ? error.message : String(error),
        );
        throw error;
      }
    })
  : null;

runner.worker.on("completed", (job) => {
  console.info(
    JSON.stringify({
      level: "info",
      event: "job_completed",
      jobId: job.id,
      conversationId: job.data.conversationId,
    }),
  );
});

runner.worker.on("failed", (job, error) => {
  console.error(
    JSON.stringify({
      level: "error",
      event: "job_failed",
      jobId: job?.id,
      conversationId: job?.data.conversationId,
      error: error.message,
    }),
  );
  const attempts = Number(job?.opts.attempts ?? 1);
  if (!job || job.attemptsMade < attempts || !notifier.enabled) return;
  const notification = {
    eventType: "conversation_processing_persistent_failure",
    title: "SDR: falha crítica no processamento",
    text: `A conversa não pôde ser processada após ${attempts} tentativa(s). Consulte os logs do worker.`,
    conversationId: job.data.conversationId,
    severity: "critical" as const,
  };
  void notifier.send(notification)
    .then(() => repository.recordNotification(
      job.data.conversationId,
      notification.eventType,
      "sent",
      notification,
    ))
    .catch((notificationError) => repository.recordNotification(
      job.data.conversationId,
      notification.eventType,
      "failed",
      notification,
      notificationError instanceof Error ? notificationError.message : String(notificationError),
    ));
});

kommoRetryRunner?.worker.on("completed", (job) => {
  console.info(JSON.stringify({
    level: "info",
    event: "kommo_retry_completed",
    jobId: job.id,
    conversationId: job.data.conversationId,
  }));
});

kommoRetryRunner?.worker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    level: "error",
    event: "kommo_retry_failed",
    jobId: job?.id,
    conversationId: job?.data.conversationId,
    attemptsMade: job?.attemptsMade,
    error: error.message,
  }));
  const attempts = Number(job?.opts.attempts ?? 1);
  if (!job || job.attemptsMade < attempts || !notifier.enabled) return;
  const notification = {
    eventType: "kommo_sync_persistent_failure",
    title: "SDR: falha persistente no Kommo",
    text: `Não foi possível sincronizar a conversa ${job.data.conversationId} após ${attempts} tentativas.`,
    conversationId: job.data.conversationId,
    severity: "critical" as const,
  };
  void notifier.send(notification)
    .then(() => repository.recordNotification(
      job.data.conversationId,
      notification.eventType,
      "sent",
      notification,
    ))
    .catch((notificationError) => repository.recordNotification(
      job.data.conversationId,
      notification.eventType,
      "failed",
      notification,
      notificationError instanceof Error ? notificationError.message : String(notificationError),
    ));
});

async function shutdown(signal: string): Promise<void> {
  console.info(JSON.stringify({ level: "info", event: "shutdown", signal }));
  await Promise.all([
    runner.close(),
    kommoRetryRunner?.close(),
    kommoRetryQueue?.close(),
  ]);
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

console.info(
  JSON.stringify({
    level: "info",
    event: "worker_started",
    queue: "sdr-conversations",
    testAllowlistEnabled: config.NODE_ENV === "development",
    allowedPhoneCount:
      config.NODE_ENV === "development"
        ? config.SDR_TEST_ALLOWED_PHONE_NUMBERS.length
        : undefined,
    kommoEnabled: config.KOMMO_ENABLED,
  }),
);
