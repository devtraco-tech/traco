import type { CatalogItemSnapshot } from "../domain/catalog.js";
import type { FlowPatch } from "../domain/commercial-flow.js";
import type { ConversationContext, EnrollmentData, HandoffReason } from "../domain/types.js";
import type { ClintClient, ClintRuntimeConfiguration, ClintStageConfiguration } from "../infra/clint-client.js";
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

export class ClintSyncService {
  constructor(
    private readonly client: ClintClient,
    private readonly repository: SdrRepository,
    private readonly configuration: ClintRuntimeConfiguration,
  ) {}

  async syncFlow(
    context: ConversationContext,
    patch: FlowPatch | undefined,
    course: CatalogItemSnapshot,
    enrollmentData?: EnrollmentData,
    notifyEnrollment = false,
  ): Promise<void> {
    const targetStageIds = this.stagesForPatch(patch, this.configuration.stages);
    if (targetStageIds.length === 0) return;
    let dealId: string | null = null;
    for (const targetStageId of targetStageIds) {
      dealId = await this.sync(context, course, targetStageId);
    }
    if (dealId && enrollmentData) {
      await this.client.updateEnrollmentFields(dealId, enrollmentData, this.configuration.enrollmentFields);
    }
    if (dealId && notifyEnrollment) {
      await this.client.prepareHumanHandoff(dealId, {
        ...this.configuration.handoff,
        noteText: `Lead interessado em iniciar matrícula. Conversa: ${context.conversationId}`,
      });
    }
  }

  async syncHandoff(
    context: ConversationContext,
    course: CatalogItemSnapshot,
    reason: HandoffReason,
    details?: string,
  ): Promise<void> {
    const dealId = await this.sync(context, course, this.configuration.stages.handoffStageId);
    const lastInbound = [...context.messages].reverse()
      .find((message) => message.direction === "inbound")?.content.trim() || "Não disponível";
    await this.client.prepareHumanHandoff(dealId, {
      ...this.configuration.handoff,
      noteText: [
        "Atendimento humano solicitado pelo Robô SDR",
        `Nome: ${context.displayName?.trim() || "Não informado"}`,
        `Telefone: ${context.phoneE164}`,
        `Curso: ${course.title}`,
        `Motivo: ${HANDOFF_REASON_LABELS[reason]}`,
        ...(details ? [`Detalhes: ${details}`] : []),
        `Última mensagem: ${lastInbound.slice(0, 1_000)}`,
        `Conversa: ${context.conversationId}`,
      ].join("\n"),
    });
  }

  async restoreHandoffStage(context: ConversationContext, course: CatalogItemSnapshot): Promise<void> {
    await this.sync(context, course, this.configuration.stages.handoffStageId);
  }

  private stagesForPatch(patch: FlowPatch | undefined, stages: ClintStageConfiguration): string[] {
    if (!patch) return [];
    if (patch.flowStage === "qualification") return [stages.newLeadStageId];
    if (patch.flowStage === "completed") return [stages.dataCollectedStageId];
    if (patch.flowStage === "enrollment") return [stages.interestedStageId, stages.negotiationStageId];
    if (patch.leadQualification === "graduated") return [stages.qualifiedStageId];
    return [];
  }

  private async sync(
    context: ConversationContext,
    course: CatalogItemSnapshot,
    targetStageId: string,
  ): Promise<string> {
    if (context.clintDealId) {
      if (context.clintStageId !== targetStageId) {
        await this.client.updateDealStage(context.clintDealId, targetStageId);
      }
      await this.repository.saveClintSync(context.conversationId, {
        dealId: context.clintDealId,
        stageId: targetStageId,
      });
      return context.clintDealId;
    }
    const result = await this.client.ensureDeal({
      name: context.displayName?.trim() || "Lead WhatsApp",
      phoneE164: context.phoneE164,
      courseTitle: course.title,
      stageId: targetStageId,
    });
    if (result.merged) await this.client.updateDealStage(result.dealId, targetStageId);
    await this.repository.saveClintSync(context.conversationId, {
      dealId: result.dealId,
      contactId: result.contactId,
      stageId: targetStageId,
    });
    return result.dealId;
  }
}
