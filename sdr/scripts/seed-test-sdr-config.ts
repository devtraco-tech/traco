import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const testCourseId = "00000000-0000-4000-8000-000000000103";
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const wahaSession = process.env.WAHA_SESSION ?? "default";

if (supabaseUrl !== developmentUrl) {
  throw new Error("Operação cancelada: este seed só pode rodar no abo-traco-dev.");
}
if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada em .env.local.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: config, error: configError } = await supabase
  .from("sdr_robot_configs")
  .upsert(
    {
      waha_session: wahaSession,
      name: "Assistente Comercial (teste)",
      course_id: testCourseId,
      script_version: "us-03-v1",
      is_active: true,
    },
    { onConflict: "waha_session" },
  )
  .select("id, waha_session, name, course_id, script_version, is_active")
  .single();

if (configError) {
  throw new Error(`Falha ao configurar SDR de teste: ${configError.message}`);
}

const { error: conversationsError } = await supabase
  .from("sdr_conversations")
  .update({ configured_course_id: testCourseId })
  .eq("waha_session", wahaSession)
  .is("configured_course_id", null);

if (conversationsError) {
  throw new Error(
    `Falha ao associar conversas existentes: ${conversationsError.message}`,
  );
}

console.log(
  JSON.stringify(
    {
      project: "abo-traco-dev",
      config,
      note: "FAQ, PDF e matriz continuam vazios até os documentos oficiais serem fornecidos.",
    },
    null,
    2,
  ),
);
