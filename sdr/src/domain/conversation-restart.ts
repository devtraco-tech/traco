function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, " ")
    .trim();
}

export type ConversationRestartReason =
  | "explicit_restart_request"
  | "new_greeting_with_course_interest";

export function conversationRestartReason(
  text: string,
): ConversationRestartReason | null {
  const value = normalize(text);
  if (!value) return null;

  const explicitRestart =
    /\b(reiniciar|reinicie|recomecar|recomece|resetar|reset|zerar)\b.{0,40}\b(conversa|atendimento|fluxo|do zero)\b/u.test(value)
    || /\b(comecar|iniciar|voltar)\b.{0,25}\b(de novo|novamente|do zero|desde o inicio|ao inicio)\b/u.test(value)
    || /\b(novo atendimento|nova conversa)\b/u.test(value)
    || /\b(restart|reset|start over|begin again|new conversation)\b/u.test(value)
    || /\b(reiniciar|restablecer|empezar de nuevo|comenzar de nuevo|nueva conversacion)\b/u.test(value);
  if (explicitRestart) return "explicit_restart_request";

  const startsWithGreeting =
    /^(ola|oi|bom dia|boa tarde|boa noite|e ai|hello|hi|good morning|good afternoon|good evening|hola|buenos dias|buenas tardes|buenas noches)\b/u.test(value);
  const mentionsInterest =
    /\b(interessad[oa]|tenho interesse|quero saber|queria saber|gostaria de saber|quero conhecer|interested|want to know|would like to know|interesad[oa]|quiero saber|quisiera saber|me gustaria saber)\b/u.test(value);
  const mentionsCatalogItem =
    /\b(curso|course|especializacao|specialization|especializacion|capacitacao|training|capacitacion|aperfeicoamento|formacao|implantodontia|implantology|implantologia)\b/u.test(value);

  return startsWithGreeting && mentionsInterest && mentionsCatalogItem
    ? "new_greeting_with_course_interest"
    : null;
}
