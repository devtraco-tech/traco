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

const prosthodonticsCourse: CatalogItemSnapshot = {
  ...course,
  id: "course-protese",
  title: "Especialização em Prótese Dentária",
  slug: "especializacao-em-protese-dentaria",
  area: "Prótese Dentária",
  investment: 70000,
  investment_details: "25 parcelas de R$ 2.800,00",
  installment_suggestion: "25x de R$ 2.800,00",
  workload: 856,
  vacancies: 0,
  available_vacancies: 0,
  duration: "25 módulos, com duração superior a 2 anos",
  periodicity: "Encontros mensais, de quarta-feira a sábado",
  suggested_start_date: null,
  effective_start_date: null,
  registration_deadline: null,
  end_date: null,
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
    clintDealId: null,
    clintContactId: null,
    clintStageId: null,
    clintSyncStatus: "not_synced",
    wahaSession: "default",
    enrollmentData: {},
    messages: [],
    ...overrides,
  };
}

describe("decideCommercialFlow", () => {
  it("segue qualificação, perfil e motivação antes de apresentar Prótese", () => {
    const qualification = decideCommercialFlow(
      context("qualification"),
      "Sim, sou dentista formado",
      prosthodonticsCourse,
    );
    expect(qualification.messages[0]).toContain("já atua com Prótese Dentária");
    expect(qualification.messages.join(" ")).not.toContain("R$ 2.800");

    const profile = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Ainda não atuo com prótese",
      prosthodonticsCourse,
    );
    expect(profile.patch?.audienceProfile).toBe("beginner");
    expect(profile.patch?.flowStage).toBeUndefined();
    expect(profile.messages[0]).toContain("o que despertou seu interesse");

    const decision = decideCommercialFlow(
      context("profile", {
        leadQualification: "graduated",
        audienceProfile: "beginner",
      }),
      "Quero desenvolver segurança para começar a atuar",
      prosthodonticsCourse,
    );

    const content = decision.messages.join("\n");
    expect(content).toContain("Especialização em Prótese Dentária");
    expect(decision.sendCoursePdf).toBe(true);
    expect(decision.messagesAfterCoursePdf?.[0]).toContain("faz sentido seguirmos");
    expect(content).not.toContain("R$ 2.800");
    expect(content).not.toContain("Getúlio");
    expect(content).not.toContain("10x de R$ 1.700");
    expect(content).not.toContain("18/09");
    expect(decision.patch?.flowStage).toBe("match");
  });

  it("adapta objeção ao conteúdo de Prótese", () => {
    const beginner = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Ainda não atuo com prótese",
      prosthodonticsCourse,
    );
    expect(beginner.patch?.audienceProfile).toBe("beginner");
    expect(beginner.messages.join(" ")).toContain("o que despertou seu interesse");
    expect(beginner.messages.join(" ")).not.toContain("guia cirúrgica");

    const objection = decideCommercialFlow(
      context("match", { audienceProfile: "experienced" }),
      "Tenho receio de pagar pelo mesmo conteúdo que já conheço",
      prosthodonticsCourse,
    );
    expect(objection.messages[0]).toContain("reabilitações complexas");
    expect(objection.messages[0]).toContain("equipe multidisciplinar");
    expect(objection.messages[0]).not.toContain("protocolos simplificados");
  });

  it("apresenta Julyane e percorre conexão, dúvidas e transferência ao consultor", () => {
    const opening = decideCommercialFlow(
      context("presentation", { displayName: "Victor Silva" }),
      "Olá",
      prosthodonticsCourse,
    );
    expect(opening.messages[0]).toContain("Olá, Victor!");
    expect(opening.messages[0]).toContain("Sou a Julyane Consultora Comercial da ABO-GO");

    const connection = decideCommercialFlow(
      context("match", {
        leadQualification: "graduated",
        audienceProfile: "experienced",
      }),
      "Sim, faz sentido para mim",
      prosthodonticsCourse,
    );
    expect(connection.messages[0]).toContain("já conhece a nossa formação e a ABO");
    expect(connection.patch).toMatchObject({
      flowStage: "abo_connection",
      interestConfirmed: true,
    });

    const institution = decideCommercialFlow(
      context("abo_connection", {
        leadQualification: "graduated",
        audienceProfile: "experienced",
      }),
      "Não conheço",
      prosthodonticsCourse,
    );
    expect(institution.messages.join(" ")).toContain("mais de 70 anos");
    expect(institution.messages.join(" ")).toContain("Sicknan Soares");
    expect(institution.messages.join(" ")).toContain("856h");
    expect(institution.patch?.flowStage).toBe("final_match");

    const questions = decideCommercialFlow(
      context("final_match", { leadQualification: "graduated" }),
      "Sim, faz sentido",
      prosthodonticsCourse,
    );
    expect(questions.messages[0]).toContain("dúvida pontual");
    expect(questions.patch?.flowStage).toBe("questions");

    const handoff = decideCommercialFlow(
      context("questions", { leadQualification: "graduated", interestConfirmed: true }),
      "Não tenho dúvidas",
      prosthodonticsCourse,
    );
    expect(handoff.messages).toEqual([]);
    expect(handoff.notifyEnrollment).toBe(true);
    expect(handoff.handoffAfterFlow?.reason).toBe("commercial_high_intent");

    const enrollment = decideCommercialFlow(
      context("questions", {
        leadQualification: "graduated",
        audienceProfile: "experienced",
        interestConfirmed: true,
      }),
      "Quero iniciar a minha matrícula",
      prosthodonticsCourse,
    );
    expect(enrollment.messages[0]).toContain("Nome completo:");
    expect(enrollment.patch).toMatchObject({
      flowStage: "enrollment",
      enrollmentNotificationSent: true,
    });
    expect(enrollment.notifyEnrollment).toBe(true);
    expect(enrollment.handoffAfterFlow).toBeUndefined();
    expect(enrollment.messages.join(" ")).not.toContain("encaminhar sua conversa");

    const investmentQuestion = decideCommercialFlow(
      context("questions", {
        leadQualification: "graduated",
        audienceProfile: "experienced",
      }),
      "Quanto custa?",
      prosthodonticsCourse,
    );
    expect(investmentQuestion.messages).toEqual([
      "O investimento da Especialização em Prótese Dentária é de *25 parcelas de R$ 2.800,00*. O material institucional também informa *5% de desconto no pagamento integral do semestre*. Para negociar condições diferentes, posso acionar uma pessoa do nosso time.",
    ]);
    expect(investmentQuestion.handoffAfterFlow).toBeUndefined();
    expect(investmentQuestion.patch).toBeUndefined();

    const earlyInvestmentQuestion = decideCommercialFlow(
      context("qualification"),
      "Qual o valor do curso?",
      prosthodonticsCourse,
    );
    expect(earlyInvestmentQuestion.messages[0]).toContain("25 parcelas de R$ 2.800,00");
    expect(earlyInvestmentQuestion.handoffAfterFlow).toBeUndefined();

    const paymentQuestion = decideCommercialFlow(
      context("questions", {
        leadQualification: "graduated",
        audienceProfile: "experienced",
      }),
      "Quais são as formas de pagamento?",
      prosthodonticsCourse,
    );
    expect(paymentQuestion.handoffAfterFlow?.reason).toBe("commercial_high_intent");
  });

  it("oferece a imersão em Endodontia quando o lead de Prótese não é formado", () => {
    const offer = decideCommercialFlow(
      context("qualification"),
      "Ainda não sou formado",
      prosthodonticsCourse,
    );
    expect(offer.messages[0]).toContain("Imersão em Endodontia");
    expect(offer.patch?.flowStage).toBe("alternative_offer");

    const details = decideCommercialFlow(
      context("alternative_offer", { leadQualification: "not_graduated" }),
      "Sim, tenho interesse",
      prosthodonticsCourse,
    );
    expect(details.messages[0]).toContain("1º a 3 de outubro");
    expect(details.messages[0]).toContain("Dr. Daniel Decurcio");
    expect(details.patch?.flowStage).toBe("alternative_details");
  });

  it("envia a apresentação institucional completa mesmo quando a pergunta da ABO veio do modelo", () => {
    const decision = decideCommercialFlow(
      context("match", {
        messages: [{
          id: "out-abo",
          direction: "outbound",
          role: "assistant",
          content: "Você já conhece a formação e a ABO Goiás?",
          status: "sent",
          createdAt: "2026-09-16T17:51:00.000Z",
        }],
      }),
      "Não",
      prosthodonticsCourse,
    );

    const content = decision.messages.join("\n");
    expect(content).toContain("Aproveitando a oportunidade, Victor");
    expect(content).toContain("🦷 Novos cursos e especializações");
    expect(content).toContain("📅 Eventos, imersões e novidades");
    expect(content).toContain("https://www.instagram.com/abogoias");
    expect(content).not.toContain("[https://");
    expect(decision.patch?.flowStage).toBe("final_match");
  });

  it("conduz a apresentação e a qualificação em inglês", () => {
    const presentation = decideCommercialFlow(
      context("presentation"),
      "Hello, I am interested in the course",
      course,
      "en",
    );
    expect(presentation.messages[0]).toContain("are you already a graduate in Dentistry");

    const qualification = decideCommercialFlow(
      context("qualification"),
      "Yes, I am a graduated dentist",
      course,
      "en",
    );
    expect(qualification.messages.at(-1)).toContain("do you already work");
    expect(qualification.messages.join(" ")).not.toContain("Treinamento prático");
    expect(qualification.patch?.leadQualification).toBe("graduated");
  });

  it("conduz em espanhol o mesmo fluxo comercial do português", () => {
    const presentation = decideCommercialFlow(
      context("presentation"),
      "Hola, me interesa el curso",
      course,
      "es",
    );
    expect(presentation.messages[0]).toContain("Soy Karol, del equipo de ABO Goiás");
    expect(presentation.messages[0]).toContain("¿ya te graduaste en Odontología?");

    const qualification = decideCommercialFlow(
      context("qualification"),
      "Sí, soy dentista graduado",
      course,
      "es",
    );
    expect(qualification.messages).toHaveLength(3);
    expect(qualification.messages[0]).toContain("referente en el mercado desde hace más de 20 años");
    expect(qualification.messages[1]).toContain("10 meses | 140 h");
    expect(qualification.messages[2]).toContain("primer paso en el área");

    const profile = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Será mi primer paso en el área",
      course,
      "es",
    );
    expect(profile.patch).toMatchObject({
      flowStage: "match",
      audienceProfile: "beginner",
    });
    expect(profile.messages[0]).toContain("comenzar en Implantología con seguridad");

    const enrollment = decideCommercialFlow(
      context("match", { leadQualification: "graduated", audienceProfile: "beginner" }),
      "Sí, tiene sentido",
      course,
      "es",
    );
    expect(enrollment.messages[0]).toContain("Nombre completo:");
    expect(enrollment.messages[0]).toContain("Código postal (CEP):");
  });

  it("trata em espanhol as objeções da matriz de público", () => {
    const specialization = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Soy recién graduado. ¿No sería mejor hacer una especialización?",
      course,
      "es",
    );
    expect(specialization.patch).toMatchObject({
      flowStage: "match",
      audienceProfile: "beginner",
    });
    expect(specialization.messages[0]).toContain("tienen propuestas diferentes");
    expect(specialization.messages[1]).toContain("práctica clínica");

    const costBenefit = decideCommercialFlow(
      context("match", { audienceProfile: "experienced" }),
      "Tengo dudas sobre el costo-beneficio y el momento financiero",
      course,
      "es",
    );
    expect(costBenefit.handled).toBe(true);
    expect(costBenefit.messages[0]).toContain("sin prometer un plazo de retorno");
    expect(costBenefit.messages[0]).toContain("persona del equipo");
  });

  it("apresenta Karol e ABO Goiás conforme o Figma", () => {
    const decision = decideCommercialFlow(context("presentation"), "Olá");
    expect(decision.handled).toBe(true);
    expect(decision.messages[0]).toContain("Sou a Karol, do time da ABO Goiás");
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
    expect(decision.messages[0]).toContain("referência no mercado há mais de 20 anos");
    expect(decision.messages[1]).toContain("10x de R$ 1.700");
    expect(decision.messages[1]).toContain("10 meses | 140h");
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
    expect(decision.messages[0]).toContain("começar na Implantodontia com segurança");
    expect(decision.messages[0]).toContain("protocolos simplificados");
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

  it("reconhece um recém-formado e responde à objeção sobre especialização", () => {
    const decision = decideCommercialFlow(
      context("profile", { leadQualification: "graduated" }),
      "Sou recém-formado. Não seria melhor fazer logo uma especialização?",
      course,
    );
    expect(decision.patch).toMatchObject({
      flowStage: "match",
      audienceProfile: "beginner",
    });
    expect(decision.messages).toHaveLength(2);
    expect(decision.messages[0]).toContain("têm propostas diferentes");
    expect(decision.messages[0]).toContain("depende do seu objetivo profissional");
    expect(decision.messages[1]).toContain("começar na Implantodontia com segurança");
  });

  it("trata custo-benefício sem prometer retorno financeiro", () => {
    const decision = decideCommercialFlow(
      context("match", { audienceProfile: "experienced" }),
      "Estou em dúvida sobre o custo-benefício e o momento financeiro",
      course,
    );
    expect(decision.handled).toBe(true);
    expect(decision.patch).toBeUndefined();
    expect(decision.messages[0]).toContain("sem prometer prazo de retorno");
    expect(decision.messages[0]).toContain("pessoa do time");
  });

  it("responde a objeção financeira do script sem iniciar a matrícula", () => {
    const decision = decideCommercialFlow(
      context("match", { audienceProfile: "beginner" }),
      "Faz sim, mas achei muito caro",
      course,
    );

    expect(decision.handled).toBe(true);
    expect(decision.messages).toHaveLength(1);
    expect(decision.messages[0]).toContain("Entendo sua preocupação");
    expect(decision.messages[0]).toContain("condições comerciais documentadas");
    expect(decision.messages[0]).toContain("pessoa do time");
    expect(decision.patch).toMatchObject({
      flowStage: "match",
      interestConfirmed: true,
    });
    expect(decision.notifyEnrollment).toBeUndefined();
  });

  it("recupera a objeção financeira após a pergunta de confirmação", () => {
    const decision = decideCommercialFlow(
      context("profile", {
        leadQualification: "graduated",
        audienceProfile: "beginner",
        messages: [
          {
            id: "message-1",
            direction: "outbound",
            role: "assistant",
            content: "Perfeito! O curso foi desenvolvido também para quem está começando. Faz sentido pra você?",
            status: "sent",
            createdAt: "2026-09-10T13:05:00.000Z",
          },
        ],
      }),
      "Faz sim, mais achei muito caro",
      course,
    );

    expect(decision.handled).toBe(true);
    expect(decision.messages[0]).toContain("Entendo sua preocupação");
    expect(decision.patch).toMatchObject({
      flowStage: "match",
      interestConfirmed: true,
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
    expect(decision.messages[0]).toContain("Nome completo:");
    expect(decision.messages[0]).toContain("CEP:");
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

  it("notifica o interesse e segue diretamente para os dados da matrícula", () => {
    const decision = decideCommercialFlow(
      context("match", { audienceProfile: "beginner" }),
      "Sim, faz sentido para mim e quero me matricular",
    );
    expect(decision.notifyEnrollment).toBe(true);
    expect(decision.messages[0]).toContain("Nome completo:");
    expect(decision.messages[0]).not.toMatch(/atendimento|responsável|encaminh/iu);
    expect(decision.handoffAfterFlow).toBeUndefined();
    expect(decision.patch).toMatchObject({
      flowStage: "enrollment",
      interestConfirmed: true,
      enrollmentNotificationSent: true,
      enrollmentStep: 0,
    });
  });

  it("conclui o fluxo e informa ao humano quando existem dados inválidos", () => {
    const invalid = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      "1. Nome completo: Maria da Silva\n2. WhatsApp com DDD: 559884413421\n3. CPF: 123",
    );
    expect(invalid.enrollmentData).toMatchObject({
      full_name: "Maria da Silva",
      whatsapp_phone: "559884413421",
    });
    expect(invalid.messages[0]).toContain("Muito obrigada pelos dados");
    expect(invalid.messages[0]).not.toContain("11 números");
    expect(invalid.patch).toMatchObject({ flowStage: "completed", enrollmentStep: 12 });
    expect(invalid.handoffAfterFlow?.details).toContain("CPF: O CPF precisa ter 11 números.");
    expect(invalid.handoffAfterFlow?.details).toContain("Data de nascimento: não informado.");
  });

  it("aceita CRO com hífen, separa endereço e bairro juntos e encaminha as pendências", () => {
    const decision = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      [
        "1 Stephany de Oliveira Borges",
        "2 62991634836",
        "3 03/01/1994",
        "4 04297864177",
        "5 Solteira",
        "6 Brasileira",
        "7 Iporaense",
        "8 CRO - 748998",
        "9 stephany@traconegocios",
        "10 Rua 8 Jardim Santo Antonio 10 11 Jardim Santo Antonio",
        "12 748532110",
      ].join("\n"),
    );

    expect(decision.enrollmentData).toMatchObject({
      full_name: "Stephany de Oliveira Borges",
      whatsapp_phone: "62991634836",
      birth_date: "03/01/1994",
      cpf: "04297864177",
      cro: "748998",
      address: "Rua 8 Jardim Santo Antonio 10",
      district: "Jardim Santo Antonio",
    });
    expect(decision.messages[0]).toContain("Muito obrigada pelos dados");
    expect(decision.messages[0]).not.toContain("Não consegui validar");
    expect(decision.patch?.flowStage).toBe("completed");
    expect(decision.handoffAfterFlow?.details).toContain("E-mail: Esse e-mail não parece válido.");
    expect(decision.handoffAfterFlow?.details).toContain("CEP: O CEP precisa ter 8 números.");
    expect(decision.handoffAfterFlow?.details).not.toContain("Nome completo: não informado.");
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
    expect(decision.messages[0]).toBe(
      "Muito obrigada pelos dados, Dr.! Agora vamos gerar o seu contrato e o link de pagamento. Assim que estiverem prontos, encaminharei tudo para você dar continuidade à sua matrícula.",
    );
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

  it("aceita somente número e valor, sem ponto e sem nome do campo", () => {
    const decision = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      [
        "9 stephany@traconegocios.com.br",
        "6 Brasileira",
        "1 Stephany de Oliveira Borges",
        "12 74853110",
        "4 04297864177",
        "7 Iporá - GO",
        "3 03/01/1994",
        "5 Solteira",
        "8 CRO-GO 748998",
        "2 62991634836",
        "10 Rua 8, Jardim Santo Antônio, 10",
        "11 Jardim Santo Antônio",
      ].join("\n"),
    );

    expect(decision.enrollmentData).toMatchObject({
      full_name: "Stephany de Oliveira Borges",
      whatsapp_phone: "62991634836",
      birth_date: "03/01/1994",
      cpf: "04297864177",
      nationality: "Brasileira",
      email: "stephany@traconegocios.com.br",
      postal_code: "74853110",
    });
    expect(decision.patch?.flowStage).toBe("completed");
  });

  it("aceita os dados identificados em qualquer ordem e sem numeração", () => {
    const decision = decideCommercialFlow(
      context("enrollment", { enrollmentStep: 0, interestConfirmed: true }),
      [
        "E-mail: maria@example.com",
        "CEP = 74000-000",
        "Nome completo - Maria da Silva",
        "CRO: CRO-GO 12345",
        "Bairro: Centro",
        "CPF: 123.456.789-01",
        "Nacionalidade: Brasileira",
        "WhatsApp com DDD: (62) 98888-7777",
        "Estado civil: Solteira",
        "Endereço completo: Rua 1, número 20, apto 3",
        "Naturalidade: Goiânia - GO",
        "Data de nascimento: 01/02/1990",
      ].join("\n"),
    );

    expect(decision.enrollmentData).toMatchObject({
      full_name: "Maria da Silva",
      email: "maria@example.com",
      cpf: "12345678901",
      postal_code: "74000000",
    });
    expect(decision.patch?.flowStage).toBe("completed");
  });
});
