
-- ============================================
-- 1. PERMISSÕES GRANULARES POR USUÁRIO
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user module permissions"
  ON public.user_module_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own module permissions"
  ON public.user_module_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_user_module_permissions_updated
  BEFORE UPDATE ON public.user_module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id uuid,
  _module text,
  _action text DEFAULT 'view'
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions
      WHERE user_id = _user_id
        AND module = _module
        AND (
          (_action = 'view' AND can_view = true)
          OR (_action = 'edit' AND can_edit = true)
        )
    );
$$;

-- ============================================
-- 2. ANEXOS DE PACIENTES
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-files', 'patient-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.patient_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  file_size integer,
  category text DEFAULT 'document',
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_attachments_patient ON public.patient_attachments(patient_id);

ALTER TABLE public.patient_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Triage staff view attachments"
  ON public.patient_attachments FOR SELECT TO authenticated
  USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE POLICY "Triage staff insert attachments"
  ON public.patient_attachments FOR INSERT TO authenticated
  WITH CHECK (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE POLICY "Triage staff delete attachments"
  ON public.patient_attachments FOR DELETE TO authenticated
  USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

-- Storage policies
CREATE POLICY "Public read patient-files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'patient-files');

CREATE POLICY "Authenticated upload patient-files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'patient-files');

CREATE POLICY "Authenticated delete patient-files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'patient-files');

-- ============================================
-- 3. AGENDA DE TRIAGEM (Fila 1 → Fila 2)
-- ============================================
CREATE TABLE IF NOT EXISTS public.triage_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_name text,
  scheduled_date date NOT NULL,
  start_time text NOT NULL,
  end_time text,
  duration_min integer DEFAULT 30,
  status text DEFAULT 'scheduled',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_triage_appt_date ON public.triage_appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_triage_appt_patient ON public.triage_appointments(patient_id);

ALTER TABLE public.triage_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Triage staff view triage appointments"
  ON public.triage_appointments FOR SELECT TO authenticated
  USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE POLICY "Triage managers manage triage appointments"
  ON public.triage_appointments FOR ALL TO authenticated
  USING (public.is_triage_manager(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()));

CREATE TRIGGER trg_triage_appt_updated
  BEFORE UPDATE ON public.triage_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
