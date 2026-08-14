import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailNotifier } from "./notifier.js";

describe("EmailNotifier", () => {
  afterEach(() => vi.restoreAllMocks());

  it("envia falha crítica pelo Resend sem dados do lead", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
    );
    const notifier = new EmailNotifier(
      "resend-test",
      "SDR <sdr@example.com>",
      ["suporte@example.com"],
      "https://resend.test/emails",
    );

    await notifier.send({
      eventType: "worker_failure",
      severity: "critical",
      title: "SDR indisponível",
      text: "Falha final no processamento.",
      conversationId: "conversation-1",
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body)) as Record<string, unknown>;
    expect(payload).toMatchObject({
      from: "SDR <sdr@example.com>",
      to: ["suporte@example.com"],
      subject: "[CRÍTICO] SDR indisponível",
    });
    expect(JSON.stringify(payload)).not.toMatch(/leadPhone|cpf|endereço/iu);
  });

  it("não envia eventos comerciais", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const notifier = new EmailNotifier(
      "resend-test",
      "SDR <sdr@example.com>",
      ["suporte@example.com"],
    );
    await notifier.send({
      eventType: "new_lead",
      severity: "info",
      title: "Novo lead",
      text: "Novo atendimento.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fica desabilitado sem credenciais completas", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await new EmailNotifier().send({
      eventType: "test",
      severity: "critical",
      title: "Teste",
      text: "Sem configuração.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
