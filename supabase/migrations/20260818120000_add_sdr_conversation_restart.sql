-- Allow a lead to explicitly start a clean SDR conversation while retaining
-- the previous conversation for audit purposes.

ALTER TABLE public.sdr_events
  DROP CONSTRAINT IF EXISTS sdr_events_event_type_check;

ALTER TABLE public.sdr_events
  ADD CONSTRAINT sdr_events_event_type_check CHECK (
    event_type IN (
      'new_lead',
      'message_received',
      'message_queued',
      'processing_started',
      'response_sent',
      'handoff_requested',
      'notification_sent',
      'error',
      'conversation_restarted'
    )
  );

CREATE OR REPLACE FUNCTION public.sdr_restart_conversation_for_message(
  p_conversation_id UUID,
  p_message_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation public.sdr_conversations;
  v_message public.sdr_messages;
  v_new_conversation public.sdr_conversations;
  v_has_previous_messages BOOLEAN;
BEGIN
  IF p_reason NOT IN ('explicit_restart_request', 'new_greeting_with_course_interest') THEN
    RAISE EXCEPTION 'invalid conversation restart reason';
  END IF;

  SELECT * INTO v_conversation
  FROM public.sdr_conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  SELECT * INTO v_message
  FROM public.sdr_messages
  WHERE id = p_message_id
    AND conversation_id = p_conversation_id
    AND direction = 'inbound'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inbound message not found in conversation';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.sdr_messages
    WHERE conversation_id = p_conversation_id
      AND id <> p_message_id
  ) INTO v_has_previous_messages;

  -- A first message already starts with a clean context, so avoid producing an
  -- empty closed conversation just because it matches the greeting pattern.
  IF NOT v_has_previous_messages THEN
    RETURN jsonb_build_object(
      'restarted', false,
      'conversation_id', p_conversation_id,
      'previous_conversation_id', NULL
    );
  END IF;

  UPDATE public.sdr_messages
  SET
    status = 'ignored',
    error_code = 'conversation_restarted',
    error_message = 'Mensagem pendente descartada porque o lead reiniciou o atendimento.'
  WHERE conversation_id = p_conversation_id
    AND id <> p_message_id
    AND direction = 'inbound'
    AND status IN ('received', 'queued', 'processing');

  UPDATE public.sdr_handoffs
  SET
    status = 'resolved',
    resolved_at = now()
  WHERE conversation_id = p_conversation_id
    AND status IN ('open', 'claimed');

  UPDATE public.sdr_conversations
  SET
    status = 'closed',
    bot_enabled = false
  WHERE id = p_conversation_id;

  INSERT INTO public.sdr_conversations (
    lead_id,
    waha_session,
    last_inbound_at
  )
  VALUES (
    v_conversation.lead_id,
    v_conversation.waha_session,
    v_message.occurred_at
  )
  RETURNING * INTO v_new_conversation;

  UPDATE public.sdr_messages
  SET
    conversation_id = v_new_conversation.id,
    status = 'queued',
    error_code = NULL,
    error_message = NULL
  WHERE id = p_message_id;

  INSERT INTO public.sdr_events (
    conversation_id,
    lead_id,
    event_type,
    payload
  )
  VALUES
    (
      v_conversation.id,
      v_conversation.lead_id,
      'conversation_restarted',
      jsonb_build_object(
        'reason', p_reason,
        'new_conversation_id', v_new_conversation.id
      )
    ),
    (
      v_new_conversation.id,
      v_conversation.lead_id,
      'conversation_restarted',
      jsonb_build_object(
        'reason', p_reason,
        'previous_conversation_id', v_conversation.id,
        'trigger_message_id', p_message_id
      )
    );

  RETURN jsonb_build_object(
    'restarted', true,
    'conversation_id', v_new_conversation.id,
    'previous_conversation_id', v_conversation.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sdr_restart_conversation_for_message(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sdr_restart_conversation_for_message(UUID, UUID, TEXT)
  TO service_role;
