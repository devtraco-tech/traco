import { describe, expect, it } from "vitest";
import {
  followUpDelayWithinBusinessHours,
  hasInboundAfterLastOutbound,
} from "./enrollment-follow-up.js";

describe("enrollment follow-up", () => {
  it("mantém quatro horas quando o vencimento cai no horário comercial", () => {
    const now = new Date("2026-08-18T10:00:00-03:00");
    expect(followUpDelayWithinBusinessHours(now, 4 * 3_600_000)).toBe(4 * 3_600_000);
  });

  it("adia para 8h quando quatro horas cair depois das 20h", () => {
    const now = new Date("2026-08-18T17:00:00-03:00");
    const delay = followUpDelayWithinBusinessHours(now, 4 * 3_600_000);
    expect(new Date(now.getTime() + delay).toISOString()).toBe("2026-08-19T11:00:00.000Z");
  });

  it("identifica uma resposta posterior à última saída", () => {
    expect(hasInboundAfterLastOutbound([
      { direction: "outbound", createdAt: "2026-08-18T10:00:00.000Z" },
      { direction: "inbound", createdAt: "2026-08-18T10:01:00.000Z" },
    ])).toBe(true);
  });
});
