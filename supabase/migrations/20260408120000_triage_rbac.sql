-- 1. ADICIONAR NOVOS ROLES NO ENUM
-- Usamos bloco DO com COMMIT dentro se quisermos ignorar erros, porém em migrations normais de Supabase
-- o ALTER TYPE ADD VALUE não pode rodar em transação. O Supabase CLI suporta DisableTransaction a nível de arquivo,
-- mas podemos simplesmente rodar os comandos:
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'triage_coordenador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'triage_atendente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'triage_dentista';

-- 2. ADICIONAR VÍNCULO DE ESPECIALIDADE AO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS triage_specialty_id UUID REFERENCES public.patient_specialties(id) ON DELETE SET NULL;

-- 3. FUNÇÕES DE SUPORTE
CREATE OR REPLACE FUNCTION public.is_triage_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'triage_coordenador', 'triage_atendente')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_triage_dentist(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text = 'triage_dentista'
  )
$$;

-- 4. ATUALIZAR POLÍTICAS DA TABELA DE PACIENTES (patients)
-- Primeiro apaga a genérica que havia sido criada
DROP POLICY IF EXISTS "Autenticados com acesso total" ON public.patients;
DROP POLICY IF EXISTS "Enable ALL for authenticated users on patients" ON public.patients;

-- Política 1: Managers (Admin/Coord/Atendente) podem fazer TUDO em Patients
CREATE POLICY "Triage Managers full access on patients"
ON public.patients FOR ALL TO authenticated
USING (public.is_triage_manager(auth.uid()))
WITH CHECK (public.is_triage_manager(auth.uid()));

-- Política 2: Dentistas podem visualizar e atualizar *Apenas* Fila 2
CREATE POLICY "Triage Dentist access to Fila 2"
ON public.patients FOR SELECT TO authenticated
USING (public.is_triage_dentist(auth.uid()) AND current_stage = 'step2_triagem_clinica');

CREATE POLICY "Triage Dentist update Fila 2"
ON public.patients FOR UPDATE TO authenticated
USING (public.is_triage_dentist(auth.uid()) AND current_stage = 'step2_triagem_clinica')
WITH CHECK (public.is_triage_dentist(auth.uid()));

-- 5. ATUALIZAR POLÍTICAS DE 'appointments' E 'patient_procedures'
DROP POLICY IF EXISTS "Autenticados com acesso total" ON public.appointments;

CREATE POLICY "Triage Managers full access on appointments"
ON public.appointments FOR ALL TO authenticated
USING (public.is_triage_manager(auth.uid()))
WITH CHECK (public.is_triage_manager(auth.uid()));

-- Dentista visualiza todas as agendas? Pode ser útil pra ele ver as vagas de sua Fila
CREATE POLICY "Triage Dentist read on appointments"
ON public.appointments FOR SELECT TO authenticated
USING (public.is_triage_dentist(auth.uid()));


-- Políticas para Procedures
DROP POLICY IF EXISTS "Autenticados com acesso total" ON public.patient_procedures;

CREATE POLICY "Admin/Atendente/Coord view all procedures"
ON public.patient_procedures FOR SELECT TO authenticated
USING (true); -- Public read para popular dropdowns!

-- Apenas coordenadores criam procedimentos em suas especialidades, e admins criam em geral
CREATE POLICY "Triage Managers modify procedures"
ON public.patient_procedures FOR ALL TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = 'triage_coordenador'
      )
      AND specialty_id = (
        SELECT triage_specialty_id FROM public.profiles WHERE id = auth.uid()
      )
    )
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role::text = 'triage_coordenador'
      )
      AND specialty_id = (
        SELECT triage_specialty_id FROM public.profiles WHERE id = auth.uid()
      )
    )
);
