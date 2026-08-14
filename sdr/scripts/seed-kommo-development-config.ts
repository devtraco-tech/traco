import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";

dotenv.config({ path: ".env.local", quiet: true });

const config = loadConfig();
const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const confirmation = "--confirm-development-kommo-config";

if (!process.argv.includes(confirmation)) {
  throw new Error(`Confirmação ausente. Use ${confirmation}.`);
}
if (config.NODE_ENV !== "development" || config.SUPABASE_URL !== developmentUrl) {
  throw new Error("Operação cancelada: configuração permitida somente no abo-traco-dev.");
}
if (!config.KOMMO_ENABLED) throw new Error("KOMMO_ENABLED precisa estar ativo.");

const repository = new SdrRepository(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
);
const saved = await repository.saveKommoConfiguration(config.WAHA_SESSION, {
  enabled: true,
  subdomain: config.KOMMO_SUBDOMAIN!,
  stages: {
    pipelineId: config.KOMMO_PIPELINE_ID!,
    newLeadStatusId: config.KOMMO_NEW_LEAD_STATUS_ID!,
    qualifiedStatusId: config.KOMMO_QUALIFIED_STATUS_ID!,
    interestedStatusId: config.KOMMO_INTERESTED_STATUS_ID!,
    negotiationStatusId: config.KOMMO_NEGOTIATION_STATUS_ID!,
    dataCollectedStatusId: config.KOMMO_DATA_COLLECTED_STATUS_ID!,
    handoffStatusId: config.KOMMO_AWAITING_HUMAN_STATUS_ID!,
  },
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
});

console.log(JSON.stringify({
  project: "abo-traco-dev",
  session: config.WAHA_SESSION,
  enabled: saved.enabled,
  subdomain: saved.subdomain,
  pipelineId: saved.stages.pipelineId,
  stages: saved.stages,
  responsibleUserId: saved.handoff.responsibleUserId,
  enrollmentFieldCount: Object.keys(saved.enrollmentFields).length,
}, null, 2));
