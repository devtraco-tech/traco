import type { CatalogItemSnapshot } from "../domain/catalog.js";
import type { FlowPatch } from "../domain/commercial-flow.js";
import type { ConversationContext, EnrollmentData, HandoffReason } from "../domain/types.js";
import type {
  KommoClient,
  KommoRuntimeConfiguration,
  KommoStageConfiguration,
} from "../infra/kommo-client.js";
import type { SdrRepository } from "../infra/supabase-repository.js";

const HANDOFF_REASON_LABELS: Record<HandoffReason, string> = {
  explicit_request: "O lead pediu para falar com uma pessoa",
  unknown_answer: "O SDR não encontrou uma resposta segura",
  ai_unavailable: "A inteligência artificial está indisponível",
  waha_unavailable: "O WhatsApp está indisponível",
  commercial_high_intent: "Intenção comercial que exige atendimento humano",
  sensitive_topic: "Assunto sensível",
  repeated_failure: "Falha repetida no processamento",
  manual: "Encaminhamento manual",
  other: "Outro motivo",
};

export class KommoSyncService {
  constructor(
    private readonly client: KommoClient,
    private readonly repository: SdrRepository,
    private readonly initialConfiguration: KommoRuntimeConfiguration,
    private readonly configurationProvider?: () => Promise<KommoRuntimeConfiguration | null>,
  ) {}

  async syncFlow(
    context: ConversationContext,
    patch: FlowPatch | undefined,
    course: CatalogItemSnapshot,
    enrollmentData?: EnrollmentData,
  ): Promise<void> {
    const configuration = await this.getConfiguration();
    const client = this.client.withStages(configuration.stages);
    const targetStatusIds = this.statusesForPatch(patch, configuration.stages);
    if (targetStatusIds.length === 0) return;
    let leadId: number | null = null;
    for (const targetStatusId of targetStatusIds) {
      leadId = await this.sync(client, configuration.stages, context, course, targetStatusId);
    }
    if (leadId && enrollmentData) {
      await client.updateEnrollmentFields(leadId, enrollmentData, configuration.enrollmentFields);
    }
  }

  async syncHandoff(
    context: ConversationContext,
    course: CatalogItemSnapshot,
    reason: HandoffReason,
  ): Promise<void> {
    const configuration = await this.getConfiguration();
    const client = this.client.withStages(configuration.stages);
    const leadId = await this.sync(
      client,
      configuration.stages,
      context,
      course,
      configuration.stages.handoffStatusId,
    );
    const lastInboundMessage = [...context.messages]
      .reverse()
      .find((message) => message.direction === "inbound")
      ?.content.trim() || "Não disponível";
    await client.prepareHumanHandoff(leadId, {
      responsibleUserId: configuration.handoff.responsibleUserId,
      taskTypeId: configuration.handoff.taskTypeId,
      deadlineMinutes: configuration.handoff.deadlineMinutes,
      taskText: "Assumir atendimento do SDR",
      requestId: `handoff-${context.conversationId}`,
      noteText: [
        "Atendimento humano solicitado pelo Robô SDR",
        `Nome: ${context.displayName?.trim() || "Não informado"}`,
        `Telefone: ${context.phoneE164}`,
        `Curso: ${course.title}`,
        `Motivo: ${HANDOFF_REASON_LABELS[reason]}`,
        `Última mensagem: ${lastInboundMessage.slice(0, 1_000)}`,
        `Conversa: ${context.conversationId}`,
      ].join("\n"),
    });
  }

  async restoreHandoffStage(
    context: ConversationContext,
    course: CatalogItemSnapshot,
  ): Promise<void> {
    const configuration = await this.getConfiguration();
    await this.sync(
      this.client.withStages(configuration.stages),
      configuration.stages,
      context,
      course,
      configuration.stages.handoffStatusId,
    );
  }

  private statusesForPatch(
    patch: FlowPatch | undefined,
    stages: KommoStageConfiguration,
  ): number[] {
    if (!patch) return [];
    if (patch.flowStage === "qualification") return [stages.newLeadStatusId];
    if (patch.flowStage === "completed") return [stages.dataCollectedStatusId];
    if (patch.flowStage === "enrollment") {
      return [stages.interestedStatusId, stages.negotiationStatusId];
    }
    if (patch.leadQualification === "graduated") {
      return [stages.qualifiedStatusId];
    }
    return [];
  }

  private async sync(
    client: KommoClient,
    stages: KommoStageConfiguration,
    context: ConversationContext,
    course: CatalogItemSnapshot,
    targetStatusId: number,
  ): Promise<number> {
    if (context.kommoLeadId) {
      if (context.kommoStatusId !== targetStatusId) {
        await client.updateLeadStage(context.kommoLeadId, targetStatusId);
      }
      await this.repository.saveKommoSync(context.conversationId, {
        leadId: context.kommoLeadId,
        statusId: targetStatusId,
      });
      return context.kommoLeadId;
    }

    const result = await client.ensureLead({
      name: context.displayName?.trim() || "Lead WhatsApp",
      phoneE164: context.phoneE164,
      courseTitle: course.title,
      conversationId: context.conversationId,
      statusId: targetStatusId,
    });
    // O controle de duplicatas pode reaproveitar o lead criado no teste manual.
    // Nesse caso, garantimos explicitamente a etapa esperada do fluxo atual.
    if (result.merged) {
      await client.updateLeadStage(result.leadId, targetStatusId);
    }
    await this.repository.saveKommoSync(context.conversationId, {
      leadId: result.leadId,
      contactId: result.contactId,
      statusId: targetStatusId,
    });
    return result.leadId;
  }

  private async getConfiguration(): Promise<KommoRuntimeConfiguration> {
    return (await this.configurationProvider?.()) ?? this.initialConfiguration;
  }
}
