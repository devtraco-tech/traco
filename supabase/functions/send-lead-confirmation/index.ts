import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadConfirmationRequest {
  lead_id: string;
  lead_name: string;
  lead_email: string;
  course_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Only allow server-to-server calls authenticated with the service role key
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token || token !== supabaseKey) {
      console.warn('Unauthorized call to send-lead-confirmation');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { lead_id, lead_name, lead_email, course_id }: LeadConfirmationRequest = await req.json();

    console.log('Sending lead confirmation email:', { lead_id, lead_name, lead_email, course_id });

    // Validate the lead actually exists and the email matches the stored record
    const { data: lead, error: leadError } = await supabase
      .from('course_leads')
      .select('id, email, course_id')
      .eq('id', lead_id)
      .maybeSingle();

    if (leadError || !lead) {
      console.error('Lead not found:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Lead not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if ((lead.email || '').toLowerCase().trim() !== (lead_email || '').toLowerCase().trim()) {
      console.warn('Lead email mismatch');
      return new Response(
        JSON.stringify({ success: false, error: 'Email mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*, teachers(name)')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      console.error('Course not found:', courseError);
      return new Response(
        JSON.stringify({ success: false, error: 'Course not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format modality
    const modalityLabels: Record<string, string> = {
      presencial: 'Presencial',
      online: 'Online',
      hibrido: 'Híbrido'
    };

    // Format investment
    const formattedInvestment = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(course.investment);

    // Template variables
    const templateVariables: Record<string, string> = {
      lead_name: lead_name,
      lead_email: lead_email,
      course_title: course.title,
      course_area: course.area,
      course_modality: modalityLabels[course.modality] || course.modality,
      course_workload: String(course.workload),
      course_investment: formattedInvestment
    };

    // Try to fetch custom template from notification_groups
    let emailSubject = `🎉 Recebemos seu interesse: ${course.title}`;
    let emailHtml = '';

    try {
      const { data: notificationGroups } = await supabase
        .from('notification_groups')
        .select('*, email_templates(*)')
        .eq('trigger_type', 'lead_confirmation')
        .eq('is_enabled', true)
        .limit(1);

      if (notificationGroups && notificationGroups.length > 0 && (notificationGroups[0] as any).email_templates) {
        const template = (notificationGroups[0] as any).email_templates;
        emailSubject = renderTemplate(template.subject, templateVariables);
        emailHtml = renderTemplate(template.html_template, templateVariables);
        console.log('Using custom template for lead confirmation');
      }
    } catch (templateError) {
      console.log('No custom template found, using default');
    }

    // If no custom template, use default
    if (!emailHtml) {
      // Try to get template directly from email_templates
      const { data: templates } = await supabase
        .from('email_templates')
        .select('*')
        .eq('type', 'lead_confirmation')
        .limit(1);

      if (templates && templates.length > 0) {
        const template = templates[0];
        emailSubject = renderTemplate(template.subject, templateVariables);
        emailHtml = renderTemplate(template.html_template, templateVariables);
        console.log('Using template from email_templates table');
      } else {
        emailHtml = getDefaultLeadConfirmationTemplate(templateVariables);
        console.log('Using hardcoded default template');
      }
    }

    // Send email using Resend API directly
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email send');
      return new Response(
        JSON.stringify({ success: true, message: 'Email would be sent (RESEND_API_KEY not configured)' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ABO Goiás - Cursos <sistema@abogoias.org.br>',
        to: [lead_email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('Resend API error:', emailResult);
      throw new Error(emailResult.message || 'Failed to send email');
    }

    console.log('Lead confirmation email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error sending lead confirmation email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to render template with variables
function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    rendered = rendered.replace(regex, String(value ?? ''));
  }
  return rendered;
}

// Default template when no custom template is configured
function getDefaultLeadConfirmationTemplate(vars: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Segoe UI, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <tr><td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;"><div style="font-size: 48px; margin-bottom: 16px;">🎉</div><h1 style="color: #ffffff; margin: 0; font-size: 28px;">Pré-Cadastro Recebido!</h1><p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Estamos felizes com o seu interesse</p></td></tr>
          <tr><td style="padding: 30px;">
            <p style="color: #374151; font-size: 18px; margin: 0 0 20px 0;">Olá <strong>${vars.lead_name}</strong>,</p>
            <p style="color: #374151; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">Recebemos seu pré-cadastro e estamos muito felizes com o seu interesse! Em breve, nossa equipe entrará em contato.</p>
            <div style="background-color: #faf5ff; border-radius: 12px; padding: 24px; border-left: 4px solid #7c3aed;">
              <h3 style="color: #7c3aed; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase;">Curso de Interesse</h3>
              <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">${vars.course_title}</h2>
              <table role="presentation" style="width: 100%;">
                <tr><td style="padding: 8px 0;"><span style="color: #6b7280;">📋 Área:</span> <span style="color: #111827; font-weight: 500;">${vars.course_area}</span></td></tr>
                <tr><td style="padding: 8px 0;"><span style="color: #6b7280;">🎯 Modalidade:</span> <span style="color: #111827; font-weight: 500;">${vars.course_modality}</span></td></tr>
                <tr><td style="padding: 8px 0;"><span style="color: #6b7280;">⏱️ Carga Horária:</span> <span style="color: #111827; font-weight: 500;">${vars.course_workload} horas</span></td></tr>
                <tr><td style="padding: 8px 0;"><span style="color: #6b7280;">💰 Investimento:</span> <span style="color: #111827; font-weight: 500;">${vars.course_investment}</span></td></tr>
              </table>
            </div>
            <div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 12px;">
              <h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">📌 Próximos Passos</h3>
              <ul style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Nossa equipe analisará seu pré-cadastro</li>
                <li>Você receberá um contato em até 48 horas úteis</li>
                <li>Fique atento ao seu e-mail e telefone</li>
              </ul>
            </div>
            <div style="margin-top: 24px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">Dúvidas? Entre em contato:</p>
              <p style="color: #7c3aed; font-size: 16px; font-weight: 600; margin: 8px 0 0 0;">cursos@abogoias.org.br</p>
            </div>
          </td></tr>
          <tr><td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 14px; margin: 0;">ABOG - Associação Brasileira de Odontologia de Goiás</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
