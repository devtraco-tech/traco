-- Robust migration to fix patient schema and enums
-- This handles cases where enums might be in a partial or inconsistent state

-- Extend existing enums without replacing their OIDs. Recreating them would
-- break dependent RLS policies and could rewrite valid patient states.
ALTER TYPE workflow_stage ADD VALUE IF NOT EXISTS 'em_negociacao';
ALTER TYPE reception_status ADD VALUE IF NOT EXISTS 'nao_selecionado';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dentist_status') THEN
        CREATE TYPE dentist_status AS ENUM ('agendado', 'consultou', 'faltou');
    END IF;
END
$$;

-- 4. Add/Ensure all columns
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS mobile_phone TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS treatment_needed TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS kommo_lead_id TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS current_stage workflow_stage DEFAULT 'step1_atendimento';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS reception_status reception_status DEFAULT 'entrada';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS urgency TEXT CHECK (urgency IN ('alta', 'media', 'baixa'));
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS specialties UUID[] DEFAULT '{}';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS treatment_types UUID[] DEFAULT '{}';
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS has_exams BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_history TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chk_necessities BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chk_orientation BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chk_dentaloffice BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS chk_scheduled BOOLEAN DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assigned_clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS assigned_class_id UUID REFERENCES public.clinic_classes(id) ON DELETE SET NULL;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS dentist_status dentist_status DEFAULT 'agendado';

-- Final reload
NOTIFY pgrst, 'reload schema';
