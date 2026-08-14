-- US-04: mapeamento administrável do funil Kommo, sem armazenar o token de API.
ALTER TABLE public.sdr_robot_configs
  ADD COLUMN IF NOT EXISTS kommo_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kommo_subdomain TEXT,
  ADD COLUMN IF NOT EXISTS kommo_pipeline_id BIGINT,
  ADD COLUMN IF NOT EXISTS kommo_stage_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kommo_field_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS kommo_responsible_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS kommo_handoff_task_type_id BIGINT,
  ADD COLUMN IF NOT EXISTS kommo_handoff_deadline_minutes INTEGER NOT NULL DEFAULT 5;

ALTER TABLE public.sdr_robot_configs
  DROP CONSTRAINT IF EXISTS sdr_robot_configs_kommo_deadline_check;
ALTER TABLE public.sdr_robot_configs
  ADD CONSTRAINT sdr_robot_configs_kommo_deadline_check
  CHECK (kommo_handoff_deadline_minutes BETWEEN 1 AND 1440);

ALTER TABLE public.sdr_robot_configs
  DROP CONSTRAINT IF EXISTS sdr_robot_configs_kommo_stage_mappings_check;
ALTER TABLE public.sdr_robot_configs
  ADD CONSTRAINT sdr_robot_configs_kommo_stage_mappings_check
  CHECK (jsonb_typeof(kommo_stage_mappings) = 'object');

ALTER TABLE public.sdr_robot_configs
  DROP CONSTRAINT IF EXISTS sdr_robot_configs_kommo_field_mappings_check;
ALTER TABLE public.sdr_robot_configs
  ADD CONSTRAINT sdr_robot_configs_kommo_field_mappings_check
  CHECK (jsonb_typeof(kommo_field_mappings) = 'object');

COMMENT ON COLUMN public.sdr_robot_configs.kommo_stage_mappings IS
  'IDs das etapas: newLead, qualified, interested, negotiation, dataCollected e awaitingHuman.';
COMMENT ON COLUMN public.sdr_robot_configs.kommo_field_mappings IS
  'IDs dos campos personalizados do card para os 12 dados da matrícula.';

-- Um mesmo card pode ser reaproveitado por novas conversas do mesmo telefone.
DROP INDEX IF EXISTS public.sdr_conversations_kommo_lead_unique;
CREATE INDEX IF NOT EXISTS sdr_conversations_kommo_lead_idx
  ON public.sdr_conversations(kommo_lead_id)
  WHERE kommo_lead_id IS NOT NULL;
