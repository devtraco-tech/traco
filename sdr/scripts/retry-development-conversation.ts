import { loadConfig } from "../src/config.js";
import { isPhoneAllowed } from "../src/domain/phone-allowlist.js";
import { ConversationQueue } from "../src/infra/queue.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const config = loadConfig();
const conversationId = process.argv.find((argument) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(argument),
);

if (config.NODE_ENV !== "development" || config.SUPABASE_URL !== developmentUrl) {
  throw new Error("Operação cancelada: recuperação permitida somente no abo-traco-dev.");
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
  throw new Error("Operação cancelada: a conversa não pertence a um número permitido.");
}

const recoveredMessages = await repository.requeueProcessingMessages(conversationId);
if (recoveredMessages === 0) {
  throw new Error("Nenhuma mensagem em processamento foi encontrada nessa conversa.");
}

const queue = new ConversationQueue(config.REDIS_URL);
try {
  await queue.enqueue(
    conversationId,
    config.SDR_RESPONSE_DELAY_MS,
    config.SDR_MAX_RETRIES,
  );
  console.log(JSON.stringify({
    project: "abo-traco-dev",
    conversationId,
    recoveredMessages,
    delayMs: config.SDR_RESPONSE_DELAY_MS,
  }, null, 2));
} finally {
  await queue.close();
}
