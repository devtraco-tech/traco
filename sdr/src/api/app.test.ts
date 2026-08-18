import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config.js";
import type { AdminAuthorizerLike } from "../infra/admin-authorizer.js";
import type { CatalogProvider } from "../domain/catalog.js";
import { EmailNotifier } from "../infra/notifier.js";
import type { ConversationQueue } from "../infra/queue.js";
import type { SdrRepository } from "../infra/supabase-repository.js";
import type { WahaClient } from "../infra/waha-client.js";
import type { KommoClient } from "../infra/kommo-client.js";
import { buildApp } from "./app.js";

const config = loadConfig({
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  SUPABASE_URL: "https://dev-example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  CATALOG_BASE_URL: "https://catalog-example.supabase.co",
  CATALOG_API_KEY: "catalog-test",
  REDIS_URL: "redis://localhost:6379",
  OPENAI_API_KEY: "openai-test",
  WAHA_BASE_URL: "http://localhost:3000",
  WAHA_API_KEY: "waha-test",
  WAHA_WEBHOOK_HMAC_KEY: "hmac-test",
  SDR_RESPONSE_DELAY_MS: "5000",
});

const body = JSON.stringify({
  event: "message",
  payload: {
    id: "wamid-api-test",
    from: "5511999990000@c.us",
    fromMe: false,
    body: "Quais cursos vocês oferecem?",
  },
});

const apps: Array<ReturnType<typeof buildApp>> = [];

const authorizedAdmin: AdminAuthorizerLike = {
  authorize: vi.fn().mockResolvedValue({ authorized: true, userId: "admin-1" }),
};

const wahaStub = {
  getSession: vi.fn(),
  ensureSession: vi.fn(),
  getQrCode: vi.fn(),
  logout: vi.fn(),
} as unknown as WahaClient;
const catalogStub = {
  id: "test-catalog",
  name: "Catálogo de teste",
  list: vi.fn(),
} as unknown as CatalogProvider;

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("POST /webhooks/waha", () => {
  it("rejeita webhook sem assinatura antes de acessar o banco", async () => {
    const ingestInbound = vi.fn();
    const app = buildApp(config, {
      repository: { ingestInbound } as unknown as SdrRepository,
      queue: {} as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: wahaStub,
      catalog: catalogStub,
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/waha",
      headers: { "content-type": "application/json" },
      payload: body,
    });

    expect(response.statusCode).toBe(401);
    expect(ingestInbound).not.toHaveBeenCalled();
  });

  it("persiste e enfileira uma mensagem válida com delay", async () => {
    const ingestInbound = vi.fn().mockResolvedValue({
      duplicate: false,
      isNewLead: false,
      leadId: "lead-1",
      conversationId: "conversation-1",
      messageId: "message-1",
    });
    const recordEvent = vi.fn().mockResolvedValue(undefined);
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const cancelEnrollmentFollowUps = vi.fn().mockResolvedValue(1);
    const app = buildApp(config, {
      repository: { ingestInbound, recordEvent } as unknown as SdrRepository,
      queue: { enqueue, cancelEnrollmentFollowUps } as unknown as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: wahaStub,
      catalog: catalogStub,
    });
    apps.push(app);
    const signature = createHmac("sha512", "hmac-test")
      .update(body)
      .digest("hex");

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/waha",
      headers: {
        "content-type": "application/json",
        "x-webhook-hmac": signature,
        "x-webhook-hmac-algorithm": "sha512",
      },
      payload: body,
    });

    expect(response.statusCode).toBe(202);
    expect(ingestInbound).toHaveBeenCalledOnce();
    expect(enqueue).toHaveBeenCalledWith("conversation-1", 5_000, 3);
    expect(cancelEnrollmentFollowUps).toHaveBeenCalledWith("conversation-1");
    expect(recordEvent).toHaveBeenCalledOnce();
  });

  it("reinicia uma conversa existente e enfileira a mensagem no contexto novo", async () => {
    const restartBody = JSON.stringify({
      event: "message",
      payload: {
        id: "wamid-restart-test",
        from: "5511999990000@c.us",
        fromMe: false,
        body: "Olá, estou interessado no curso de Implantodontia",
      },
    });
    const ingestInbound = vi.fn().mockResolvedValue({
      duplicate: false,
      isNewLead: false,
      leadId: "lead-1",
      conversationId: "conversation-old",
      messageId: "message-restart",
    });
    const restartConversationForMessage = vi.fn().mockResolvedValue({
      restarted: true,
      conversationId: "conversation-new",
      previousConversationId: "conversation-old",
    });
    const recordEvent = vi.fn().mockResolvedValue(undefined);
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const cancelEnrollmentFollowUps = vi.fn().mockResolvedValue(1);
    const app = buildApp(config, {
      repository: {
        ingestInbound,
        restartConversationForMessage,
        recordEvent,
      } as unknown as SdrRepository,
      queue: { enqueue, cancelEnrollmentFollowUps } as unknown as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: wahaStub,
      catalog: catalogStub,
    });
    apps.push(app);
    const signature = createHmac("sha512", "hmac-test")
      .update(restartBody)
      .digest("hex");

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/waha",
      headers: {
        "content-type": "application/json",
        "x-webhook-hmac": signature,
        "x-webhook-hmac-algorithm": "sha512",
      },
      payload: restartBody,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      conversationId: "conversation-new",
      conversationRestarted: true,
    });
    expect(restartConversationForMessage).toHaveBeenCalledWith(
      "conversation-old",
      "message-restart",
      "new_greeting_with_course_interest",
    );
    expect(enqueue).toHaveBeenCalledWith("conversation-new", 5_000, 3);
    expect(recordEvent).toHaveBeenCalledWith(
      "message_queued",
      "conversation-new",
      "lead-1",
      expect.objectContaining({ conversation_restarted: true }),
    );
  });

  it("não persiste nem enfileira remetente fora da lista de desenvolvimento", async () => {
    const ingestInbound = vi.fn();
    const enqueue = vi.fn();
    const developmentConfig = {
      ...config,
      NODE_ENV: "development" as const,
      SDR_TEST_ALLOWED_PHONE_NUMBERS: ["5511888880000"],
    };
    const app = buildApp(developmentConfig, {
      repository: { ingestInbound } as unknown as SdrRepository,
      queue: { enqueue } as unknown as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: wahaStub,
      catalog: catalogStub,
    });
    apps.push(app);
    const signature = createHmac("sha512", "hmac-test")
      .update(body)
      .digest("hex");

    const response = await app.inject({
      method: "POST",
      url: "/webhooks/waha",
      headers: {
        "content-type": "application/json",
        "x-webhook-hmac": signature,
        "x-webhook-hmac-algorithm": "sha512",
      },
      payload: body,
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({ ignored: true, reason: "sender_not_allowed" });
    expect(ingestInbound).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled();
  });
});

