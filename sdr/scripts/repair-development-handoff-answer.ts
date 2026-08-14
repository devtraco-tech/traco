import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";
import { evaluateHandoff, shouldInterruptCurrentFlow } from "../src/domain/handoff.js";
import { isPhoneAllowed } from "../src/domain/phone-allowlist.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";

dotenv.config({ path: ".env.local", quiet: true });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const confirmation = "--confirm-development-repair";
const config = loadConfig();
const conversationId = process.argv.find((argument) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(argument),
);

if (!process.argv.includes(confirmation)) {
  throw new Error(`Confirmação ausente. Use ${confirmation}.`);
}
if (config.NODE_ENV !== "development" || config.SUPABASE_URL !== developmentUrl) {
  throw new Error("Operação cancelada: reparo permitido somente no abo-traco-dev.");
}
if (!conversationId) throw new Error("Informe um conversationId UUID válido.");

const repository = new SdrRepository(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);
const context = await repository.loadConversation(conversationId, config.SDR_CONTEXT_MESSAGE_LIMIT);
if (!isPhoneAllowed(context.phoneE164, config.SDR_TEST_ALLOWED_PHONE_NUMBERS)) {
  throw new Error("Operação cancelada: conversa fora da lista de teste.");
}
if (context.flowStage !== "enrollment" || context.enrollmentStep !== 1) {
  throw new Error("Operação cancelada: conversa não está no ponto esperado da coleta.");
}

const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const profile = await client
  .from("sdr_enrollment_profiles")
  .select("full_name")
  .eq("conversation_id", conversationId)
  .maybeSingle();
if (profile.error) throw new Error(`Falha ao consultar perfil: ${profile.error.message}`);
const incorrectValue = String(profile.data?.full_name ?? "");
if (!shouldInterruptCurrentFlow(evaluateHandoff(incorrectValue))) {
  throw new Error("Operação cancelada: o nome salvo não é um pedido de handoff.");
}

const clearProfile = await client
  .from("sdr_enrollment_profiles")
  .update({ full_name: null })
  .eq("conversation_id", conversationId);
if (clearProfile.error) throw new Error(`Falha ao limpar nome incorreto: ${clearProfile.error.message}`);

const rewind = await client
  .from("sdr_conversations")
  .update({ enrollment_step: 0 })
  .eq("id", conversationId);
if (rewind.error) throw new Error(`Falha ao reposicionar coleta: ${rewind.error.message}`);

console.log(JSON.stringify({
  project: "abo-traco-dev",
  conversationId,
  clearedField: "full_name",
  enrollmentStep: 0,
  kommoLeadId: context.kommoLeadId,
}, null, 2));
