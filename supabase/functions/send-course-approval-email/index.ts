import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  course_id: string;
  recipient_email?: string; // Optional - will use notification groups if not provided
  recipient_name?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (service role)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Require an authenticated admin/staff caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "staff"]);
    if (!roleRows || roleRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { course_id, recipient_email, recipient_name }: EmailRequest = await req.json();

    if (!course_id) {
      return new Response(
        JSON.stringify({ error: "course_id is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`[send-course-approval-email] Processing approval for course ${course_id}`);

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("id, title, area, modality, workload, investment, effective_start_date, description")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      console.error("[send-course-approval-email] Course not found:", courseError);
      return new Response(
        JSON.stringify({ error: "Course not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch notification groups with their emails
    let notificationGroups: any[] = [];
    let recipientEmails: string[] = [];
    
    try {
      const { data: groups, error: groupsError } = await supabase
        .from("notification_groups")
        .select("*, template:email_templates(*)")
        .eq("trigger_type", "course_approved")
        .eq("is_enabled", true);

      if (!groupsError && groups && groups.length > 0) {
        notificationGroups = groups;
        console.log(`[send-course-approval-email] Found ${groups.length} notification groups`);
        
        // Collect all unique emails from notification groups
        groups.forEach((group: any) => {
          if (group.emails && Array.isArray(group.emails)) {
            group.emails.forEach((email: string) => {
              if (email && !recipientEmails.includes(email)) {
                recipientEmails.push(email);
              }
            });
          }
        });
        console.log(`[send-course-approval-email] Found ${recipientEmails.length} recipients from groups`);
      }
    } catch {
      console.log("[send-course-approval-email] notification_groups table not available yet");
    }

    // Fallback to provided recipient_email if no groups configured
    if (recipientEmails.length === 0 && recipient_email) {
      recipientEmails = [recipient_email];
      console.log("[send-course-approval-email] Using provided recipient_email as fallback");
    }

    // If still no recipients, skip sending
    if (recipientEmails.length === 0) {
      console.log("[send-course-approval-email] No recipients found, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch site URL from configuration
    let siteUrl = "https://abogoias.org.br"; // Default fallback
    try {
      const { data: siteConfig } = await supabase
        .from("site_configuration")
        .select("value")
        .eq("key", "site_url")
        .single();
      
      if (siteConfig?.value) {
        siteUrl = siteConfig.value;
      }
    } catch {
      console.log("[send-course-approval-email] Using default site URL");
    }

    // Format course data for template variables
    const startDate = course.effective_start_date 
      ? (() => {
          const [year, month, day] = course.effective_start_date.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString("pt-BR");
        })()
      : "A definir";

    const investment = course.investment 
      ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(course.investment)
      : "A consultar";

    const templateVariables = {
      recipient_name: recipient_name || "Usuário",
      course_title: course.title,
      course_area: course.area,
      course_modality: course.modality,
      course_workload: course.workload || 0,
      course_investment: investment,
      course_start_date: startDate,
      course_id: course_id,
      app_url: siteUrl,
    };

    let emailSubject: string;
    let emailHtml: string;

    // Use custom template if available
    if (notificationGroups.length > 0 && notificationGroups[0].template) {
      const template = notificationGroups[0].template;
      emailSubject = renderTemplate(template.subject, templateVariables);
      emailHtml = renderTemplate(template.html_template, templateVariables);
      console.log("[send-course-approval-email] Using custom template:", template.name);
    } else {
      // Default template
      emailSubject = `✅ Curso Aprovado: ${course.title}`;
      emailHtml = getDefaultApprovalTemplate(course, templateVariables, recipient_name);
    }

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.log("[send-course-approval-email] RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - API key not configured" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ABO Goiás - Cursos <sistema@abogoias.org.br>",
        to: recipientEmails,
        subject: emailSubject,
        html: emailHtml,
      }),
    });
    
    console.log(`[send-course-approval-email] Sending to: ${recipientEmails.join(', ')}`);

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.text();
      console.error("[send-course-approval-email] Resend error:", errorBody);
      throw new Error(`Failed to send email: ${resendResponse.status}`);
    }

    const emailResponse = await resendResponse.json();
    console.log("[send-course-approval-email] Email sent successfully");

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.id }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("[send-course-approval-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

// Helper functions
function renderTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(String(value));
  }
  return result;
}

function getDefaultApprovalTemplate(course: any, vars: Record<string, any>, recipientName?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Curso Aprovado - ABOG</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f4; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">🎉 Curso Aprovado!</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Olá${recipientName ? ` <strong>${recipientName}</strong>` : ''},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                Temos o prazer de informar que seu curso foi <strong style="color: #059669;">aprovado</strong> e está pronto para ser publicado!
              </p>
              
              <!-- Course Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 24px;">
                    <h2 style="color: #1e3a8a; margin: 0 0 16px; font-size: 20px; font-weight: 700;">
                      ${vars.course_title}
                    </h2>
                    
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="padding: 8px 0; vertical-align: top;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Área</p>
                          <p style="color: #374151; font-size: 14px; margin: 4px 0 0; font-weight: 600;">${vars.course_area}</p>
                        </td>
                        <td width="50%" style="padding: 8px 0; vertical-align: top;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Modalidade</p>
                          <p style="color: #374151; font-size: 14px; margin: 4px 0 0; font-weight: 600;">${vars.course_modality}</p>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" style="padding: 8px 0; vertical-align: top;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Carga Horária</p>
                          <p style="color: #374151; font-size: 14px; margin: 4px 0 0; font-weight: 600;">${vars.course_workload}h</p>
                        </td>
                        <td width="50%" style="padding: 8px 0; vertical-align: top;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Início</p>
                          <p style="color: #374151; font-size: 14px; margin: 4px 0 0; font-weight: 600;">${vars.course_start_date}</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 8px 0; vertical-align: top;">
                          <p style="color: #6b7280; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Investimento</p>
                          <p style="color: #059669; font-size: 18px; margin: 4px 0 0; font-weight: 700;">${vars.course_investment}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                O curso agora está disponível para visualização no site. Em caso de dúvidas, entre em contato conosco.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} ABOG - Academia Brasileira de Odontologia de Grupo
              </p>
              <p style="color: #9ca3af; font-size: 11px; margin: 8px 0 0;">
                Este é um e-mail automático, por favor não responda.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
