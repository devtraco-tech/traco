-- O fluxo oficial de Prótese aceita passaporte opcional na matrícula.

ALTER TABLE public.sdr_enrollment_profiles
  ADD COLUMN IF NOT EXISTS passport_number TEXT;
