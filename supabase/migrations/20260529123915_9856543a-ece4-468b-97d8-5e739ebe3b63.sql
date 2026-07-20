DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;
CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));