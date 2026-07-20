-- Criar os enums base
CREATE TYPE workflow_stage AS ENUM (
  'step1_atendimento',
  'step2_triagem_clinica',
  'step3_selecao_cap',
  'em_atendimento',
  'arquivado'
);

CREATE TYPE reception_status AS ENUM (
  'entrada', 
  'contato_realizado', 
  'faltou'
);

-- Tabela principal
CREATE TABLE patients (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   kommo_lead_id TEXT UNIQUE,
   
   full_name TEXT NOT NULL,
   phone TEXT,
   
   -- Máquina de Estado Macro
   current_stage workflow_stage DEFAULT 'step1_atendimento',
   
   -- Dados do STEP 1 (Recepção)
   reception_status reception_status DEFAULT 'entrada',
   chk_necessities BOOLEAN DEFAULT false,
   chk_orientation BOOLEAN DEFAULT false,
   chk_dentaloffice BOOLEAN DEFAULT false,
   chk_scheduled BOOLEAN DEFAULT false,

   created_at TIMESTAMPTZ DEFAULT NOW(),
   updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger de Updated At (opcional, comum com Supabase)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_modtime
    BEFORE UPDATE ON patients
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Políticas RLS Iniciais (Permite crud total se logado, pode ser refinado dps)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable ALL for authenticated users on patients"
ON patients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


