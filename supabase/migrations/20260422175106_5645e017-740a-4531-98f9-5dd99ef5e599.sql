-- Restringir visualização de cursos no painel: apenas criador, admins e staff
DROP POLICY IF EXISTS "All authenticated users can view courses" ON public.courses;

CREATE POLICY "Creators admins and staff can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR public.is_admin_or_staff(auth.uid())
);