-- Novas etapas do pré-atendimento de Prótese Dentária.
ALTER TABLE public.sdr_conversations
  DROP CONSTRAINT IF EXISTS sdr_conversations_flow_stage_check;
ALTER TABLE public.sdr_conversations
  ADD CONSTRAINT sdr_conversations_flow_stage_check
  CHECK (flow_stage IN (
    'presentation', 'qualification', 'profile', 'match', 'abo_connection',
    'final_match', 'questions', 'format_confirmation', 'price_permission',
    'price_match', 'closing', 'alternative_offer', 'alternative_details',
    'enrollment', 'completed', 'disqualified'
  ));
