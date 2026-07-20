-- CORREÇÃO DA RECURSÃO INFINITA NAS POLÍTICAS DE USER_ROLES
-- Este erro impedia o sistema de identificar quem é Admin/Coordenador.

-- 1. Remover as políticas problemáticas
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;

-- 2. Recriar a função has_role de forma mais robusta e sem recursão para o RLS
-- Usamos uma função SECURITY DEFINER que limpa o search_path para garantir segurança e bypass do RLS
CREATE OR REPLACE FUNCTION public.has_role_v2(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
  -- Nota: O SELECT direto aqui em uma função SECURITY DEFINER ignora o RLS da própria tabela
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 3. Criar novas políticas que NÃO usam funções recursivas ou usam a versão v2 hardenizada
-- Política de Leitura: Usuário vê o próprio papel (Simples, sem loop)
CREATE POLICY "user_roles_read_own"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política de Admin: Admin gerencia tudo
-- Para evitar o loop, usamos uma subquery direta ou a função v2 que é SECURITY DEFINER
CREATE POLICY "user_roles_admin_manage"
ON public.user_roles FOR ALL
TO authenticated
USING (
  (SELECT (role = 'admin') FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
)
WITH CHECK (
  (SELECT (role = 'admin') FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1)
);

-- 4. Atualizar também a função has_role original para apontar para a v2 ou ser corrigida
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
  BEGIN
    RETURN public.has_role_v2(_user_id, _role);
  END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Corrigir as funções de Triagem para garantir que também não causem lentidão ou recursão
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
