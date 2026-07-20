import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Teacher {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  bio?: string;
  specialties?: string[];
  photo_url?: string;
  cro?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useTeachers = (includeInactive = false) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["teachers", includeInactive],
    queryFn: async () => {
      let query = supabase
        .from("teachers")
        .select("*")
        .order("name", { ascending: true });

      if (!includeInactive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Teacher[];
    },
  });

  const createTeacher = useMutation({
    mutationFn: async (teacherData: Omit<Teacher, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("teachers")
        .insert([teacherData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Professor criado com sucesso!",
        description: "O professor foi adicionado ao sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar professor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTeacher = useMutation({
    mutationFn: async ({ id, ...teacherData }: Partial<Teacher> & { id: string }) => {
      const { data, error } = await supabase
        .from("teachers")
        .update(teacherData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: "Professor atualizado com sucesso!",
        description: "As informações foram atualizadas.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar professor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleTeacherStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from("teachers")
        .update({ is_active })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast({
        title: data.is_active ? "Professor ativado!" : "Professor desativado!",
        description: "O status foi atualizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    teachers,
    isLoading,
    createTeacher,
    updateTeacher,
    toggleTeacherStatus,
  };
};
