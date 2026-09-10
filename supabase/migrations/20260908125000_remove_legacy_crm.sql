-- Remove definitivamente estruturas do CRM anterior. A integração comercial passa
-- a usar exclusivamente as colunas clint_* criadas nas migrations anteriores.

DROP INDEX IF EXISTS public.sdr_conversations_kommo_lead_unique;
DROP INDEX IF EXISTS public.sdr_conversations_kommo_lead_idx;
DROP INDEX IF EXISTS public.sdr_conversations_kommo_sync_idx;
DROP INDEX IF EXISTS public.idx_course_leads_kommo_lead_id;
DROP INDEX IF EXISTS public.idx_course_leads_kommo_pending;

ALTER TABLE IF EXISTS public.sdr_conversations
  DROP CONSTRAINT IF EXISTS sdr_conversations_kommo_sync_status_check,
  DROP CONSTRAINT IF EXISTS sdr_conversations_crm_provider_check,
  DROP COLUMN IF EXISTS crm_provider,
  DROP COLUMN IF EXISTS kommo_lead_id,
  DROP COLUMN IF EXISTS kommo_contact_id,
  DROP COLUMN IF EXISTS kommo_status_id,
  DROP COLUMN IF EXISTS kommo_sync_status,
  DROP COLUMN IF EXISTS kommo_last_synced_at,
  DROP COLUMN IF EXISTS kommo_sync_error;

ALTER TABLE IF EXISTS public.sdr_robot_configs
  DROP CONSTRAINT IF EXISTS sdr_robot_configs_kommo_deadline_check,
  DROP CONSTRAINT IF EXISTS sdr_robot_configs_kommo_stage_mappings_check,
  DROP CONSTRAINT IF EXISTS sdr_robot_configs_kommo_field_mappings_check,
  DROP COLUMN IF EXISTS kommo_enabled,
  DROP COLUMN IF EXISTS kommo_subdomain,
  DROP COLUMN IF EXISTS kommo_pipeline_id,
  DROP COLUMN IF EXISTS kommo_stage_mappings,
  DROP COLUMN IF EXISTS kommo_field_mappings,
  DROP COLUMN IF EXISTS kommo_responsible_user_id,
  DROP COLUMN IF EXISTS kommo_handoff_task_type_id,
  DROP COLUMN IF EXISTS kommo_handoff_deadline_minutes;

ALTER TABLE IF EXISTS public.course_leads
  DROP COLUMN IF EXISTS kommo_lead_id;

ALTER TABLE IF EXISTS public.patient_leads
  DROP COLUMN IF EXISTS kommo_lead_id;

ALTER TABLE IF EXISTS public.patients
  DROP COLUMN IF EXISTS kommo_lead_id;

ALTER TABLE IF EXISTS public.old_contacts
  DROP COLUMN IF EXISTS kommo_sent;

DROP TABLE IF EXISTS public.sdr_admin_audit_logs;
