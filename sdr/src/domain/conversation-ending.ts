import type { ConversationContext } from "./types.js";

export function endsConversation(text: string, stage: ConversationContext["flowStage"]): boolean {
  const value = text.normalize("NFD").replace(/[\u0300-\u036f]/gu, "").toLowerCase().trim();
  // Only complete closing statements qualify; a new question or request must be answered.
  const thanks = "(?:agradeco|(?:muito )?obrigad[oa](?: pelas? informacoes)?)";
  const punctuation = "[\\s,.!😊🙏]*";
  if (new RegExp(`^(?:pode encerrar(?: o atendimento| a conversa)?|nao quero continuar)${punctuation}(?:${thanks}${punctuation})?$`, "u").test(value)) return true;
  if (stage !== "questions") return false;
  return new RegExp(`^(?:nao${punctuation})?(?:esta tudo (?:bem )?esclarecido|(?:esta )?tudo claro|nao tenho (?:mais )?duvidas|sem (?:mais )?duvidas)${punctuation}${thanks}${punctuation}$`, "u").test(value);
}
