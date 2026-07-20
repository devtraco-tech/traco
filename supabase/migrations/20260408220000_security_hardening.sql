-- Security Hardening Migration
-- Restricts sensitive patient and appointment data to Triage staff only.

-- 1. Drop overly permissive policies on patients
DROP POLICY IF EXISTS "Enable ALL for authenticated users on patients" ON public.patients;
DROP POLICY IF EXISTS "patients_public_read" ON public.patients;

-- 2. Create restricted policies for patients
CREATE POLICY "patients_staff_read" ON public.patients FOR SELECT TO authenticated 
USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE POLICY "patients_staff_insert" ON public.patients FOR INSERT TO authenticated 
WITH CHECK (public.is_triage_manager(auth.uid()));

CREATE POLICY "patients_staff_update" ON public.patients FOR UPDATE TO authenticated 
USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()))
WITH CHECK (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

-- 3. Standardize appointments policies
DROP POLICY IF EXISTS "Triage staff can view appointments" ON public.appointments;
DROP POLICY IF EXISTS "Triage managers can manage appointments" ON public.appointments;

CREATE POLICY "appointments_staff_read" ON public.appointments FOR SELECT TO authenticated 
USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE POLICY "appointments_staff_write" ON public.appointments FOR ALL TO authenticated 
USING (public.is_triage_manager(auth.uid()))
WITH CHECK (public.is_triage_manager(auth.uid()));

-- 4. Audit Log (Informational)
COMMENT ON TABLE public.patients IS 'Sensitive patient data. Restricted by RLS to Triage staff only.';
COMMENT ON TABLE public.appointments IS 'Clinical appointments. Restricted by RLS to Triage staff only.';
