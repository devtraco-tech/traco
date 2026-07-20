-- Fix RLS so coordinators can upsert course_validations when editing/creating courses
-- (Currently UPDATE policy blocks 'coordenador', causing UPSERT to fail)

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.course_validations ENABLE ROW LEVEL SECURITY;

-- Add UPDATE policy for coordinators/admins
DROP POLICY IF EXISTS "Coordenador and admin can update validations" ON public.course_validations;
CREATE POLICY "Coordenador and admin can update validations"
ON public.course_validations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
      AND (d.name = 'coordenador' OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
      AND (d.name = 'coordenador' OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
);
