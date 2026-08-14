ALTER TABLE public.sdr_robot_configs
  ADD COLUMN IF NOT EXISTS abo_course_id text,
  ADD COLUMN IF NOT EXISTS abo_course_slug text,
  ADD COLUMN IF NOT EXISTS abo_course_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS abo_course_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_sdr_robot_configs_abo_course_id
  ON public.sdr_robot_configs (abo_course_id)
  WHERE abo_course_id IS NOT NULL;

COMMENT ON COLUMN public.sdr_robot_configs.abo_course_snapshot IS
  'Snapshot público do curso ABO usado pelo SDR; não contém dados pessoais.';
