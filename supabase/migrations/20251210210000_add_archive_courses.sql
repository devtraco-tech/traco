-- Add is_archived column to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Keep the migration safe when the column was created by an earlier migration.
UPDATE public.courses
SET is_archived = false
WHERE is_archived IS NULL;

ALTER TABLE public.courses
ALTER COLUMN is_archived SET DEFAULT false,
ALTER COLUMN is_archived SET NOT NULL;

-- Create index for performance when filtering archived courses
CREATE INDEX IF NOT EXISTS courses_is_archived_idx ON public.courses(is_archived);
