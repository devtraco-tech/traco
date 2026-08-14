import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: [".env.local", ".env"], quiet: true });

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const phoneNumberList = z
  .string()
  .default("")
  .transform((value) =>
    [...new Set(
      value
        .split(",")
        .map((phone) => phone.replace(/\D/gu, ""))
        .filter(Boolean),
    )],
  );

const emailList = z
  .string()
  .default("")
  .transform((value) =>
    [...new Set(value.split(",").map((email) => email.trim()).filter(Boolean))],
  )
  .pipe(z.array(z.email()).max(10));

const booleanString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const internalServiceUrl = z
  .string()
  .min(1)
  .transform((value) => (/^[a-z][a-z\d+.-]*:\/\//iu.test(value) ? value : `http://${value}`))
  .pipe(z.url());

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(10_000),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
      .default("info"),
    FRONTEND_ORIGIN: z.url().default("http://localhost:8080"),
    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    CATALOG_PROVIDER: z.string().min(1).default("http-course-catalog"),
    CATALOG_PROVIDER_NAME: z.string().min(1).default("Catálogo"),
    CATALOG_BASE_URL: z.url(),
    CATALOG_API_KEY: z.string().min(1),
    CATALOG_COURSES_PATH: z.string().startsWith("/").default("/functions/v1/wordpress-courses"),
    CATALOG_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).max(60).default(60),
    CATALOG_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30_000).default(10_000),
    REDIS_URL: z.url(),
    OPENAI_API_KEY: optionalSecret,
    OPENAI_MODEL: z.string().min(1).default("gpt-5.6-terra"),
    WAHA_BASE_URL: internalServiceUrl,
    WAHA_API_KEY: z.string().min(1),
    WAHA_SESSION: z.string().min(1).default("default"),
    WAHA_WEBHOOK_HMAC_KEY: z.string().min(1),
    RESEND_API_KEY: optionalSecret,
    ALERT_EMAIL_FROM: optionalSecret,
    ALERT_EMAIL_TO: emailList,
    SDR_RESPONSE_DELAY_MS: z.coerce.number().int().nonnegative().default(8_000),
    SDR_CONTEXT_MESSAGE_LIMIT: z.coerce.number().int().min(1).max(100).default(20),
    SDR_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
    SDR_TEST_ALLOWED_PHONE_NUMBERS: phoneNumberList,
    KOMMO_ENABLED: booleanString,
    KOMMO_SUBDOMAIN: z.string().regex(/^[a-z0-9-]+$/u).optional(),
    KOMMO_ACCESS_TOKEN: optionalSecret,
    KOMMO_PIPELINE_ID: optionalPositiveInteger,
    KOMMO_NEW_LEAD_STATUS_ID: optionalPositiveInteger,
    KOMMO_QUALIFIED_STATUS_ID: optionalPositiveInteger,
    KOMMO_INTERESTED_STATUS_ID: optionalPositiveInteger,
    KOMMO_NEGOTIATION_STATUS_ID: optionalPositiveInteger,
    KOMMO_DATA_COLLECTED_STATUS_ID: optionalPositiveInteger,
    KOMMO_AWAITING_HUMAN_STATUS_ID: optionalPositiveInteger,
    KOMMO_RESPONSIBLE_USER_ID: optionalPositiveInteger,
    KOMMO_HANDOFF_TASK_TYPE_ID: optionalPositiveInteger,
    KOMMO_HANDOFF_DEADLINE_MINUTES: z.coerce.number().int().min(1).max(1440).default(5),
    KOMMO_FIELD_FULL_NAME_ID: optionalPositiveInteger,
    KOMMO_FIELD_WHATSAPP_PHONE_ID: optionalPositiveInteger,
    KOMMO_FIELD_CPF_ID: optionalPositiveInteger,
    KOMMO_FIELD_BIRTH_DATE_ID: optionalPositiveInteger,
    KOMMO_FIELD_MARITAL_STATUS_ID: optionalPositiveInteger,
    KOMMO_FIELD_NATIONALITY_ID: optionalPositiveInteger,
    KOMMO_FIELD_BIRTHPLACE_ID: optionalPositiveInteger,
    KOMMO_FIELD_CRO_ID: optionalPositiveInteger,
    KOMMO_FIELD_EMAIL_ID: optionalPositiveInteger,
    KOMMO_FIELD_ADDRESS_ID: optionalPositiveInteger,
    KOMMO_FIELD_DISTRICT_ID: optionalPositiveInteger,
    KOMMO_FIELD_POSTAL_CODE_ID: optionalPositiveInteger,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production") {
      for (const field of ["RESEND_API_KEY", "ALERT_EMAIL_FROM"] as const) {
        if (!value[field]) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "é obrigatório em produção para alertas críticos",
          });
        }
      }
      if (value.ALERT_EMAIL_TO.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["ALERT_EMAIL_TO"],
          message: "deve conter ao menos um destinatário em produção",
        });
      }
    }
    if (
      value.NODE_ENV === "development" &&
      value.SDR_TEST_ALLOWED_PHONE_NUMBERS.length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["SDR_TEST_ALLOWED_PHONE_NUMBERS"],
        message: "deve conter ao menos um número em desenvolvimento",
      });
    }
    if (value.KOMMO_ENABLED) {
      const requiredFields = [
        "KOMMO_SUBDOMAIN",
        "KOMMO_ACCESS_TOKEN",
        "KOMMO_PIPELINE_ID",
        "KOMMO_NEW_LEAD_STATUS_ID",
        "KOMMO_QUALIFIED_STATUS_ID",
        "KOMMO_INTERESTED_STATUS_ID",
        "KOMMO_NEGOTIATION_STATUS_ID",
        "KOMMO_DATA_COLLECTED_STATUS_ID",
        "KOMMO_AWAITING_HUMAN_STATUS_ID",
        "KOMMO_RESPONSIBLE_USER_ID",
        "KOMMO_HANDOFF_TASK_TYPE_ID",
        "KOMMO_FIELD_FULL_NAME_ID",
        "KOMMO_FIELD_WHATSAPP_PHONE_ID",
        "KOMMO_FIELD_CPF_ID",
        "KOMMO_FIELD_BIRTH_DATE_ID",
        "KOMMO_FIELD_MARITAL_STATUS_ID",
        "KOMMO_FIELD_NATIONALITY_ID",
        "KOMMO_FIELD_BIRTHPLACE_ID",
        "KOMMO_FIELD_CRO_ID",
        "KOMMO_FIELD_EMAIL_ID",
        "KOMMO_FIELD_ADDRESS_ID",
        "KOMMO_FIELD_DISTRICT_ID",
        "KOMMO_FIELD_POSTAL_CODE_ID",
      ] as const;
      for (const field of requiredFields) {
        if (!value[field]) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "é obrigatório quando KOMMO_ENABLED=true",
          });
        }
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  // Temporary compatibility for existing local environments. Runtime modules
  // only receive the provider-neutral CATALOG_* contract.
  const normalizedEnvironment = {
    ...environment,
    CATALOG_BASE_URL: environment.CATALOG_BASE_URL ?? environment.ABO_SUPABASE_URL,
    CATALOG_API_KEY: environment.CATALOG_API_KEY ?? environment.ABO_SUPABASE_ANON_KEY,
    CATALOG_CACHE_TTL_SECONDS:
      environment.CATALOG_CACHE_TTL_SECONDS ?? environment.ABO_COURSES_CACHE_TTL_SECONDS,
    CATALOG_TIMEOUT_MS: environment.CATALOG_TIMEOUT_MS ?? environment.ABO_COURSES_TIMEOUT_MS,
  };
  const parsed = envSchema.safeParse(normalizedEnvironment);

  if (!parsed.success) {
    const fields = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuração inválida: ${fields}`);
  }

  return parsed.data;
}
