-- Audit the enrollment follow-up cadence without storing additional personal data.

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
      'conversation_restarted',
      'enrollment_follow_up_scheduled',
      'enrollment_follow_up_sent'
    )
  );
