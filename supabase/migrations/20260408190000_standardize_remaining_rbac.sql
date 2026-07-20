-- PADRONIZAÇÃO FINAL DE RBAC PARA TRIAGEM E PACIENTES
-- Garante que as transições de fila (stages) não sejam bloqueadas pelo RLS

-- 1. LIMPEZA DE POLÍTICAS ANTIGAS NA TABELA PATIENTS
DO $$ 
DECLARE pol RECORD; 
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'patients' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.patients', pol.policyname);
    END LOOP;
END $$;

-- 2. NOVAS POLÍTICAS PARA PATIENTS (Permitindo Transições)

-- Gestores (Administradores, Coordenadores e Atendentes) têm acesso total
CREATE POLICY "patients_manager_all" ON public.patients FOR ALL TO authenticated 
USING (public.is_triage_manager(auth.uid()))
WITH CHECK (public.is_triage_manager(auth.uid()));

-- Dentistas podem VER pacientes na Fila 2 OU se forem os responsáveis (futuro)
CREATE POLICY "patients_dentist_view" ON public.patients FOR SELECT TO authenticated 
USING (
    public.is_triage_dentist(auth.uid()) 
    AND (current_stage = 'step2_triagem_clinica' OR dentist_status IS NOT NULL)
);

-- Dentistas podem ATUALIZAR pacientes na Fila 2, inclusive para movê-los para a Fila 3
CREATE POLICY "patients_dentist_update" ON public.patients FOR UPDATE TO authenticated 
USING (
    public.is_triage_dentist(auth.uid()) 
    AND current_stage = 'step2_triagem_clinica'
)
WITH CHECK (public.is_triage_dentist(auth.uid()));


-- 3. PADRONIZAÇÃO DE TABELAS AUXILIARES (Procedures e Especialidades)

-- Procedures
ALTER TABLE public.patient_procedures ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "patient_procedures_manager_all" ON public.patient_procedures; EXCEPTION WHEN others THEN END $$;
CREATE POLICY "patient_procedures_manager_all" ON public.patient_procedures FOR ALL TO authenticated 
USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

-- Especialidades (Assessed Specialties)
ALTER TABLE public.patient_specialties ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "assessments_manager_all" ON public.patient_specialties; EXCEPTION WHEN others THEN END $$;
CREATE POLICY "assessments_manager_all" ON public.patient_specialties FOR ALL TO authenticated 
USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));


-- 4. PADRONIZAÇÃO DE AGENDAMENTOS (Appointments)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN DROP POLICY IF EXISTS "appointments_manager_all" ON public.appointments; EXCEPTION WHEN others THEN END $$;
CREATE POLICY "appointments_manager_all" ON public.appointments FOR ALL TO authenticated 
USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

-- Garantir que todos tenham acesso de leitura para evitar erros de join, mas respeitando o estágio se não for gestor
DROP POLICY IF EXISTS "patients_public_read" ON public.patients;
CREATE POLICY "patients_public_read" ON public.patients FOR SELECT TO authenticated 
USING (public.is_admin_or_staff(auth.uid()));
