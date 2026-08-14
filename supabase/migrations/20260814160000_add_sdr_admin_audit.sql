-- Audit administrative changes made by the SDR configuration interface.

CREATE TABLE IF NOT EXISTS public.sdr_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN (
    'kommo_pipeline_created',
    'kommo_pipeline_renamed',
    'kommo_stage_renamed'
  )),
  target_type TEXT NOT NULL CHECK (target_type IN ('kommo_pipeline', 'kommo_stage')),
  target_external_id TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sdr_admin_audit_logs_created_at_idx
  ON public.sdr_admin_audit_logs (created_at DESC);

ALTER TABLE public.sdr_admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sdr_admin_audit_logs_admin_read
  ON public.sdr_admin_audit_logs;
CREATE POLICY sdr_admin_audit_logs_admin_read
  ON public.sdr_admin_audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

COMMENT ON TABLE public.sdr_admin_audit_logs IS
  'Immutable audit trail for external CRM structure changes initiated by SDR administrators.';
