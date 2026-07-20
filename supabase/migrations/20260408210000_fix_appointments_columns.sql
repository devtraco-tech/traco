-- Migration to harmonize appointments table with frontend expectations
-- Adds missing columns for start/end time, status, notes and denormalized patient name

ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS "start_time" TEXT,
ADD COLUMN IF NOT EXISTS "end_time" TEXT,
ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "patient_name" TEXT;

-- Safely handle the date column rename if necessary
DO $$
BEGIN
    -- If appointment_date exists, rename it to 'date' to match the frontend property
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='appointment_date') THEN
        ALTER TABLE public.appointments RENAME COLUMN "appointment_date" TO "date";
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='appointments' AND column_name='date') THEN
        ALTER TABLE public.appointments ADD COLUMN "date" TEXT;
    END IF;
END $$;

-- Update RLS policies to ensure all new columns are manageable
-- (Assuming policies using auth.uid() are already in place, this just ensures the schema is ready)
COMMENT ON TABLE public.appointments IS 'Table for clinical appointments with full support for agenda visualization.';
