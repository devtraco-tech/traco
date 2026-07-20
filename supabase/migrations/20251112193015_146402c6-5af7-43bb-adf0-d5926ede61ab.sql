-- Permitir leitura pública de cursos aprovados e em andamento
CREATE POLICY "Anonymous can view approved courses"
ON public.courses
FOR SELECT
USING (status IN ('approved', 'in_progress'));

-- Permitir leitura pública de professores
CREATE POLICY "Anonymous can view teachers"
ON public.teachers
FOR SELECT
USING (true);