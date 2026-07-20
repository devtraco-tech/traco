-- Add missing columns to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS class_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS theoretical_workload integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS practical_workload integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS nature text,
ADD COLUMN IF NOT EXISTS other_professors text,
ADD COLUMN IF NOT EXISTS course_materials boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS required_equipment text;

-- Make course-documents bucket public for downloads
UPDATE storage.buckets SET public = true WHERE id = 'course-documents';