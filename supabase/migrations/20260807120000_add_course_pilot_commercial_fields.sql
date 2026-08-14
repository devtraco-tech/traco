-- Campos comerciais públicos necessários para o piloto do SDR.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS registration_deadline date,
  ADD COLUMN IF NOT EXISTS investment_details text;

COMMENT ON COLUMN public.courses.registration_deadline IS
  'Data limite pública para novas matrículas, distinta da data de início do curso.';

COMMENT ON COLUMN public.courses.investment_details IS
  'Texto comercial oficial quando o investimento não deve ser apresentado como valor total.';
