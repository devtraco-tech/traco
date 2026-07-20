import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CourseLead {
  id: string;
  course_id: string;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  notes: string | null;
  source: string;
  status: 'pending' | 'contacted' | 'converted' | 'lost';
  created_at: string;
  updated_at: string;
  courses?: {
    id: string;
    title: string;
    area: string;
  };
}

export const useCourseLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all course leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["course-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_leads")
        .select(`
          *,
          courses (
            id,
            title,
            area
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CourseLead[];
    },
  });

  // Update lead status
  const updateLeadStatus = useMutation({
    mutationFn: async ({ 
      leadId, 
      status 
    }: { 
      leadId: string; 
      status: 'pending' | 'contacted' | 'converted' | 'lost';
    }) => {
      const { data, error } = await supabase
        .from("course_leads")
        .update({ status })
        .eq("id", leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-leads"] });
      toast({
        title: "Status atualizado",
        description: "O status do lead foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("course_leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-leads"] });
      toast({
        title: "Lead excluído",
        description: "O lead foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get leads by status
  const getLeadsByStatus = (status: string) => {
    return leads?.filter(lead => lead.status === status) || [];
  };

  // Get leads by course
  const getLeadsByCourse = (courseId: string) => {
    return leads?.filter(lead => lead.course_id === courseId) || [];
  };

  // Get statistics
  const stats = {
    total: leads?.length || 0,
    pending: leads?.filter(l => l.status === 'pending').length || 0,
    contacted: leads?.filter(l => l.status === 'contacted').length || 0,
    converted: leads?.filter(l => l.status === 'converted').length || 0,
    lost: leads?.filter(l => l.status === 'lost').length || 0,
  };

  return {
    leads,
    isLoading,
    updateLeadStatus,
    deleteLead,
    getLeadsByStatus,
    getLeadsByCourse,
    stats,
  };
};
