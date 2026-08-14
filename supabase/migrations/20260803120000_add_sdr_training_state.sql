-- US-03: deterministic commercial flow and protected enrollment data.

ALTER TABLE public.sdr_conversations
  ADD COLUMN IF NOT EXISTS flow_stage TEXT NOT NULL DEFAULT 'presentation'
    CHECK (flow_stage IN (
      'presentation',
      'qualification',
      'profile',
      'match',
      'enrollment',
      'completed',
      'disqualified'
    )),
  ADD COLUMN IF NOT EXISTS lead_qualification TEXT NOT NULL DEFAULT 'unknown'
    CHECK (lead_qualification IN ('unknown', 'graduated', 'not_graduated')),
  ADD COLUMN IF NOT EXISTS audience_profile TEXT NOT NULL DEFAULT 'unknown'
    CHECK (audience_profile IN ('unknown', 'beginner', 'experienced')),
  ADD COLUMN IF NOT EXISTS interest_confirmed BOOLEAN,
  ADD COLUMN IF NOT EXISTS enrollment_step SMALLINT NOT NULL DEFAULT 0
    CHECK (enrollment_step BETWEEN 0 AND 12),
  ADD COLUMN IF NOT EXISTS enrollment_notification_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS configured_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS script_version TEXT NOT NULL DEFAULT 'us-03-v1';

CREATE TABLE IF NOT EXISTS public.sdr_robot_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waha_session TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Karol - SDR ABO Goiás',
  course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  script_version TEXT NOT NULL DEFAULT 'us-03-v1',
  course_pdf_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sdr_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  robot_config_id UUID NOT NULL
    REFERENCES public.sdr_robot_configs(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN ('faq', 'pdf', 'audience_matrix', 'commercial_script')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sdr_enrollment_profiles (
  conversation_id UUID PRIMARY KEY
    REFERENCES public.sdr_conversations(id) ON DELETE CASCADE,
  full_name TEXT,
  whatsapp_phone TEXT,
  cpf TEXT,
  birth_date TEXT,
  marital_status TEXT,
  nationality TEXT,
  birthplace TEXT,
  cro TEXT,
  email TEXT,
  address TEXT,
  district TEXT,
  postal_code TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_sdr_enrollment_profiles_updated_at
  ON public.sdr_enrollment_profiles;
CREATE TRIGGER update_sdr_enrollment_profiles_updated_at
  BEFORE UPDATE ON public.sdr_enrollment_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sdr_robot_configs_updated_at
  ON public.sdr_robot_configs;
CREATE TRIGGER update_sdr_robot_configs_updated_at
  BEFORE UPDATE ON public.sdr_robot_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sdr_knowledge_documents_updated_at
  ON public.sdr_knowledge_documents;
CREATE TRIGGER update_sdr_knowledge_documents_updated_at
  BEFORE UPDATE ON public.sdr_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sdr_enrollment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_robot_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_knowledge_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdr_enrollment_profiles_admin_manage
  ON public.sdr_enrollment_profiles;
CREATE POLICY sdr_enrollment_profiles_admin_manage
  ON public.sdr_enrollment_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_robot_configs_admin_manage
  ON public.sdr_robot_configs;
CREATE POLICY sdr_robot_configs_admin_manage
  ON public.sdr_robot_configs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_knowledge_documents_admin_manage
  ON public.sdr_knowledge_documents;
CREATE POLICY sdr_knowledge_documents_admin_manage
  ON public.sdr_knowledge_documents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS sdr_conversations_flow_stage_idx
  ON public.sdr_conversations(flow_stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS sdr_knowledge_documents_config_type_idx
  ON public.sdr_knowledge_documents(robot_config_id, document_type)
  WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.sdr_assign_robot_config()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.configured_course_id IS NULL THEN
    SELECT config.course_id
      INTO NEW.configured_course_id
    FROM public.sdr_robot_configs AS config
    WHERE config.waha_session = NEW.waha_session
      AND config.is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sdr_assign_robot_config_trigger
  ON public.sdr_conversations;
CREATE TRIGGER sdr_assign_robot_config_trigger
  BEFORE INSERT ON public.sdr_conversations
  FOR EACH ROW EXECUTE FUNCTION public.sdr_assign_robot_config();

COMMENT ON TABLE public.sdr_enrollment_profiles IS
  'Restricted enrollment data collected by SDR after explicit lead interest.';

COMMENT ON TABLE public.sdr_knowledge_documents IS
  'Official FAQ, PDF text, audience matrix and commercial script used to ground SDR answers.';

COMMENT ON COLUMN public.sdr_conversations.flow_stage IS
  'Current deterministic stage of the US-03 commercial script.';
