-- Adicionar coluna is_archived à tabela courses
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Criar índice para melhorar performance de queries filtradas
CREATE INDEX IF NOT EXISTS idx_courses_is_archived ON public.courses(is_archived);