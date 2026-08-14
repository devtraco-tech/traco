import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWahaHmac } from "./hmac.js";

describe("verifyWahaHmac", () => {
  it("aceita a assinatura SHA-512 correta", () => {
    const body = '{"event":"message"}';
    const secret = "segredo-de-teste";
    const signature = createHmac("sha512", secret).update(body).digest("hex");

    expect(verifyWahaHmac(body, signature, secret)).toBe(true);
    expect(verifyWahaHmac(body, `sha512=${signature}`, secret)).toBe(true);
  });

  it("rejeita assinatura alterada ou ausente", () => {
    expect(verifyWahaHmac("corpo", "abcd", "segredo")).toBe(false);
    expect(verifyWahaHmac("corpo", undefined, "segredo")).toBe(false);
  });
});
