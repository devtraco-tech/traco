import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BillingCompany {
  id: string;
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  contact_person?: string;
  created_at?: string;
  updated_at?: string;
}

export const useBillingCompanies = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: billingCompanies, isLoading, error: queryError } = useQuery({
    queryKey: ["billing-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_companies")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar empresas de faturamento:", error);
        throw error;
      }
      
      return data as BillingCompany[];
    },
  });

  // Show error toast if query fails
  if (queryError) {
    toast({
      title: "Erro ao carregar empresas",
      description: "Não foi possível carregar as empresas de faturamento. Verifique suas permissões.",
      variant: "destructive",
    });
  }

  const createBillingCompany = useMutation({
    mutationFn: async (companyData: Omit<BillingCompany, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("billing_companies")
        .insert([companyData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-companies"] });
      toast({
        title: "Empresa criada com sucesso!",
        description: "A empresa de cobrança foi adicionada ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateBillingCompany = useMutation({
    mutationFn: async ({ id, ...companyData }: Partial<BillingCompany> & { id: string }) => {
      const { data, error } = await supabase
        .from("billing_companies")
        .update(companyData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-companies"] });
      toast({
        title: "Empresa atualizada com sucesso!",
        description: "As informações foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteBillingCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("billing_companies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billing-companies"] });
      toast({
        title: "Empresa excluída com sucesso!",
        description: "A empresa foi removida do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir empresa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    billingCompanies,
    isLoading,
    createBillingCompany,
    updateBillingCompany,
    deleteBillingCompany,
  };
};