describe("API administrativa do WhatsApp", () => {
  it("rejeita acesso sem token antes de consultar o WAHA", async () => {
    const getSession = vi.fn();
    const app = buildApp(config, {
      repository: {} as SdrRepository,
      queue: {} as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: {
        authorize: vi.fn().mockResolvedValue({
          authorized: false,
          statusCode: 401,
          message: "Token ausente",
        }),
      },
      waha: { getSession } as unknown as WahaClient,
      catalog: catalogStub,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/sdr/whatsapp/status",
    });

    expect(response.statusCode).toBe(401);
    expect(getSession).not.toHaveBeenCalled();
  });

  it("retorna o estado real da sessão para um administrador", async () => {
    const getSession = vi.fn().mockResolvedValue({
      session: "default",
      status: "WORKING",
      connected: true,
      whatsappId: "556299999999@c.us",
      phoneE164: "556299999999",
      displayName: "Atendimento ABO",
    });
    const app = buildApp(config, {
      repository: {} as SdrRepository,
      queue: {} as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: { getSession } as unknown as WahaClient,
      catalog: catalogStub,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/sdr/whatsapp/status",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "WORKING", connected: true });
  });

  it("entrega o QR Code somente quando a sessão está aguardando leitura", async () => {
    const getSession = vi.fn().mockResolvedValue({
      session: "default",
      status: "SCAN_QR_CODE",
      connected: false,
    });
    const getQrCode = vi.fn().mockResolvedValue({
      mimetype: "image/png",
      data: "base64-qr",
    });
    const app = buildApp(config, {
      repository: {} as SdrRepository,
      queue: {} as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: { getSession, getQrCode } as unknown as WahaClient,
      catalog: catalogStub,
    });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/api/sdr/whatsapp/qr",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      session: "default",
      mimetype: "image/png",
      data: "base64-qr",
    });
  });
});

describe("Administração do funil Kommo", () => {
  it("cria o funil padrão e registra o administrador na auditoria", async () => {
    const pipeline = {
      id: 100,
      name: "Atendimento SDR",
      statuses: [
        { id: 201, name: "Novo Lead", sort: 10 },
        { id: 202, name: "Qualificado", sort: 20 },
      ],
    };
    const createStandardPipeline = vi.fn().mockResolvedValue({ pipeline, created: true });
    const recordAdminAudit = vi.fn().mockResolvedValue(undefined);
    const app = buildApp(config, {
      repository: { recordAdminAudit } as unknown as SdrRepository,
      queue: {} as ConversationQueue,
      notifier: new EmailNotifier(),
      adminAuthorizer: authorizedAdmin,
      waha: wahaStub,
      catalog: catalogStub,
      kommoAdmin: { createStandardPipeline } as unknown as KommoClient,
    });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/api/sdr/kommo/pipelines/standard",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
      },
      payload: JSON.stringify({ name: "Atendimento SDR" }),
    });

    expect(response.statusCode).toBe(201);
    expect(createStandardPipeline).toHaveBeenCalledWith("Atendimento SDR");
    expect(recordAdminAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: "admin-1",
      action: "kommo_pipeline_created",
      targetExternalId: "100",
    }));
  });
});
