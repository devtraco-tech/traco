-- Ensure the CAP status contract exists without dropping enum dependencies.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'cap_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.cap_status AS ENUM (
      'aguardando_vaga',
      'em_negociacao',
      'entrevista_agendada'
    );
  END IF;
END
$$;

-- The original production column was created outside the recorded migrations.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS cap_status public.cap_status
  DEFAULT 'aguardando_vaga'::public.cap_status;

NOTIFY pgrst, 'reload schema';
