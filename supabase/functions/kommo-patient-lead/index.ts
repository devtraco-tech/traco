// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const KOMMO_BASE_URL = "https://cursosabogoiasorgbr.kommo.com/api/v4";
const PIPELINE_ID = 13273332;

interface PatientLeadData {
  type: "new" | "old";
  name: string;
  phone: string;
  landline_phone?: string;
  city?: string;
  state?: string;
  message?: string;
  gender?: string;
  birth_date?: string;
  // For tracking
  lead_id?: string; // patient_leads id
  old_contact_id?: string; // old_contacts id
}

async function getKommoHeaders(): Promise<Record<string, string>> {
  const token = Deno.env.get("KOMMO_ACCESS_TOKEN") || Deno.env.get("KOMMO_API_TOKEN");
  if (!token) throw new Error("KOMMO_ACCESS_TOKEN not configured");
  return {
    accept: "application/json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };
}

async function getPipelineStatuses(headers: Record<string, string>): Promise<any[]> {
  const res = await fetch(`${KOMMO_BASE_URL}/leads/pipelines/${PIPELINE_ID}`, { headers });
  if (!res.ok) throw new Error(`Failed to get pipeline: ${res.status}`);
  const data = await res.json();
  return data._embedded?.statuses || [];
}

async function getOrCreateStatusId(
  supabase: any,
  headers: Record<string, string>,
  type: "new" | "old"
): Promise<number> {
  const configKey = type === "new" ? "kommo_patient_contato_inicial_status_id" : "kommo_patient_antigos_status_id";

  // Check site_configuration first
  const { data: config } = await supabase
    .from("site_configuration")
    .select("value")
    .eq("key", configKey)
    .single();

  if (config?.value) {
    return parseInt(config.value);
  }

  // Fetch pipeline statuses
  const statuses = await getPipelineStatuses(headers);
  console.log("Pipeline statuses:", JSON.stringify(statuses.map((s: any) => ({ id: s.id, name: s.name }))));

  if (type === "new") {
    // Find "Contato inicial" status
    const status = statuses.find((s: any) => 
      s.name.toLowerCase().includes("contato inicial")
    );
    if (!status) {
      // Use first non-default status or first status
      const firstStatus = statuses.find((s: any) => s.id !== 142 && s.id !== 143) || statuses[0];
      console.log("Using first status as Contato inicial:", firstStatus.id, firstStatus.name);
      await saveConfig(supabase, configKey, String(firstStatus.id), "Kommo Pipeline Pacientes - Status Contato inicial");
      return firstStatus.id;
    }
    await saveConfig(supabase, configKey, String(status.id), "Kommo Pipeline Pacientes - Status Contato inicial");
    return status.id;
  } else {
    // Find or create "Contatos antigos" status
    const existing = statuses.find((s: any) => 
      s.name.toLowerCase().includes("contatos antigos")
    );
    if (existing) {
      await saveConfig(supabase, configKey, String(existing.id), "Kommo Pipeline Pacientes - Status Contatos antigos");
      return existing.id;
    }

    // Create the status
    console.log("Creating 'Contatos antigos' status in pipeline...");
    const createRes = await fetch(`${KOMMO_BASE_URL}/leads/pipelines/${PIPELINE_ID}/statuses`, {
      method: "POST",
      headers,
      body: JSON.stringify([{
        name: "Contatos antigos",
        sort: 100,
        color: "#c1c1c1",
      }]),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Failed to create status:", errText);
      throw new Error(`Failed to create Kommo status: ${createRes.status}`);
    }

    const createData = await createRes.json();
    const newStatus = createData._embedded?.statuses?.[0];
    if (!newStatus?.id) throw new Error("Failed to get created status ID");

    console.log("Created status 'Contatos antigos' with ID:", newStatus.id);
    await saveConfig(supabase, configKey, String(newStatus.id), "Kommo Pipeline Pacientes - Status Contatos antigos");
    return newStatus.id;
  }
}

async function saveConfig(supabase: any, key: string, value: string, description: string) {
  // Try update first
  const { data: existing } = await supabase
    .from("site_configuration")
    .select("id")
    .eq("key", key)
    .single();

  if (existing) {
    await supabase.from("site_configuration").update({ value }).eq("key", key);
  } else {
    await supabase.from("site_configuration").insert({ key, value, description });
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Support single or batch
    const leads: PatientLeadData[] = Array.isArray(body) ? body : [body];
    
    console.log(`Processing ${leads.length} patient lead(s) for Kommo`);

    const kommoHeaders = await getKommoHeaders();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: any[] = [];

    for (const lead of leads) {
      try {
        const statusId = await getOrCreateStatusId(supabase, kommoHeaders, lead.type);

        const tag = lead.type === "new" ? "PACIENTE SITE" : "PACIENTE ANTIGO";
        const leadName = lead.type === "new"
          ? `Paciente Site - ${lead.name}`
          : `Contato Antigo - ${lead.name}`;

        // Build contact custom fields
        const contactCustomFields: any[] = [];
        const phoneValues: any[] = [];
        
        const cleanPhone = lead.phone.replace(/\D/g, "");
        if (cleanPhone) {
          phoneValues.push({
            value: cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`,
            enum_code: "MOB",
          });
        }

        if (lead.landline_phone) {
          const cleanLandline = lead.landline_phone.replace(/\D/g, "");
          if (cleanLandline) {
            phoneValues.push({
              value: cleanLandline.startsWith("55") ? cleanLandline : `55${cleanLandline}`,
              enum_code: "HOME",
            });
          }
        }

        if (phoneValues.length > 0) {
          contactCustomFields.push({
            field_id: 263914,
            values: phoneValues,
          });
        }

        // Build lead note with all info
        const noteLines = [];
        if (lead.city && lead.state) noteLines.push(`📍 ${lead.city}, ${lead.state}`);
        if (lead.message) noteLines.push(`💬 ${lead.message}`);
        if (lead.gender) noteLines.push(`👤 ${lead.gender}`);
        if (lead.birth_date) noteLines.push(`🎂 ${lead.birth_date}`);

        const kommoPayload = [{
          name: leadName,
          price: 0,
          pipeline_id: PIPELINE_ID,
          status_id: statusId,
          _embedded: {
            tags: [{ name: tag }],
            contacts: [{
              name: lead.name,
              custom_fields_values: contactCustomFields,
            }],
          },
        }];

        const res = await fetch(`${KOMMO_BASE_URL}/leads/complex`, {
          method: "POST",
          headers: kommoHeaders,
          body: JSON.stringify(kommoPayload),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`Kommo error for ${lead.name}:`, errText);
          results.push({ success: false, name: lead.name, error: errText });
          continue;
        }

        const kommoData = await res.json();
        const kommoLeadId = kommoData?._embedded?.leads?.[0]?.id ?? kommoData?.[0]?.id ?? kommoData?.id;
        
        if (!kommoLeadId) {
          console.error(`Lead NOT created (no ID in response): ${lead.name}`, JSON.stringify(kommoData));
          results.push({ success: false, name: lead.name, error: "No ID returned from Kommo", data: kommoData });
          continue;
        }

        console.log(`Lead created in Kommo: ${lead.name} -> ${kommoLeadId}`);

        // Add note to lead if we have extra info
        if (noteLines.length > 0 && kommoLeadId) {
          try {
            await fetch(`${KOMMO_BASE_URL}/leads/${kommoLeadId}/notes`, {
              method: "POST",
              headers: kommoHeaders,
              body: JSON.stringify([{
                note_type: "common",
                params: { text: noteLines.join("\n") },
              }]),
            });
          } catch (noteErr) {
            console.error("Failed to add note:", noteErr);
          }
        }

        // Update tracking in DB
        if (lead.lead_id && kommoLeadId) {
          await supabase
            .from("patient_leads")
            .update({ kommo_lead_id: String(kommoLeadId) })
            .eq("id", lead.lead_id);
        }
        if (lead.old_contact_id) {
          await supabase
            .from("old_contacts")
            .update({ kommo_sent: true })
            .eq("id", lead.old_contact_id);
        }

        results.push({ success: true, name: lead.name, kommo_lead_id: kommoLeadId });

        // Rate limiting: 100ms delay between requests
        if (leads.length > 1) {
          await new Promise(r => setTimeout(r, 150));
        }
      } catch (leadErr: any) {
        console.error(`Error processing lead ${lead.name}:`, leadErr);
        results.push({ success: false, name: lead.name, error: leadErr.message });
      }
    }

    const hasFailures = results.some(r => !r.success);
    const allFailed = results.length > 0 && results.every(r => !r.success);

    return new Response(
      JSON.stringify({ 
        success: !allFailed, 
        hasFailures,
        results 
      }),
      { 
        status: allFailed ? 400 : (hasFailures ? 207 : 200), 
        headers: { "Content-Type": "application/json", ...corsHeaders } 
      }
    );
  } catch (error: any) {
    console.error("Error in kommo-patient-lead:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
