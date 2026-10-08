-- Keep the manual message and the pause atomic, including duplicate webhooks.
CREATE OR REPLACE FUNCTION public.sdr_take_over_manually(
  p_whatsapp_id TEXT, p_waha_session TEXT, p_provider_message_id TEXT,
  p_content TEXT, p_occurred_at TIMESTAMPTZ
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_conversation UUID;
BEGIN
  -- A delayed echo of a message sent by the SDR must not pause it.
  IF EXISTS (SELECT 1 FROM sdr_messages WHERE provider_message_id = p_provider_message_id) THEN RETURN NULL; END IF;

  SELECT c.id INTO v_conversation FROM sdr_conversations c
    JOIN sdr_leads l ON l.id = c.lead_id
    WHERE l.whatsapp_id = p_whatsapp_id AND c.waha_session = p_waha_session
      AND c.status IN ('bot_active', 'waiting_human', 'human_active')
      AND c.created_at < p_occurred_at + INTERVAL '1 second'
    ORDER BY c.created_at DESC LIMIT 1 FOR UPDATE OF c;
  IF v_conversation IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM sdr_messages WHERE provider_message_id = p_provider_message_id) THEN RETURN NULL; END IF;

  UPDATE sdr_conversations SET status = 'human_active', bot_enabled = false
    WHERE id = v_conversation;
  INSERT INTO sdr_messages (conversation_id, provider_message_id, direction, role,
    content, status, model, occurred_at)
    VALUES (v_conversation, p_provider_message_id, 'outbound', 'assistant',
      COALESCE(NULLIF(p_content, ''), '[Mensagem manual com mídia]'), 'sent', 'human:whatsapp', p_occurred_at)
    ON CONFLICT (provider_message_id) DO NOTHING;
  RETURN v_conversation;
END;
$$;
REVOKE ALL ON FUNCTION public.sdr_take_over_manually(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_take_over_manually(TEXT,TEXT,TEXT,TEXT,TIMESTAMPTZ) TO service_role;

-- A lead's greeting/restart must not reactivate a conversation owned by a human.
ALTER FUNCTION public.sdr_restart_conversation_for_message(UUID,UUID,TEXT)
  RENAME TO sdr_restart_conversation_for_message_before_manual_takeover;
REVOKE ALL ON FUNCTION public.sdr_restart_conversation_for_message_before_manual_takeover(UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.sdr_restart_conversation_for_message(
  p_conversation_id UUID, p_message_id UUID, p_reason TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM sdr_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM sdr_conversations WHERE id = p_conversation_id AND status = 'human_active') THEN
    RETURN jsonb_build_object('restarted', false, 'conversation_id', p_conversation_id, 'previous_conversation_id', NULL);
  END IF;
  RETURN sdr_restart_conversation_for_message_before_manual_takeover(p_conversation_id, p_message_id, p_reason);
END;
$$;
REVOKE ALL ON FUNCTION public.sdr_restart_conversation_for_message(UUID,UUID,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_restart_conversation_for_message(UUID,UUID,TEXT) TO service_role;

-- An AI result that finishes during manual takeover cannot overwrite human ownership.
ALTER FUNCTION public.sdr_request_handoff(UUID,TEXT,TEXT)
  RENAME TO sdr_request_handoff_before_manual_takeover;
REVOKE ALL ON FUNCTION public.sdr_request_handoff_before_manual_takeover(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.sdr_request_handoff(
  p_conversation_id UUID, p_reason TEXT, p_details TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM sdr_conversations WHERE id = p_conversation_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM sdr_conversations WHERE id = p_conversation_id AND status IN ('human_active', 'closed', 'resolved')) THEN
    RETURN NULL;
  END IF;
  RETURN sdr_request_handoff_before_manual_takeover(p_conversation_id, p_reason, p_details);
END;
$$;
REVOKE ALL ON FUNCTION public.sdr_request_handoff(UUID,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_request_handoff(UUID,TEXT,TEXT) TO service_role;
