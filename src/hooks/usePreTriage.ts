import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; 
import { supabase } from "@/integrations/supabase/client";

export type WorkflowStage = 'step1_atendimento' | 'step2_triagem_clinica' | 'step3_selecao_cap' | 'em_atendimento' | 'arquivado';
export type ReceptionStatus = 'entrada' | 'contato_realizado' | 'faltou' | 'nao_selecionado' | 'aguardando_retorno';
export type DentistStatus = 'agendado' | 'consultou' | 'faltou';
export type CapStatus = 'aguardando_vaga' | 'em_negociacao' | 'entrevista_agendada' | 'finalizado' | null;

export const usePreTriage = () => {
  const queryClient = useQueryClient();

  const { data: patients = [], isPending, isFetching, error } = useQuery({
    queryKey: ["triage-patients-step1"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("*")
        .eq("current_stage", "step1_atendimento")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });

  const createPatient = useMutation({
    mutationFn: async (newPatient: any) => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .insert([{ 
          ...newPatient, 
          current_stage: 'step1_atendimento',
          reception_status: 'entrada',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString() 
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step2"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step3"] });
      queryClient.invalidateQueries({ queryKey: ["triage-dashboard-stats"] });
      toast.success("Paciente cadastrado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar paciente:", error);
      toast.error(`Falha ao criar paciente: ${error.message}`);
    }
  });

  const updatePatient = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step2"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step3"] });
      queryClient.invalidateQueries({ queryKey: ["triage-dashboard-stats"] });
      toast.success("Ficha atualizada com sucesso.");
    },
  });

  const advanceToClinicalTriage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("patients")
        .update({ 
          current_stage: 'step2_triagem_clinica',
          dentist_status: 'agendado',
          updated_at: new Date().toISOString() 
        })
        .eq("id", id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step2"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step3"] });
      queryClient.invalidateQueries({ queryKey: ["triage-dashboard-stats"] });
      toast.success("Paciente enviado para Triagem Clínica 3!");
    },
    onError: (error: any) => {
      console.error("Erro ao avançar paciente:", error);
      toast.error(`Falha ao avançar paciente: ${error.message || 'Erro desconhecido'}`);
    }
  });

  const deletePatient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("patients")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step2"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step3"] });
      queryClient.invalidateQueries({ queryKey: ["triage-dashboard-stats"] });
      toast.success("Paciente excluído com sucesso.");
    },
    onError: (error: any) => {
      console.error("Erro ao excluir paciente:", error);
      toast.error(`Falha ao excluir paciente: ${error.message}`);
    }
  });

  return {
    patients,
    isPending,
    isFetching,
    isLoading: isPending,
    error,
    updatePatient,
    advanceToClinicalTriage,
    createPatient,
    deletePatient
  };
};
