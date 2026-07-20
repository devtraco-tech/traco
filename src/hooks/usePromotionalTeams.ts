import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PromotionalTeam {
  id: string;
  name: string;
  description?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export const usePromotionalTeams = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: promotionalTeams, isLoading, error: queryError } = useQuery({
    queryKey: ["promotional-teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotional_teams")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar equipes promotoras:", error);
        throw error;
      }
      
      return data as PromotionalTeam[];
    },
  });

  // Show error toast if query fails
  if (queryError) {
    toast({
      title: "Erro ao carregar equipes",
      description: "Não foi possível carregar as equipes promotoras. Verifique suas permissões.",
      variant: "destructive",
    });
  }

  const createPromotionalTeam = useMutation({
    mutationFn: async (teamData: Omit<PromotionalTeam, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("promotional_teams")
        .insert([teamData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotional-teams"] });
      toast({
        title: "Equipe criada com sucesso!",
        description: "A equipe promotora foi adicionada ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar equipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePromotionalTeam = useMutation({
    mutationFn: async ({ id, ...teamData }: Partial<PromotionalTeam> & { id: string }) => {
      const { data, error } = await supabase
        .from("promotional_teams")
        .update(teamData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotional-teams"] });
      toast({
        title: "Equipe atualizada com sucesso!",
        description: "As informações foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar equipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePromotionalTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promotional_teams")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotional-teams"] });
      toast({
        title: "Equipe excluída com sucesso!",
        description: "A equipe foi removida do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir equipe",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    promotionalTeams,
    isLoading,
    createPromotionalTeam,
    updatePromotionalTeam,
    deletePromotionalTeam,
  };
};
