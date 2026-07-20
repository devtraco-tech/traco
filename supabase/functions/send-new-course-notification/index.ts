import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CourseNotificationRequest {
  course_id: string;
}

serve(async (req) => {
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

    const { course_id }: CourseNotificationRequest = await req.json();

    if (!course_id) {
      throw new Error("course_id is required");
    }

    console.log("[send-new-course-notification] Processing course:", course_id);


    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("*, teacher:teachers(name)")
      .eq("id", course_id)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
    }

    console.log("[send-new-course-notification] Course found:", course.title);

    // Try to use new notification groups system first
    let notificationGroups: any[] = [];
    try {
      const { data: groups, error: groupsError } = await supabase
        .from("notification_groups")
        .select("*, template:email_templates(*)")
        .eq("trigger_type", "course_created")
        .eq("is_enabled", true);

      if (!groupsError && groups && groups.length > 0) {
        notificationGroups = groups;
        console.log(`[send-new-course-notification] Found ${groups.length} notification groups`);
      }
    } catch {
      console.log("[send-new-course-notification] notification_groups table not available yet");
    }

    // Get recipient emails - either from groups or fallback to admin/staff
    let recipientEmails: string[] = [];

    if (notificationGroups.length > 0) {
      notificationGroups.forEach((group: any) => {
        if (group.emails && Array.isArray(group.emails)) {
          group.emails.forEach((email: string) => {
            if (email && !recipientEmails.includes(email)) {
              recipientEmails.push(email);
            }
          });
        }
      });
    }

    // Fallback to admin/staff users if no groups configured
    if (recipientEmails.length === 0) {
      console.log("[send-new-course-notification] Using admin/staff fallback");
      const { data: adminUsers } = await supabase
        .from("user_roles")
        .select("user_id, profiles:user_id(email, name)")
        .in("role", ["admin", "staff"]);

      if (adminUsers) {
        adminUsers.forEach((user: any) => {
          if (user.profiles?.email && !recipientEmails.includes(user.profiles.email)) {
            recipientEmails.push(user.profiles.email);
          }
        });
      }
    }

    if (recipientEmails.length === 0) {
      console.log("[send-new-course-notification] No recipients found");
      return new Response(
        JSON.stringify({ success: true, message: "No recipients found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      console.log("[send-new-course-notification] Using default site URL");
    }

    // Format course data for template variables
    const modalityLabels: Record<string, string> = {
      presencial: "Presencial",
      online: "Online",
      hibrido: "Híbrido",
    };

    const formattedInvestment = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(course.investment || 0);

    // Template variables that can be used in dynamic templates
    const templateVariables = {
      course_title: course.title,
      course_area: course.area,
      course_teacher: course.teacher?.name || "Não definido",
      course_modality: modalityLabels[course.modality] || course.modality,
      course_workload: course.workload || 0,
      course_vacancies: course.vacancies || 0,
      course_investment: formattedInvestment,
      course_id: course_id,
      app_url: siteUrl,
    };

    let emailSubject: string;
    let emailHtml: string;

    // If using dynamic template, render it; otherwise use default
    if (notificationGroups.length > 0 && notificationGroups[0].template) {
      const template = notificationGroups[0].template;
      emailSubject = renderTemplate(template.subject, templateVariables);
      emailHtml = renderTemplate(template.html_template, templateVariables);
      console.log("[send-new-course-notification] Using custom template:", template.name);
    } else {
      // Default template
      emailSubject = `🆕 Novo Curso Cadastrado: ${course.title}`;
      emailHtml = getDefaultCourseTemplate(course, templateVariables);
    }

    // Send email via Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log("[send-new-course-notification] RESEND_API_KEY not configured, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "Email skipped - API key not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ABO Goiás - Cursos <sistema@abogoias.org.br>",
        to: recipientEmails,
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("[send-new-course-notification] Error sending email:", emailData);
      throw new Error(`Failed to send email: ${emailData.message || "Unknown error"}`);
    }

    console.log(`[send-new-course-notification] Email sent to ${recipientEmails.length} recipients`);

    return new Response(
      JSON.stringify({ success: true, emailId: emailData?.id, recipients: recipientEmails.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-new-course-notification] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

function getDefaultCourseTemplate(course: any, vars: Record<string, any>): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .course-title { font-size: 20px; color: #1e40af; margin-bottom: 20px; }
        .detail-row { display: flex; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-label { font-weight: bold; color: #64748b; width: 140px; flex-shrink: 0; }
        .detail-value { color: #1e293b; }
        .cta-button { display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🆕 Novo Curso Cadastrado</h1>
        </div>
        <div class="content">
          <div class="course-title">${vars.course_title}</div>
          <span class="badge">Aguardando Validação</span>
          
          <div style="margin-top: 24px;">
            <div class="detail-row">
              <span class="detail-label">Área:</span>
              <span class="detail-value">${vars.course_area}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Professor:</span>
              <span class="detail-value">${vars.course_teacher}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Modalidade:</span>
              <span class="detail-value">${vars.course_modality}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Carga Horária:</span>
              <span class="detail-value">${vars.course_workload} horas</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Vagas:</span>
              <span class="detail-value">${vars.course_vacancies}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Investimento:</span>
              <span class="detail-value">${vars.course_investment}</span>
            </div>
          </div>

          <p style="margin-top: 24px; color: #64748b;">
            Um novo curso foi cadastrado no sistema e está aguardando validação dos departamentos.
          </p>

          <center>
            <a href="${vars.app_url}/courses/${vars.course_id}" class="cta-button">
              Ver Detalhes do Curso
            </a>
          </center>
        </div>
        <div class="footer">
          <p>Este é um email automático do sistema ABOG.</p>
          <p>© ${new Date().getFullYear()} ABOG - Todos os direitos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
