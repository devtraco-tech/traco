-- Adicionar campos de repasse à tabela courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS suggested_repayment_type text,
ADD COLUMN IF NOT EXISTS suggested_repayment_value text,
ADD COLUMN IF NOT EXISTS effective_repayment_type text,
ADD COLUMN IF NOT EXISTS effective_repayment_value text,
ADD COLUMN IF NOT EXISTS installment_suggestion text,
ADD COLUMN IF NOT EXISTS effective_installment text;