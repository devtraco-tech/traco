-- Vínculo exclusivo das conversas comerciais com a Clint.
ALTER TABLE public.sdr_conversations
  ADD COLUMN IF NOT EXISTS clint_deal_id UUID,
  ADD COLUMN IF NOT EXISTS clint_contact_id UUID,
  ADD COLUMN IF NOT EXISTS clint_stage_id UUID,
  ADD COLUMN IF NOT EXISTS clint_sync_status TEXT NOT NULL DEFAULT 'not_synced',
  ADD COLUMN IF NOT EXISTS clint_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clint_sync_error TEXT;

ALTER TABLE public.sdr_conversations
  DROP CONSTRAINT IF EXISTS sdr_conversations_clint_sync_status_check;

ALTER TABLE public.sdr_conversations
  ADD CONSTRAINT sdr_conversations_clint_sync_status_check
  CHECK (clint_sync_status IN ('not_synced', 'synced', 'failed'));

CREATE INDEX IF NOT EXISTS sdr_conversations_clint_deal_idx
  ON public.sdr_conversations(clint_deal_id)
  WHERE clint_deal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sdr_conversations_clint_sync_idx
  ON public.sdr_conversations(clint_sync_status, updated_at DESC);

COMMENT ON COLUMN public.sdr_conversations.clint_deal_id IS
  'UUID do negócio comercial correspondente na Clint.';
