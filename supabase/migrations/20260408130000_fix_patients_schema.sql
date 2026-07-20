-- Robust migration to fix patient schema and enums
-- This handles cases where enums might be in a partial or inconsistent state

DO $$ 
BEGIN
    -- 1. Fix workflow_stage enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_stage') THEN
        ALTER TYPE workflow_stage RENAME TO workflow_stage_bkp;
        CREATE TYPE workflow_stage AS ENUM ('step1_atendimento', 'step2_triagem_clinica', 'step3_selecao_cap', 'em_atendimento', 'arquivado', 'em_negociacao');
        
        ALTER TABLE public.patients ALTER COLUMN current_stage DROP DEFAULT;
        ALTER TABLE public.patients ALTER COLUMN current_stage TYPE workflow_stage 
            USING (CASE WHEN current_stage::text IN ('step1_atendimento', 'step2_triagem_clinica', 'step3_selecao_cap', 'em_negociacao') 
                   THEN current_stage::text::workflow_stage ELSE 'step1_atendimento'::workflow_stage END);
        ALTER TABLE public.patients ALTER COLUMN current_stage SET DEFAULT 'step1_atendimento';
        
        DROP TYPE workflow_stage_bkp;
    ELSE
        CREATE TYPE workflow_stage AS ENUM ('step1_atendimento', 'step2_triagem_clinica', 'step3_selecao_cap', 'em_atendimento', 'arquivado', 'em_negociacao');
    END IF;

    -- 2. Fix reception_status enum
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reception_status') THEN
        ALTER TYPE reception_status RENAME TO reception_status_bkp;
        CREATE TYPE reception_status AS ENUM ('entrada', 'contato_realizado', 'faltou', 'nao_selecionado');
        
        ALTER TABLE public.patients ALTER COLUMN reception_status DROP DEFAULT;
        ALTER TABLE public.patients ALTER COLUMN reception_status TYPE reception_status 
            USING (CASE WHEN reception_status::text IN ('entrada', 'contato_realizado', 'faltou', 'nao_selecionado') 
                   THEN reception_status::text::reception_status ELSE 'entrada'::reception_status END);
        ALTER TABLE public.patients ALTER COLUMN reception_status SET DEFAULT 'entrada';
        
        DROP TYPE reception_status_bkp;
    ELSE
        CREATE TYPE reception_status AS ENUM ('entrada', 'contato_realizado', 'faltou', 'nao_selecionado');
    END IF;

    -- 3. Ensure dentist_status exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'dentist_status') THEN
        CREATE TYPE dentist_status AS ENUM ('agendado', 'consultou', 'faltou');
    END IF;
END $$;

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
