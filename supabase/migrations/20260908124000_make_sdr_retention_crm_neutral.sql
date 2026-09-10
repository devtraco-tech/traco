-- A retenção pode prosseguir após confirmação no CRM que estiver ativo.
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
    AND conversation.clint_sync_status = 'synced'
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
