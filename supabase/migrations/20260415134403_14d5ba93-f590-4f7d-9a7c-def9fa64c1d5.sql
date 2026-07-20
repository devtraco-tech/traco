ALTER TABLE public.courses
ADD COLUMN display_status text DEFAULT NULL;

COMMENT ON COLUMN public.courses.display_status IS 'Manual display status override: open, immediate_start, waiting_list, full. NULL = auto-calculate from dates.';