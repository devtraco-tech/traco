-- Ensure the enum labels are correct and the schema is reloaded
DO $$
BEGIN
    -- Fix dentist_status enum if it exists but is missing values
    BEGIN
        ALTER TYPE public.dentist_status ADD VALUE 'agendado';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TYPE public.dentist_status ADD VALUE 'consultou';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;

    BEGIN
        ALTER TYPE public.dentist_status ADD VALUE 'faltou';
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
