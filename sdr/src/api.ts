import { buildApp } from "./api/app.js";
import { loadConfig } from "./config.js";
import { AdminAuthorizer } from "./infra/admin-authorizer.js";
import { HttpCourseCatalogProvider } from "./infra/catalog-client.js";
import { EmailNotifier } from "./infra/notifier.js";
import { ConversationQueue } from "./infra/queue.js";
import { SdrRepository } from "./infra/supabase-repository.js";
import { WahaClient } from "./infra/waha-client.js";
import { KommoClient, type KommoStageConfiguration } from "./infra/kommo-client.js";
import type { KommoAdminConfiguration } from "./infra/supabase-repository.js";

const config = loadConfig();
const repository = new SdrRepository(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
);
const queue = new ConversationQueue(config.REDIS_URL);
const notifier = new EmailNotifier(
  config.RESEND_API_KEY,
  config.ALERT_EMAIL_FROM,
  config.ALERT_EMAIL_TO,
);
const adminAuthorizer = new AdminAuthorizer(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
);
const waha = new WahaClient(
  config.WAHA_BASE_URL,
  config.WAHA_API_KEY,
  config.WAHA_SESSION,
);
const catalog = new HttpCourseCatalogProvider(
  config.CATALOG_PROVIDER,
  config.CATALOG_PROVIDER_NAME,
  config.CATALOG_BASE_URL,
  config.CATALOG_API_KEY,
  config.CATALOG_COURSES_PATH,
  config.CATALOG_CACHE_TTL_SECONDS * 1000,
  config.CATALOG_TIMEOUT_MS,
);
const kommoStages: KommoStageConfiguration | null = config.KOMMO_ENABLED
  ? {
      pipelineId: config.KOMMO_PIPELINE_ID!,
      newLeadStatusId: config.KOMMO_NEW_LEAD_STATUS_ID!,
      qualifiedStatusId: config.KOMMO_QUALIFIED_STATUS_ID!,
      interestedStatusId: config.KOMMO_INTERESTED_STATUS_ID!,
      negotiationStatusId: config.KOMMO_NEGOTIATION_STATUS_ID!,
      dataCollectedStatusId: config.KOMMO_DATA_COLLECTED_STATUS_ID!,
      handoffStatusId: config.KOMMO_AWAITING_HUMAN_STATUS_ID!,
    }
  : null;
const kommoDefaultConfiguration: KommoAdminConfiguration | null = kommoStages
  ? {
      enabled: true,
      subdomain: config.KOMMO_SUBDOMAIN!,
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
const kommoAdmin = config.KOMMO_SUBDOMAIN && config.KOMMO_ACCESS_TOKEN
  ? new KommoClient(
      config.KOMMO_SUBDOMAIN!,
      config.KOMMO_ACCESS_TOKEN!,
      kommoStages,
    )
  : null;
const app = buildApp(config, {
  repository,
  queue,
  notifier,
  adminAuthorizer,
  waha,
  catalog,
  kommoAdmin,
  kommoDefaultConfiguration,
});

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Encerrando API do SDR");
  await app.close();
  await queue.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ host: "0.0.0.0", port: config.PORT });
} catch (error) {
  app.log.error(error);
  await queue.close();
  process.exit(1);
}
