import { describe, expect, it } from "vitest";
import { detectMessageLanguage, resolveConversationLanguage } from "./language.js";
import type { ConversationMessage } from "./types.js";

describe("message language", () => {
  it.each([
    ["Olá, gostaria de saber mais sobre o curso", "pt"],
    ["Hello, I would like to know more about the course", "en"],
    ["Hola, quisiera saber más sobre el curso", "es"],
  ])("detecta %s", (text, language) => {
    expect(detectMessageLanguage(text)).toBe(language);
  });

  it("mantÃ©m em portuguÃªs a pergunta sobre curso no Tocantins", () => {
    const text = "Quando vcs vÃ£o fazer esse curso no estado do Tocantins?\nEm Palmas to";

    expect(detectMessageLanguage(text)).toBe("pt");
    expect(resolveConversationLanguage(text, [])).toBe("pt");
  });

  it.each(["no", "curso", "saber", "dentista", "no curso"])(
    "nÃ£o decide o idioma usando apenas termos compartilhados: %s",
    (text) => {
      expect(detectMessageLanguage(text)).toBeNull();
    },
  );

  it("usa o idioma anterior quando a resposta atual é ambígua", () => {
    const messages: ConversationMessage[] = [{
      id: "1",
      direction: "inbound",
      role: "user",
      content: "Hello, I am interested in the course",
      status: "sent",
      createdAt: "2026-01-01T00:00:00.000Z",
    }];
    expect(resolveConversationLanguage("John Smith", messages)).toBe("en");
  });
});
