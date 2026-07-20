-- Add banner columns to courses table
ALTER TABLE public.courses 
ADD COLUMN banner_desktop_url text,
ADD COLUMN banner_mobile_url text;