import { describe, expect, it, vi } from "vitest";
import type { ConversationContext } from "../domain/types.js";
import type { SdrRepository } from "../infra/supabase-repository.js";
import type { ConversationQueue, CrmRetryQueue } from "../infra/queue.js";
import type { OpenAiAgent } from "../infra/openai-agent.js";
import type { EmailNotifier } from "../infra/notifier.js";
import type { WahaClient } from "../infra/waha-client.js";
import { ConversationProcessor } from "./process-conversation.js";
import type { CrmSyncService } from "./crm-sync.js";

const baseline = "2026-08-18T12:00:00.000Z";

function context(messages: ConversationContext["messages"]): ConversationContext {
  return {
    conversationId: "conversation-1",
    leadId: "lead-1",
    whatsappId: "556299999999@c.us",
    phoneE164: "+556299999999",
    displayName: "Victor",
    status: "bot_active",
    botEnabled: true,
    flowStage: "enrollment",
    leadQualification: "graduated",
    audienceProfile: "beginner",
    interestConfirmed: true,
    enrollmentStep: 0,
    enrollmentNotificationSent: true,
    configuredCourseId: "course-1",
    clintDealId: null,
    clintContactId: null,
    clintStageId: null,
    clintSyncStatus: "not_synced",
    wahaSession: "default",
    enrollmentData: {},
    messages,
  };
}

function processorWith(conversation: ConversationContext) {
  const repository = {
    canSendAutomatedMessage: vi.fn().mockResolvedValue(true),
    markOutboundIgnored: vi.fn().mockResolvedValue(undefined),
    claimQueuedMessages: vi.fn().mockResolvedValue(["in-1"]),
    closeConversation: vi.fn().mockImplementation(async () => {
      conversation.status = "closed";
      conversation.botEnabled = false;
    }),
    markMessages: vi.fn().mockResolvedValue(undefined),
    loadConversation: vi.fn().mockResolvedValue(conversation),
    createOutboundMessage: vi.fn().mockResolvedValue("outbound-1"),
    markOutboundSent: vi.fn().mockResolvedValue(undefined),
    markOutboundFailed: vi.fn().mockResolvedValue(undefined),
    recordEvent: vi.fn().mockResolvedValue(undefined),
    getCatalogBinding: vi.fn().mockResolvedValue({ snapshot: { title: "Especialização em Prótese Dentária", area: "Prótese Dentária" } }),
  };
  const queue = {
    cancelFollowUps: vi.fn().mockResolvedValue(0),
    cancelEnrollmentFollowUps: vi.fn().mockResolvedValue(0),
    scheduleEnrollmentFollowUp: vi.fn().mockResolvedValue(undefined),
  };
  const waha = {
    sendText: vi.fn().mockResolvedValue({ providerMessageId: "waha-1" }),
  };
  const agent = { answer: vi.fn() };
  const processor = new ConversationProcessor({
    repository: repository as unknown as SdrRepository,
    conversationQueue: queue as unknown as ConversationQueue,
    waha: waha as unknown as WahaClient,
    agent: agent as unknown as OpenAiAgent,
    notifier: { enabled: false } as EmailNotifier,
    model: "test-model",
    contextMessageLimit: 20,
    developmentAllowedPhoneNumbers: null,
    crm: {} as CrmSyncService,
    crmRetryQueue: {} as CrmRetryQueue,
    enrollmentFollowUpIntervalMs: 4 * 3_600_000,
    enrollmentFollowUpMaxAttempts: 3,
    timeZone: "America/Sao_Paulo",
  });
  return { processor, repository, queue, waha, agent };
}

