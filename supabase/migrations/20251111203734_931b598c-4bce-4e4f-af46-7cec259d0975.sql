-- Create course history table to track all changes
CREATE TABLE IF NOT EXISTS public.course_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_type TEXT NOT NULL, -- 'created', 'updated', 'status_changed'
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on course_history
ALTER TABLE public.course_history ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view course history
CREATE POLICY "Authenticated users can view course history"
ON public.course_history
FOR SELECT
TO authenticated
USING (true);

-- Policy: System can insert course history (via trigger)
CREATE POLICY "System can insert course history"
ON public.course_history
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to track course changes
CREATE OR REPLACE FUNCTION public.track_course_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  field_record RECORD;
  old_val TEXT;
  new_val TEXT;
BEGIN
  -- If it's an INSERT, log course creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.course_history (
      course_id,
      changed_by,
      change_type,
      description
    ) VALUES (
      NEW.id,
      auth.uid(),
      'created',
      'Curso criado'
    );
    RETURN NEW;
  END IF;

  -- If it's an UPDATE, log each changed field
  IF (TG_OP = 'UPDATE') THEN
    -- Check each important field for changes
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'title', OLD.title, NEW.title);
    END IF;
    
    IF OLD.area IS DISTINCT FROM NEW.area THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'area', OLD.area, NEW.area);
    END IF;
    
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'description', LEFT(OLD.description, 100), LEFT(NEW.description, 100));
    END IF;
    
    IF OLD.workload IS DISTINCT FROM NEW.workload THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'workload', OLD.workload::TEXT, NEW.workload::TEXT);
    END IF;
    
    IF OLD.investment IS DISTINCT FROM NEW.investment THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'investment', OLD.investment::TEXT, NEW.investment::TEXT);
    END IF;
    
    IF OLD.vacancies IS DISTINCT FROM NEW.vacancies THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'vacancies', OLD.vacancies::TEXT, NEW.vacancies::TEXT);
    END IF;
    
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'status_changed', 'status', OLD.status::TEXT, NEW.status::TEXT);
    END IF;
    
    IF OLD.suggested_start_date IS DISTINCT FROM NEW.suggested_start_date THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'suggested_start_date', OLD.suggested_start_date::TEXT, NEW.suggested_start_date::TEXT);
    END IF;
    
    IF OLD.effective_start_date IS DISTINCT FROM NEW.effective_start_date THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'effective_start_date', OLD.effective_start_date::TEXT, NEW.effective_start_date::TEXT);
    END IF;
    
    IF OLD.language IS DISTINCT FROM NEW.language THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'language', OLD.language::TEXT, NEW.language::TEXT);
    END IF;
    
    IF OLD.modality IS DISTINCT FROM NEW.modality THEN
      INSERT INTO public.course_history (course_id, changed_by, change_type, field_name, old_value, new_value)
      VALUES (NEW.id, auth.uid(), 'updated', 'modality', OLD.modality::TEXT, NEW.modality::TEXT);
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS track_course_changes_trigger ON public.courses;

-- Create trigger to automatically log course changes
CREATE TRIGGER track_course_changes_trigger
AFTER INSERT OR UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.track_course_changes();

-- Update RLS policies on courses table to restrict edit access
-- Drop existing update policy if exists
DROP POLICY IF EXISTS "Admin and coordenador can update courses" ON public.courses;

-- Create new update policy that only allows coordenador and admin
CREATE POLICY "Only coordenador and admin can update courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (d.name = 'coordenador' OR has_role(auth.uid(), 'admin'::app_role))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = auth.uid()
    AND (d.name = 'coordenador' OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create index for better performance on course_history queries
CREATE INDEX IF NOT EXISTS idx_course_history_course_id ON public.course_history(course_id);
CREATE INDEX IF NOT EXISTS idx_course_history_change_date ON public.course_history(change_date DESC);