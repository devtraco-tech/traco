import { describe, expect, it, vi } from "vitest";
import type { CatalogItemSnapshot } from "../domain/catalog.js";
import type { ConversationContext } from "../domain/types.js";
import type { ClintRuntimeConfiguration } from "../infra/clint-client.js";
import { ClintSyncService } from "./clint-sync.js";

const id = (prefix: number, suffix: number) =>
  `${prefix}0000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
const stages = {
  originId: id(1, 1),
  newLeadStageId: id(2, 1),
  qualifiedStageId: id(2, 2),
  interestedStageId: id(2, 3),
  negotiationStageId: id(2, 4),
  dataCollectedStageId: id(2, 5),
  handoffStageId: id(2, 6),
};
const fieldNames = [
  "full_name", "whatsapp_phone", "cpf", "birth_date", "marital_status", "nationality",
  "birthplace", "cro", "email", "address", "district", "postal_code",
] as const;
const runtime: ClintRuntimeConfiguration = {
  stages,
  enrollmentFields: Object.fromEntries(
    fieldNames.map((name, index) => [name, id(6, index + 1)]),
  ) as ClintRuntimeConfiguration["enrollmentFields"],
  handoff: { responsibleUserId: id(5, 1), noteFieldId: id(6, 20) },
};
const context: ConversationContext = {
  conversationId: "conversation-1",
  leadId: "lead-1",
  whatsappId: "5562999999999@c.us",
  phoneE164: "+5562999999999",
  displayName: "Lead Teste",
  status: "bot_active",
  botEnabled: true,
  flowStage: "qualification",
  leadQualification: "unknown",
  audienceProfile: "unknown",
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
  messages: [],
};
const course = { id: "course-1", title: "Curso Teste" } as CatalogItemSnapshot;

describe("ClintSyncService", () => {
  it("cria e vincula o negócio qualificado", async () => {
    const client = {
      ensureDeal: vi.fn().mockResolvedValue({ dealId: id(3, 1), contactId: id(4, 1), merged: false }),
      updateDealStage: vi.fn(),
      updateEnrollmentFields: vi.fn(),
      prepareHumanHandoff: vi.fn(),
    };
    const repository = { saveClintSync: vi.fn() };
    const service = new ClintSyncService(client as never, repository as never, runtime);

    await service.syncFlow(context, { flowStage: "profile", leadQualification: "graduated" }, course);

    expect(client.ensureDeal).toHaveBeenCalledWith(expect.objectContaining({
      stageId: stages.qualifiedStageId,
      phoneE164: context.phoneE164,
      contactName: context.displayName,
    }));
    expect(repository.saveClintSync).toHaveBeenCalledWith(context.conversationId, {
      dealId: id(3, 1),
      contactId: id(4, 1),
      stageId: stages.qualifiedStageId,
    });
  });

  it("move um negócio existente para handoff e atribui responsável", async () => {
    const linked = { ...context, clintDealId: id(3, 1), clintStageId: stages.qualifiedStageId };
    const client = {
      ensureDeal: vi.fn(),
      syncContactName: vi.fn().mockResolvedValue(id(4, 1)),
      updateDealStage: vi.fn(),
      prepareHumanHandoff: vi.fn(),
    };
    const repository = { saveClintSync: vi.fn() };
    const service = new ClintSyncService(client as never, repository as never, runtime);

    await service.syncHandoff(linked, course, "explicit_request");

    expect(client.syncContactName).toHaveBeenCalledWith({
      contactId: context.clintContactId,
      phoneE164: context.phoneE164,
      name: context.displayName,
    });
    expect(client.updateDealStage).toHaveBeenCalledWith(id(3, 1), stages.handoffStageId);
    expect(client.prepareHumanHandoff).toHaveBeenCalledWith(id(3, 1), expect.objectContaining({
      responsibleUserId: runtime.handoff.responsibleUserId,
      noteText: expect.stringContaining("Atendimento humano solicitado"),
    }));
  });
});
