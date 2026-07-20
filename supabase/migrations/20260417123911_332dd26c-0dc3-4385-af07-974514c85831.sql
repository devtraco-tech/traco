ALTER TABLE public.course_leads ADD COLUMN IF NOT EXISTS kommo_lead_id text;
COMMENT ON COLUMN public.course_leads.kommo_lead_id IS 'ID do lead correspondente no Kommo CRM. NULL = ainda não enviado.';
CREATE INDEX IF NOT EXISTS idx_course_leads_kommo_pending ON public.course_leads(created_at) WHERE kommo_lead_id IS NULL;