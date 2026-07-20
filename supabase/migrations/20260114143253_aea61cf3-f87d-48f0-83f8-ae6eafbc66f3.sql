
-- Drop the existing update policy and create one that allows coordenadores to reset validations
DROP POLICY IF EXISTS "Users can update course validations" ON course_validations;

-- Create new policy that allows coordenadores and admins to update any course validations
CREATE POLICY "Users can update course validations"
  ON course_validations FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.department_id = course_validations.department_id
    ))
    OR is_course_owner(course_id, auth.uid())
    OR (EXISTS (
      SELECT 1 FROM profiles p
      JOIN departments d ON d.id = p.department_id
      WHERE p.id = auth.uid() AND d.name = 'coordenador'
    ))
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) 
    OR (EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.department_id = course_validations.department_id
    ))
    OR is_course_owner(course_id, auth.uid())
    OR (EXISTS (
      SELECT 1 FROM profiles p
      JOIN departments d ON d.id = p.department_id
      WHERE p.id = auth.uid() AND d.name = 'coordenador'
    ))
  );
