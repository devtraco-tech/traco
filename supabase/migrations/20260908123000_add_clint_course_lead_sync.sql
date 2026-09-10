-- Vínculo dos leads de cursos com a Clint. Leads de pacientes não fazem parte deste escopo.
ALTER TABLE public.course_leads
  ADD COLUMN IF NOT EXISTS clint_deal_id UUID;

CREATE INDEX IF NOT EXISTS course_leads_clint_deal_idx
  ON public.course_leads(clint_deal_id)
  WHERE clint_deal_id IS NOT NULL;

COMMENT ON COLUMN public.course_leads.clint_deal_id IS
  'UUID do negócio de curso correspondente na Clint.';
