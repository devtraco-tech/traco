import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";
import { EmailNotifier } from "../src/infra/notifier.js";

dotenv.config({ path: ".env.local", quiet: true });

if (!process.argv.includes("--confirm-email-delivery")) {
  throw new Error("Confirmação ausente. Use --confirm-email-delivery.");
}

const config = loadConfig();
const notifier = new EmailNotifier(
  config.RESEND_API_KEY,
  config.ALERT_EMAIL_FROM,
  config.ALERT_EMAIL_TO,
);
if (!notifier.enabled) {
  throw new Error(
    "Preencha RESEND_API_KEY, ALERT_EMAIL_FROM e ALERT_EMAIL_TO em .env.local.",
  );
}

await notifier.send({
  eventType: "critical_email_test",
  severity: "critical",
  title: "Teste do canal crítico do Robô SDR",
  text: "O canal de e-mail para falhas críticas está funcionando.",
});

console.info(JSON.stringify({
  level: "info",
  event: "critical_email_test_sent",
  recipientCount: config.ALERT_EMAIL_TO.length,
}));
