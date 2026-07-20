ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS no_show_count integer NOT NULL DEFAULT 0;

ALTER TYPE cap_status ADD VALUE IF NOT EXISTS 'faltou';
ALTER TYPE cap_status ADD VALUE IF NOT EXISTS 'declinado_falta';