describe("ConversationProcessor enrollment follow-up", () => {
  it("descarta a resposta da IA preparada enquanto a July assumia", async () => {
    const conversation = context([
      { id: "in-1", direction: "inbound", role: "user", content: "Só consigo conversar amanhã à tarde", status: "processing", createdAt: baseline },
    ]);
    conversation.flowStage = "qualification";
    const setup = processorWith(conversation);
    Object.assign(setup.repository, {
      listActiveKnowledge: vi.fn().mockResolvedValue(["commercial_script", "faq", "audience_matrix"].map(documentType => ({ documentType, metadata: {} }))),
    });
    setup.agent.answer.mockImplementation(async () => {
      setup.repository.canSendAutomatedMessage.mockResolvedValue(false);
      return { text: "Amanhã fico à disposição", confidence: 0.95, shouldHandoff: false };
    });
    await setup.processor.process(conversation.conversationId);
    expect(setup.agent.answer).toHaveBeenCalledOnce();
    expect(setup.waha.sendText).not.toHaveBeenCalled();
    expect(setup.repository.markMessages).toHaveBeenCalledWith(["in-1"], "ignored");
  });

  it("bloqueia o lembrete se a July assume entre a leitura e o envio", async () => {
    const setup = processorWith(context([
      { id: "in-1", direction: "inbound", role: "user", content: "Quero me matricular", status: "sent", createdAt: baseline },
      { id: "out-1", direction: "outbound", role: "assistant", content: "Formulário", status: "sent", createdAt: "2026-08-18T12:01:00.000Z" },
    ]));
    setup.repository.canSendAutomatedMessage.mockResolvedValue(false);
    await setup.processor.sendEnrollmentFollowUp("conversation-1", 1, "pt", baseline);
    expect(setup.waha.sendText).not.toHaveBeenCalled();
    expect(setup.queue.scheduleEnrollmentFollowUp).not.toHaveBeenCalled();
  });
  it("interrompe o roteiro se a July assumiu durante o processamento", async () => {
    const conversation = context([
      { id: "in-1", direction: "inbound", role: "user", content: "Não tenho dúvidas", status: "processing", createdAt: baseline },
    ]);
    conversation.flowStage = "questions";
    const setup = processorWith(conversation);
    Object.assign(setup.repository, {
      listActiveKnowledge: vi.fn().mockResolvedValue(["commercial_script", "faq", "audience_matrix"].map(documentType => ({ documentType, metadata: {} }))),
    });
    setup.repository.canSendAutomatedMessage.mockResolvedValue(false);
    await setup.processor.process(conversation.conversationId);
    expect(setup.waha.sendText).not.toHaveBeenCalled();
    expect(setup.repository.markOutboundIgnored).toHaveBeenCalledWith("outbound-1");
    expect(setup.repository.markMessages).toHaveBeenCalledWith(["in-1"], "ignored");
    expect(setup.queue.scheduleEnrollmentFollowUp).not.toHaveBeenCalled();
  });
  it("encerra o caso do print antes de continuar o roteiro e bloqueia os lembretes", async () => {
    const conversation = context([
      { id: "in-1", direction: "inbound", role: "user", content: "Não, está tudo bem esclarecido \nAgradeço", status: "processing", createdAt: baseline },
    ]);
    conversation.flowStage = "questions";
    const setup = processorWith(conversation);
    await setup.processor.process(conversation.conversationId);
    expect(setup.repository.closeConversation).toHaveBeenCalledWith(conversation.conversationId);
    expect(setup.queue.cancelFollowUps).toHaveBeenCalledWith(conversation.conversationId);
    expect(setup.repository.getCatalogBinding).not.toHaveBeenCalled();
    expect(setup.waha.sendText).toHaveBeenCalledExactlyOnceWith(conversation.whatsappId, "Por nada! Fico à disposição se precisar retomar a conversa.");
    expect(setup.repository.markMessages).toHaveBeenCalledWith(["in-1"], "sent");
    setup.waha.sendText.mockClear();
    // Even a job left in Redis must respect the closed state for its own stage.
    conversation.flowStage = "qualification";
    await setup.processor.sendPreAttendanceFollowUp(conversation.conversationId, "first_contact", baseline);
    conversation.flowStage = "price_match";
    await setup.processor.sendPreAttendanceFollowUp(conversation.conversationId, "after_price", baseline);
    conversation.flowStage = "enrollment";
    await setup.processor.sendEnrollmentFollowUp(conversation.conversationId, 1, "pt", baseline);
    expect(setup.waha.sendText).not.toHaveBeenCalled();
    expect(setup.queue.scheduleEnrollmentFollowUp).not.toHaveBeenCalled();
  });

  it("mantém o encerramento quando a limpeza da fila ou a confirmação falha", async () => {
    const conversation = context([
      { id: "in-1", direction: "inbound", role: "user", content: "Não, está tudo bem esclarecido. Agradeço", status: "processing", createdAt: baseline },
    ]);
    conversation.flowStage = "questions";
    const setup = processorWith(conversation);
    setup.queue.cancelFollowUps.mockRejectedValueOnce(new Error("Redis indisponível"));
    setup.waha.sendText.mockRejectedValueOnce(new Error("WAHA indisponível"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await setup.processor.process(conversation.conversationId);
      expect(conversation.status).toBe("closed");
      expect(conversation.botEnabled).toBe(false);
      expect(setup.repository.markMessages).toHaveBeenCalledWith(["in-1"], "failed", expect.any(String));
      expect(setup.repository.getCatalogBinding).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  it("envia o lembrete após o preço sem nova resposta", async () => {
    const conversation = context([
      { id: "in-1", direction: "inbound", role: "user", content: "Quero só o valor", status: "sent", createdAt: baseline },
      { id: "out-1", direction: "outbound", role: "assistant", content: "25 parcelas. Faz sentido conhecer a proposta?", status: "sent", createdAt: "2026-08-18T12:01:00.000Z" },
    ]);
    conversation.flowStage = "price_match";
    const setup = processorWith(conversation);
    await setup.processor.sendPreAttendanceFollowUp("conversation-1", "after_price", baseline);
    expect(setup.waha.sendText).toHaveBeenCalledWith(conversation.whatsappId, expect.stringContaining("Ainda é uma prioridade"));
  });

  it("cancela o envio comercial se o lead respondeu ou o bot foi interrompido", async () => {
    const conversation = context([
      { id: "out-1", direction: "outbound", role: "assistant", content: "Proposta", status: "sent", createdAt: baseline },
      { id: "in-2", direction: "inbound", role: "user", content: "Sim", status: "sent", createdAt: "2026-08-18T12:02:00.000Z" },
    ]);
    conversation.flowStage = "price_match";
    const setup = processorWith(conversation);
    await setup.processor.sendPreAttendanceFollowUp("conversation-1", "after_price", baseline);
    expect(setup.waha.sendText).not.toHaveBeenCalled();
    conversation.botEnabled = false;
    await setup.processor.sendPreAttendanceFollowUp("conversation-1", "after_price", "2026-08-18T12:02:00.000Z");
    expect(setup.waha.sendText).not.toHaveBeenCalled();
  });

  it("envia a tentativa inicial somente no mesmo dia", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-08-18T16:01:00.000Z"));
      const conversation = context([
        { id: "in-1", direction: "inbound", role: "user", content: "Olá", status: "sent", createdAt: baseline },
        { id: "out-1", direction: "outbound", role: "assistant", content: "Você já é formado?", status: "sent", createdAt: "2026-08-18T12:01:00.000Z" },
      ]);
      conversation.flowStage = "qualification";
      const setup = processorWith(conversation);
      await setup.processor.sendPreAttendanceFollowUp("conversation-1", "first_contact", baseline);
      expect(setup.waha.sendText).toHaveBeenCalledOnce();
      setup.waha.sendText.mockClear();
      vi.setSystemTime(new Date("2026-08-19T16:01:00.000Z"));
      await setup.processor.sendPreAttendanceFollowUp("conversation-1", "first_contact", baseline);
      expect(setup.waha.sendText).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it("envia o lembrete e agenda a próxima tentativa", async () => {
    const setup = processorWith(context([
      { id: "in-1", direction: "inbound", role: "user", content: "Quero me matricular", status: "sent", createdAt: baseline },
      { id: "out-1", direction: "outbound", role: "assistant", content: "Formulário", status: "sent", createdAt: "2026-08-18T12:01:00.000Z" },
    ]));

    await setup.processor.sendEnrollmentFollowUp("conversation-1", 1, "pt", baseline);

    expect(setup.waha.sendText).toHaveBeenCalledWith(
      "556299999999@c.us",
      "Vamos prosseguir com a sua matrícula?",
    );
    expect(setup.queue.scheduleEnrollmentFollowUp).toHaveBeenCalledWith(
      "conversation-1",
      expect.any(Number),
      2,
      "pt",
      baseline,
    );
  });

  it("não envia se o lead respondeu depois do agendamento", async () => {
    const setup = processorWith(context([
      { id: "out-1", direction: "outbound", role: "assistant", content: "Formulário", status: "sent", createdAt: "2026-08-18T12:01:00.000Z" },
      { id: "in-2", direction: "inbound", role: "user", content: "Vou preencher", status: "sent", createdAt: "2026-08-18T12:02:00.000Z" },
    ]));

    await setup.processor.sendEnrollmentFollowUp("conversation-1", 1, "pt", baseline);

    expect(setup.waha.sendText).not.toHaveBeenCalled();
    expect(setup.queue.scheduleEnrollmentFollowUp).not.toHaveBeenCalled();
  });
});
