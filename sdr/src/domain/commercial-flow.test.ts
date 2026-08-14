import { describe, expect, it } from "vitest";
import type { ConversationContext, FlowStage } from "./types.js";
import { decideCommercialFlow } from "./commercial-flow.js";
import type { CatalogItemSnapshot } from "./catalog.js";

const course: CatalogItemSnapshot = {
  id: "course-1",
  title: "Especialização em Implantodontia e Cirurgia Avançada",
  slug: "implantodontia",
  area: "Implantodontia",
  investment: 44400,
  investment_details: "Consulte condições especiais de parcelamento",
  currency: "real",
  teachers: null,
  program: null,
  workload: 860,
  vacancies: 12,
  public_url: null,
  description: null,
  prerequisites: "Graduação em Odontologia",
  differentials: "Treinamento prático intensivo em clínica com pacientes.",
  modality: "presencial",
  available_vacancies: 8,
  duration: "24 meses",
  periodicity: "Mensal (Quinta a Sábado)",
  target_audience: "cirurgioes_dentistas",
  other_professors: null,
  installment_suggestion: "24x de R$ 1.850,00",
  effective_installment: null,
  suggested_start_date: "2026-09-24",
  effective_start_date: "2026-09-24",
  registration_deadline: "2026-09-19",
  end_date: "2028-09-24",
};

function context(
  flowStage: FlowStage,
  overrides: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    conversationId: "conversation-1",
    leadId: "lead-1",
    whatsappId: "556299999999@c.us",
    phoneE164: "+556299999999",
    displayName: "Victor",
    status: "bot_active",
    botEnabled: true,
    flowStage,
    leadQualification: "unknown",
    audienceProfile: "unknown",
    interestConfirmed: null,
    enrollmentStep: 0,
    enrollmentNotificationSent: false,
    configuredCourseId: null,
    kommoLeadId: null,
    kommoContactId: null,
    kommoStatusId: null,
    kommoSyncStatus: "not_synced",
    wahaSession: "default",
    enrollmentData: {},
    messages: [],
    ...overrides,
  };
}

