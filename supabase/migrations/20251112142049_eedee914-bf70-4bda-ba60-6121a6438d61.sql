-- Criar tabela de equipes promotoras
CREATE TABLE public.promotional_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.promotional_teams ENABLE ROW LEVEL SECURITY;

-- Política: Todos autenticados podem visualizar equipes
CREATE POLICY "Authenticated users can view promotional teams"
ON public.promotional_teams
FOR SELECT
TO authenticated
USING (true);

-- Política: Apenas admins podem gerenciar equipes
CREATE POLICY "Admins can manage promotional teams"
ON public.promotional_teams
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Adicionar coluna promotional_team_id na tabela courses
ALTER TABLE public.courses
ADD COLUMN promotional_team_id UUID REFERENCES public.promotional_teams(id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_promotional_teams_updated_at
BEFORE UPDATE ON public.promotional_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();