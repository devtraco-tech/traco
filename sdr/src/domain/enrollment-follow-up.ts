import type { SupportedLanguage } from "./language.js";

export const ENROLLMENT_FOLLOW_UP_MESSAGE: Record<SupportedLanguage, string> = {
  pt: "Vamos prosseguir com a sua matrícula?",
  en: "Shall we continue with your enrollment?",
  es: "¿Continuamos con tu inscripción?",
};

type LocalClock = { hour: number; minute: number; second: number };

function clockInTimeZone(date: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { hour: value("hour"), minute: value("minute"), second: value("second") };
}

export function followUpDelayWithinBusinessHours(
  now: Date,
  intervalMs: number,
  startHour = 8,
  endHour = 20,
  timeZone = "America/Sao_Paulo",
): number {
  const dueAt = new Date(now.getTime() + intervalMs);
  const local = clockInTimeZone(dueAt, timeZone);
  const elapsedInHourMs = (local.minute * 60 + local.second) * 1_000 + dueAt.getMilliseconds();

  if (local.hour < startHour) {
    return intervalMs + (startHour - local.hour) * 3_600_000 - elapsedInHourMs;
  }
  if (local.hour >= endHour) {
    return intervalMs + (24 - local.hour + startHour) * 3_600_000 - elapsedInHourMs;
  }
  return intervalMs;
}

export function hasInboundAfterLastOutbound(
  messages: Array<{ direction: "inbound" | "outbound"; createdAt: string }>,
): boolean {
  const latestInbound = messages
    .filter((message) => message.direction === "inbound")
    .at(-1);
  const latestOutbound = messages
    .filter((message) => message.direction === "outbound")
    .at(-1);
  if (!latestInbound) return false;
  if (!latestOutbound) return true;
  return latestInbound.createdAt > latestOutbound.createdAt;
}
