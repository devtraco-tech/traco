import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import type { AppConfig } from "../config.js";
import {
  getWahaInboundSenderId,
  parseWahaInboundMessage,
} from "../domain/waha-event.js";
import { conversationRestartReason } from "../domain/conversation-restart.js";
import type { AdminAuthorizerLike } from "../infra/admin-authorizer.js";
import { CatalogApiError } from "../infra/catalog-client.js";
import { createCatalogItemSnapshot, type CatalogProvider } from "../domain/catalog.js";
import type { EmailNotifier } from "../infra/notifier.js";
import type { ConversationQueue } from "../infra/queue.js";
import type { SdrRepository } from "../infra/supabase-repository.js";
import { WahaApiError, type WahaClient } from "../infra/waha-client.js";
import type { KommoClient } from "../infra/kommo-client.js";
import type { KommoAdminConfiguration } from "../infra/supabase-repository.js";
import { verifyWahaHmac } from "../lib/hmac.js";
import { isPhoneAllowed, maskPhoneNumber } from "../domain/phone-allowlist.js";
import {
  OFFICIAL_TRAINING_DOCUMENTS,
  TRAINING_VERSION,
} from "../training/official-training.js";

type ApiDependencies = {
  repository: SdrRepository;
  queue: ConversationQueue;
  notifier: EmailNotifier;
  adminAuthorizer: AdminAuthorizerLike;
  waha: WahaClient;
  catalog: CatalogProvider;
  kommoAdmin?: KommoClient | null;
  kommoDefaultConfiguration?: KommoAdminConfiguration | null;
};

type RawJsonBody = {
  raw: string;
  parsed: unknown;
};

