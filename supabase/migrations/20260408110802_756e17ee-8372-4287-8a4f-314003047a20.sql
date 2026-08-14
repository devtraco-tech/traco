
-- The original production table was created outside the migration history.
-- Recreate its contract here so a fresh development database is reproducible.
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  specialty_id UUID REFERENCES public.patient_specialties(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT DEFAULT 'scheduled',
  notes TEXT,
  patient_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id
  ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id
  ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date
  ON public.appointments(date);

-- Policies below depend on these helpers. They must exist before CREATE POLICY.
CREATE OR REPLACE FUNCTION public.is_triage_manager(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'triage_coordenador', 'triage_atendente')
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_triage_dentist(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'triage_dentista'
  )
$function$;

-- 1. Enable RLS on unprotected tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_specialties ENABLE ROW LEVEL SECURITY;

-- 2. Policies for appointments
CREATE POLICY "Triage staff can view appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE POLICY "Triage managers can manage appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (public.is_triage_manager(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()));

-- 3. Policies for clinic_classes
CREATE POLICY "Authenticated can view clinic classes"
  ON public.clinic_classes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Triage managers can manage clinic classes"
  ON public.clinic_classes FOR ALL TO authenticated
  USING (public.is_triage_manager(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()));

-- 4. Policies for clinics
CREATE POLICY "Authenticated can view clinics"
  ON public.clinics FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Triage managers can manage clinics"
  ON public.clinics FOR ALL TO authenticated
  USING (public.is_triage_manager(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()));

-- 5. Policies for patient_procedures
CREATE POLICY "Authenticated can view patient procedures"
  ON public.patient_procedures FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Triage managers can manage patient procedures"
  ON public.patient_procedures FOR ALL TO authenticated
  USING (public.is_triage_manager(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()));

-- 6. Policies for patient_specialties
CREATE POLICY "Authenticated can view patient specialties"
  ON public.patient_specialties FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Triage managers can manage patient specialties"
  ON public.patient_specialties FOR ALL TO authenticated
  USING (public.is_triage_manager(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()));

-- 7. Fix functions without search_path
CREATE OR REPLACE FUNCTION public.update_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

CREATE OR REPLACE FUNCTION public.is_triage_manager(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text IN ('admin', 'triage_coordenador', 'triage_atendente')
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_triage_dentist(_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = 'triage_dentista'
  )
$function$;
