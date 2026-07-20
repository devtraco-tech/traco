-- Permitir que admins deletem qualquer validação
CREATE POLICY "Admins can delete validations" 
ON public.course_validations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Permitir que coordenadores deletem validações de seus cursos
CREATE POLICY "Coordenadores can delete own course validations"
ON public.course_validations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM courses c
    WHERE c.id = course_validations.course_id
    AND c.created_by = auth.uid()
  )
);