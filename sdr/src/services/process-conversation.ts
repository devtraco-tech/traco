import { evaluateHandoff, shouldInterruptCurrentFlow } from "../domain/handoff.js";
import {
  decideCommercialFlow,
  type CommercialFlowDecision,
} from "../domain/commercial-flow.js";
import type { HandoffReason } from "../domain/types.js";
import type { OpenAiAgent } from "../infra/openai-agent.js";
import type { EmailNotifier } from "../infra/notifier.js";
import type { SdrRepository } from "../infra/supabase-repository.js";
import type { WahaClient } from "../infra/waha-client.js";
import type { KommoRetryQueue } from "../infra/queue.js";
import { isPhoneAllowed } from "../domain/phone-allowlist.js";
import type { CatalogItemSnapshot } from "../domain/catalog.js";
import type { KommoSyncService } from "./kommo-sync.js";

type Dependencies = {
  repository: SdrRepository;
  agent: OpenAiAgent;
  waha: WahaClient;
  notifier: EmailNotifier;
  model: string;
  contextMessageLimit: number;
  developmentAllowedPhoneNumbers: string[] | null;
  kommo: KommoSyncService | null;
  kommoRetryQueue: KommoRetryQueue | null;
};

const HANDOFF_ACK =
  "Entendi. Vou encaminhar sua conversa para uma pessoa do nosso time, que continuará o atendimento por aqui.";

export class ConversationProcessor {
  constructor(private readonly dependencies: Dependencies) {}

