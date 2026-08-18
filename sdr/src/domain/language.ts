import type { ConversationMessage } from "./types.js";

export type SupportedLanguage = "pt" | "en" | "es";

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  pt: "português do Brasil",
  en: "English",
  es: "español",
};

const TOKENS: Record<SupportedLanguage, Set<string>> = {
  pt: new Set([
    "oi", "ola", "gostaria", "quero", "nao", "sim", "sou", "tenho", "voce",
    "voces", "falar", "pessoa", "pagamento", "matricula", "dentista", "obrigado",
    "obrigada", "saber", "curso", "formado", "formada",
  ]),
  en: new Set([
    "hello", "hi", "would", "want", "yes", "not", "no", "am", "have", "you",
    "speak", "person", "payment", "enrollment", "enroll", "dentist", "thanks",
    "thank", "know", "course", "graduated", "interested",
  ]),
  es: new Set([
    "hola", "quisiera", "quiero", "si", "no", "soy", "tengo", "usted", "ustedes",
    "hablar", "persona", "pago", "inscripcion", "inscribirme", "dentista", "gracias",
    "saber", "curso", "graduado", "graduada", "interesado", "interesada",
  ]),
};

function normalizedWords(text: string): string[] {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase()
    .match(/[a-z]+/gu) ?? [];
}

export function detectMessageLanguage(text: string): SupportedLanguage | null {
  const raw = text.toLocaleLowerCase();
  if (/\b(hello|would like|i want|i am|i'm|how much|full name|thank you)\b/iu.test(raw)) {
    return "en";
  }
  if (/\b(hola|quisiera|me gustaria|quiero|soy|cómo|cuánto|inscribirme|gracias)\b/iu.test(raw)) {
    return "es";
  }
  if (/\b(olá|oi|gostaria|quero|sou|você|quanto|matrícula|obrigad[oa])\b/iu.test(raw)) {
    return "pt";
  }

  const scores: Record<SupportedLanguage, number> = { pt: 0, en: 0, es: 0 };
  for (const word of normalizedWords(text)) {
    for (const language of Object.keys(TOKENS) as SupportedLanguage[]) {
      if (TOKENS[language].has(word)) scores[language] += 1;
    }
  }
  const ranked = (Object.entries(scores) as Array<[SupportedLanguage, number]>)
    .sort((a, b) => b[1] - a[1]);
  const best = ranked[0];
  const second = ranked[1];
  if (!best || !second) return null;
  return best[1] > 0 && best[1] > second[1] ? best[0] : null;
}

export function resolveConversationLanguage(
  currentText: string,
  messages: ConversationMessage[],
): SupportedLanguage {
  const current = detectMessageLanguage(currentText);
  if (current) return current;

  const priorUserMessages = messages
    .filter((message) => message.role === "user")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  for (const message of priorUserMessages) {
    const detected = detectMessageLanguage(message.content);
    if (detected) return detected;
  }
  return "pt";
}

export function languageName(language: SupportedLanguage): string {
  return LANGUAGE_NAMES[language];
}
