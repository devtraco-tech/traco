-- Make the SDR core provider-neutral while preserving the current catalog snapshot.

DROP INDEX IF EXISTS public.idx_sdr_robot_configs_abo_course_id;

ALTER TABLE public.sdr_robot_configs
  RENAME COLUMN abo_course_id TO catalog_item_id;
ALTER TABLE public.sdr_robot_configs
  RENAME COLUMN abo_course_slug TO catalog_item_slug;
ALTER TABLE public.sdr_robot_configs
  RENAME COLUMN abo_course_snapshot TO catalog_item_snapshot;
ALTER TABLE public.sdr_robot_configs
  RENAME COLUMN abo_course_synced_at TO catalog_item_synced_at;

ALTER TABLE public.sdr_robot_configs
  ADD COLUMN IF NOT EXISTS catalog_provider_id TEXT NOT NULL DEFAULT 'http-course-catalog',
  ADD COLUMN IF NOT EXISTS catalog_provider_name TEXT NOT NULL DEFAULT 'Catálogo';

CREATE INDEX IF NOT EXISTS idx_sdr_robot_configs_catalog_item_id
  ON public.sdr_robot_configs (catalog_item_id)
  WHERE catalog_item_id IS NOT NULL;

UPDATE public.sdr_robot_configs
SET name = 'Assistente Comercial'
WHERE name IN ('Karol - SDR ABO Goiás', 'Karol - SDR ABO Goiás (teste)');

COMMENT ON COLUMN public.sdr_robot_configs.catalog_item_snapshot IS
  'Provider-neutral snapshot used by the SDR; it must not contain lead personal data.';
COMMENT ON COLUMN public.sdr_robot_configs.catalog_provider_id IS
  'Identifier of the configured catalog adapter.';
