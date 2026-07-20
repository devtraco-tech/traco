import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; 
import { supabase } from "@/integrations/supabase/client";

export type CAPStatus = 'aguardando_vaga' | 'em_negociacao' | 'entrevista_agendada' | 'recusado_cap' | 'faltou' | 'declinado_falta';

export const useCAPDistribution = () => {
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["triage-patients-step3"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("*")
        .eq("current_stage", "step3_selecao_cap")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        kanban_status: p.reception_status === 'nao_selecionado' ? 'recusado_cap' : (p.cap_status || 'aguardando_vaga')
      }));
    },
  });

  const routePatientsToClinic = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      clinic_class, 
      clinic_id, 
      specialty_id,
      specialties,
      scheduled_date,
      treatment_types,
      no_show_count,
      medical_history,
      current_stage,
      reception_status
    }: { 
      id: string, 
      status: string, 
      clinic_class?: string, 
      clinic_id?: string, 
      specialty_id?: string,
      specialties?: string[],
      scheduled_date?: string,
      treatment_types?: string[],
      no_show_count?: number,
      medical_history?: string,
      current_stage?: string,
      reception_status?: string
    }) => {
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      const stages = ['step1_atendimento', 'step2_triagem_clinica', 'step3_selecao_cap', 'arquivado'];
      
      if (status === 'recusado_cap') {
        updates.current_stage = 'step3_selecao_cap';
        updates.reception_status = 'nao_selecionado';
        updates.cap_status = null;
      } else if (stages.includes(status)) {
        updates.current_stage = status;
        updates.reception_status = 'contato_realizado'; 
        if (status === 'step3_selecao_cap') updates.cap_status = 'aguardando_vaga';
      } else {
        // Colunas do Kanban
        updates.current_stage = 'step3_selecao_cap';
        updates.cap_status = status;
        updates.reception_status = 'contato_realizado'; 
        
        if (clinic_id && clinic_id !== "") updates.assigned_clinic_id = clinic_id;
        if (clinic_class && clinic_class !== "") updates.assigned_class_id = clinic_class;
        if (specialty_id && specialty_id !== "") updates.assigned_specialty_id = specialty_id;
        if (Array.isArray(specialties) && specialties.length > 0) updates.specialties = specialties;
        if (scheduled_date) updates.scheduled_date = scheduled_date;
        if (Array.isArray(treatment_types) && treatment_types.length > 0) updates.treatment_types = treatment_types;
      }

      if (no_show_count !== undefined) updates.no_show_count = no_show_count;
      if (medical_history !== undefined) updates.medical_history = medical_history;
      if (current_stage !== undefined) updates.current_stage = current_stage;
      if (reception_status !== undefined) updates.reception_status = reception_status;

      console.log("Iniciando Transição CAP:", { id, updates });

      const { error } = await (supabase as any)
        .from("patients")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("Erro no Supabase:", error);
        throw error;
      }
      return { success: true, newStatus: status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step2"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step3"] });
      queryClient.invalidateQueries({ queryKey: ["triage-dashboard-stats"] });
      toast.success(`Paciente movido para: ${variables.status}`);
    },
    onError: (error: any) => {
      console.error("Erro na mutação CAP:", error);
      toast.error(`Falha ao mover paciente: ${error.message || 'Erro desconhecido'}`);
    }
  });

  return {
    patients,
    isLoading,
    routePatientsToClinic
  };
};
