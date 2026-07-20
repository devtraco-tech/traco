-- Remove validations for 'coordenador' department (coordinator should not validate)
DELETE FROM public.course_validations cv
USING public.departments d
WHERE d.id = cv.department_id
  AND d.name = 'coordenador';

-- De-duplicate: keep only the most recent validation per (course_id, department_id)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id, department_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.course_validations
)
DELETE FROM public.course_validations
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Prevent duplicates going forward
ALTER TABLE public.course_validations
ADD CONSTRAINT course_validations_course_department_unique
UNIQUE (course_id, department_id);