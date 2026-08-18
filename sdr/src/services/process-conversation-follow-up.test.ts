import { describe, expect, it, vi } from "vitest";
import type { ConversationContext } from "../domain/types.js";
import type { SdrRepository } from "../infra/supabase-repository.js";
import type { ConversationQueue, KommoRetryQueue } from "../infra/queue.js";
import type { OpenAiAgent } from "../infra/openai-agent.js";
import type { EmailNotifier } from "../infra/notifier.js";
import type { WahaClient } from "../infra/waha-client.js";
import { ConversationProcessor } from "./process-conversation.js";

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
    kommoLeadId: null,
    kommoContactId: null,
    kommoStatusId: null,
    kommoSyncStatus: "not_synced",
    wahaSession: "default",
    enrollmentData: {},
    messages,
  };
}

function processorWith(conversation: ConversationContext) {
  const repository = {
    loadConversation: vi.fn().mockResolvedValue(conversation),
    createOutboundMessage: vi.fn().mockResolvedValue("outbound-1"),
    markOutboundSent: vi.fn().mockResolvedValue(undefined),
    recordEvent: vi.fn().mockResolvedValue(undefined),
  };
  const queue = {
    cancelEnrollmentFollowUps: vi.fn().mockResolvedValue(0),
    scheduleEnrollmentFollowUp: vi.fn().mockResolvedValue(undefined),
  };
  const waha = {
    sendText: vi.fn().mockResolvedValue({ providerMessageId: "waha-1" }),
  };
  const processor = new ConversationProcessor({
    repository: repository as unknown as SdrRepository,
    conversationQueue: queue as unknown as ConversationQueue,
    waha: waha as unknown as WahaClient,
    agent: {} as OpenAiAgent,
    notifier: { enabled: false } as EmailNotifier,
    model: "test-model",
    contextMessageLimit: 20,
    developmentAllowedPhoneNumbers: null,
    kommo: null,
    kommoRetryQueue: null as KommoRetryQueue | null,
    enrollmentFollowUpIntervalMs: 4 * 3_600_000,
    enrollmentFollowUpMaxAttempts: 3,
    timeZone: "America/Sao_Paulo",
  });
  return { processor, repository, queue, waha };
}

describe("ConversationProcessor enrollment follow-up", () => {
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
