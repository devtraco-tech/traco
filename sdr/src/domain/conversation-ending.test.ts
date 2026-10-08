import { describe, expect, it } from "vitest";
import { endsConversation } from "./conversation-ending.js";

describe("conversation ending", () => {
  it.each([
    "Não, está tudo bem esclarecido \nAgradeço",
    "Está tudo claro, obrigada!",
    "Não tenho mais dúvidas. Obrigado pelas informações 😊",
    "Pode encerrar o atendimento. Obrigada",
  ])("reconhece o encerramento: %s", (text) => {
    expect(endsConversation(text, "questions")).toBe(true);
  });

  it.each([
    "Não tenho dúvidas",
    "Não",
    "Obrigada",
    "Não tenho dúvidas, obrigada! Quero me matricular",
    "Está tudo claro, obrigada. Qual o investimento?",
    "Não, está tudo bem esclarecido. Agradeço. Pode enviar o PDF?",
  ])("preserva a continuidade e os pedidos: %s", (text) => {
    expect(endsConversation(text, "questions")).toBe(false);
  });

  it("não confunde agradecimento durante a matrícula com encerramento", () => {
    expect(endsConversation("Está tudo claro, obrigada!", "enrollment")).toBe(false);
    expect(endsConversation("Pode encerrar a conversa", "enrollment")).toBe(true);
  });
});
