-- US-01: persistent infrastructure for the SDR robot.

CREATE TABLE public.sdr_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_id TEXT NOT NULL UNIQUE,
  phone_e164 TEXT NOT NULL UNIQUE,
  display_name TEXT,
  source TEXT NOT NULL DEFAULT 'waha',
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sdr_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  waha_session TEXT NOT NULL DEFAULT 'default',
  status TEXT NOT NULL DEFAULT 'bot_active'
    CHECK (status IN ('bot_active', 'waiting_human', 'human_active', 'resolved', 'closed')),
  bot_enabled BOOLEAN NOT NULL DEFAULT true,
  consecutive_failures INTEGER NOT NULL DEFAULT 0 CHECK (consecutive_failures >= 0),
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sdr_one_open_conversation_per_lead
  ON public.sdr_conversations(lead_id)
  WHERE status IN ('bot_active', 'waiting_human', 'human_active');

CREATE TABLE public.sdr_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.sdr_conversations(id) ON DELETE CASCADE,
  provider_message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'queued', 'processing', 'sent', 'failed', 'ignored')),
  response_to_id UUID REFERENCES public.sdr_messages(id) ON DELETE SET NULL,
  model TEXT,
  input_tokens INTEGER CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER CHECK (output_tokens IS NULL OR output_tokens >= 0),
  raw_payload JSONB,
  error_code TEXT,
  error_message TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sdr_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.sdr_conversations(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (
    reason IN (
      'explicit_request',
      'unknown_answer',
      'ai_unavailable',
      'waha_unavailable',
      'commercial_high_intent',
      'sensitive_topic',
      'repeated_failure',
      'manual',
      'other'
    )
  ),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'resolved')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sdr_one_open_handoff_per_conversation
  ON public.sdr_handoffs(conversation_id)
  WHERE status IN ('open', 'claimed');

CREATE TABLE public.sdr_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id UUID REFERENCES public.sdr_conversations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.sdr_leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'new_lead',
      'message_received',
      'message_queued',
      'processing_started',
      'response_sent',
      'handoff_requested',
      'notification_sent',
      'error'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.sdr_notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.sdr_conversations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  destination TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sdr_conversations_status_idx ON public.sdr_conversations(status, updated_at DESC);
CREATE INDEX sdr_messages_conversation_time_idx
  ON public.sdr_messages(conversation_id, occurred_at, created_at);
CREATE INDEX sdr_messages_processing_idx
  ON public.sdr_messages(conversation_id, status)
  WHERE direction = 'inbound' AND status IN ('received', 'queued', 'processing');
CREATE INDEX sdr_handoffs_status_idx ON public.sdr_handoffs(status, requested_at);
CREATE INDEX sdr_events_conversation_idx ON public.sdr_events(conversation_id, created_at DESC);
CREATE INDEX sdr_events_type_idx ON public.sdr_events(event_type, created_at DESC);

