-- Create enum for currency
CREATE TYPE public.currency AS ENUM ('real', 'dolar');

-- Add currency column to courses table with default 'real'
ALTER TABLE public.courses 
ADD COLUMN currency public.currency NOT NULL DEFAULT 'real';

-- Update all existing courses to 'real' (they already have this as default)
UPDATE public.courses SET currency = 'real' WHERE currency IS NULL;