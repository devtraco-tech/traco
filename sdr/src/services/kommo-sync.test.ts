import { describe, expect, it, vi } from "vitest";
import type { ConversationContext } from "../domain/types.js";
import type { CatalogItemSnapshot } from "../domain/catalog.js";
import type { KommoStageConfiguration } from "../infra/kommo-client.js";
import { KommoSyncService } from "./kommo-sync.js";

const stages: KommoStageConfiguration = {
  pipelineId: 100,
  newLeadStatusId: 201,
  qualifiedStatusId: 202,
  interestedStatusId: 204,
  negotiationStatusId: 203,
  handoffStatusId: 205,
  dataCollectedStatusId: 206,
};
const fields = {
  full_name: 301,
  whatsapp_phone: 302,
  cpf: 303,
  birth_date: 304,
  marital_status: 305,
  nationality: 306,
  birthplace: 307,
  cro: 308,
  email: 309,
  address: 310,
  district: 311,
  postal_code: 312,
};
const handoff = {
  responsibleUserId: 501,
  taskTypeId: 1,
  deadlineMinutes: 5,
};
const runtime = { stages, enrollmentFields: fields, handoff };
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
  kommoLeadId: null,
  kommoContactId: null,
  kommoStatusId: null,
  kommoSyncStatus: "not_synced",
  wahaSession: "default",
  enrollmentData: {},
  messages: [],
};
const course = { id: "course-1", title: "Curso Teste" } as CatalogItemSnapshot;

describe("KommoSyncService", () => {
  it("cria o lead diretamente como qualificado", async () => {
    const client = {
      withStages: vi.fn().mockReturnThis(),
      ensureLead: vi.fn().mockResolvedValue({ leadId: 300, contactId: 400, merged: false }),
      updateLeadStage: vi.fn(),
    };
    const repository = { saveKommoSync: vi.fn() };
    const service = new KommoSyncService(client as never, repository as never, runtime);

    await service.syncFlow(context, {
      flowStage: "profile",
      leadQualification: "graduated",
    }, course);

    expect(client.ensureLead).toHaveBeenCalledWith(expect.objectContaining({
      statusId: stages.qualifiedStatusId,
      conversationId: context.conversationId,
    }));
    expect(repository.saveKommoSync).toHaveBeenCalledWith(context.conversationId, {
      leadId: 300,
      contactId: 400,
      statusId: stages.qualifiedStatusId,
    });
  });

  it("move o mesmo lead para matrícula sem criar outro", async () => {
    const linked = {
      ...context,
      kommoLeadId: 300,
      kommoContactId: 400,
      kommoStatusId: stages.qualifiedStatusId,
      kommoSyncStatus: "synced" as const,
    };
    const client = { withStages: vi.fn().mockReturnThis(), ensureLead: vi.fn(), updateLeadStage: vi.fn() };
    const repository = { saveKommoSync: vi.fn() };
    const service = new KommoSyncService(client as never, repository as never, runtime);

    await service.syncFlow(linked, { flowStage: "enrollment" }, course);

    expect(client.ensureLead).not.toHaveBeenCalled();
    expect(client.updateLeadStage).toHaveBeenNthCalledWith(1, 300, stages.interestedStatusId);
    expect(client.updateLeadStage).toHaveBeenNthCalledWith(2, 300, stages.negotiationStatusId);
  });

  it("notifica o responsável antes da coleta dos dados sem fazer handoff", async () => {
    const linked = {
      ...context,
      kommoLeadId: 300,
      kommoContactId: 400,
      kommoStatusId: stages.qualifiedStatusId,
      kommoSyncStatus: "synced" as const,
    };
    const client = {
      withStages: vi.fn().mockReturnThis(),
      ensureLead: vi.fn(),
      updateLeadStage: vi.fn(),
      notifyResponsible: vi.fn(),
      prepareHumanHandoff: vi.fn(),
    };
    const repository = { saveKommoSync: vi.fn() };
    const service = new KommoSyncService(client as never, repository as never, runtime);

    await service.syncFlow(linked, { flowStage: "enrollment" }, course, undefined, true);

    expect(client.notifyResponsible).toHaveBeenCalledWith(300, expect.objectContaining({
      responsibleUserId: 501,
      taskTypeId: 1,
      taskText: "Lead interessado em iniciar matrícula",
      requestId: "enrollment-data-request-conversation-1",
      noteText: expect.stringContaining("Lead demonstrou interesse em iniciar"),
    }));
    expect(client.prepareHumanHandoff).not.toHaveBeenCalled();
  });

  it("move handoff para atendimento humano", async () => {
    const linked = { ...context, kommoLeadId: 300 };
    const client = {
      withStages: vi.fn().mockReturnThis(),
      ensureLead: vi.fn(),
      updateLeadStage: vi.fn(),
      prepareHumanHandoff: vi.fn(),
    };
    const repository = { saveKommoSync: vi.fn() };
    const service = new KommoSyncService(client as never, repository as never, runtime);

    await service.syncHandoff(linked, course, "explicit_request");

    expect(client.updateLeadStage).toHaveBeenCalledWith(300, stages.handoffStatusId);
    expect(client.prepareHumanHandoff).toHaveBeenCalledWith(300, expect.objectContaining({
      responsibleUserId: 501,
      taskTypeId: 1,
      deadlineMinutes: 5,
      taskText: "Assumir atendimento do SDR",
      noteText: expect.stringContaining("Lead Teste"),
    }));
  });

  it("reposiciona um lead reaproveitado pelo controle de duplicatas", async () => {
    const client = {
      withStages: vi.fn().mockReturnThis(),
      ensureLead: vi.fn().mockResolvedValue({ leadId: 300, contactId: 400, merged: true }),
      updateLeadStage: vi.fn(),
    };
    const repository = { saveKommoSync: vi.fn() };
    const service = new KommoSyncService(client as never, repository as never, runtime);

    await service.syncFlow(context, {
      flowStage: "profile",
      leadQualification: "graduated",
    }, course);

    expect(client.updateLeadStage).toHaveBeenCalledWith(300, stages.qualifiedStatusId);
    expect(repository.saveKommoSync).toHaveBeenCalledWith(context.conversationId, {
      leadId: 300,
      contactId: 400,
      statusId: stages.qualifiedStatusId,
    });
  });
});
