-- Vínculo idempotente entre uma conversa SDR e um lead/contato do Kommo.
ALTER TABLE public.sdr_conversations
  ADD COLUMN IF NOT EXISTS kommo_lead_id BIGINT,
  ADD COLUMN IF NOT EXISTS kommo_contact_id BIGINT,
  ADD COLUMN IF NOT EXISTS kommo_status_id BIGINT,
  ADD COLUMN IF NOT EXISTS kommo_sync_status TEXT NOT NULL DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS kommo_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS kommo_sync_error TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sdr_conversations_kommo_sync_status_check'
      AND conrelid = 'public.sdr_conversations'::regclass
  ) THEN
    ALTER TABLE public.sdr_conversations
      ADD CONSTRAINT sdr_conversations_kommo_sync_status_check
      CHECK (kommo_sync_status IN ('not_synced', 'synced', 'failed'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS sdr_conversations_kommo_lead_unique
  ON public.sdr_conversations(kommo_lead_id)
  WHERE kommo_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sdr_conversations_kommo_sync_idx
  ON public.sdr_conversations(kommo_sync_status, updated_at DESC);

COMMENT ON COLUMN public.sdr_conversations.kommo_lead_id IS
  'ID do lead correspondente no Kommo; um único lead por conversa.';
COMMENT ON COLUMN public.sdr_conversations.kommo_contact_id IS
  'ID do contato principal vinculado ao lead no Kommo.';
COMMENT ON COLUMN public.sdr_conversations.kommo_status_id IS
  'Última etapa do funil Kommo confirmada pela API.';
COMMENT ON COLUMN public.sdr_conversations.kommo_sync_error IS
  'Erro técnico mais recente; não deve armazenar token nem payload com dados sensíveis.';
