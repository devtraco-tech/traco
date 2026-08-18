import { describe, expect, it } from "vitest";
import { conversationRestartReason } from "./conversation-restart.js";

describe("conversationRestartReason", () => {
  it.each([
    ["Hello, I am interested in the implantology course"],
    ["Hola, estoy interesado en el curso de implantología"],
  ])("reconhece nova saudação internacional: %s", (text) => {
    expect(conversationRestartReason(text)).toBe("new_greeting_with_course_interest");
  });
  it.each([
    "Quero reiniciar a conversa",
    "Pode recomeçar o atendimento do zero?",
    "Vamos começar de novo",
    "Quero um novo atendimento",
  ])("identifica um pedido explícito: %s", (message) => {
    expect(conversationRestartReason(message)).toBe("explicit_restart_request");
  });

  it.each([
    "Olá, estou interessado no curso de Implantodontia",
    "Oi, gostaria de saber mais sobre a especialização",
    "Bom dia, quero conhecer o curso",
  ])("identifica nova saudação com interesse: %s", (message) => {
    expect(conversationRestartReason(message)).toBe(
      "new_greeting_with_course_interest",
    );
  });

  it.each([
    "Olá",
    "Ainda tenho interesse",
    "Qual é o valor do curso?",
    "Quero falar com uma pessoa",
  ])("não reinicia mensagens comuns: %s", (message) => {
    expect(conversationRestartReason(message)).toBeNull();
  });
});
