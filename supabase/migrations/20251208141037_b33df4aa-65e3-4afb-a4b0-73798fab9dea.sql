-- Atribui o papel somente se o usuário existir neste ambiente.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE id = 'ea337956-13cb-41c0-8213-7b29555d056e'
ON CONFLICT (user_id, role) DO NOTHING;
