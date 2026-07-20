-- Adicionar política de DELETE para course_leads para admins e staff
CREATE POLICY "Admins and staff can delete leads"
ON public.course_leads
FOR DELETE
USING (is_admin_or_staff(auth.uid()));