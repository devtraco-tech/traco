-- Adicionar 'archived' ao enum course_status
ALTER TYPE public.course_status ADD VALUE IF NOT EXISTS 'archived';