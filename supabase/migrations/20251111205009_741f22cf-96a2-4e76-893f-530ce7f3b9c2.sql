-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coordenador and admin can create validations" ON public.course_validations;

-- Create policy to allow coordenador and admin to insert course validations
CREATE POLICY "Coordenador and admin can create validations"
ON public.course_validations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      d.name = 'coordenador'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);