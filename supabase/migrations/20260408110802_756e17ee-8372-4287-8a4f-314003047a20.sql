
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
