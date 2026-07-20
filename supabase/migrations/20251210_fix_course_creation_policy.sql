-- Fix course creation policy to use user_roles table instead of department join
-- This is more reliable and doesn't depend on department foreign key

-- Drop old policy
DROP POLICY IF EXISTS "Coordenador and admin can create courses" ON courses;

-- Create new policy that checks both admin role and coordenador department
CREATE POLICY "Coordenador and admin can create courses"
ON courses
FOR INSERT
WITH CHECK (
  -- Check if admin
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  -- Check if coordenador
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND d.name = 'coordenador'
  )
);
