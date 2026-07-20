-- Allow admins to update user profiles (including department_id)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix course creation policy to use user_roles table instead of department join
DROP POLICY IF EXISTS "Coordenador and admin can create courses" ON courses;

CREATE POLICY "Coordenador and admin can create courses"
ON courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND d.name = 'coordenador'
  )
);

-- Fix course UPDATE policy to work with coordenador department
DROP POLICY IF EXISTS "Only coordenador and admin can update courses" ON courses;

CREATE POLICY "Only coordenador and admin can update courses"
ON courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND d.name = 'coordenador'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND d.name = 'coordenador'
  )
);