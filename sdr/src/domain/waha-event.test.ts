import { describe, expect, it } from "vitest";
import { parseWahaInboundMessage, parseWahaManualMessage } from "./waha-event.js";

function event(overrides: Record<string, unknown> = {}) {
  return {
    event: "message",
    payload: {
      id: "wamid-123",
      from: "5511999998888@c.us",
      fromMe: false,
      body: "Olá, quero conhecer os cursos",
      timestamp: 1_753_833_600,
      pushName: "Victor",
      ...overrides,
    },
  };
}

describe("parseWahaInboundMessage", () => {
  it("aceita mensagens recebidas em message.any", () => {
    expect(parseWahaInboundMessage({ ...event(), event: "message.any" })?.text).toContain("cursos");
  });

  it("identifica envio manual inclusive mídia e destinatário LID", () => {
    const result = parseWahaManualMessage({ ...event({ fromMe: true, source: "app", to: "120000000@lid", body: "" }), event: "message.any" });
    expect(result).toMatchObject({ recipientId: "120000000@lid", providerMessageId: "wamid-123", text: "" });
  });

  it("ignora ecos da API, grupos e eventos sem destinatário", () => {
    for (const overrides of [
      { fromMe: true, source: "api", to: "5511999998888@c.us" },
      { fromMe: true, source: "app", to: "123@g.us" },
      { fromMe: true, source: "app" },
      { fromMe: false, source: "app", to: "5511999998888@c.us" },
    ]) expect(parseWahaManualMessage({ ...event(overrides), event: "message.any" })).toBeNull();
  });
  it("normaliza uma mensagem direta recebida", () => {
    const result = parseWahaInboundMessage(event());

    expect(result).toMatchObject({
      providerMessageId: "wamid-123",
      whatsappId: "5511999998888@c.us",
      phoneE164: "+5511999998888",
      displayName: "Victor",
      text: "Olá, quero conhecer os cursos",
    });
  });

  it("ignora mensagens enviadas pelo próprio robô", () => {
    expect(parseWahaInboundMessage(event({ fromMe: true }))).toBeNull();
  });

  it("ignora grupos, status e mensagens vazias", () => {
    expect(
      parseWahaInboundMessage(event({ from: "12345@g.us" })),
    ).toBeNull();
    expect(
      parseWahaInboundMessage(event({ from: "status@broadcast" })),
    ).toBeNull();
    expect(parseWahaInboundMessage(event({ body: "  " }))).toBeNull();
  });

  it("normaliza uma mensagem LID quando o WAHA resolve o telefone", () => {
    const result = parseWahaInboundMessage(
      event({ from: "120000000000000@lid" }),
      "5562999998888@c.us",
    );

    expect(result).toMatchObject({
      whatsappId: "5562999998888@c.us",
      phoneE164: "+5562999998888",
    });
  });

  it("captura o nome no formato atual do payload do WAHA", () => {
    const result = parseWahaInboundMessage(event({
      pushName: undefined,
      _data: { Info: { PushName: "Dinho" } },
    }));

    expect(result?.displayName).toBe("Dinho");
  });

  it("não inventa telefone quando o WAHA não consegue resolver um LID", () => {
    expect(
      parseWahaInboundMessage(event({ from: "120000000000000@lid" })),
    ).toBeNull();
  });
});
