-- Tabela separada para agendamentos da Triagem Clínica (Fila 2)
CREATE TABLE IF NOT EXISTS public.clinical_triage_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  patient_name text,
  scheduled_date date NOT NULL,
  start_time text NOT NULL,
  end_time text,
  duration_min integer DEFAULT 30,
  status text DEFAULT 'scheduled',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_triage_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Triage staff manage clinical triage appointments"
  ON public.clinical_triage_appointments FOR ALL
  TO authenticated
  USING (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()))
  WITH CHECK (public.is_triage_manager(auth.uid()) OR public.is_triage_dentist(auth.uid()));

CREATE TRIGGER clinical_triage_appointments_updated_at
  BEFORE UPDATE ON public.clinical_triage_appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_clinical_triage_appts_date ON public.clinical_triage_appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_clinical_triage_appts_patient ON public.clinical_triage_appointments(patient_id);