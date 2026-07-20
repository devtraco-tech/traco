import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner"; 
import { supabase } from "@/integrations/supabase/client";

export const useClinicalTriage = () => {
  const queryClient = useQueryClient();

  const { data: patients = [], isPending, isFetching, error } = useQuery({
    queryKey: ["triage-patients-step2"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("*")
        .eq("current_stage", "step2_triagem_clinica")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const updatePatientClinicalData = useMutation({
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
      toast.success("Avaliação clínica atualizada.");
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  const advanceToCAPSelection = useMutation({
    mutationFn: async ({ id, updates = {} }: { id: string, updates?: any }) => {
      const { error } = await (supabase as any)
        .from("patients")
        .update({ 
          ...updates,
          current_stage: 'step3_selecao_cap',
          cap_status: 'aguardando_vaga',
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
      toast.success("Paciente enviado para Distribuição CAP!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao avançar paciente: ${error.message}`);
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
    updatePatientClinicalData,
    advanceToCAPSelection,
    deletePatient
  };
};
