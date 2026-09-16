import { describe, expect, it, vi } from "vitest";
import type { ConversationContext } from "../domain/types.js";
import type { OpenAiAgent } from "../infra/openai-agent.js";
import type { EmailNotifier } from "../infra/notifier.js";
import type { ConversationQueue, CrmRetryQueue } from "../infra/queue.js";
import type { SdrRepository } from "../infra/supabase-repository.js";
import type { WahaClient } from "../infra/waha-client.js";
import type { CrmSyncService } from "./crm-sync.js";
import { ConversationProcessor, requestsCoursePdf } from "./process-conversation.js";

const conversation: ConversationContext = {
  conversationId: "conversation-1",
  leadId: "lead-1",
  whatsappId: "556299999999@c.us",
  phoneE164: "+556299999999",
  displayName: "Victor",
  status: "bot_active",
  botEnabled: true,
  flowStage: "match",
  leadQualification: "graduated",
  audienceProfile: "beginner",
  interestConfirmed: null,
  enrollmentStep: 0,
  enrollmentNotificationSent: false,
  configuredCourseId: "course-1",
  clintDealId: null,
  clintContactId: null,
  clintStageId: null,
  clintSyncStatus: "not_synced",
  wahaSession: "default",
  enrollmentData: {},
  messages: [{
    id: "in-1", direction: "inbound", role: "user", content: "Pode me enviar o PDF?",
    status: "processing", createdAt: "2026-09-15T12:00:00.000Z",
  }],
};

function setup(
  pdfUrl: string | null,
  contextOverrides: Partial<ConversationContext> = {},
  snapshot: Record<string, unknown> = { id: "course-1", title: "Curso" },
) {
  const testConversation = { ...conversation, ...contextOverrides };
  const repository = {
    claimQueuedMessages: vi.fn().mockResolvedValue(["in-1"]),
    loadConversation: vi.fn().mockResolvedValue(testConversation),
    getCatalogBinding: vi.fn().mockResolvedValue({
      itemId: "course-1", slug: "curso", snapshot,
      syncedAt: "2026-09-15T12:00:00.000Z",
    }),
    listActiveKnowledge: vi.fn().mockResolvedValue([
      { documentType: "commercial_script", title: "Script", content: "x", sourceUrl: null, metadata: {} },
      { documentType: "faq", title: "FAQ", content: "x", sourceUrl: null, metadata: {} },
      { documentType: "audience_matrix", title: "Matriz", content: "x", sourceUrl: null, metadata: {} },
      { documentType: "pdf", title: "Folder Curso", content: "x", sourceUrl: pdfUrl, metadata: {} },
    ]),
    recordEvent: vi.fn().mockResolvedValue(undefined),
    createOutboundMessage: vi.fn().mockResolvedValue("out-1"),
    markOutboundSent: vi.fn().mockResolvedValue(undefined),
    markOutboundFailed: vi.fn().mockResolvedValue(undefined),
    markMessages: vi.fn().mockResolvedValue(undefined),
    updateFlowState: vi.fn().mockResolvedValue(undefined),
  };
  const waha = {
    sendFile: vi.fn().mockResolvedValue({ providerMessageId: "waha-pdf-1" }),
    sendText: vi.fn().mockResolvedValue({ providerMessageId: "waha-text-1" }),
  };
  const processor = new ConversationProcessor({
    repository: repository as unknown as SdrRepository,
    waha: waha as unknown as WahaClient,
    agent: {} as OpenAiAgent,
    notifier: { enabled: false } as EmailNotifier,
    model: "test-model",
    contextMessageLimit: 20,
    developmentAllowedPhoneNumbers: null,
    crm: { syncFlow: vi.fn().mockResolvedValue(undefined) } as unknown as CrmSyncService,
    crmRetryQueue: {} as CrmRetryQueue,
    conversationQueue: {} as ConversationQueue,
    enrollmentFollowUpIntervalMs: 14_400_000,
    enrollmentFollowUpMaxAttempts: 3,
    timeZone: "America/Sao_Paulo",
  });
  return { processor, repository, waha };
}

describe("envio do PDF do curso", () => {
  it.each([
    "Pode me enviar o PDF?",
    "Vocês têm o folder do curso?",
    "Can you send me the course brochure?",
    "Quiero recibir el material del curso",
  ])("reconhece o pedido: %s", (message) => {
    expect(requestsCoursePdf(message)).toBe(true);
  });

  it("envia o documento configurado e registra a saída", async () => {
    const { processor, repository, waha } = setup("https://files.example.com/curso.pdf");

    await processor.process("conversation-1");

    expect(waha.sendFile).toHaveBeenCalledWith(
      "556299999999@c.us",
      {
        url: "https://files.example.com/curso.pdf",
        filename: "Folder Curso.pdf",
        mimetype: "application/pdf",
      },
      "Segue o PDF com as informações do curso.",
    );
    expect(repository.markOutboundSent).toHaveBeenCalledWith("out-1", "waha-pdf-1");
    expect(repository.markMessages).toHaveBeenCalledWith(["in-1"], "sent");
  });

  it("explica a indisponibilidade quando não existe URL configurada", async () => {
    const { processor, waha } = setup(null);

    await processor.process("conversation-1");

    expect(waha.sendFile).not.toHaveBeenCalled();
    expect(waha.sendText).toHaveBeenCalledOnce();
  });

  it("envia automaticamente o projeto entre a apresentação e a pergunta de continuidade", async () => {
    const messages: ConversationContext["messages"] = [{
      id: "in-1",
      direction: "inbound",
      role: "user",
      content: "Quero desenvolver mais segurança clínica",
      status: "processing",
      createdAt: "2026-09-15T12:00:00.000Z",
    }];
    const { processor, repository, waha } = setup(
      "https://files.example.com/protese.pdf",
      { flowStage: "profile", audienceProfile: "beginner", messages },
      {
        id: "course-1",
        title: "Especialização em Prótese Dentária",
        slug: "especializacao-em-protese-dentaria",
        area: "Prótese Dentária",
      },
    );

    await processor.process("conversation-1");

    expect(waha.sendText).toHaveBeenCalledTimes(3);
    expect(waha.sendFile).toHaveBeenCalledOnce();
    const firstTextOrder = waha.sendText.mock.invocationCallOrder[0]!;
    const pdfOrder = waha.sendFile.mock.invocationCallOrder[0]!;
    const finalTextOrder = waha.sendText.mock.invocationCallOrder[2]!;
    expect(firstTextOrder).toBeLessThan(pdfOrder);
    expect(pdfOrder).toBeLessThan(finalTextOrder);
    expect(waha.sendText.mock.calls[2]?.[1]).toContain("faz sentido seguirmos");
    expect(repository.updateFlowState).toHaveBeenCalledWith(
      "conversation-1",
      { flowStage: "match" },
    );
  });
});
