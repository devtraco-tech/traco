-- Add is_archived column to courses table
ALTER TABLE public.courses 
ADD COLUMN is_archived boolean DEFAULT false NOT NULL;

-- Create index for performance when filtering archived courses
CREATE INDEX IF NOT EXISTS courses_is_archived_idx ON public.courses(is_archived);
