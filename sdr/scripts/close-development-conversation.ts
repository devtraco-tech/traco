import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";
import { isPhoneAllowed } from "../src/domain/phone-allowlist.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";

dotenv.config({ path: ".env.local", quiet: true });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const confirmation = "--confirm-development-close";
const config = loadConfig();
const conversationId = process.argv.find((argument) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(argument),
);

if (!process.argv.includes(confirmation)) {
  throw new Error(`Confirmação ausente. Use ${confirmation}.`);
}
if (config.NODE_ENV !== "development" || config.SUPABASE_URL !== developmentUrl) {
  throw new Error("Operação cancelada: encerramento permitido somente no abo-traco-dev.");
}
if (!conversationId) {
  throw new Error("Informe um conversationId UUID válido.");
}

const repository = new SdrRepository(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
);
const context = await repository.loadConversation(
  conversationId,
  config.SDR_CONTEXT_MESSAGE_LIMIT,
);

if (!isPhoneAllowed(context.phoneE164, config.SDR_TEST_ALLOWED_PHONE_NUMBERS)) {
  throw new Error("Operação cancelada: a conversa não pertence a um número de teste permitido.");
}

const client = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const pendingMessages = await client
  .from("sdr_messages")
  .update({
    status: "ignored",
    error_code: "development_conversation_closed",
    error_message: "Conversa anterior encerrada para reiniciar o teste de desenvolvimento.",
  })
  .eq("conversation_id", conversationId)
  .eq("direction", "inbound")
  .in("status", ["received", "queued", "processing"])
  .select("id");
if (pendingMessages.error) {
  throw new Error(`Falha ao descartar mensagens pendentes: ${pendingMessages.error.message}`);
}

const handoffs = await client
  .from("sdr_handoffs")
  .update({ status: "resolved", resolved_at: new Date().toISOString() })
  .eq("conversation_id", conversationId)
  .in("status", ["open", "claimed"])
  .select("id");
if (handoffs.error) {
  throw new Error(`Falha ao resolver handoffs: ${handoffs.error.message}`);
}

const conversation = await client
  .from("sdr_conversations")
  .update({ status: "closed", bot_enabled: false })
  .eq("id", conversationId)
  .select("id, status, bot_enabled, configured_course_id")
  .single();
if (conversation.error) {
  throw new Error(`Falha ao encerrar conversa: ${conversation.error.message}`);
}

console.log(JSON.stringify({
  project: "abo-traco-dev",
  conversation: conversation.data,
  phoneE164: context.phoneE164,
  ignoredPendingMessages: pendingMessages.data.length,
  resolvedHandoffs: handoffs.data.length,
  nextMessageCreatesNewConversation: true,
}, null, 2));
