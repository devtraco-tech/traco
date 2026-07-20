-- Drop the existing check constraint and create a new one with lead_confirmation
ALTER TABLE email_templates DROP CONSTRAINT email_templates_type_check;

ALTER TABLE email_templates ADD CONSTRAINT email_templates_type_check 
  CHECK (type = ANY (ARRAY['course_created'::text, 'course_approved'::text, 'course_rejected'::text, 'course_pending_correction'::text, 'lead_confirmation'::text]));

-- Insert default email templates with beautiful HTML designs

-- Template 1: Novo Curso Criado
INSERT INTO email_templates (name, type, subject, html_template, text_template, variables)
VALUES (
  'Notificação de Novo Curso',
  'course_created',
  '📚 Novo Curso Cadastrado: {{course_title}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Curso Cadastrado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📚 Novo Curso Cadastrado</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Aguardando validação dos departamentos</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 30px 0;">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center">
                    <span style="display: inline-block; background-color: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">⏳ Aguardando Validação</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 22px;">{{course_title}}</h2>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 14px;">📋 Área</span><p style="margin: 4px 0 0 0; color: #111827; font-weight: 500;">{{course_area}}</p></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 14px;">👨‍🏫 Professor</span><p style="margin: 4px 0 0 0; color: #111827; font-weight: 500;">{{course_teacher}}</p></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 14px;">🎯 Modalidade</span><p style="margin: 4px 0 0 0; color: #111827; font-weight: 500;">{{course_modality}}</p></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 14px;">⏱️ Carga Horária</span><p style="margin: 4px 0 0 0; color: #111827; font-weight: 500;">{{course_workload}} horas</p></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;"><span style="color: #6b7280; font-size: 14px;">👥 Vagas</span><p style="margin: 4px 0 0 0; color: #111827; font-weight: 500;">{{course_vacancies}}</p></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #6b7280; font-size: 14px;">💰 Investimento</span><p style="margin: 4px 0 0 0; color: #111827; font-weight: 500;">{{course_investment}}</p></td></tr>
              </table>
              <table role="presentation" style="width: 100%; margin-top: 30px;"><tr><td align="center"><a href="{{app_url}}/courses/{{course_id}}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Ver Detalhes do Curso</a></td></tr></table>
            </td>
          </tr>
          <tr><td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 14px; margin: 0;">ABOG - Sistema de Gestão de Cursos</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Novo Curso: {{course_title}} | Área: {{course_area}} | Professor: {{course_teacher}} | {{course_modality}} | {{course_workload}}h | {{course_vacancies}} vagas | {{course_investment}}',
  ARRAY['course_title', 'course_area', 'course_teacher', 'course_modality', 'course_workload', 'course_vacancies', 'course_investment', 'course_id', 'app_url']
);

-- Template 2: Curso Aprovado
INSERT INTO email_templates (name, type, subject, html_template, text_template, variables)
VALUES (
  'Notificação de Curso Aprovado',
  'course_approved',
  '✅ Curso Aprovado: {{course_title}}',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Segoe UI, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <tr><td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 30px; text-align: center;"><div style="font-size: 48px; margin-bottom: 16px;">🎉</div><h1 style="color: #ffffff; margin: 0; font-size: 28px;">Curso Aprovado!</h1><p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Todas as validações foram concluídas</p></td></tr>
          <tr><td style="padding: 30px 30px 0;"><table role="presentation" style="width: 100%;"><tr><td align="center"><span style="display: inline-block; background-color: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">✓ Aprovado por todos os departamentos</span></td></tr></table></td></tr>
          <tr><td style="padding: 30px;"><p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">Olá {{recipient_name}},</p><p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">O curso abaixo foi aprovado e está pronto para ser divulgado:</p><div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; border-left: 4px solid #10b981;"><h2 style="color: #059669; margin: 0 0 16px 0; font-size: 20px;">{{course_title}}</h2><table role="presentation" style="width: 100%;"><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">📋 Área:</span> <span style="color: #111827; font-weight: 500;">{{course_area}}</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">🎯 Modalidade:</span> <span style="color: #111827; font-weight: 500;">{{course_modality}}</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">⏱️ Carga Horária:</span> <span style="color: #111827; font-weight: 500;">{{course_workload}} horas</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">💰 Investimento:</span> <span style="color: #111827; font-weight: 500;">{{course_investment}}</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">📅 Início:</span> <span style="color: #111827; font-weight: 500;">{{course_start_date}}</span></td></tr></table></div><table role="presentation" style="width: 100%; margin-top: 30px;"><tr><td align="center"><a href="{{app_url}}/courses/{{course_id}}" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Ver Curso Aprovado</a></td></tr></table></td></tr>
          <tr><td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 14px; margin: 0;">ABOG - Sistema de Gestão de Cursos</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Curso Aprovado: {{course_title}} | Olá {{recipient_name}}, o curso foi aprovado! | Área: {{course_area}} | {{course_modality}} | {{course_workload}}h | {{course_investment}} | Início: {{course_start_date}}',
  ARRAY['recipient_name', 'course_title', 'course_area', 'course_modality', 'course_workload', 'course_investment', 'course_start_date', 'course_id', 'app_url']
);

