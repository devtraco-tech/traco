-- Enable unaccent extension for removing accents
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add slug column to courses table
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);