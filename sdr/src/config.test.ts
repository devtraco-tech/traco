import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const validEnvironment = {
  NODE_ENV: "test",
  SUPABASE_URL: "https://dev-example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-test",
  CATALOG_BASE_URL: "https://catalog-example.supabase.co",
  CATALOG_API_KEY: "catalog-test",
  REDIS_URL: "redis://localhost:6379",
  OPENAI_API_KEY: "openai-test",
  WAHA_BASE_URL: "http://localhost:3000",
  WAHA_API_KEY: "waha-test",
  WAHA_WEBHOOK_HMAC_KEY: "hmac-test",
};

describe("loadConfig", () => {
  it("aplica defaults seguros", () => {
    const config = loadConfig(validEnvironment);

    expect(config.OPENAI_MODEL).toBe("gpt-5.6-terra");
    expect(config.SDR_RESPONSE_DELAY_MS).toBe(8_000);
    expect(config.SDR_ENROLLMENT_FOLLOW_UP_INTERVAL_HOURS).toBe(4);
    expect(config.SDR_ENROLLMENT_FOLLOW_UP_MAX_ATTEMPTS).toBe(3);
    expect(config.SDR_TIME_ZONE).toBe("America/Sao_Paulo");
    expect(config.PORT).toBe(10_000);
    expect(config.SDR_TEST_ALLOWED_PHONE_NUMBERS).toEqual([]);
  });

  it("aceita o host privado do Render para o WAHA", () => {
    const config = loadConfig({
      ...validEnvironment,
      WAHA_BASE_URL: "traco-sdr-waha:3000",
    });

    expect(config.WAHA_BASE_URL).toBe("http://traco-sdr-waha:3000");
  });

  it("exige e normaliza a lista de teste em desenvolvimento", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, NODE_ENV: "development" }),
    ).toThrow(/SDR_TEST_ALLOWED_PHONE_NUMBERS/u);

    const config = loadConfig({
      ...validEnvironment,
      NODE_ENV: "development",
      SDR_TEST_ALLOWED_PHONE_NUMBERS: "+55 (62) 99999-0000, 5562888880000",
    });
    expect(config.SDR_TEST_ALLOWED_PHONE_NUMBERS).toEqual([
      "5562999990000",
      "5562888880000",
    ]);
  });

  it("obriga canal de e-mail crítico em produção", () => {
    expect(() =>
      loadConfig({ ...validEnvironment, NODE_ENV: "production" }),
    ).toThrow(/RESEND_API_KEY/u);

    const config = loadConfig({
      ...validEnvironment,
      NODE_ENV: "production",
      RESEND_API_KEY: "resend-test",
      ALERT_EMAIL_FROM: "SDR <sdr@example.com>",
      ALERT_EMAIL_TO: "suporte@example.com, produto@example.com",
    });
    expect(config.ALERT_EMAIL_TO).toEqual([
      "suporte@example.com",
      "produto@example.com",
    ]);
  });
});
