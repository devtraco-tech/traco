-- Fix: Allow course creators (owners) to INSERT validations for their own courses
-- The current INSERT policy only allows "coordenador" department or admin, excluding course owners

-- Drop conflicting/duplicate UPDATE policies (keep only one comprehensive)
DROP POLICY IF EXISTS "Department users can update validations" ON public.course_validations;
DROP POLICY IF EXISTS "Coordenador and admin can update validations" ON public.course_validations;
DROP POLICY IF EXISTS "Coordenador and admin can create validations" ON public.course_validations;

-- Create a comprehensive INSERT policy: admins, coordenador department, OR course owner
CREATE POLICY "Users can insert course validations"
ON public.course_validations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can always insert
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  -- Users from 'coordenador' department can insert
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid() AND d.name = 'coordenador'
  )
  OR
  -- Course owners can insert validations for their own courses
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.created_by = auth.uid()
  )
);

-- Create a comprehensive UPDATE policy: admins, department members for their dept, or course owners
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
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_validations.course_id AND c.created_by = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.department_id = course_validations.department_id
  )
  OR
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_validations.course_id AND c.created_by = auth.uid()
  )
);