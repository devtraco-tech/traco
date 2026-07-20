import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PatientLeadRequest {
  full_name: string;
  cpf?: string;
  mobile_phone: string;
  landline_phone?: string;
  gender: string;
  birth_date: string;
  state: string;
  city: string;
  message: string;
}

const normalizeCpf = (s: string | null | undefined): string =>
  (s ? String(s) : "").replace(/\D/g, "");

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const leadData: PatientLeadRequest = await req.json();
    console.log("Received patient lead data:", leadData);

    if (!leadData.full_name || leadData.full_name.length < 2) {
      throw new Error("Nome completo é obrigatório");
    }
    if (!leadData.mobile_phone || leadData.mobile_phone.length < 10) {
      throw new Error("Celular é obrigatório");
    }
    if (!leadData.gender) throw new Error("Sexo é obrigatório");
    if (!leadData.birth_date) throw new Error("Data de nascimento é obrigatória");
    if (!leadData.state) throw new Error("Estado é obrigatório");
    if (!leadData.city) throw new Error("Cidade é obrigatória");
    if (!leadData.message) throw new Error("Mensagem é obrigatória");

    const cpfNorm = normalizeCpf(leadData.cpf);
    if (!cpfNorm || cpfNorm.length !== 11) {
      throw new Error("CPF é obrigatório e deve conter 11 dígitos");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("patient_leads")
      .insert({
        full_name: leadData.full_name.trim(),
        cpf: cpfNorm,
        mobile_phone: leadData.mobile_phone.trim(),
        landline_phone: leadData.landline_phone?.trim() || null,
        gender: leadData.gender,
        birth_date: leadData.birth_date,
        state: leadData.state,
        city: leadData.city,
        message: leadData.message.trim(),
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      throw new Error("Erro ao salvar os dados. Tente novamente.");
    }

    console.log("Lead inserted successfully:", lead.id);

    // Auto-create / reactivate patient in Fila 1 (Recepção)
    try {
      const cpfFormatted = `${cpfNorm.slice(0,3)}.${cpfNorm.slice(3,6)}.${cpfNorm.slice(6,9)}-${cpfNorm.slice(9,11)}`;
      const { data: existing } = await supabase
        .from("patients")
        .select("id, current_stage")
        .or(`cpf.eq.${cpfNorm},cpf.eq.${cpfFormatted}`)
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const { error: patientErr } = await supabase.from("patients").insert({
          full_name: leadData.full_name.trim(),
          cpf: cpfNorm,
          mobile_phone: leadData.mobile_phone.trim(),
          phone: leadData.landline_phone?.trim() || null,
          gender: leadData.gender,
          birth_date: leadData.birth_date,
          state: leadData.state,
          city: leadData.city,
          treatment_needed: leadData.message.trim(),
          current_stage: "step1_atendimento",
          reception_status: "entrada",
        });
        if (patientErr) {
          console.error("Failed to auto-create patient in Fila 1:", patientErr);
        } else {
          console.log("Patient auto-created in Fila 1");
        }
      } else {
        // Patient already exists. If it is no longer in Fila 1 (archived or
        // moved to a previous flow), bring it back so the reception sees the
        // new contact. Keep the latest phone for the WhatsApp link.
        const stage = (existing as any).current_stage;
        if (stage === "arquivado" || !stage) {
          const { error: reErr } = await supabase
            .from("patients")
            .update({
              current_stage: "step1_atendimento",
              reception_status: "entrada",
              mobile_phone: leadData.mobile_phone.trim(),
            })
            .eq("id", (existing as any).id);
          if (reErr) {
            console.error("Failed to reactivate patient to Fila 1:", reErr);
          } else {
            console.log("Existing patient reactivated to Fila 1");
          }
        } else {
          console.log("Patient with this CPF already active in flow, skipping auto-create");
        }
      }
    } catch (autoErr) {
      console.error("Error in auto-create patient flow:", autoErr);
    }


    // Send to Kommo CRM
    try {
      const kommoPayload = {
        type: "new" as const,
        name: leadData.full_name,
        phone: leadData.mobile_phone,
        landline_phone: leadData.landline_phone || undefined,
        city: leadData.city,
        state: leadData.state,
        message: leadData.message,
        gender: leadData.gender,
        birth_date: leadData.birth_date,
        lead_id: lead.id,
      };

      const kommoRes = await fetch(`${supabaseUrl}/functions/v1/kommo-patient-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(kommoPayload),
      });

      if (kommoRes.ok) {
        console.log("Lead sent to Kommo successfully");
      } else {
        console.error("Failed to send lead to Kommo:", await kommoRes.text());
      }
    } catch (kommoErr) {
      console.error("Error sending to Kommo:", kommoErr);
    }

    // Get active notification emails
    const { data: notificationEmails, error: emailsError } = await supabase
      .from("patient_notification_emails")
      .select("email, name")
      .eq("is_active", true);

    if (emailsError) {
      console.error("Error fetching notification emails:", emailsError);
    }

    // Send email notifications if there are configured emails
    if (notificationEmails && notificationEmails.length > 0) {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        
        const genderLabels: Record<string, string> = {
          male: "Masculino",
          female: "Feminino",
          other: "Outro",
        };

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d; border-bottom: 2px solid #3182ce; padding-bottom: 10px;">
              Novo Contato de Paciente
            </h2>
            
            <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2d3748; margin-top: 0;">Dados do Paciente</h3>
              
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #718096; width: 140px;">Nome Completo:</td>
                  <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${leadData.full_name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Celular:</td>
                  <td style="padding: 8px 0; color: #2d3748; font-weight: bold;">${leadData.mobile_phone}</td>
                </tr>
                ${leadData.landline_phone ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Telefone Fixo:</td>
                  <td style="padding: 8px 0; color: #2d3748;">${leadData.landline_phone}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Sexo:</td>
                  <td style="padding: 8px 0; color: #2d3748;">${genderLabels[leadData.gender] || leadData.gender}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Data de Nascimento:</td>
                  <td style="padding: 8px 0; color: #2d3748;">${new Date(leadData.birth_date).toLocaleDateString('pt-BR')}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">Localização:</td>
                  <td style="padding: 8px 0; color: #2d3748;">${leadData.city}, ${leadData.state}</td>
                </tr>
              </table>
            </div>
            
            <div style="background-color: #ebf8ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3182ce;">
              <h3 style="color: #2b6cb0; margin-top: 0;">Tratamento Desejado</h3>
              <p style="color: #2d3748; line-height: 1.6; margin: 0;">${leadData.message}</p>
            </div>
            
            <p style="color: #a0aec0; font-size: 12px; margin-top: 30px; text-align: center;">
              Este é um email automático enviado pelo sistema de gestão de pacientes.
            </p>
          </div>
        `;

        const toEmails = notificationEmails.map(e => e.email);
        console.log("Sending notification to emails:", toEmails);

        try {
          const emailResponse = await resend.emails.send({
            from: "Pacientes ABOG <sistema@abogoias.org.br>",
            to: toEmails,
            subject: `Novo Contato de Paciente: ${leadData.full_name}`,
            html: emailHtml,
          });

          console.log("Email sent successfully:", emailResponse);
        } catch (emailError) {
          console.error("Error sending email:", emailError);
          // Don't throw - the lead was saved successfully
        }
      } else {
        console.warn("RESEND_API_KEY not configured, skipping email notification");
      }
    } else {
      console.log("No active notification emails configured");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Dados enviados com sucesso! Entraremos em contato em breve.",
        id: lead.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-patient-lead:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
