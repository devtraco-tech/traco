ALTER TABLE public.profiles ADD COLUMN date_bypass_until date DEFAULT NULL;

COMMENT ON COLUMN public.profiles.date_bypass_until IS 'Temporary permission to bypass the 6/9 month date restriction for course creation. NULL = no bypass.';
