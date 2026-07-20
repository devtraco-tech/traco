ALTER TABLE public.patient_leads ADD COLUMN IF NOT EXISTS cpf text;
CREATE INDEX IF NOT EXISTS idx_patient_leads_cpf ON public.patient_leads(cpf);