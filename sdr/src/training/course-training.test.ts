import { describe, expect, it } from "vitest";
import { getCourseTraining } from "./course-training.js";
import { TRAINING_VERSION } from "./official-training.js";
import { PROSTHODONTICS_TRAINING_VERSION } from "./prosthodontics-training.js";

describe("getCourseTraining", () => {
  it("seleciona o treinamento de Prótese pelo slug vinculado", () => {
    const training = getCourseTraining("especializacao-em-protese-dentaria");

    expect(training.version).toBe(PROSTHODONTICS_TRAINING_VERSION);
    expect(training.documents.map((document) => document.documentType)).toEqual([
      "commercial_script",
      "faq",
      "audience_matrix",
      "follow_up",
    ]);
    expect(training.documents.map((document) => document.content).join("\n"))
      .not.toContain("Getúlio");
  });

  it("preserva o treinamento oficial existente para os demais cursos", () => {
    expect(getCourseTraining(null).version).toBe(TRAINING_VERSION);
    expect(getCourseTraining("especializacao-em-implantodontia-e-cirurgia-avancada").version)
      .toBe(TRAINING_VERSION);
  });
});
