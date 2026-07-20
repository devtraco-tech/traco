import { WorkflowStage, ReceptionStatus, DentistStatus, CapStatus } from "./usePreTriage";

export interface ClinicalData {
  urgency: 'alta' | 'media' | 'baixa' | null;
  specialties: string[];
  treatment_types: string[];
  has_exams: boolean;
  exams_type?: string;
  exams_date?: string;
  exams_validity?: string;
  dentist_requested_exams?: string;
  medical_history?: string;
}

export type PatientData = {
  id: string;
  kommo_lead_id: string | null;
  full_name: string;
  mobile_phone: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  gender: string | null;
  birth_date?: string | null;
  state?: string | null;
  city?: string | null;
  treatment_needed?: string | null;
  current_stage: WorkflowStage;
  reception_status: ReceptionStatus;
  dentist_status?: DentistStatus;
  cap_status?: CapStatus;
  assigned_clinic_id?: string | null;
  assigned_class_id?: string | null;
  kanban_status?: string | null;
  chk_necessities: boolean;
  chk_orientation: boolean;
  chk_dentaloffice: boolean;
  chk_scheduled: boolean;
  scheduled_date?: string | null;
  created_at: string;
  updated_at: string;
  is_return?: boolean;
  triaged_by_name?: string | null;
} & ClinicalData;

export const globalMockPatients: PatientData[] = [
  {
    id: "1",
    kommo_lead_id: null,
    full_name: "João Silva Sauro",
    mobile_phone: "(61) 99822-1234",
    phone: "(61) 3333-4444",
    email: "joao.sauro@email.com",
    cpf: "111.222.333-44",
    gender: "M",
    birth_date: "1985-05-12",
    state: "GO",
    city: "Goiânia",
    treatment_needed: "Limpeza e Clareamento",
    current_stage: 'step1_atendimento',
    reception_status: 'entrada',
    chk_necessities: false,
    chk_orientation: false,
    chk_dentaloffice: false,
    chk_scheduled: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    urgency: null, specialties: [], treatment_types: [], has_exams: false
  },
  {
    id: "2",
    kommo_lead_id: null,
    full_name: "Maria de Lourdes Almeida",
    mobile_phone: "(61) 98765-4321",
    phone: null,
    email: "maria.lourdes@gmail.com",
    cpf: "555.666.777-88",
    gender: "F",
    birth_date: "1960-11-23",
    state: "GO",
    city: "Aparecida de Goiânia",
    treatment_needed: "Implante Dentário",
    current_stage: 'step1_atendimento',
    reception_status: 'contato_realizado',
    chk_necessities: true,
    chk_orientation: true,
    chk_dentaloffice: false,
    chk_scheduled: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
    urgency: null, specialties: [], treatment_types: [], has_exams: false
  },
  {
    id: "3",
    kommo_lead_id: null,
    full_name: "Carlos Roberto Neves",
    mobile_phone: "(61) 97777-6666",
    phone: null,
    email: "carlos_roberto@outlook.com",
    cpf: "222.333.444-55",
    gender: "M",
    birth_date: "1992-02-15",
    state: "DF",
    city: "Brasília",
    treatment_needed: "Aparelho Ortodôntico",
    current_stage: 'step2_triagem_clinica', // Note que este está na Fila 2!
    reception_status: 'contato_realizado',
    dentist_status: 'agendado',
    chk_necessities: true,
    chk_orientation: true,
    chk_dentaloffice: true,
    chk_scheduled: true,
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date().toISOString(),
    urgency: null, specialties: [], treatment_types: [], has_exams: false
  }
];
