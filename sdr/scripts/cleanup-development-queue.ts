import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";
import { ConversationQueue } from "../src/infra/queue.js";
import { SdrRepository } from "../src/infra/supabase-repository.js";

dotenv.config({ path: ".env.local", quiet: true });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const confirmation = "--confirm-development-cleanup";
const config = loadConfig();

if (!process.argv.includes(confirmation)) {
  throw new Error(`Confirmação ausente. Execute novamente com ${confirmation}.`);
}
if (config.NODE_ENV !== "development") {
  throw new Error("Operação cancelada: a limpeza só funciona em NODE_ENV=development.");
}
if (config.SUPABASE_URL !== developmentUrl) {
  throw new Error("Operação cancelada: o projeto não é o abo-traco-dev.");
}

const repository = new SdrRepository(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
);
const queue = new ConversationQueue(config.REDIS_URL);
const wasPaused = await queue.isPaused();

try {
  if (!wasPaused) await queue.pause();
  const ignoredMessages = await repository.discardQueuedMessages(
    "Limpeza manual da fila de desenvolvimento",
  );
  const discardedJobs = await queue.discardPendingJobs();
  console.log(JSON.stringify({
    project: "abo-traco-dev",
    ignoredMessages,
    discardedJobs,
    note: "Jobs ativos não são interrompidos; execute com o worker desligado.",
  }, null, 2));
} finally {
  if (!wasPaused) await queue.resume();
  await queue.close();
}
