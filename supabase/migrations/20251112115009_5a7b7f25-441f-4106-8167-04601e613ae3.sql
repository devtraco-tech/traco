-- Add accepts_students field to courses table
ALTER TABLE public.courses ADD COLUMN accepts_students BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.courses.accepts_students IS 'Indica se o curso aceita acadêmicos';