import { describe, expect, it } from "vitest";
import {
  OFFICIAL_FOLLOW_UPS,
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
} from "./official-training.js";

describe("treinamento oficial US-03", () => {
  it("mantém os materiais essenciais ativos e versionados", () => {
    expect(TRAINING_VERSION).toBe("us-03-v4-figma");
    for (const type of ["commercial_script", "faq", "audience_matrix"]) {
      expect(
        OFFICIAL_TRAINING_DOCUMENTS.find((document) => document.documentType === type),
      ).toMatchObject({ active: true });
    }
  });

  it("usa as informações comerciais definidas no Figma", () => {
    const combined = OFFICIAL_TRAINING_DOCUMENTS.map((item) => item.content).join("\n");
    expect(combined).toContain("Sou a Karol, do time da ABO Goiás");
    expect(combined).toContain("140 horas");
    expect(combined).toContain("10 meses");
    expect(combined).toContain("10x de R$ 1.700");
    expect(combined).toContain("18/09");
    expect(combined).not.toContain("860 horas");
    expect(combined).not.toContain("24x de R$ 1.850,00");
  });

  it("mantém os sete follow-ups desligados enquanto a cadência não for aprovada", () => {
    const followUps = JSON.parse(OFFICIAL_FOLLOW_UPS) as Array<{
      enabled: boolean;
      delayHours: number | null;
    }>;
    expect(followUps).toHaveLength(7);
    expect(followUps.every((item) => !item.enabled && item.delayHours === null)).toBe(true);
  });
});