  async process(conversationId: string): Promise<void> {
    const { repository } = this.dependencies;
    const claimedIds = await repository.claimQueuedMessages(conversationId);
    if (claimedIds.length === 0) return;

    const context = await repository.loadConversation(
      conversationId,
      this.dependencies.contextMessageLimit,
    );

    if (
      this.dependencies.developmentAllowedPhoneNumbers &&
      !isPhoneAllowed(
        context.phoneE164,
        this.dependencies.developmentAllowedPhoneNumbers,
      )
    ) {
      await repository.markMessages(claimedIds, "ignored");
      return;
    }

    if (!context.botEnabled || context.status !== "bot_active") {
      await repository.markMessages(claimedIds, "ignored");
      return;
    }

    const courseBinding = await repository.getCatalogBinding(context.wahaSession);
    if (!courseBinding) {
      await repository.markMessages(claimedIds, "failed", "Nenhum item de catálogo vinculado");
      await this.handoff(context, "unknown_answer", "Nenhum item de catálogo está vinculado ao SDR", true);
      return;
    }

    const knowledge = await repository.listActiveKnowledge(context.wahaSession);
    const requiredTraining = ["commercial_script", "faq", "audience_matrix"];
    const missingTraining = requiredTraining.filter(
      (type) => !knowledge.some((document) => document.documentType === type),
    );
    if (missingTraining.length > 0) {
      const details = `Treinamento incompleto: ${missingTraining.join(", ")}`;
      await repository.markMessages(claimedIds, "failed", details);
      await this.handoff(context, "unknown_answer", details, true, courseBinding.snapshot);
      return;
    }

    await repository.recordEvent("processing_started", conversationId, context.leadId, {
      message_ids: claimedIds,
    });

    const currentText = context.messages
      .filter((message) => claimedIds.includes(message.id))
      .map((message) => message.content)
      .join("\n");

    const deterministicHandoff = evaluateHandoff(currentText);
    if (
      shouldInterruptCurrentFlow(deterministicHandoff)
      && deterministicHandoff.reason
    ) {
      await this.handoff(
        context,
        deterministicHandoff.reason,
        `Regra prioritária acionada pela mensagem: ${currentText.slice(0, 300)}`,
        true,
        courseBinding.snapshot,
      );
      await repository.markMessages(claimedIds, "sent");
      return;
    }

    let flowDecision: CommercialFlowDecision;
    try {
      flowDecision = decideCommercialFlow(context, currentText, courseBinding.snapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await repository.markMessages(claimedIds, "failed", message);
      await this.handoff(
        context,
        "repeated_failure",
        `Falha inesperada no fluxo comercial: ${message}`,
        true,
        courseBinding.snapshot,
      );
      return;
    }
    if (flowDecision.handled) {
      try {
        const scriptVersion = knowledge
          .find((document) => document.documentType === "commercial_script")
          ?.metadata?.version;
        await this.sendMessages(
          context,
          flowDecision.messages,
          `script:${typeof scriptVersion === "string" ? scriptVersion : "configured"}`,
        );

        if (flowDecision.enrollmentData) {
          await repository.markMessagesContainingPersonalData(claimedIds);
          await repository.saveEnrollmentData(
            conversationId,
            flowDecision.enrollmentData,
            flowDecision.patch?.flowStage === "completed",
          );
        }

        if (flowDecision.patch) {
          await repository.updateFlowState(conversationId, flowDecision.patch);
        }

        await this.syncKommoFlowSafely(
          context,
          flowDecision,
          courseBinding.snapshot,
        );

        if (flowDecision.handoffAfterFlow) {
          await this.handoff(
            context,
            flowDecision.handoffAfterFlow.reason,
            flowDecision.handoffAfterFlow.details,
            false,
            courseBinding.snapshot,
          );
        }

        await repository.markMessages(claimedIds, "sent");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await repository.markMessages(claimedIds, "failed", message);
        await this.handoff(context, "waha_unavailable", message, false, courseBinding.snapshot);
      }
      return;
    }

    if (deterministicHandoff.shouldHandoff && deterministicHandoff.reason) {
      await this.handoff(
        context,
        deterministicHandoff.reason,
        `Regra automática acionada pela mensagem: ${currentText.slice(0, 300)}`,
        true,
        courseBinding.snapshot,
      );
      await repository.markMessages(claimedIds, "sent");
      return;
    }

    try {
      const answer = await this.dependencies.agent.answer(context, [courseBinding.snapshot], knowledge);

      if (answer.shouldHandoff || answer.confidence < 0.55) {
        await this.handoff(
          context,
          "unknown_answer",
          answer.handoffReason ?? `Confiança baixa: ${answer.confidence}`,
          true,
          courseBinding.snapshot,
        );
        await repository.markMessages(claimedIds, "sent");
        return;
      }

      try {
        await this.sendMessages(context, [answer.text]);
        await repository.markMessages(claimedIds, "sent");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await repository.markMessages(claimedIds, "failed", message);
        await this.handoff(context, "waha_unavailable", message, false, courseBinding.snapshot);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await repository.markMessages(claimedIds, "failed", message);
      await this.handoff(context, "ai_unavailable", message, false, courseBinding.snapshot);
    }
  }

  private async sendMessages(
    context: Awaited<ReturnType<SdrRepository["loadConversation"]>>,
    messages: string[],
    responseSource = this.dependencies.model,
  ): Promise<void> {
    const { repository, waha } = this.dependencies;
    for (const text of messages) {
      const outboundId = await repository.createOutboundMessage(
        context.conversationId,
        text,
        responseSource,
      );
      try {
        const result = await waha.sendText(context.whatsappId, text);
        await repository.markOutboundSent(outboundId, result.providerMessageId);
        await repository.recordEvent(
          "response_sent",
          context.conversationId,
          context.leadId,
          { message_id: outboundId, model: responseSource },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await repository.markOutboundFailed(outboundId, message);
        throw error;
      }
    }
  }

  private async handoff(
    context: Awaited<ReturnType<SdrRepository["loadConversation"]>>,
    reason: HandoffReason,
    details: string,
    acknowledgeLead: boolean,
    course?: CatalogItemSnapshot,
  ): Promise<void> {
    const { repository, notifier, waha } = this.dependencies;
    await repository.requestHandoff(context.conversationId, reason, details);
    if (course) {
      await this.syncKommoHandoffSafely(context, course, reason);
    }

    if (acknowledgeLead) {
      try {
        await waha.sendText(context.whatsappId, HANDOFF_ACK);
      } catch {
        // O handoff e a notificação continuam válidos mesmo se o WAHA estiver
        // temporariamente indisponível para enviar a confirmação ao lead.
      }
    }

    const criticalReasons: HandoffReason[] = [
      "ai_unavailable",
      "waha_unavailable",
      "repeated_failure",
    ];
    if (!notifier.enabled || !criticalReasons.includes(reason)) {
      return;
    }

    const notification = {
      eventType: "critical_dependency_failure",
      title: "SDR: dependência crítica indisponível",
      text: `O atendimento automático foi interrompido pelo motivo técnico ${reason}.`,
      conversationId: context.conversationId,
      severity: "critical" as const,
    };

    try {
      await notifier.send(notification);
      await repository.recordNotification(
        context.conversationId,
        notification.eventType,
        "sent",
        notification,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await repository.recordNotification(
        context.conversationId,
        notification.eventType,
        "failed",
        notification,
        message,
      );
    }
  }

  private async syncKommoFlowSafely(
    context: Awaited<ReturnType<SdrRepository["loadConversation"]>>,
    decision: CommercialFlowDecision,
    course: CatalogItemSnapshot,
  ): Promise<void> {
    if (!this.dependencies.kommo) return;
    try {
      await this.dependencies.kommo.syncFlow(
        context,
        decision.patch,
        course,
        decision.enrollmentData,
      );
    } catch (error) {
      await this.auditKommoFailure(context, error);
      if (decision.patch && this.dependencies.kommoRetryQueue) {
        try {
          await this.dependencies.kommoRetryQueue.enqueue({
            operation: "flow",
            conversationId: context.conversationId,
            patch: decision.patch,
            ...(decision.enrollmentData ? { enrollmentData: decision.enrollmentData } : {}),
            restoreHandoffStage: Boolean(decision.handoffAfterFlow),
          });
        } catch (queueError) {
          console.error(JSON.stringify({
            level: "error",
            event: "kommo_retry_enqueue_failed",
            conversationId: context.conversationId,
            error: queueError instanceof Error ? queueError.message : String(queueError),
          }));
        }
      }
    }
  }

  private async syncKommoHandoffSafely(
    context: Awaited<ReturnType<SdrRepository["loadConversation"]>>,
    course: CatalogItemSnapshot,
    reason: HandoffReason,
  ): Promise<void> {
    if (!this.dependencies.kommo) return;
    try {
      await this.dependencies.kommo.syncHandoff(context, course, reason);
    } catch (error) {
      await this.auditKommoFailure(context, error);
      if (this.dependencies.kommoRetryQueue) {
        try {
          await this.dependencies.kommoRetryQueue.enqueue({
            operation: "handoff",
            conversationId: context.conversationId,
            reason,
          });
        } catch (queueError) {
          console.error(JSON.stringify({
            level: "error",
            event: "kommo_retry_enqueue_failed",
            conversationId: context.conversationId,
            error: queueError instanceof Error ? queueError.message : String(queueError),
          }));
        }
      }
    }
  }

  private async auditKommoFailure(
    context: Awaited<ReturnType<SdrRepository["loadConversation"]>>,
    error: unknown,
  ): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({
      level: "error",
      event: "kommo_sync_failed",
      conversationId: context.conversationId,
      error: message,
    }));
    try {
      await this.dependencies.repository.markKommoSyncFailed(
        context.conversationId,
        message,
      );
    } catch (auditError) {
      console.error(JSON.stringify({
        level: "error",
        event: "kommo_sync_audit_failed",
        conversationId: context.conversationId,
        error: auditError instanceof Error ? auditError.message : String(auditError),
      }));
    }
  }
}
