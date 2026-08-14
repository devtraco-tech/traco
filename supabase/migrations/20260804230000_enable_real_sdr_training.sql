-- US-03: treinamento persistido e versionado do SDR.

ALTER TABLE public.sdr_knowledge_documents
  DROP CONSTRAINT IF EXISTS sdr_knowledge_documents_document_type_check;

ALTER TABLE public.sdr_knowledge_documents
  ADD CONSTRAINT sdr_knowledge_documents_document_type_check
  CHECK (document_type IN (
    'faq',
    'pdf',
    'audience_matrix',
    'commercial_script',
    'follow_up'
  ));

ALTER TABLE public.sdr_knowledge_documents
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.sdr_knowledge_documents.metadata IS
  'Metadados não sensíveis do treinamento, como versão, quantidade de itens e estado da cadência.';
