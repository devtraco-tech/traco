import { describe, expect, it } from "vitest";
import { evaluateHandoff, shouldInterruptCurrentFlow } from "./handoff.js";

describe("evaluateHandoff", () => {
  it.each([
    ["Quero falar com um atendente", "explicit_request", true],
    ["Vocês conseguem dar desconto?", "commercial_high_intent", true],
    ["Quais são as formas de pagamento?", "commercial_high_intent", true],
    ["Posso pagar no PIX?", "commercial_high_intent", true],
    ["Quero solicitar reembolso", "sensitive_topic", true],
    ["I want to speak to a human agent", "explicit_request", true],
    ["Quiero hablar con una persona", "explicit_request", true],
    ["What payment methods do you accept?", "commercial_high_intent", true],
    ["¿Puedo pagar en cuotas?", "commercial_high_intent", true],
  ])("encaminha %s", (text, reason, interruptFlow) => {
    expect(evaluateHandoff(text)).toMatchObject({
      shouldHandoff: true,
      reason,
    });
    expect(shouldInterruptCurrentFlow(evaluateHandoff(text))).toBe(interruptFlow);
  });

  it("mantém no robô uma pergunta comum sobre curso", () => {
    expect(evaluateHandoff("Qual é a carga horária do curso?")).toEqual({
      shouldHandoff: false,
    });
  });

  it("interrompe imediatamente a coleta quando o lead pede uma pessoa", () => {
    expect(
      shouldInterruptCurrentFlow(evaluateHandoff("Quero falar com uma pessoa")),
    ).toBe(true);
  });

  it.each([
    "Quero me matricular",
    "Como faço a matrícula?",
    "I want to enroll",
    "Quiero matricularme",
  ])("mantém pedido de matrícula no fluxo normal do SDR: %s", (text) => {
    expect(evaluateHandoff(text)).toEqual({ shouldHandoff: false });
    expect(shouldInterruptCurrentFlow(evaluateHandoff(text))).toBe(false);
  });

  it("encaminha pagamento imediatamente mesmo durante outro fluxo", () => {
    expect(
      shouldInterruptCurrentFlow(evaluateHandoff("Quero saber como funciona o pagamento")),
    ).toBe(true);
  });
});
