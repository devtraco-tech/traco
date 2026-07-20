-- Add column kommo_lead_id to course_leads for reference to Kommo CRM
ALTER TABLE public.course_leads
ADD COLUMN IF NOT EXISTS kommo_lead_id TEXT;

-- optional index for faster lookups
CREATE INDEX IF NOT EXISTS idx_course_leads_kommo_lead_id ON public.course_leads(kommo_lead_id);
