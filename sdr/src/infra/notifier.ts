export type Notification = {
  eventType: string;
  title: string;
  text: string;
  conversationId?: string;
  severity?: "info" | "warning" | "critical";
};

export class EmailNotifier {
  constructor(
    private readonly apiKey?: string,
    private readonly from?: string,
    private readonly recipients: string[] = [],
    private readonly endpoint = "https://api.resend.com/emails",
  ) {}

  get enabled(): boolean {
    return Boolean(this.apiKey && this.from && this.recipients.length > 0);
  }

  async send(notification: Notification): Promise<void> {
    // Eventos comerciais são tratados pelo Kommo. O e-mail é reservado para
    // incidentes técnicos, reduzindo ruído e exposição desnecessária de dados.
    if (!this.enabled || notification.severity !== "critical") return;

    const reference = notification.conversationId ?? "não disponível";
    const subject = `[CRÍTICO] ${notification.title}`;
    const text = [
      notification.text,
      `Evento: ${notification.eventType}`,
      `Conversa: ${reference}`,
      "Consulte os logs protegidos do SDR para investigar.",
    ].join("\n");
    const html = [
      `<h2>${escapeHtml(subject)}</h2>`,
      `<p>${escapeHtml(notification.text)}</p>`,
      `<p><strong>Evento:</strong> ${escapeHtml(notification.eventType)}</p>`,
      `<p><strong>Conversa:</strong> ${escapeHtml(reference)}</p>`,
      "<p>Consulte os logs protegidos do SDR para investigar.</p>",
    ].join("");

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: this.recipients,
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Canal de e-mail respondeu ${response.status}`);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
