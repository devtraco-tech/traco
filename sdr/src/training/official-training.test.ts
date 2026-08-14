import { describe, expect, it } from "vitest";
import {
  OFFICIAL_FOLLOW_UPS,
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
} from "./official-training.js";

describe("treinamento oficial US-03", () => {
  it("mantém os materiais essenciais ativos e versionados", () => {
    expect(TRAINING_VERSION).toBe("us-03-v3-specialization");
    for (const type of ["commercial_script", "faq", "audience_matrix"]) {
      expect(
        OFFICIAL_TRAINING_DOCUMENTS.find((document) => document.documentType === type),
      ).toMatchObject({ active: true });
    }
  });

  it("não reutiliza informações do curso antigo", () => {
    const combined = OFFICIAL_TRAINING_DOCUMENTS.map((item) => item.content).join("\n");
    expect(combined).toContain("860 horas");
    expect(combined).toContain("24x de R$ 1.850,00");
    expect(combined).toContain("19/09/2026");
    expect(combined).not.toContain("140 horas");
    expect(combined).not.toContain("10 meses");
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
