import { describe, expect, it } from "vitest";
import { parseWahaInboundMessage } from "./waha-event.js";

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

  it("não inventa telefone quando o WAHA não consegue resolver um LID", () => {
    expect(
      parseWahaInboundMessage(event({ from: "120000000000000@lid" })),
    ).toBeNull();
  });
});
