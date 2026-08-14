import { createClient } from "@supabase/supabase-js";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv({ path: [".env.local", ".env"], quiet: true });

const config = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
}).parse(process.env);
const client = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await client.rpc("sdr_apply_data_retention");
if (error) {
  console.error(JSON.stringify({
    level: "error",
    event: "sdr_retention_failed",
    error: error.message,
  }));
  process.exit(1);
}

console.info(JSON.stringify({
  level: "info",
  event: "sdr_retention_completed",
  result: data,
}));
