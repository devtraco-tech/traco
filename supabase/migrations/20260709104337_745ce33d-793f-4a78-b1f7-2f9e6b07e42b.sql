ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS restrict_to_own_area boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.user_is_area_restricted(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT restrict_to_own_area FROM public.profiles WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.user_triage_specialty(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT triage_specialty_id FROM public.profiles WHERE id = _user_id;
$$;

CREATE POLICY patients_area_scope
ON public.patients
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR NOT public.user_is_area_restricted(auth.uid())
  OR assigned_specialty_id = public.user_triage_specialty(auth.uid())
  OR public.user_triage_specialty(auth.uid()) = ANY (specialties)
);