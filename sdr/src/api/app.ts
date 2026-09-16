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
import type { ClintClient } from "../infra/clint-client.js";
import { WahaApiError, type WahaClient } from "../infra/waha-client.js";
import { verifyWahaHmac } from "../lib/hmac.js";
import { isPhoneAllowed, maskPhoneNumber } from "../domain/phone-allowlist.js";
import { getCourseTraining } from "../training/course-training.js";

type ApiDependencies = {
  repository: SdrRepository;
  queue: ConversationQueue;
  notifier: EmailNotifier;
  adminAuthorizer: AdminAuthorizerLike;
  waha: WahaClient;
  catalog: CatalogProvider;
  clintAdmin?: ClintClient | null;
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

  const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await dependencies.adminAuthorizer.authorize(
      request.headers.authorization,
    );
    if (!result.authorized) {
      return reply.code(result.statusCode).send({ error: result.message });
    }
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
    async () => {
      const binding = await dependencies.repository.getCatalogBinding(config.WAHA_SESSION);
      const training = getCourseTraining(binding?.slug);
      return dependencies.repository.installOfficialTraining(
        config.WAHA_SESSION,
        training.documents,
        training.version,
      );
    },
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
      const binding = await dependencies.repository.getCatalogBinding(config.WAHA_SESSION);
      const training = getCourseTraining(binding?.slug);
      return dependencies.repository.saveCommercialScript(
        config.WAHA_SESSION,
        body.script.trim(),
        training.version,
      );
    },
  );

  app.put(
    "/api/sdr/training/pdf",
    { onRequest: requireAdmin },
    async (request, reply) => {
      const body = (request.body as RawJsonBody).parsed as Record<string, unknown>;
      const sourceUrl = typeof body?.sourceUrl === "string" ? body.sourceUrl.trim() : "";
      const title = typeof body?.title === "string" ? body.title.trim() : "Material do curso.pdf";
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(sourceUrl);
      } catch {
        return reply.code(400).send({ error: "Informe uma URL válida para o PDF" });
      }
      if (parsedUrl.protocol !== "https:") {
        return reply.code(400).send({ error: "A URL do PDF deve usar HTTPS" });
      }
      if (!title || title.length > 180) {
        return reply.code(400).send({ error: "O nome do PDF deve ter entre 1 e 180 caracteres" });
      }
      return dependencies.repository.saveCoursePdf(
        config.WAHA_SESSION,
        parsedUrl.toString(),
        title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`,
      );
    },
  );

  app.get(
    "/api/sdr/clint/status",
    { onRequest: requireAdmin },
    async (_request, reply) => {
      if (!dependencies.clintAdmin) {
        return reply.code(503).send({
          configured: false,
          connected: false,
          originId: null,
          responsibleUserId: null,
          error: "Integração Clint não configurada no backend",
        });
      }
      await dependencies.clintAdmin.listOrigins();
      return {
        configured: true,
        connected: true,
        originId: config.CLINT_ORIGIN_ID ?? null,
        responsibleUserId: config.CLINT_RESPONSIBLE_USER_ID ?? null,
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
