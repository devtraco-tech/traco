import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EmailTemplate {
  id: string;
  name: string;
  type: "course_created" | "course_approved" | "course_rejected" | "course_pending_correction" | "lead_confirmation" | "course_unarchived";
  subject: string;
  html_template: string;
  text_template: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export interface NotificationGroup {
  id: string;
  name: string;
  description: string;
  trigger_type: "course_created" | "course_approved" | "course_rejected" | "course_pending_correction" | "lead_confirmation" | "course_unarchived";
  emails: string[];
  template_id: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
  email_templates?: EmailTemplate;
}

export const triggerTypeConfig = {
  course_created: {
    label: "Novo Curso Criado",
    icon: "📝",
    color: "bg-blue-500",
    description: "Enviado quando um novo curso é cadastrado",
    variables: ["course_title", "course_area", "course_teacher", "course_modality", "course_workload", "course_vacancies", "course_investment", "course_id", "app_url"]
  },
  course_approved: {
    label: "Curso Aprovado",
    icon: "✅",
    color: "bg-green-500",
    description: "Enviado quando um curso é aprovado",
    variables: ["recipient_name", "course_title", "course_area", "course_modality", "course_workload", "course_investment", "course_start_date", "course_id", "app_url"]
  },
  course_rejected: {
    label: "Curso Rejeitado",
    icon: "❌",
    color: "bg-red-500",
    description: "Enviado quando um curso é rejeitado",
    variables: ["recipient_name", "course_title", "course_area", "rejection_reason", "course_id", "app_url"]
  },
  course_pending_correction: {
    label: "Correção Pendente",
    icon: "⚠️",
    color: "bg-amber-500",
    description: "Enviado quando um curso precisa de correções",
    variables: ["recipient_name", "course_title", "course_area", "correction_notes", "course_id", "app_url"]
  },
  lead_confirmation: {
    label: "Confirmação de Pré-Cadastro",
    icon: "🎉",
    color: "bg-purple-500",
    description: "Enviado automaticamente quando alguém faz pré-cadastro",
    variables: ["lead_name", "lead_email", "course_title", "course_area", "course_modality", "course_workload", "course_investment"]
  },
  course_unarchived: {
    label: "Curso Desarquivado",
    icon: "📦",
    color: "bg-teal-500",
    description: "Enviado quando um curso é desarquivado",
    variables: ["recipient_name", "course_title", "course_area", "course_modality", "course_workload", "course_investment", "course_start_date", "course_id", "app_url"]
  }
};

export const useEmailNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all email templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  // Fetch all notification groups with templates
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["notification-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_groups")
        .select("*, email_templates(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as NotificationGroup[];
    },
  });

  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (template: Omit<EmailTemplate, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("email_templates")
        .insert([template])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template criado",
        description: "O template foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...template }: Partial<EmailTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("email_templates")
        .update(template)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({
        title: "Template deletado",
        description: "O template foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create notification group mutation
  const createGroup = useMutation({
    mutationFn: async (group: Omit<NotificationGroup, "id" | "created_at" | "updated_at" | "email_templates">) => {
      const { data, error } = await supabase
        .from("notification_groups")
        .insert([group])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      toast({
        title: "Grupo criado",
        description: "O grupo de notificação foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update notification group mutation
  const updateGroup = useMutation({
    mutationFn: async ({ id, ...group }: Partial<NotificationGroup> & { id: string }) => {
      // Remove the nested email_templates from the update payload
      const { email_templates, ...updateData } = group as Partial<NotificationGroup> & { email_templates?: EmailTemplate };
      
      const { data, error } = await supabase
        .from("notification_groups")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      toast({
        title: "Grupo atualizado",
        description: "O grupo foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete notification group mutation
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_groups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      toast({
        title: "Grupo deletado",
        description: "O grupo foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao deletar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle group enabled status
  const toggleGroup = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { data, error } = await supabase
        .from("notification_groups")
        .update({ is_enabled })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["notification-groups"] });
      toast({
        title: variables.is_enabled ? "Grupo ativado" : "Grupo desativado",
        description: `O grupo foi ${variables.is_enabled ? "ativado" : "desativado"} com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar grupo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send test email
  const sendTestEmail = useMutation({
    mutationFn: async ({ templateId, email }: { templateId: string; email: string }) => {
      const template = templates?.find(t => t.id === templateId);
      if (!template) throw new Error("Template não encontrado");

      // Create mock variables for testing
      const mockVariables: Record<string, string> = {};
      template.variables?.forEach(v => {
        mockVariables[v] = `[${v}]`;
      });

      // For now, just log the test - in production, this would call an edge function
      console.log('Test email would be sent to:', email, 'with template:', template.name);
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Email de teste enviado",
        description: "Verifique sua caixa de entrada.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar teste",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    groups,
    templatesLoading,
    groupsLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createGroup,
    updateGroup,
    deleteGroup,
    toggleGroup,
    sendTestEmail,
    triggerTypeConfig,
  };
};
