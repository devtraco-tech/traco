-- First, delete existing validations to avoid foreign key constraint
DELETE FROM course_validations;

-- Update departments
DELETE FROM departments;

INSERT INTO departments (name, description) VALUES
('educacao', 'Educação - Validação pedagógica'),
('projetos', 'Projetos - Gestão de projetos'),
('admin', 'Administração - Gestão geral'),
('coordenador', 'Coordenador - Criação de cursos'),
('checkbasico', 'Check Básico - Verificação inicial'),
('comercial', 'Comercial - Aspectos comerciais'),
('eduq', 'EduQ - Qualidade educacional'),
('financeiro', 'Financeiro - Validação financeira'),
('marketing', 'Marketing - Estratégia de marketing'),
('reservas', 'Reservas - Gestão de reservas');

-- Update RLS policies for course_validations to filter by department
DROP POLICY IF EXISTS "Users can view own validations" ON course_validations;
DROP POLICY IF EXISTS "Admins and staff can update validations" ON course_validations;
DROP POLICY IF EXISTS "Admins and staff can create validations" ON course_validations;
DROP POLICY IF EXISTS "Students can create validations for enrolled courses" ON course_validations;

-- Users can only view validations from their department (except admin)
CREATE POLICY "Users can view department validations"
ON course_validations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.department_id = course_validations.department_id
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Only specific departments can update validations (coordenador cannot)
CREATE POLICY "Department users can update validations"
ON course_validations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      d.name != 'coordenador'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    AND (
      p.department_id = course_validations.department_id
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      d.name != 'coordenador'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
    AND (
      p.department_id = course_validations.department_id
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

-- Allow course creation for coordenador and admin
DROP POLICY IF EXISTS "Admins and staff can manage courses" ON courses;
DROP POLICY IF EXISTS "Authenticated users can view approved courses" ON courses;

CREATE POLICY "Coordenador and admin can create courses"
ON courses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      d.name = 'coordenador'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Admin and coordenador can update courses"
ON courses
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      d.name = 'coordenador'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (
      d.name = 'coordenador'
      OR has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Admin can delete courses"
ON courses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view courses"
ON courses
FOR SELECT
USING (auth.uid() IS NOT NULL);