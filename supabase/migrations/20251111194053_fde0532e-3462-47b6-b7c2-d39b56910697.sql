-- Add policy to allow admins and staff to create course validations
CREATE POLICY "Admins and staff can create validations"
ON public.course_validations
FOR INSERT
TO authenticated
WITH CHECK (is_admin_or_staff(auth.uid()));