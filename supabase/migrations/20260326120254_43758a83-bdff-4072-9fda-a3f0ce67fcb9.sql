
ALTER TABLE public.old_contacts ADD COLUMN IF NOT EXISTS kommo_sent boolean NOT NULL DEFAULT false;
ALTER TABLE public.patient_leads ADD COLUMN IF NOT EXISTS kommo_lead_id text;
