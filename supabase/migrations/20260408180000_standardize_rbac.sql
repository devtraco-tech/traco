-- PADRONIZAÇÃO FINAL DE RBAC E POLÍTICAS DE SEGURANÇA (RLS)
-- Esta migração organiza todas as funções de auxílio e as aplica de forma consistente.

-- 1. FUNÇÕES DE AUXÍLIO REPADRONIZADAS (SECURITY DEFINER PARA EVITAR RECURSÃO)

-- Função geral para checar qualquer cargo
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Função para Administradores ou Staff
CREATE OR REPLACE FUNCTION public.is_admin_or_staff(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'staff')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Funções específicas da Triagem
CREATE OR REPLACE FUNCTION public.is_triage_manager(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'triage_coordenador', 'triage_atendente')
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_triage_dentist(_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'triage_dentista'
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;


-- 2. PADRONIZAÇÃO DA TABELA USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Limpar e recriar políticas
DO $$ 
DECLARE pol RECORD; 
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));


-- 3. PADRONIZAÇÃO DA TABELA PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE pol RECORD; 
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_view_all" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin_or_staff(auth.uid()));
CREATE POLICY "profiles_admin_manage" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));


-- 4. PADRONIZAÇÃO DA TABELA PATIENTS (Triagem)
DO $$ 
DECLARE pol RECORD; 
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'patients' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.patients', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "patients_manager_all" ON public.patients FOR ALL TO authenticated 
USING (public.is_triage_manager(auth.uid()));

CREATE POLICY "patients_dentist_view" ON public.patients FOR SELECT TO authenticated 
USING (public.is_triage_dentist(auth.uid()) AND current_stage = 'step2_triagem_clinica');

CREATE POLICY "patients_dentist_update" ON public.patients FOR UPDATE TO authenticated 
USING (public.is_triage_dentist(auth.uid()) AND current_stage = 'step2_triagem_clinica');


-- 5. PADRONIZAÇÃO DE CURSOS (Educação)
DO $$ 
DECLARE pol RECORD; 
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'courses' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.courses', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "courses_public_read_approved" ON public.courses FOR SELECT TO authenticated 
USING (status IN ('approved', 'in_progress', 'completed') OR public.is_admin_or_staff(auth.uid()));

CREATE POLICY "courses_admin_manage" ON public.courses FOR ALL TO authenticated 
USING (public.is_admin_or_staff(auth.uid()));
