import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SiteConfiguration {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export const useSiteConfiguration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configurations, isLoading } = useQuery({
    queryKey: ["site-configuration"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_configuration")
        .select("*")
        .order("key", { ascending: true });

      if (error) throw error;
      return data as SiteConfiguration[];
    },
  });

  const getConfigValue = (key: string): string | null => {
    const config = configurations?.find(c => c.key === key);
    return config?.value || null;
  };

  const updateConfiguration = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Check if configuration exists
      const { data: existing } = await supabase
        .from("site_configuration")
        .select("id")
        .eq("key", key)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from("site_configuration")
          .update({ 
            value, 
            description: description || null,
            updated_by: user?.id 
          })
          .eq("key", key)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new - need to use RPC or handle differently since INSERT is not allowed
        throw new Error("Configuração não existe. Contate o administrador.");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-configuration"] });
      toast({
        title: "Configuração salva!",
        description: "As alterações foram aplicadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configuração",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    configurations,
    isLoading,
    getConfigValue,
    updateConfiguration,
  };
};
