import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import {
  KommoClient,
  type KommoStageConfiguration,
} from "../src/infra/kommo-client.js";

dotenv.config({ path: ".env.local", quiet: true });

const confirmation = "--confirm-kommo-homologation";
const expectedSubdomain = "traconegocio";
const expectedPipelineId = 14_281_543;
const expectedPipelineName = "TESTE SDR - NÃO USAR EM PRODUÇÃO";

if (!process.argv.includes(confirmation)) {
  throw new Error(`Confirmação ausente. Execute novamente com ${confirmation}.`);
}

const phoneArgument = process.argv.find((argument) => argument.startsWith("--phone="));
const phoneE164 = phoneArgument?.slice("--phone=".length).replace(/\D/gu, "") ?? "";
if (phoneE164.length < 12 || phoneE164.length > 13 || !phoneE164.startsWith("55")) {
  throw new Error("Informe um telefone brasileiro de teste com --phone=55DDDNUMERO.");
}

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não configurado em .env.local.`);
  return value;
};
const requiredNumber = (name: string): number => {
  const value = Number(required(name));
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} deve ser um ID numérico válido.`);
  }
  return value;
};

const subdomain = required("KOMMO_SUBDOMAIN");
const pipelineId = requiredNumber("KOMMO_PIPELINE_ID");
if (subdomain !== expectedSubdomain || pipelineId !== expectedPipelineId) {
  throw new Error("Operação cancelada: conta ou funil não corresponde à homologação autorizada.");
}

const stages: KommoStageConfiguration = {
  pipelineId,
  newLeadStatusId: requiredNumber("KOMMO_NEW_LEAD_STATUS_ID"),
  qualifiedStatusId: requiredNumber("KOMMO_QUALIFIED_STATUS_ID"),
  interestedStatusId: requiredNumber("KOMMO_INTERESTED_STATUS_ID"),
  negotiationStatusId: requiredNumber("KOMMO_NEGOTIATION_STATUS_ID"),
  handoffStatusId: requiredNumber("KOMMO_AWAITING_HUMAN_STATUS_ID"),
  dataCollectedStatusId: requiredNumber("KOMMO_DATA_COLLECTED_STATUS_ID"),
};

const client = new KommoClient(
  subdomain,
  required("KOMMO_ACCESS_TOKEN"),
  stages,
);
await client.validateHomologationPipeline(expectedPipelineName);

const result = await client.createLead({
  name: "[TESTE SDR] Lead de homologação",
  phoneE164: `+${phoneE164}`,
  courseTitle: "Especialização em Implantodontia e Cirurgia Avançada",
  conversationId: randomUUID(),
  statusId: stages.newLeadStatusId,
});

console.log(JSON.stringify({
  account: expectedSubdomain,
  pipeline: { id: expectedPipelineId, name: expectedPipelineName },
  stage: { id: stages.newLeadStatusId, name: "Novo lead" },
  result,
  phone: `+${phoneE164.slice(0, 4)}******${phoneE164.slice(-2)}`,
}, null, 2));
