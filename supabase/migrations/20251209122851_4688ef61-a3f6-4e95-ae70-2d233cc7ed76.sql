-- Insert initial configuration for notification emails if not exists
INSERT INTO public.site_configuration (key, value, description)
VALUES (
  'notification_emails',
  '[]',
  'Lista de emails adicionais para receber notificações de novos cursos'
)
ON CONFLICT (key) DO NOTHING;

-- Add INSERT policy for admins on site_configuration
CREATE POLICY "Admins can insert configuration"
ON public.site_configuration
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));