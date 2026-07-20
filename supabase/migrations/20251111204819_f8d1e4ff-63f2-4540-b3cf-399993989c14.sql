-- Drop existing view policy
DROP POLICY IF EXISTS "Admins and staff can view billing companies" ON public.billing_companies;

-- Create new policy allowing coordenador to view billing companies too
CREATE POLICY "Coordenador, admins and staff can view billing companies"
ON public.billing_companies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      is_admin_or_staff(auth.uid())
      OR d.name = 'coordenador'
    )
  )
);