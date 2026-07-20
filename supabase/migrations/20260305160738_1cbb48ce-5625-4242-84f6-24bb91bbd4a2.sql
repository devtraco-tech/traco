
CREATE OR REPLACE FUNCTION public.prevent_non_admin_course_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check when status is being changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Check if the current user is an admin
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Apenas administradores podem aprovar cursos';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_admin_course_approval
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_non_admin_course_approval();
