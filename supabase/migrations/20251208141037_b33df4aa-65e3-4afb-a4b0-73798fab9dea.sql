-- Transformar usuário Eduq em admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('ea337956-13cb-41c0-8213-7b29555d056e', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;