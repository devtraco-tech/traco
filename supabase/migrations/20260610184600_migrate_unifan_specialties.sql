-- ============================================================
-- Migração: Atribuir coluna institution = 'UNIFAN'
--           para as especialidades listadas pelo usuário.
-- ============================================================

-- 1. Garante que a coluna institution existe na tabela
--    (não falha se já existir)
ALTER TABLE public.patient_specialties
  ADD COLUMN IF NOT EXISTS institution TEXT DEFAULT 'ABO';

-- 2. Atualiza as especialidades UNIFAN pelo nome
--    (ILIKE para tolerar variações de capitalização/espaço)
UPDATE public.patient_specialties
SET institution = 'UNIFAN'
WHERE name ILIKE '%Clínica Integrada III UNIFAN%'
   OR name ILIKE '%Clínica integrada III UNIFAN%'
   OR name ILIKE '%Clinica Integrada III UNIFAN%'
   OR name ILIKE '%Estágio em Clínica Integrada II%Unifan%'
   OR name ILIKE '%Estagio em Clinica Integrada II%Unifan%'
   OR name ILIKE '%COORDENADOR DA ENDODONTIA%'
   OR name ILIKE '%GRADUAÇÃO UNIFAN%COORDENADOR DA ENDODONTIA%'
   OR name ILIKE '%Odontologia%Graduação Unifan%Clínica de Atenção Básica%'
   OR name ILIKE '%Odontologia%Graduacao Unifan%Clinica de Atencao Basica%'
   OR name ILIKE '%Unifan Cirurgia%Tawan%'
   OR name ILIKE '%Unifan Cirurgia%'
   OR name ILIKE '%GRADUAÇÃO UNIFA%DISCIPLINA DE ESTÁGIO EM CLÍNICA INTEGRADA 1%'
   OR name ILIKE '%GRADUACAO UNIFA%DISCIPLINA DE ESTAGIO EM CLINICA INTEGRADA 1%';

-- 3. Verificação: lista o que foi atualizado
-- (útil para rodar manualmente no Supabase SQL Editor)
-- SELECT id, name, institution FROM public.patient_specialties
-- WHERE institution = 'UNIFAN'
-- ORDER BY name;
