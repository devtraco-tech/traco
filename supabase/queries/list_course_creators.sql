-- Query para listar usuários que podem criar cursos
-- (Admins e Coordenadores)

SELECT 
  p.id,
  p.name,
  p.email,
  d.name as department,
  CASE 
    WHEN ur.role = 'admin' THEN 'Admin'
    WHEN d.name = 'coordenador' THEN 'Coordenador'
    ELSE 'Outro'
  END as role_type
FROM public.profiles p
LEFT JOIN public.departments d ON d.id = p.department_id
LEFT JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'admin'
WHERE 
  -- Admins
  ur.role = 'admin'
  OR
  -- Coordenadores
  d.name = 'coordenador'
ORDER BY p.name;
