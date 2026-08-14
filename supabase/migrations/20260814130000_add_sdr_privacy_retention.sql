-- SDR production hardening: least-privilege access and configurable retention.

ALTER TABLE public.sdr_messages
  ADD COLUMN IF NOT EXISTS contains_personal_data BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_redacted_at TIMESTAMPTZ;

-- Conservative backfill: inbound enrollment messages can contain the 12-field form.
UPDATE public.sdr_messages AS message
SET contains_personal_data = true
FROM public.sdr_conversations AS conversation
WHERE conversation.id = message.conversation_id
  AND message.direction = 'inbound'
  AND conversation.flow_stage IN ('enrollment', 'completed');

CREATE TABLE IF NOT EXISTS public.sdr_data_retention_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled BOOLEAN NOT NULL DEFAULT true,
  raw_payload_days INTEGER NOT NULL DEFAULT 7 CHECK (raw_payload_days BETWEEN 1 AND 30),
  personal_data_days INTEGER NOT NULL DEFAULT 30 CHECK (personal_data_days BETWEEN 1 AND 365),
  notification_days INTEGER NOT NULL DEFAULT 90 CHECK (notification_days BETWEEN 7 AND 365),
  audit_event_days INTEGER NOT NULL DEFAULT 180 CHECK (audit_event_days BETWEEN 30 AND 730),
  closed_conversation_days INTEGER NOT NULL DEFAULT 180 CHECK (closed_conversation_days BETWEEN 30 AND 730),
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.sdr_data_retention_config (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

DROP TRIGGER IF EXISTS update_sdr_data_retention_config_updated_at
  ON public.sdr_data_retention_config;
CREATE TRIGGER update_sdr_data_retention_config_updated_at
  BEFORE UPDATE ON public.sdr_data_retention_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sdr_data_retention_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sdr_data_retention_config_admin_manage
  ON public.sdr_data_retention_config;
CREATE POLICY sdr_data_retention_config_admin_manage
  ON public.sdr_data_retention_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Existing notification audit entries may contain display name and full phone.
UPDATE public.sdr_notification_deliveries
SET payload = jsonb_strip_nulls(jsonb_build_object(
  'eventType', payload -> 'eventType',
  'title', payload -> 'title',
  'severity', payload -> 'severity',
  'conversationId', COALESCE(payload -> 'conversationId', to_jsonb(conversation_id))
));

-- Operational events must never duplicate lead identity or free-form handoff text.
UPDATE public.sdr_events
SET payload = payload - 'phone_e164' - 'display_name' - 'details';

CREATE OR REPLACE FUNCTION public.sdr_sanitize_operational_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.payload := COALESCE(NEW.payload, '{}'::jsonb)
    - 'phone_e164'
    - 'display_name'
    - 'details';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sdr_sanitize_operational_event_trigger ON public.sdr_events;
CREATE TRIGGER sdr_sanitize_operational_event_trigger
  BEFORE INSERT OR UPDATE OF payload ON public.sdr_events
  FOR EACH ROW EXECUTE FUNCTION public.sdr_sanitize_operational_event();

-- SDR records are restricted to administrators. Backend operations use service_role.
DROP POLICY IF EXISTS sdr_leads_admin_manage ON public.sdr_leads;
CREATE POLICY sdr_leads_admin_manage
  ON public.sdr_leads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_conversations_admin_manage ON public.sdr_conversations;
CREATE POLICY sdr_conversations_admin_manage
  ON public.sdr_conversations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_messages_admin_manage ON public.sdr_messages;
CREATE POLICY sdr_messages_admin_manage
  ON public.sdr_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_handoffs_admin_manage ON public.sdr_handoffs;
CREATE POLICY sdr_handoffs_admin_manage
  ON public.sdr_handoffs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_events_admin_read ON public.sdr_events;
CREATE POLICY sdr_events_admin_read
  ON public.sdr_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS sdr_notifications_admin_read ON public.sdr_notification_deliveries;
CREATE POLICY sdr_notifications_admin_read
  ON public.sdr_notification_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.sdr_apply_data_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  retention public.sdr_data_retention_config;
  raw_payloads_redacted INTEGER := 0;
  personal_messages_redacted INTEGER := 0;
  enrollment_profiles_deleted INTEGER := 0;
  handoff_details_redacted INTEGER := 0;
  notifications_deleted INTEGER := 0;
  events_deleted INTEGER := 0;
  conversations_deleted INTEGER := 0;
  orphan_leads_deleted INTEGER := 0;
BEGIN
  SELECT * INTO retention
  FROM public.sdr_data_retention_config
  WHERE singleton = true;

  IF NOT FOUND OR NOT retention.enabled THEN
    RETURN jsonb_build_object('executed', false, 'reason', 'retention_disabled');
  END IF;

  UPDATE public.sdr_messages
  SET raw_payload = '{}'::jsonb
  WHERE raw_payload <> '{}'::jsonb
    AND created_at < now() - (retention.raw_payload_days * interval '1 day');
  GET DIAGNOSTICS raw_payloads_redacted = ROW_COUNT;

  UPDATE public.sdr_messages
  SET
    content = '[dados pessoais removidos pela política de retenção]',
    raw_payload = '{}'::jsonb,
    error_message = NULL,
    content_redacted_at = now()
  WHERE contains_personal_data = true
    AND content_redacted_at IS NULL
    AND created_at < now() - (retention.personal_data_days * interval '1 day');
  GET DIAGNOSTICS personal_messages_redacted = ROW_COUNT;

  DELETE FROM public.sdr_enrollment_profiles AS profile
  USING public.sdr_conversations AS conversation
  WHERE conversation.id = profile.conversation_id
    AND conversation.kommo_sync_status = 'synced'
    AND COALESCE(profile.completed_at, profile.updated_at)
      < now() - (retention.personal_data_days * interval '1 day');
  GET DIAGNOSTICS enrollment_profiles_deleted = ROW_COUNT;

  UPDATE public.sdr_handoffs
  SET details = '[detalhes removidos pela política de retenção]'
  WHERE status = 'resolved'
    AND details IS NOT NULL
    AND details <> '[detalhes removidos pela política de retenção]'
    AND COALESCE(resolved_at, updated_at)
      < now() - (retention.personal_data_days * interval '1 day');
  GET DIAGNOSTICS handoff_details_redacted = ROW_COUNT;

  DELETE FROM public.sdr_notification_deliveries
  WHERE created_at < now() - (retention.notification_days * interval '1 day');
  GET DIAGNOSTICS notifications_deleted = ROW_COUNT;

  DELETE FROM public.sdr_events
  WHERE created_at < now() - (retention.audit_event_days * interval '1 day');
  GET DIAGNOSTICS events_deleted = ROW_COUNT;

  DELETE FROM public.sdr_conversations
  WHERE status IN ('resolved', 'closed')
    AND updated_at < now() - (retention.closed_conversation_days * interval '1 day');
  GET DIAGNOSTICS conversations_deleted = ROW_COUNT;

  DELETE FROM public.sdr_leads AS lead
  WHERE lead.last_seen_at < now() - (retention.closed_conversation_days * interval '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM public.sdr_conversations AS conversation
      WHERE conversation.lead_id = lead.id
    );
  GET DIAGNOSTICS orphan_leads_deleted = ROW_COUNT;

  UPDATE public.sdr_data_retention_config
  SET last_run_at = now()
  WHERE singleton = true;

  RETURN jsonb_build_object(
    'executed', true,
    'rawPayloadsRedacted', raw_payloads_redacted,
    'personalMessagesRedacted', personal_messages_redacted,
    'enrollmentProfilesDeleted', enrollment_profiles_deleted,
    'handoffDetailsRedacted', handoff_details_redacted,
    'notificationsDeleted', notifications_deleted,
    'eventsDeleted', events_deleted,
    'conversationsDeleted', conversations_deleted,
    'orphanLeadsDeleted', orphan_leads_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sdr_apply_data_retention()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_apply_data_retention() TO service_role;

COMMENT ON TABLE public.sdr_data_retention_config IS
  'Configurable technical retention limits. Legal approval is required before production changes.';
COMMENT ON COLUMN public.sdr_messages.contains_personal_data IS
  'Marks messages that contain enrollment or other directly identifying personal data.';
COMMENT ON FUNCTION public.sdr_apply_data_retention() IS
  'Idempotent retention routine intended to run daily using service_role.';