describe("decideCommercialFlow", () => {
  it("se identifica sem acoplar a conversa a uma marca", () => {
    const decision = decideCommercialFlow(context("presentation"), "Olá");
    expect(decision.handled).toBe(true);
    expect(decision.messages[0]).toContain("assistente virtual da equipe responsável");
    expect(decision.patch?.flowStage).toBe("qualification");
  });

  it("encerra o fluxo para quem não é graduado", () => {
    const decision = decideCommercialFlow(
      context("qualification"),
      "Ainda não, sou estudante de odontologia",
    );
    expect(decision.patch).toMatchObject({
      flowStage: "disqualified",
      leadQualification: "not_graduated",
    });
    expect(decision.messages[0]).toContain("necessário ter graduação");
  });

  it("apresenta diferenciais e pergunta o perfil de um dentista", () => {
    const decision = decideCommercialFlow(
      context("qualification"),
      "Sim, sou dentista formado",
      course,
    );
    expect(decision.messages).toHaveLength(3);
    expect(decision.messages[0]).toContain("Treinamento prático intensivo");
    expect(decision.messages[1]).toContain("24x de R$ 1.850,00");
    expect(decision.messages[1]).not.toContain("44.400");
    expect(decision.messages[2]).toContain("Implantodontia");
    expect(decision.patch).toMatchObject({
      flowStage: "profile",
      leadQualification: "graduated",
    });
  });

  it("adapta o match para um iniciante", () => {
    const decision = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Nunca fiz implante, será meu primeiro passo",
      course,
    );
    expect(decision.messages[0]).toContain("começa pelos fundamentos");
    expect(decision.messages[0]).toContain("equipe pode confirmar");
    expect(decision.patch).toMatchObject({
      flowStage: "match",
      audienceProfile: "beginner",
    });
  });

  it("reconhece primeira formação como perfil iniciante", () => {
    const decision = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Busco minha primeira formação na área",
      course,
    );
    expect(decision.handled).toBe(true);
    expect(decision.patch).toMatchObject({
      flowStage: "match",
      audienceProfile: "beginner",
    });
  });

  it("inicia o fluxo determinístico quando um graduado pede a matrícula", () => {
    const decision = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Quero iniciar minha matrícula",
      course,
    );
    expect(decision.handled).toBe(true);
    expect(decision.messages).toHaveLength(1);
    expect(decision.messages[0]).toContain("1. Nome completo:");
    expect(decision.messages[0]).toContain("12. CEP:");
    expect(decision.patch).toMatchObject({
      flowStage: "enrollment",
      interestConfirmed: true,
      enrollmentStep: 0,
    });
  });

  it("não confunde uma pergunta com confirmação de matrícula", () => {
    const decision = decideCommercialFlow(
      context("match", { audienceProfile: "beginner" }),
      "Quero saber o preço da matrícula",
      course,
    );
    expect(decision.handled).toBe(false);
  });

  it("só inicia matrícula depois da confirmação de interesse", () => {
    const decision = decideCommercialFlow(
      context("match", { audienceProfile: "beginner" }),
      "Sim, faz sentido para mim",
    );
    expect(decision.notifyEnrollment).toBe(true);
    expect(decision.messages[0]).toContain("responda todos os dados");
    expect(decision.patch).toMatchObject({
      flowStage: "enrollment",
      interestConfirmed: true,
      enrollmentStep: 0,
    });
  });

  it("informa de uma vez os campos ausentes ou inválidos", () => {
    const invalid = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      "1. Nome completo: Maria da Silva\n2. WhatsApp com DDD: 559884413421\n3. CPF: 123",
    );
    expect(invalid.enrollmentData).toBeUndefined();
    expect(invalid.messages[0]).toContain("11 números");
    expect(invalid.messages[0]).toContain("Data de nascimento");
    expect(invalid.messages[0]).toContain("reenvie a lista completa");
    expect(invalid.patch).toBeUndefined();
  });

  it("aceita todas as respostas numeradas em uma única mensagem", () => {
    const decision = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      [
        "1. Nome completo: Maria da Silva",
        "2. WhatsApp com DDD: (62) 98888-7777",
        "3. CPF: 123.456.789-01",
        "4. Data de nascimento: 01/02/1990",
        "5. Estado civil: Solteira",
        "6. Nacionalidade: Brasileira",
        "7. Naturalidade: Goiânia - GO",
        "8. CRO: CRO-GO 12345",
        "9. E-mail: maria@example.com",
        "10. Endereço completo: Rua 1, número 20, apto 3",
        "11. Bairro: Centro",
        "12. CEP: 74000-000",
      ].join("\n"),
    );
    expect(decision.enrollmentData).toMatchObject({
      full_name: "Maria da Silva",
      whatsapp_phone: "62988887777",
      cpf: "12345678901",
      email: "maria@example.com",
      postal_code: "74000000",
    });
    expect(decision.patch).toMatchObject({ flowStage: "completed", enrollmentStep: 12 });
    expect(decision.messages[0]).toContain("contrato e pagamento");
    expect(decision.handoffAfterFlow).toEqual({
      reason: "commercial_high_intent",
      details: "Dados de matrícula concluídos; contrato e pagamento exigem atendimento humano.",
    });
  });

  it("aceita uma lista posicional sem repetir os nomes dos campos", () => {
    const decision = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      [
        "1. Maria da Silva",
        "2. 62988887777",
        "3. 12345678901",
        "4. 01/02/1990",
        "5. Solteira",
        "6. Brasileira",
        "7. Goiânia - GO",
        "8. CRO-GO 12345",
        "9. maria@example.com",
        "10. Rua 1, número 20",
        "11. Centro",
        "12. 74000000",
      ].join("\n"),
    );
    expect(decision.enrollmentData?.full_name).toBe("Maria da Silva");
    expect(decision.enrollmentData?.postal_code).toBe("74000000");
    expect(decision.patch?.flowStage).toBe("completed");
  });
});
