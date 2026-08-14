import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWahaHmac(
  rawBody: string,
  receivedSignature: string | undefined,
  secret: string,
): boolean {
  if (!receivedSignature || !secret) {
    return false;
  }

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const normalized = receivedSignature.replace(/^sha512=/i, "").trim().toLowerCase();

  if (!/^[a-f0-9]+$/u.test(normalized) || normalized.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(normalized, "hex"));
}
