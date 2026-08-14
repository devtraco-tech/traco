import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { loadConfig } from "../src/config.js";

dotenv.config({ path: ".env.local", quiet: true });

const developmentUrl = "https://yoqocelwzhhpzvlsbncq.supabase.co";
const config = loadConfig();

if (config.NODE_ENV !== "development" || config.SUPABASE_URL !== developmentUrl) {
  throw new Error("Diagnóstico permitido somente no abo-traco-dev.");
}

const client = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const phones = config.SDR_TEST_ALLOWED_PHONE_NUMBERS;
const leads = await client
  .from("sdr_leads")
  .select("id, phone_e164, whatsapp_id, last_seen_at")
  .in("phone_e164", phones.map((phone) => `+${phone}`));
if (leads.error) throw new Error(`Falha ao consultar lead: ${leads.error.message}`);

const leadIds = leads.data.map((lead) => lead.id);
const conversations = leadIds.length === 0
  ? { data: [], error: null }
  : await client
      .from("sdr_conversations")
      .select("id, lead_id, status, bot_enabled, flow_stage, configured_course_id, kommo_lead_id, kommo_contact_id, kommo_status_id, kommo_sync_status, kommo_last_synced_at, kommo_sync_error, created_at, updated_at, last_inbound_at, last_outbound_at")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false })
      .limit(5);
if (conversations.error) {
  throw new Error(`Falha ao consultar conversas: ${conversations.error.message}`);
}

const conversationIds = conversations.data.map((conversation) => conversation.id);
const messages = conversationIds.length === 0
  ? { data: [], error: null }
  : await client
      .from("sdr_messages")
      .select("id, conversation_id, direction, role, content, status, error_code, error_message, model, occurred_at, created_at")
      .in("conversation_id", conversationIds)
      .order("occurred_at", { ascending: false })
      .limit(15);
if (messages.error) {
  throw new Error(`Falha ao consultar mensagens: ${messages.error.message}`);
}

const handoffs = conversationIds.length === 0
  ? { data: [], error: null }
  : await client
      .from("sdr_handoffs")
      .select("id, conversation_id, reason, details, status, requested_at")
      .in("conversation_id", conversationIds)
      .order("requested_at", { ascending: false })
      .limit(10);
if (handoffs.error) {
  throw new Error(`Falha ao consultar handoffs: ${handoffs.error.message}`);
}

const configResult = await client
  .from("sdr_robot_configs")
  .select("waha_session, is_active, course_id, updated_at")
  .eq("waha_session", config.WAHA_SESSION)
  .maybeSingle();
if (configResult.error) {
  throw new Error(`Falha ao consultar configuração: ${configResult.error.message}`);
}

console.log(JSON.stringify({
  project: "abo-traco-dev",
  checkedAt: new Date().toISOString(),
  configuredPhones: phones,
  leads: leads.data,
  conversations: conversations.data,
  messages: messages.data,
  handoffs: handoffs.data,
  robotConfig: configResult.data,
}, null, 2));
