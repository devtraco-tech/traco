import { describe, expect, it } from "vitest";
import { evaluateHandoff, shouldInterruptCurrentFlow } from "./handoff.js";

describe("evaluateHandoff", () => {
  it.each([
    ["Quero falar com um atendente", "explicit_request", true],
    ["Como faço a matrícula?", "commercial_high_intent", false],
    ["Vocês conseguem dar desconto?", "commercial_high_intent", true],
    ["Quais são as formas de pagamento?", "commercial_high_intent", true],
    ["Posso pagar no PIX?", "commercial_high_intent", true],
    ["Quero solicitar reembolso", "sensitive_topic", true],
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

  it("não transforma pedido de matrícula em handoff antes do fluxo comercial", () => {
    expect(
      shouldInterruptCurrentFlow(evaluateHandoff("Quero me matricular")),
    ).toBe(false);
  });

  it("encaminha pagamento imediatamente mesmo durante outro fluxo", () => {
    expect(
      shouldInterruptCurrentFlow(evaluateHandoff("Quero saber como funciona o pagamento")),
    ).toBe(true);
  });
});