-- Template 3: Confirmação de Pré-Cadastro
INSERT INTO email_templates (name, type, subject, html_template, text_template, variables)
VALUES (
  'Confirmação de Pré-Cadastro',
  'lead_confirmation',
  '🎉 Recebemos seu interesse: {{course_title}}',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Segoe UI, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <tr><td style="background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 40px 30px; text-align: center;"><div style="font-size: 48px; margin-bottom: 16px;">🎉</div><h1 style="color: #ffffff; margin: 0; font-size: 28px;">Pré-Cadastro Recebido!</h1><p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Estamos felizes com o seu interesse</p></td></tr>
          <tr><td style="padding: 30px;"><p style="color: #374151; font-size: 18px; margin: 0 0 20px 0;">Olá <strong>{{lead_name}}</strong>,</p><p style="color: #374151; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">Recebemos seu pré-cadastro e estamos muito felizes com o seu interesse! Em breve, nossa equipe entrará em contato.</p><div style="background-color: #faf5ff; border-radius: 12px; padding: 24px; border-left: 4px solid #7c3aed;"><h3 style="color: #7c3aed; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase;">Curso de Interesse</h3><h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">{{course_title}}</h2><table role="presentation" style="width: 100%;"><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">📋 Área:</span> <span style="color: #111827; font-weight: 500;">{{course_area}}</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">🎯 Modalidade:</span> <span style="color: #111827; font-weight: 500;">{{course_modality}}</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">⏱️ Carga Horária:</span> <span style="color: #111827; font-weight: 500;">{{course_workload}} horas</span></td></tr><tr><td style="padding: 8px 0;"><span style="color: #6b7280;">💰 Investimento:</span> <span style="color: #111827; font-weight: 500;">{{course_investment}}</span></td></tr></table></div><div style="margin-top: 30px; padding: 20px; background-color: #f3f4f6; border-radius: 12px;"><h3 style="color: #374151; margin: 0 0 12px 0; font-size: 16px;">📌 Próximos Passos</h3><ul style="color: #6b7280; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;"><li>Nossa equipe analisará seu pré-cadastro</li><li>Você receberá um contato em até 48 horas úteis</li><li>Fique atento ao seu e-mail e telefone</li></ul></div><div style="margin-top: 24px; text-align: center;"><p style="color: #6b7280; font-size: 14px; margin: 0;">Dúvidas? Entre em contato:</p><p style="color: #7c3aed; font-size: 16px; font-weight: 600; margin: 8px 0 0 0;">cursos@abogoias.org.br</p></div></td></tr>
          <tr><td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 14px; margin: 0;">ABOG - Associação Brasileira de Odontologia de Goiás</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Olá {{lead_name}}, recebemos seu pré-cadastro para: {{course_title}} | Área: {{course_area}} | {{course_modality}} | {{course_workload}}h | {{course_investment}} | Entraremos em contato em breve!',
  ARRAY['lead_name', 'lead_email', 'course_title', 'course_area', 'course_modality', 'course_workload', 'course_investment']
);

-- Template 4: Correção Pendente
INSERT INTO email_templates (name, type, subject, html_template, text_template, variables)
VALUES (
  'Solicitação de Correção',
  'course_pending_correction',
  '⚠️ Correção Necessária: {{course_title}}',
  '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: Segoe UI, sans-serif; background-color: #f4f7fa;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);">
          <tr><td style="background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); padding: 40px 30px; text-align: center;"><div style="font-size: 48px; margin-bottom: 16px;">⚠️</div><h1 style="color: #ffffff; margin: 0; font-size: 28px;">Correção Necessária</h1><p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Ajustes solicitados no curso</p></td></tr>
          <tr><td style="padding: 30px;"><p style="color: #374151; font-size: 16px; margin: 0 0 20px 0;">Olá {{recipient_name}},</p><p style="color: #374151; font-size: 16px; margin: 0 0 24px 0;">O curso abaixo precisa de ajustes antes de ser aprovado:</p><div style="background-color: #fffbeb; border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b;"><h2 style="color: #d97706; margin: 0 0 16px 0; font-size: 20px;">{{course_title}}</h2><p style="color: #6b7280; font-size: 14px; margin: 0;">Área: {{course_area}}</p></div><div style="margin-top: 24px; padding: 20px; background-color: #fef3c7; border-radius: 12px;"><h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 16px;">📝 Observações:</h3><p style="color: #78350f; font-size: 14px; margin: 0; line-height: 1.6;">{{correction_notes}}</p></div><table role="presentation" style="width: 100%; margin-top: 30px;"><tr><td align="center"><a href="{{app_url}}/courses/{{course_id}}/edit" style="display: inline-block; background: linear-gradient(135deg, #d97706 0%, #f59e0b 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Editar Curso</a></td></tr></table></td></tr>
          <tr><td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;"><p style="color: #6b7280; font-size: 14px; margin: 0;">ABOG - Sistema de Gestão de Cursos</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>',
  'Correção Necessária: {{course_title}} | Olá {{recipient_name}}, o curso precisa de ajustes. | Área: {{course_area}} | Observações: {{correction_notes}}',
  ARRAY['recipient_name', 'course_title', 'course_area', 'correction_notes', 'course_id', 'app_url']
);