CREATE TRIGGER update_sdr_leads_updated_at
  BEFORE UPDATE ON public.sdr_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_conversations_updated_at
  BEFORE UPDATE ON public.sdr_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_messages_updated_at
  BEFORE UPDATE ON public.sdr_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_handoffs_updated_at
  BEFORE UPDATE ON public.sdr_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sdr_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY sdr_leads_admin_manage
  ON public.sdr_leads FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY sdr_conversations_admin_manage
  ON public.sdr_conversations FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY sdr_messages_admin_manage
  ON public.sdr_messages FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY sdr_handoffs_admin_manage
  ON public.sdr_handoffs FOR ALL TO authenticated
  USING (public.is_admin_or_staff(auth.uid()))
  WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY sdr_events_admin_read
  ON public.sdr_events FOR SELECT TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY sdr_notifications_admin_read
  ON public.sdr_notification_deliveries FOR SELECT TO authenticated
  USING (public.is_admin_or_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.sdr_ingest_inbound_message(
  p_whatsapp_id TEXT,
  p_phone_e164 TEXT,
  p_provider_message_id TEXT,
  p_content TEXT,
  p_waha_session TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT now(),
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead public.sdr_leads;
  v_conversation public.sdr_conversations;
  v_message public.sdr_messages;
  v_is_new_lead BOOLEAN := false;
BEGIN
  IF p_whatsapp_id IS NULL OR btrim(p_whatsapp_id) = '' THEN
    RAISE EXCEPTION 'whatsapp_id is required';
  END IF;

  IF p_provider_message_id IS NULL OR btrim(p_provider_message_id) = '' THEN
    RAISE EXCEPTION 'provider_message_id is required';
  END IF;

  SELECT * INTO v_message
  FROM public.sdr_messages
  WHERE provider_message_id = p_provider_message_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'duplicate', true,
      'lead_id', (SELECT lead_id FROM public.sdr_conversations WHERE id = v_message.conversation_id),
      'conversation_id', v_message.conversation_id,
      'message_id', v_message.id,
      'is_new_lead', false
    );
  END IF;

  SELECT * INTO v_lead
  FROM public.sdr_leads
  WHERE whatsapp_id = p_whatsapp_id
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.sdr_leads (whatsapp_id, phone_e164, display_name)
    VALUES (p_whatsapp_id, p_phone_e164, NULLIF(btrim(p_display_name), ''))
    RETURNING * INTO v_lead;
    v_is_new_lead := true;
  ELSE
    UPDATE public.sdr_leads
    SET
      phone_e164 = p_phone_e164,
      display_name = COALESCE(NULLIF(btrim(p_display_name), ''), display_name),
      last_seen_at = greatest(last_seen_at, p_occurred_at)
    WHERE id = v_lead.id
    RETURNING * INTO v_lead;
  END IF;

  SELECT * INTO v_conversation
  FROM public.sdr_conversations
  WHERE lead_id = v_lead.id
    AND status IN ('bot_active', 'waiting_human', 'human_active')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.sdr_conversations (lead_id, waha_session, last_inbound_at)
    VALUES (v_lead.id, COALESCE(NULLIF(p_waha_session, ''), 'default'), p_occurred_at)
    RETURNING * INTO v_conversation;
  ELSE
    UPDATE public.sdr_conversations
    SET
      waha_session = COALESCE(NULLIF(p_waha_session, ''), waha_session),
      last_inbound_at = greatest(COALESCE(last_inbound_at, p_occurred_at), p_occurred_at)
    WHERE id = v_conversation.id
    RETURNING * INTO v_conversation;
  END IF;

  INSERT INTO public.sdr_messages (
    conversation_id,
    provider_message_id,
    direction,
    role,
    content,
    status,
    occurred_at,
    raw_payload
  )
  VALUES (
    v_conversation.id,
    p_provider_message_id,
    'inbound',
    'user',
    p_content,
    'queued',
    p_occurred_at,
    p_raw_payload
  )
  RETURNING * INTO v_message;

  IF v_is_new_lead THEN
    INSERT INTO public.sdr_events (conversation_id, lead_id, event_type, payload)
    VALUES (
      v_conversation.id,
      v_lead.id,
      'new_lead',
      jsonb_build_object('phone_e164', v_lead.phone_e164, 'display_name', v_lead.display_name)
    );
  END IF;

  INSERT INTO public.sdr_events (conversation_id, lead_id, event_type, payload)
  VALUES (
    v_conversation.id,
    v_lead.id,
    'message_received',
    jsonb_build_object('message_id', v_message.id, 'provider_message_id', p_provider_message_id)
  );

  RETURN jsonb_build_object(
    'duplicate', false,
    'lead_id', v_lead.id,
    'conversation_id', v_conversation.id,
    'message_id', v_message.id,
    'is_new_lead', v_is_new_lead
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sdr_ingest_inbound_message(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sdr_ingest_inbound_message(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB
) TO service_role;

CREATE OR REPLACE FUNCTION public.sdr_request_handoff(
  p_conversation_id UUID,
  p_reason TEXT,
  p_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handoff_id UUID;
  v_lead_id UUID;
BEGIN
  IF p_reason NOT IN (
    'explicit_request',
    'unknown_answer',
    'ai_unavailable',
    'waha_unavailable',
    'commercial_high_intent',
    'sensitive_topic',
    'repeated_failure',
    'manual',
    'other'
  ) THEN
    RAISE EXCEPTION 'invalid handoff reason';
  END IF;

  UPDATE public.sdr_conversations
  SET status = 'waiting_human', bot_enabled = false
  WHERE id = p_conversation_id
  RETURNING lead_id INTO v_lead_id;

  IF v_lead_id IS NULL THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  INSERT INTO public.sdr_handoffs (conversation_id, reason, details)
  VALUES (p_conversation_id, p_reason, p_details)
  ON CONFLICT (conversation_id) WHERE status IN ('open', 'claimed')
  DO UPDATE SET
    reason = EXCLUDED.reason,
    details = COALESCE(EXCLUDED.details, public.sdr_handoffs.details),
    updated_at = now()
  RETURNING id INTO v_handoff_id;

  INSERT INTO public.sdr_events (conversation_id, lead_id, event_type, payload)
  VALUES (
    p_conversation_id,
    v_lead_id,
    'handoff_requested',
    jsonb_build_object('handoff_id', v_handoff_id, 'reason', p_reason, 'details', p_details)
  );

  RETURN v_handoff_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sdr_request_handoff(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sdr_request_handoff(UUID, TEXT, TEXT)
  TO service_role;

COMMENT ON TABLE public.sdr_leads IS 'SDR leads isolated by normalized WhatsApp identity.';
COMMENT ON TABLE public.sdr_messages IS 'Permanent inbound/outbound conversation audit log.';
COMMENT ON TABLE public.sdr_events IS 'Append-only operational audit events for the SDR.';

