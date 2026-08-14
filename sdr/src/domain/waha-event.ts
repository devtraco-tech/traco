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
      fromMe: z.boolean().optional().default(false),
      body: z.string().optional().default(""),
      timestamp: z.number().optional(),
      pushName: z.string().optional(),
      _data: z
        .object({
          notifyName: z.string().optional(),
          pushname: z.string().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough(),
}).passthrough();

export function getWahaInboundSenderId(input: unknown): string | null {
  const parsed = wahaMessageSchema.safeParse(input);
  if (!parsed.success || parsed.data.event !== "message") {
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
      payload._data?.notifyName ??
      payload._data?.pushname ??
      null,
    text,
    occurredAt: timestamp.toISOString(),
    rawPayload: input as Record<string, unknown>,
  };
}
