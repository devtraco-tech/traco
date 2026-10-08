import { z } from "zod";
import type { InboundMessage } from "./types.js";

const wahaMessageSchema = z.object({
  event: z.string(),
  payload: z
    .object({
      id: z.union([
        z.string(),
        z.object({ _serialized: z.string() }).passthrough(),
      ]),
      from: z.string(),
      to: z.string().optional(),
      source: z.enum(["app", "api"]).optional(),
      fromMe: z.boolean().optional().default(false),
      body: z.string().optional().default(""),
      timestamp: z.number().optional(),
      pushName: z.string().optional(),
      _data: z
        .object({
          notifyName: z.string().optional(),
          pushname: z.string().optional(),
          Info: z
            .object({
              PushName: z.string().optional(),
            })
            .passthrough()
            .optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
}).passthrough();

export function getWahaInboundSenderId(input: unknown): string | null {
  const parsed = wahaMessageSchema.safeParse(input);
  if (!parsed.success || !["message", "message.any"].includes(parsed.data.event)) {
    return null;
  }

  const payload = parsed.data.payload;
  const text = payload.body.trim();
  const isDirectMessage =
    payload.from.endsWith("@c.us") || payload.from.endsWith("@lid");

  if (payload.fromMe || !isDirectMessage || text.length === 0) {
    return null;
  }

  return payload.from;
}

export function parseWahaManualMessage(input: unknown): { recipientId: string; providerMessageId: string; text: string; occurredAt: string } | null {
  const parsed = wahaMessageSchema.safeParse(input);
  if (!parsed.success || parsed.data.event !== "message.any") return null;
  const payload = parsed.data.payload;
  if (!payload.fromMe || payload.source === "api") return null;
  const recipientId = payload.to;
  if (!recipientId || !/@(?:c\.us|lid)$/u.test(recipientId)) return null;
  const timestamp = payload.timestamp;
  return {
    recipientId,
    providerMessageId: typeof payload.id === "string" ? payload.id : payload.id._serialized,
    text: payload.body,
    occurredAt: timestamp ? new Date(timestamp < 10_000_000_000 ? timestamp * 1_000 : timestamp).toISOString() : new Date().toISOString(),
  };
}

export function parseWahaInboundMessage(
  input: unknown,
  resolvedWhatsappId?: string,
): InboundMessage | null {
  const senderId = getWahaInboundSenderId(input);
  const parsed = wahaMessageSchema.safeParse(input);
  if (!senderId || !parsed.success) return null;

  const payload = parsed.data.payload;
  const text = payload.body.trim();
  const whatsappId = senderId.endsWith("@lid")
    ? resolvedWhatsappId
    : senderId;

  if (!whatsappId?.endsWith("@c.us")) {
    return null;
  }

  const providerMessageId =
    typeof payload.id === "string" ? payload.id : payload.id._serialized;
  const digits = whatsappId.replace(/\D/g, "");

  if (!providerMessageId || !digits) {
    return null;
  }

  const timestamp = payload.timestamp
    ? new Date(payload.timestamp < 10_000_000_000 ? payload.timestamp * 1_000 : payload.timestamp)
    : new Date();

  return {
    providerMessageId,
    whatsappId,
    phoneE164: `+${digits}`,
    displayName:
      payload.pushName ??
      payload._data?.Info?.PushName ??
      payload._data?.notifyName ??
      payload._data?.pushname ??
      null,
    text,
    occurredAt: timestamp.toISOString(),
    rawPayload: input as Record<string, unknown>,
  };
}
