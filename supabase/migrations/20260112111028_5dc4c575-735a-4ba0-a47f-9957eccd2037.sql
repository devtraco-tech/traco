-- Create SECURITY DEFINER function to check course ownership (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_course_owner(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.courses
    WHERE id = _course_id
      AND created_by = _user_id
  )
$$;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Users can insert course validations" ON public.course_validations;
DROP POLICY IF EXISTS "Users can update course validations" ON public.course_validations;

-- Recreate INSERT policy using the SECURITY DEFINER function
CREATE POLICY "Users can insert course validations"
ON public.course_validations
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid() AND d.name = 'coordenador'
  )
  OR
  public.is_course_owner(course_id, auth.uid())
);

-- Recreate UPDATE policy using the SECURITY DEFINER function
CREATE POLICY "Users can update course validations"
ON public.course_validations
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.department_id = course_validations.department_id
  )
  OR
  public.is_course_owner(course_validations.course_id, auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.department_id = course_validations.department_id
  )
  OR
  public.is_course_owner(course_validations.course_id, auth.uid())
);