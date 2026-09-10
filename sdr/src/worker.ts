import { loadConfig } from "./config.js";
import { OpenAiAgent } from "./infra/openai-agent.js";
import { EmailNotifier } from "./infra/notifier.js";
import {
  createConversationWorker,
  createCrmRetryWorker,
  ConversationQueue,
  CrmRetryQueue,
} from "./infra/queue.js";
import { SdrRepository } from "./infra/supabase-repository.js";
import { WahaClient } from "./infra/waha-client.js";
import { ConversationProcessor } from "./services/process-conversation.js";
import { ClintClient, type ClintStageConfiguration } from "./infra/clint-client.js";
import { ClintSyncService } from "./services/clint-sync.js";

const config = loadConfig();
if (!config.OPENAI_API_KEY) {
  throw new Error("Configuração inválida: OPENAI_API_KEY é obrigatória no worker");
}
const requiredClintFields = [
  "CLINT_API_TOKEN", "CLINT_ORIGIN_ID", "CLINT_NEW_LEAD_STAGE_ID",
  "CLINT_QUALIFIED_STAGE_ID", "CLINT_INTERESTED_STAGE_ID",
  "CLINT_NEGOTIATION_STAGE_ID", "CLINT_DATA_COLLECTED_STAGE_ID",
  "CLINT_AWAITING_HUMAN_STAGE_ID", "CLINT_RESPONSIBLE_USER_ID",
  "CLINT_FIELD_CPF_ID",
  "CLINT_FIELD_BIRTH_DATE_ID", "CLINT_FIELD_MARITAL_STATUS_ID",
  "CLINT_FIELD_NATIONALITY_ID", "CLINT_FIELD_BIRTHPLACE_ID", "CLINT_FIELD_CRO_ID",
  "CLINT_FIELD_ADDRESS_ID", "CLINT_FIELD_DISTRICT_ID",
  "CLINT_FIELD_POSTAL_CODE_ID",
] as const;
for (const field of requiredClintFields) {
  if (!config[field]) throw new Error(`Configuração inválida: ${field} é obrigatório no worker`);
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
const clintStages: ClintStageConfiguration = {
  originId: config.CLINT_ORIGIN_ID!,
  newLeadStageId: config.CLINT_NEW_LEAD_STAGE_ID!,
  qualifiedStageId: config.CLINT_QUALIFIED_STAGE_ID!,
  interestedStageId: config.CLINT_INTERESTED_STAGE_ID!,
  negotiationStageId: config.CLINT_NEGOTIATION_STAGE_ID!,
  dataCollectedStageId: config.CLINT_DATA_COLLECTED_STAGE_ID!,
  handoffStageId: config.CLINT_AWAITING_HUMAN_STAGE_ID!,
};
const crm = new ClintSyncService(
  new ClintClient(config.CLINT_API_TOKEN!, clintStages),
  repository,
  {
    stages: clintStages,
    enrollmentFields: {
      cpf: config.CLINT_FIELD_CPF_ID!,
      birth_date: config.CLINT_FIELD_BIRTH_DATE_ID!,
      marital_status: config.CLINT_FIELD_MARITAL_STATUS_ID!,
      nationality: config.CLINT_FIELD_NATIONALITY_ID!,
      birthplace: config.CLINT_FIELD_BIRTHPLACE_ID!,
      cro: config.CLINT_FIELD_CRO_ID!,
      address: config.CLINT_FIELD_ADDRESS_ID!,
      district: config.CLINT_FIELD_DISTRICT_ID!,
      postal_code: config.CLINT_FIELD_POSTAL_CODE_ID!,
    },
    handoff: {
      responsibleUserId: config.CLINT_RESPONSIBLE_USER_ID!,
      ...(config.CLINT_HANDOFF_NOTE_FIELD_ID
        ? { noteFieldId: config.CLINT_HANDOFF_NOTE_FIELD_ID }
        : {}),
    },
  },
);
const crmRetryQueue = new CrmRetryQueue(config.REDIS_URL);
const conversationQueue = new ConversationQueue(config.REDIS_URL);
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
  crm,
  crmRetryQueue,
  conversationQueue,
  enrollmentFollowUpIntervalMs:
    config.SDR_ENROLLMENT_FOLLOW_UP_INTERVAL_HOURS * 3_600_000,
  enrollmentFollowUpMaxAttempts: config.SDR_ENROLLMENT_FOLLOW_UP_MAX_ATTEMPTS,
  timeZone: config.SDR_TIME_ZONE,
});

const runner = createConversationWorker(config.REDIS_URL, async (job) => {
  if (job.data.kind === "enrollment_follow_up") {
    await processor.sendEnrollmentFollowUp(
      job.data.conversationId,
      job.data.attempt,
      job.data.language,
      job.data.baselineInboundAt,
    );
    return;
  }
  await processor.process(job.data.conversationId);
});

const crmRetryRunner = createCrmRetryWorker(config.REDIS_URL, async (job) => {
  const context = await repository.loadConversation(
    job.data.conversationId,
    config.SDR_CONTEXT_MESSAGE_LIMIT,
  );
  const binding = await repository.getCatalogBinding(context.wahaSession);
  if (!binding) throw new Error("Curso não vinculado durante retry da Clint.");
  try {
    if (job.data.operation === "flow") {
      await crm.syncFlow(
        context,
        job.data.patch,
        binding.snapshot,
        job.data.enrollmentData,
        job.data.notifyEnrollment,
      );
      if (job.data.restoreHandoffStage) {
        const refreshed = await repository.loadConversation(
          job.data.conversationId,
          config.SDR_CONTEXT_MESSAGE_LIMIT,
        );
        await crm.restoreHandoffStage(refreshed, binding.snapshot);
      }
    } else {
      await crm.syncHandoff(
        context,
        binding.snapshot,
        job.data.reason,
        job.data.details,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await repository.markClintSyncFailed(context.conversationId, message);
    throw error;
  }
});

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

crmRetryRunner.worker.on("completed", (job) => {
  console.info(JSON.stringify({
    level: "info",
    event: "crm_retry_completed",
    provider: "clint",
    jobId: job.id,
    conversationId: job.data.conversationId,
  }));
});

crmRetryRunner.worker.on("failed", (job, error) => {
  console.error(JSON.stringify({
    level: "error",
    event: "crm_retry_failed",
    provider: "clint",
    jobId: job?.id,
    conversationId: job?.data.conversationId,
    attemptsMade: job?.attemptsMade,
    error: error.message,
  }));
  const attempts = Number(job?.opts.attempts ?? 1);
  if (!job || job.attemptsMade < attempts || !notifier.enabled) return;
  const notification = {
    eventType: "crm_sync_persistent_failure",
    title: "SDR: falha persistente na Clint",
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
    crmRetryRunner.close(),
    crmRetryQueue.close(),
    conversationQueue.close(),
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
    crmProvider: "clint",
  }),
);
