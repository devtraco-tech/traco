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

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.uuid().optional(),
);

const optionalClintFieldKey = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.string().trim().min(1).max(128).regex(/^[a-z\d_-]+$/iu).optional(),
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
    SDR_ENROLLMENT_FOLLOW_UP_INTERVAL_HOURS: z.coerce.number().int().min(1).max(24).default(4),
    SDR_ENROLLMENT_FOLLOW_UP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
    SDR_TIME_ZONE: z.string().min(1).default("America/Sao_Paulo"),
    SDR_TEST_ALLOWED_PHONE_NUMBERS: phoneNumberList,
    CLINT_API_TOKEN: optionalSecret,
    CLINT_ORIGIN_ID: optionalUuid,
    CLINT_NEW_LEAD_STAGE_ID: optionalUuid,
    CLINT_QUALIFIED_STAGE_ID: optionalUuid,
    CLINT_INTERESTED_STAGE_ID: optionalUuid,
    CLINT_NEGOTIATION_STAGE_ID: optionalUuid,
    CLINT_DATA_COLLECTED_STAGE_ID: optionalUuid,
    CLINT_AWAITING_HUMAN_STAGE_ID: optionalUuid,
    CLINT_RESPONSIBLE_USER_ID: optionalUuid,
    CLINT_HANDOFF_NOTE_FIELD_ID: optionalClintFieldKey,
    CLINT_FIELD_FULL_NAME_ID: optionalClintFieldKey,
    CLINT_FIELD_WHATSAPP_PHONE_ID: optionalClintFieldKey,
    CLINT_FIELD_CPF_ID: optionalClintFieldKey,
    CLINT_FIELD_BIRTH_DATE_ID: optionalClintFieldKey,
    CLINT_FIELD_MARITAL_STATUS_ID: optionalClintFieldKey,
    CLINT_FIELD_NATIONALITY_ID: optionalClintFieldKey,
    CLINT_FIELD_BIRTHPLACE_ID: optionalClintFieldKey,
    CLINT_FIELD_CRO_ID: optionalClintFieldKey,
    CLINT_FIELD_EMAIL_ID: optionalClintFieldKey,
    CLINT_FIELD_ADDRESS_ID: optionalClintFieldKey,
    CLINT_FIELD_DISTRICT_ID: optionalClintFieldKey,
    CLINT_FIELD_POSTAL_CODE_ID: optionalClintFieldKey,
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