export function buildApp(
  config: AppConfig,
  dependencies: ApiDependencies,
): FastifyInstance {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
    bodyLimit: 1_048_576,
  });

  app.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && origin !== config.FRONTEND_ORIGIN) {
      if (request.method === "OPTIONS") {
        return reply.code(403).send({ error: "Origem não permitida" });
      }
      return;
    }

    if (origin === config.FRONTEND_ORIGIN) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
      reply.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
      reply.header("Vary", "Origin");
    }

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      try {
        const raw = String(body);
        done(null, { raw, parsed: JSON.parse(raw) } satisfies RawJsonBody);
      } catch (error) {
        done(error as Error);
      }
    },
  );

  app.get("/health", async () => ({
    status: "ok",
    service: "traco-sdr-api",
    timestamp: new Date().toISOString(),
  }));

  const adminActors = new WeakMap<FastifyRequest, string>();
  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await dependencies.adminAuthorizer.authorize(
      request.headers.authorization,
    );
    if (!result.authorized) {
      return reply.code(result.statusCode).send({ error: result.message });
    }
    adminActors.set(request, result.userId);
  };

  const adminActor = (request: FastifyRequest): string => {
    const actor = adminActors.get(request);
    if (!actor) throw new Error("Administrador autenticado não identificado.");
    return actor;
  };

  app.get(
    "/api/sdr/catalog/items",
    { onRequest: requireAdmin },
    async (request) => {
      const query = request.query as Record<string, string | undefined>;
      return dependencies.catalog.list({
        ...(query.area ? { area: query.area } : {}),
        ...(query.modality ? { modality: query.modality } : {}),
        ...(query.target_audience ? { targetAudience: query.target_audience } : {}),
        upcoming: query.upcoming === "true",
        includeFilters: query.filters === "true",
      });
    },
  );

  app.get(
    "/api/sdr/catalog/binding",
    { onRequest: requireAdmin },
    async () => ({
      provider: { id: dependencies.catalog.id, name: dependencies.catalog.name },
      binding: await dependencies.repository.getCatalogBinding(config.WAHA_SESSION),
    }),
  );

  app.post(
    "/api/sdr/catalog/binding",
    { onRequest: requireAdmin },
    async (request, reply) => {
      const body = (request.body as RawJsonBody).parsed as Record<string, unknown>;
      if (typeof body?.itemId !== "string" || !body.itemId) {
        return reply.code(400).send({ error: "itemId é obrigatório" });
      }
      const result = await dependencies.catalog.list();
      const item = result.items.find((candidate) => candidate.id === body.itemId);
      if (!item) return reply.code(404).send({ error: "Item não disponível no catálogo" });
      const binding = await dependencies.repository.bindCatalogItem(
        config.WAHA_SESSION,
        createCatalogItemSnapshot(item),
        { id: dependencies.catalog.id, name: dependencies.catalog.name },
      );
      return {
        provider: { id: dependencies.catalog.id, name: dependencies.catalog.name },
        binding,
      };
    },
  );

  app.get(
    "/api/sdr/training",
    { onRequest: requireAdmin },
    async () => dependencies.repository.getTrainingConfiguration(config.WAHA_SESSION),
  );

  app.post(
    "/api/sdr/training/install",
    { onRequest: requireAdmin },
    async () => dependencies.repository.installOfficialTraining(
      config.WAHA_SESSION,
      OFFICIAL_TRAINING_DOCUMENTS,
      TRAINING_VERSION,
    ),
  );

  app.put(
    "/api/sdr/training/script",
    { onRequest: requireAdmin },
    async (request, reply) => {
      const body = (request.body as RawJsonBody).parsed as Record<string, unknown>;
      if (typeof body?.script !== "string" || body.script.trim().length < 80) {
        return reply.code(400).send({ error: "O script deve ter pelo menos 80 caracteres" });
      }
      if (body.script.length > 30_000) {
        return reply.code(400).send({ error: "O script deve ter no máximo 30.000 caracteres" });
      }
      return dependencies.repository.saveCommercialScript(
        config.WAHA_SESSION,
        body.script.trim(),
        TRAINING_VERSION,
      );
    },
  );

  app.get(
    "/api/sdr/kommo/options",
    { onRequest: requireAdmin },
    async (_request, reply) => {
      if (!dependencies.kommoAdmin) {
        return reply.code(503).send({ error: "Integração Kommo não configurada no backend" });
      }
      return dependencies.kommoAdmin.listAdminOptions();
    },
  );

  app.post(
    "/api/sdr/kommo/pipelines/standard",
    { onRequest: requireAdmin },
    async (request, reply) => {
      if (!dependencies.kommoAdmin) {
        return reply.code(503).send({ error: "Integração Kommo não configurada no backend" });
      }
      const body = (request.body as RawJsonBody).parsed as Record<string, unknown>;
      const name = typeof body?.name === "string" ? body.name : "";
      if (name.trim().length < 2 || name.trim().length > 100) {
        return reply.code(400).send({ error: "Nome do funil deve ter entre 2 e 100 caracteres" });
      }
      const result = await dependencies.kommoAdmin.createStandardPipeline(name);
      if (result.created) {
        await dependencies.repository.recordAdminAudit({
          actorUserId: adminActor(request),
          action: "kommo_pipeline_created",
          targetType: "kommo_pipeline",
          targetExternalId: String(result.pipeline.id),
          newState: result.pipeline,
        });
      }
      return reply.code(result.created ? 201 : 200).send(result);
    },
  );

  app.patch(
    "/api/sdr/kommo/pipelines/:pipelineId",
    { onRequest: requireAdmin },
    async (request, reply) => {
      if (!dependencies.kommoAdmin) {
        return reply.code(503).send({ error: "Integração Kommo não configurada no backend" });
      }
      const pipelineId = Number((request.params as Record<string, string>).pipelineId);
      const body = (request.body as RawJsonBody).parsed as Record<string, unknown>;
      const name = typeof body?.name === "string" ? body.name : "";
      if (!Number.isSafeInteger(pipelineId) || pipelineId <= 0) {
        return reply.code(400).send({ error: "pipelineId inválido" });
      }
      if (name.trim().length < 2 || name.trim().length > 100) {
        return reply.code(400).send({ error: "Nome do funil deve ter entre 2 e 100 caracteres" });
      }
      const result = await dependencies.kommoAdmin.renamePipeline(pipelineId, name);
      await dependencies.repository.recordAdminAudit({
        actorUserId: adminActor(request),
        action: "kommo_pipeline_renamed",
        targetType: "kommo_pipeline",
        targetExternalId: String(pipelineId),
        previousState: { name: result.previousName },
        newState: { name: result.pipeline.name },
      });
      return result;
    },
  );

  app.patch(
    "/api/sdr/kommo/pipelines/:pipelineId/stages/:stageId",
    { onRequest: requireAdmin },
    async (request, reply) => {
      if (!dependencies.kommoAdmin) {
        return reply.code(503).send({ error: "Integração Kommo não configurada no backend" });
      }
      const params = request.params as Record<string, string>;
      const pipelineId = Number(params.pipelineId);
      const stageId = Number(params.stageId);
      const body = (request.body as RawJsonBody).parsed as Record<string, unknown>;
      const name = typeof body?.name === "string" ? body.name : "";
      if (
        !Number.isSafeInteger(pipelineId) || pipelineId <= 0
        || !Number.isSafeInteger(stageId) || stageId <= 0
      ) {
        return reply.code(400).send({ error: "Funil ou coluna inválidos" });
      }
      if (name.trim().length < 2 || name.trim().length > 100) {
        return reply.code(400).send({ error: "Nome da coluna deve ter entre 2 e 100 caracteres" });
      }
      const result = await dependencies.kommoAdmin.renamePipelineStage(
        pipelineId,
        stageId,
        name,
      );
      await dependencies.repository.recordAdminAudit({
        actorUserId: adminActor(request),
        action: "kommo_stage_renamed",
        targetType: "kommo_stage",
        targetExternalId: String(stageId),
        previousState: { pipelineId, name: result.previousName },
        newState: { pipelineId, name: result.pipeline.statuses.find((item) => item.id === stageId)?.name },
      });
      return result;
    },
  );

  app.get(
    "/api/sdr/kommo/config",
    { onRequest: requireAdmin },
    async () => ({
      configuration:
        (await dependencies.repository.getKommoConfiguration(config.WAHA_SESSION))
        ?? dependencies.kommoDefaultConfiguration
        ?? null,
      tokenConfigured: Boolean(config.KOMMO_ACCESS_TOKEN),
    }),
  );

  app.put(
    "/api/sdr/kommo/config",
    { onRequest: requireAdmin },
    async (request, reply) => {
      if (!dependencies.kommoAdmin || !dependencies.kommoDefaultConfiguration) {
        return reply.code(503).send({ error: "Integração Kommo não configurada no backend" });
      }
      const body = (request.body as RawJsonBody).parsed as Record<string, any>;
      const positive = (value: unknown): number | null => {
        const parsed = Number(value);
        return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
      };
      const pipelineId = positive(body.pipelineId);
      const stages = body.stages as Record<string, unknown> | undefined;
      const responsibleUserId = positive(body.responsibleUserId);
      const taskTypeId = positive(body.taskTypeId);
      const deadlineMinutes = positive(body.deadlineMinutes);
      const stageKeys = [
        "newLead",
        "qualified",
        "interested",
        "negotiation",
        "dataCollected",
        "awaitingHuman",
      ] as const;
      const stageIds = Object.fromEntries(
        stageKeys.map((key) => [key, positive(stages?.[key])]),
      ) as Record<(typeof stageKeys)[number], number | null>;
      if (
        !pipelineId
        || !responsibleUserId
        || !taskTypeId
        || !deadlineMinutes
        || deadlineMinutes > 1440
        || stageKeys.some((key) => !stageIds[key])
      ) {
        return reply.code(400).send({ error: "Mapeamento Kommo incompleto ou inválido" });
      }

      const options = await dependencies.kommoAdmin.listAdminOptions();
      const pipeline = options.pipelines.find((item) => item.id === pipelineId);
      if (!pipeline) return reply.code(400).send({ error: "Funil Kommo não encontrado" });
      const allowedStatuses = new Set(pipeline.statuses.map((status) => status.id));
      if (stageKeys.some((key) => !allowedStatuses.has(stageIds[key]!))) {
        return reply.code(400).send({ error: "Uma etapa não pertence ao funil selecionado" });
      }
      if (!options.users.some((user) => user.id === responsibleUserId && user.active)) {
        return reply.code(400).send({ error: "Responsável Kommo inativo ou inexistente" });
      }
      if (!options.taskTypes.some((taskType) => taskType.id === taskTypeId)) {
        return reply.code(400).send({ error: "Tipo de tarefa Kommo inexistente" });
      }

      const configuration: KommoAdminConfiguration = {
        enabled: body.enabled !== false,
        subdomain: config.KOMMO_SUBDOMAIN!,
        stages: {
          pipelineId,
          newLeadStatusId: stageIds.newLead!,
          qualifiedStatusId: stageIds.qualified!,
          interestedStatusId: stageIds.interested!,
          negotiationStatusId: stageIds.negotiation!,
          dataCollectedStatusId: stageIds.dataCollected!,
          handoffStatusId: stageIds.awaitingHuman!,
        },
        enrollmentFields: dependencies.kommoDefaultConfiguration.enrollmentFields,
        handoff: { responsibleUserId, taskTypeId, deadlineMinutes },
      };
      return {
        configuration: await dependencies.repository.saveKommoConfiguration(
          config.WAHA_SESSION,
          configuration,
        ),
        tokenConfigured: true,
      };
    },
  );

  app.get(
    "/api/sdr/whatsapp/status",
    { onRequest: requireAdmin },
    async () => dependencies.waha.getSession(),
  );

  app.post(
    "/api/sdr/whatsapp/start",
    { onRequest: requireAdmin },
    async () => dependencies.waha.ensureSession(),
  );

  app.get(
    "/api/sdr/whatsapp/qr",
    { onRequest: requireAdmin },
    async (_request, reply) => {
      const session = await dependencies.waha.getSession();
      if (session.connected) {
        return reply.code(409).send({ error: "O WhatsApp já está conectado" });
      }
      if (session.status !== "SCAN_QR_CODE") {
        return reply.code(409).send({
          error: "O QR Code ainda não está disponível",
          status: session.status,
        });
      }

      const qr = await dependencies.waha.getQrCode();
      return {
        session: session.session,
        mimetype: qr.mimetype,
        data: qr.data,
      };
    },
  );

  app.post(
    "/api/sdr/whatsapp/disconnect",
    { onRequest: requireAdmin },
    async () => dependencies.waha.logout(),
  );

  app.post("/webhooks/waha", async (request, reply) => {
    const body = request.body as RawJsonBody;
    const signatureHeader = request.headers["x-webhook-hmac"];
    const signature = Array.isArray(signatureHeader)
      ? signatureHeader[0]
      : signatureHeader;
    const algorithmHeader = request.headers["x-webhook-hmac-algorithm"];
    const algorithm = Array.isArray(algorithmHeader)
      ? algorithmHeader[0]
      : algorithmHeader;

    if (algorithm && algorithm.toLowerCase() !== "sha512") {
      return reply.code(401).send({ error: "Algoritmo HMAC inválido" });
    }

    if (!verifyWahaHmac(body.raw, signature, config.WAHA_WEBHOOK_HMAC_KEY)) {
      request.log.warn("Webhook WAHA rejeitado por assinatura inválida");
      return reply.code(401).send({ error: "Assinatura inválida" });
    }

    const senderId = getWahaInboundSenderId(body.parsed);
    const resolvedWhatsappId = senderId?.endsWith("@lid")
      ? await dependencies.waha.resolveLid(senderId)
      : undefined;
    const message = parseWahaInboundMessage(body.parsed, resolvedWhatsappId ?? undefined);
    if (!message) {
      if (senderId?.endsWith("@lid") && !resolvedWhatsappId) {
        request.log.warn({ senderType: "lid" }, "Mensagem ignorada: LID sem telefone conhecido");
      }
      return reply.code(202).send({ accepted: true, ignored: true });
    }

    if (
      config.NODE_ENV === "development" &&
      !isPhoneAllowed(message.phoneE164, config.SDR_TEST_ALLOWED_PHONE_NUMBERS)
    ) {
      request.log.info(
        { sender: maskPhoneNumber(message.phoneE164) },
        "Mensagem ignorada: remetente fora da lista de teste",
      );
      return reply.code(202).send({
        accepted: true,
        ignored: true,
        reason: "sender_not_allowed",
      });
    }

    const result = await dependencies.repository.ingestInbound(
      message,
      config.WAHA_SESSION,
    );

    if (result.duplicate) {
      return reply.code(200).send({ accepted: true, duplicate: true });
    }

    // Qualquer nova resposta do lead interrompe a cadência anterior. Se os
    // dados ainda estiverem incompletos, o worker agenda uma nova cadência a
    // partir dessa resposta depois de processá-la.
    try {
      await dependencies.queue.cancelEnrollmentFollowUps(result.conversationId);
    } catch (error) {
      request.log.error(
        { err: error, conversationId: result.conversationId },
        "Falha ao cancelar follow-ups; a mensagem continuará sendo processada",
      );
    }

    let conversationId = result.conversationId;
    let conversationRestarted = false;
    const restartReason = conversationRestartReason(message.text);
    if (restartReason && result.messageId) {
      const restart = await dependencies.repository.restartConversationForMessage(
        result.conversationId,
        result.messageId,
        restartReason,
      );
      conversationId = restart.conversationId;
      conversationRestarted = restart.restarted;
      if (restart.restarted) {
        request.log.info(
          {
            conversationId,
            previousConversationId: restart.previousConversationId,
            restartReason,
          },
          "Conversa reiniciada a pedido do lead",
        );
      }
    }

    await dependencies.queue.enqueue(
      conversationId,
      config.SDR_RESPONSE_DELAY_MS,
      config.SDR_MAX_RETRIES,
    );
    await dependencies.repository.recordEvent(
      "message_queued",
      conversationId,
      result.leadId,
      {
        message_id: result.messageId,
        delay_ms: config.SDR_RESPONSE_DELAY_MS,
        conversation_restarted: conversationRestarted,
      },
    );

    return reply.code(202).send({
      accepted: true,
      conversationId,
      conversationRestarted,
      delayMs: config.SDR_RESPONSE_DELAY_MS,
    });
  });

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Erro não tratado na API do SDR");
    if (error instanceof WahaApiError) {
      const statusCode = error.statusCode === 503 ? 503 : 502;
      void reply.code(statusCode).send({ error: error.message });
      return;
    }
    if (error instanceof CatalogApiError) {
      const statusCode = error.statusCode === 504 ? 504 : 502;
      void reply.code(statusCode).send({ error: error.message });
      return;
    }
    if (dependencies.notifier.enabled) {
      const notification = {
        eventType: "api_unhandled_error",
        title: "SDR: falha crítica na API",
        text: `Uma requisição falhou em ${request.method} ${request.url.split("?", 1)[0]}. Consulte os logs da API.`,
        severity: "critical" as const,
      };
      void dependencies.notifier.send(notification)
        .then(() => dependencies.repository.recordNotification(
          null,
          notification.eventType,
          "sent",
          notification,
        ))
        .catch((notificationError) => dependencies.repository.recordNotification(
          null,
          notification.eventType,
          "failed",
          notification,
          notificationError instanceof Error
            ? notificationError.message
            : String(notificationError),
        ));
    }
    void reply.code(500).send({ error: "Erro interno" });
  });

  return app;
}
