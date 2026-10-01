import type { ConversationContext } from "./types.js";

export type PreAttendanceFollowUpKind = "first_contact" | "after_price";

export function preAttendanceReminder(context: ConversationContext, kind: PreAttendanceFollowUpKind): string {
  const name = context.displayName?.trim().split(/\s+/u)[0];
  const greeting = `Oi${name ? `, ${name}` : ""}! Tudo bem? 😊`;
  return kind === "first_contact"
    ? `${greeting}\n\nTentei falar com você sobre o seu interesse na nossa Especialização em Prótese Dentária, mas acredito que, pela correria, não conseguimos avançar na nossa conversa.\n\nAgora está mais tranquilo para conversarmos?`
    : `${greeting}\n\nComeçamos a conversar quanto ao seu interesse em nossa Especialização em Prótese Dentária, mas não tive mais o seu retorno.\n\nAinda é uma prioridade para você conhecer a proposta da nossa especialização? ☺️`;
}
