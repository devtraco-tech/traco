import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { classifiedCacheConfig } from "@/lib/queryConfig";

export type Classified = Tables<"classifieds">;
export type ClassifiedInsert = TablesInsert<"classifieds">;
export type ClassifiedUpdate = TablesUpdate<"classifieds">;
export type ClassifiedLog = Tables<"classified_logs">;


export const useClassifieds = () => {
  return useQuery({
    queryKey: ["classifieds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Classified[];
    },
    ...classifiedCacheConfig,
  });
};

export const useMyClassifieds = () => {
  return useQuery({
    queryKey: ["my-classifieds"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Classified[];
    },
    ...classifiedCacheConfig,
  });
};

export const useApprovedClassifieds = () => {
  return useQuery({
    queryKey: ["approved-classifieds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("status", "approved")
        .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Classified[];
    },
    ...classifiedCacheConfig,
  });
};

export const useClassified = (id?: string) => {
  return useQuery({
    queryKey: ["classified", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("classifieds")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Classified;
    },
    enabled: !!id,
  });
};

export const useCreateClassified = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (classified: ClassifiedInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("classifieds")
        .insert({ ...classified, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["my-classifieds"] });
      toast({
        title: "Sucesso",
        description: "Classificado criado e enviado para aprovação.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useUpdateClassified = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ClassifiedUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("classifieds")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["my-classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["approved-classifieds"] });
      toast({
        title: "Sucesso",
        description: "Classificado atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useDeleteClassified = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("classifieds")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["my-classifieds"] });
      toast({
        title: "Sucesso",
        description: "Classificado excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useApproveClassified = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("classifieds")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log the approval action
      await supabase
        .from("classified_logs")
        .insert({
          classified_id: id,
          action: "approved",
          performed_by: user.id,
          notes,
          timezone: "America/Sao_Paulo",
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["approved-classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["classified-logs"] });
      toast({
        title: "Sucesso",
        description: "Classificado aprovado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRejectClassified = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("classifieds")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Log the rejection action
      await supabase
        .from("classified_logs")
        .insert({
          classified_id: id,
          action: "rejected",
          performed_by: user.id,
          notes,
          timezone: "America/Sao_Paulo",
        });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classifieds"] });
      queryClient.invalidateQueries({ queryKey: ["classified-logs"] });
      toast({
        title: "Sucesso",
        description: "Classificado rejeitado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useClassifiedLogs = (classifiedId?: string) => {
  return useQuery({
    queryKey: ["classified-logs", classifiedId],
    queryFn: async () => {
      if (!classifiedId) return [];

      const { data, error } = await supabase
        .from("classified_logs")
        .select("*")
        .eq("classified_id", classifiedId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClassifiedLog[];
    },
    enabled: !!classifiedId,
  });
};
