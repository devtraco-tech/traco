import { describe, expect, it } from "vitest";
import {
  OFFICIAL_FOLLOW_UPS,
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
} from "./official-training.js";

describe("treinamento oficial US-03", () => {
  it("mantém os materiais essenciais ativos e versionados", () => {
    expect(TRAINING_VERSION).toBe("us-03-v5-audience-matrix");
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

  it("incorpora os dois públicos, suas objeções e as salvaguardas comerciais", () => {
    const matrix = OFFICIAL_TRAINING_DOCUMENTS.find(
      (document) => document.documentType === "audience_matrix",
    );
    expect(matrix?.content).toContain("Odontólogos recém-formados");
    expect(matrix?.content).toContain("Odontólogos já atuantes");
    expect(matrix?.content).toContain("É melhor fazer logo uma especialização?");
    expect(matrix?.content).toContain("qual é o custo-benefício?");
    expect(matrix?.content).toContain("não garanta lucro, renda");
    expect(matrix?.content).toContain("nunca use idade ou gênero");
    expect(matrix?.metadata).toMatchObject({
      version: "us-03-v5-audience-matrix",
      source: "audience_matrix_pdf_2026-08-19",
      profiles: 2,
    });
  });
});
