import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const confirmation = "--confirm-kommo-homologation";
const expectedSubdomain = "traconegocio";
const expectedPipelineId = 14_281_543;

if (!process.argv.includes(confirmation)) {
  throw new Error(`Confirmação ausente. Use ${confirmation}.`);
}

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não configurado em .env.local.`);
  return value;
};

const subdomain = required("KOMMO_SUBDOMAIN");
const pipelineId = Number(required("KOMMO_PIPELINE_ID"));
const token = required("KOMMO_ACCESS_TOKEN");
if (subdomain !== expectedSubdomain || pipelineId !== expectedPipelineId) {
  throw new Error("Operação cancelada: conta ou funil não corresponde à homologação autorizada.");
}

const baseUrl = `https://${subdomain}.kommo.com/api/v4`;
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Kommo ${init.method ?? "GET"} ${path} retornou HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return body as T;
};

const pipeline = await request<Record<string, any>>(`/leads/pipelines/${pipelineId}`);
if (!String(pipeline.name).startsWith("TESTE SDR")) {
  throw new Error(`Funil recusado: ${String(pipeline.name)}.`);
}

const desiredStages = [
  { id: 110_288_119, name: "Novo Lead", sort: 20, color: "#99ccff" },
  { id: 110_288_123, name: "Qualificado", sort: 30, color: "#ffff99" },
  { id: 110_288_127, name: "Interessado", sort: 40, color: "#ffcccc" },
  { id: 110_288_131, name: "Em Negociação", sort: 50, color: "#ffcc66" },
  { id: 110_290_135, name: "Dados Coletados", sort: 60, color: "#ccffcc" },
  { id: 110_290_139, name: "Aguardando Humano", sort: 70, color: "#f9deff" },
] as const;

let existingStages = (pipeline._embedded?.statuses ?? []) as Array<Record<string, any>>;
for (const desired of desiredStages) {
  const existing = existingStages.find((stage) => Number(stage.id) === desired.id);
  if (!existing || Number(existing.type) !== 0) {
    throw new Error(`Etapa regular esperada não encontrada: ${desired.id}.`);
  }
  if (existing.name !== desired.name || Number(existing.sort) !== desired.sort) {
    await request(`/leads/pipelines/${pipelineId}/statuses/${desired.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: desired.name,
        sort: desired.sort,
      }),
    });
    const refreshed = await request<Record<string, any>>(`/leads/pipelines/${pipelineId}`);
    existingStages = (refreshed._embedded?.statuses ?? []) as Array<Record<string, any>>;
  }
}

const desiredFields = [
  ["full_name", "SDR - Nome completo"],
  ["whatsapp_phone", "SDR - WhatsApp"],
  ["cpf", "SDR - CPF"],
  ["birth_date", "SDR - Data de nascimento"],
  ["marital_status", "SDR - Estado civil"],
  ["nationality", "SDR - Nacionalidade"],
  ["birthplace", "SDR - Naturalidade"],
  ["cro", "SDR - CRO"],
  ["email", "SDR - E-mail"],
  ["address", "SDR - Endereço"],
  ["district", "SDR - Bairro"],
  ["postal_code", "SDR - CEP"],
] as const;

const fieldsResponse = await request<Record<string, any>>("/leads/custom_fields?limit=250");
const existingFields = (fieldsResponse._embedded?.custom_fields ?? []) as Array<Record<string, any>>;
const fieldIds: Record<string, number> = {};
const missing = desiredFields.filter(([, name]) => !existingFields.some((field) => field.name === name));

if (missing.length > 0) {
  const created = await request<Record<string, any>>("/leads/custom_fields", {
    method: "POST",
    body: JSON.stringify(missing.map(([, name], index) => ({
      name,
      type: "text",
      sort: 1_000 + index * 10,
    }))),
  });
  existingFields.push(...((created._embedded?.custom_fields ?? created) as Array<Record<string, any>>));
}

for (const [key, name] of desiredFields) {
  const field = existingFields.find((candidate) => candidate.name === name);
  if (!field?.id) throw new Error(`Campo não encontrado após provisionamento: ${name}.`);
  fieldIds[key] = Number(field.id);
}

console.log(JSON.stringify({
  mode: "homologation-write",
  account: subdomain,
  pipeline: { id: pipelineId, name: pipeline.name },
  stages: Object.fromEntries(desiredStages.map((stage) => [stage.name, stage.id])),
  enrollmentFieldIds: fieldIds,
}, null, 2));
