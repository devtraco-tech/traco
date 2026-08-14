import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const subdomain = process.env.KOMMO_SUBDOMAIN?.trim();
const accessToken = process.env.KOMMO_ACCESS_TOKEN?.trim();
const expectedSubdomain = "traconegocio";

if (subdomain !== expectedSubdomain) {
  throw new Error(
    `Operação cancelada: inspeção permitida somente em ${expectedSubdomain}.kommo.com.`,
  );
}
if (!accessToken) {
  throw new Error("KOMMO_ACCESS_TOKEN não configurado em .env.local.");
}

const baseUrl = `https://${subdomain}.kommo.com/api/v4`;
const headers = {
  accept: "application/json",
  authorization: `Bearer ${accessToken}`,
};

async function kommoGet(path: string): Promise<Record<string, any>> {
  const response = await fetch(`${baseUrl}${path}`, { headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Kommo GET ${path} falhou com HTTP ${response.status}.`);
  }
  return body as Record<string, any>;
}

const [account, pipelinesResponse] = await Promise.all([
  kommoGet("/account"),
  kommoGet("/leads/pipelines"),
]);

const pipelines = (pipelinesResponse._embedded?.pipelines ?? []) as Array<
  Record<string, any>
>;
const listedTestPipeline = pipelines.find((pipeline) =>
  String(pipeline.name).toLocaleUpperCase("pt-BR").includes("TESTE SDR"),
);

if (!listedTestPipeline) {
  throw new Error("Funil de homologação contendo 'TESTE SDR' não foi encontrado.");
}

const testPipeline = await kommoGet(
  `/leads/pipelines/${listedTestPipeline.id}?_=${Date.now()}`,
);

const stages = (testPipeline._embedded?.statuses ?? []) as Array<
  Record<string, any>
>;

console.log(JSON.stringify({
  mode: "read-only",
  account: {
    id: account.id,
    name: account.name,
    subdomain,
  },
  pipeline: {
    id: testPipeline.id,
    name: testPipeline.name,
    isMain: testPipeline.is_main,
    stages: stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      sort: stage.sort,
      type: stage.type,
    })),
  },
}, null, 2));
