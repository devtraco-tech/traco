-- Fix course UPDATE policy to work with coordenador department
-- The issue is that coordenadores don't have a role in user_roles, they only have department_id

DROP POLICY IF EXISTS "Admin and coordenador can update courses" ON courses;

CREATE POLICY "Admin and coordenador can update courses"
ON courses
FOR UPDATE
USING (
  -- Admin role
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  -- Coordenador department
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND d.name = 'coordenador'
  )
)
WITH CHECK (
  -- Admin role
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  -- Coordenador department
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND d.name = 'coordenador'
  )
);
