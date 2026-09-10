import { buildApp } from "./api/app.js";
import { loadConfig } from "./config.js";
import { AdminAuthorizer } from "./infra/admin-authorizer.js";
import { HttpCourseCatalogProvider } from "./infra/catalog-client.js";
import { EmailNotifier } from "./infra/notifier.js";
import { ConversationQueue } from "./infra/queue.js";
import { SdrRepository } from "./infra/supabase-repository.js";
import { WahaClient } from "./infra/waha-client.js";
import { ClintClient, type ClintStageConfiguration } from "./infra/clint-client.js";

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
const clintStageValues = [
  config.CLINT_ORIGIN_ID,
  config.CLINT_NEW_LEAD_STAGE_ID,
  config.CLINT_QUALIFIED_STAGE_ID,
  config.CLINT_INTERESTED_STAGE_ID,
  config.CLINT_NEGOTIATION_STAGE_ID,
  config.CLINT_DATA_COLLECTED_STAGE_ID,
  config.CLINT_AWAITING_HUMAN_STAGE_ID,
] as const;
const clintStages: ClintStageConfiguration | null = clintStageValues.every(Boolean)
  ? {
      originId: config.CLINT_ORIGIN_ID!,
      newLeadStageId: config.CLINT_NEW_LEAD_STAGE_ID!,
      qualifiedStageId: config.CLINT_QUALIFIED_STAGE_ID!,
      interestedStageId: config.CLINT_INTERESTED_STAGE_ID!,
      negotiationStageId: config.CLINT_NEGOTIATION_STAGE_ID!,
      dataCollectedStageId: config.CLINT_DATA_COLLECTED_STAGE_ID!,
      handoffStageId: config.CLINT_AWAITING_HUMAN_STAGE_ID!,
    }
  : null;
const clintAdmin = config.CLINT_API_TOKEN && clintStages
  ? new ClintClient(config.CLINT_API_TOKEN, clintStages)
  : null;
const app = buildApp(config, {
  repository,
  queue,
  notifier,
  adminAuthorizer,
  waha,
  catalog,
  clintAdmin,
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
