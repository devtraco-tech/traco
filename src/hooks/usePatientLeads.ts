import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PatientLead {
  id: string;
  full_name: string;
  mobile_phone: string;
  landline_phone: string | null;
  gender: string;
  birth_date: string;
  state: string;
  city: string;
  message: string;
  status: string;
  notes: string | null;
  kommo_lead_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientNotificationEmail {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePatientLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all patient leads (with high limit for listing)
  const { data: leads, isLoading } = useQuery({
    queryKey: ["patient-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10000); // Increase limit to handle large datasets

      if (error) throw error;
      return data as PatientLead[];
    },
  });

  // Fetch real counts using count() - no row limit
  const { data: counts } = useQuery({
    queryKey: ["patient-leads-counts"],
    queryFn: async () => {
      const [totalResult, pendingResult, contactedResult, scheduledResult, completedResult] = await Promise.all([
        supabase.from("patient_leads").select("*", { count: "exact", head: true }),
        supabase.from("patient_leads").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("patient_leads").select("*", { count: "exact", head: true }).eq("status", "contacted"),
        supabase.from("patient_leads").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
        supabase.from("patient_leads").select("*", { count: "exact", head: true }).eq("status", "completed"),
      ]);

      return {
        total: totalResult.count || 0,
        pending: pendingResult.count || 0,
        contacted: contactedResult.count || 0,
        scheduled: scheduledResult.count || 0,
        completed: completedResult.count || 0,
      };
    },
  });

  // Update lead status
  const updateLeadStatus = useMutation({
    mutationFn: async ({ 
      leadId, 
      status 
    }: { 
      leadId: string; 
      status: string;
    }) => {
      const { data, error } = await supabase
        .from("patient_leads")
        .update({ status })
        .eq("id", leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
      queryClient.invalidateQueries({ queryKey: ["patient-leads-counts"] });
      toast({
        title: "Status atualizado",
        description: "O status do paciente foi atualizado com sucesso.",
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

  // Update lead notes
  const updateLeadNotes = useMutation({
    mutationFn: async ({ 
      leadId, 
      notes 
    }: { 
      leadId: string; 
      notes: string;
    }) => {
      const { data, error } = await supabase
        .from("patient_leads")
        .update({ notes })
        .eq("id", leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
      queryClient.invalidateQueries({ queryKey: ["patient-leads-counts"] });
      toast({
        title: "Observações atualizadas",
        description: "As observações foram salvas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar observações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lead
  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("patient_leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
      queryClient.invalidateQueries({ queryKey: ["patient-leads-counts"] });
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

  // Bulk delete leads - with batch support to avoid URL length limits
  const bulkDeleteLeads = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const BATCH_SIZE = 50; // Keep batches small to avoid URL length issues
      const batches = [];
      
      // Split into batches
      for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
        batches.push(leadIds.slice(i, i + BATCH_SIZE));
      }
      
      let totalDeleted = 0;
      
      // Process each batch sequentially
      for (const batch of batches) {
        const { error } = await supabase
          .from("patient_leads")
          .delete()
          .in("id", batch);

        if (error) throw error;
        totalDeleted += batch.length;
      }
      
      return totalDeleted;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
      queryClient.invalidateQueries({ queryKey: ["patient-leads-counts"] });
      toast({
        title: "Leads excluídos",
        description: `${count} leads foram excluídos com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir leads",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import leads from CSV - with batch support for large imports
  const importLeads = useMutation({
    mutationFn: async (leadsToImport: Array<{
      full_name: string;
      mobile_phone: string;
      landline_phone?: string | null;
      gender: string;
      birth_date: string;
      state: string;
      city: string;
      message: string;
      status?: string;
      created_at?: string;
      updated_at?: string;
    }>) => {
      const BATCH_SIZE = 500;
      const batches = [];
      
      // Split into batches
      for (let i = 0; i < leadsToImport.length; i += BATCH_SIZE) {
        batches.push(leadsToImport.slice(i, i + BATCH_SIZE));
      }
      
      let totalImported = 0;
      
      // Process each batch sequentially
      for (const batch of batches) {
        const { data, error } = await supabase
          .from("patient_leads")
          .insert(batch.map(lead => ({
            full_name: lead.full_name,
            mobile_phone: lead.mobile_phone,
            landline_phone: lead.landline_phone,
            gender: lead.gender,
            birth_date: lead.birth_date,
            state: lead.state,
            city: lead.city,
            message: lead.message,
            status: lead.status || 'pending',
            ...(lead.created_at && { created_at: lead.created_at }),
            ...(lead.updated_at && { updated_at: lead.updated_at }),
          })))
          .select();

        if (error) throw error;
        totalImported += data?.length || 0;
      }
      
      return totalImported;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
      queryClient.invalidateQueries({ queryKey: ["patient-leads-counts"] });
      toast({
        title: "Leads importados",
        description: `${count} leads foram importados com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao importar leads",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get leads by status
  const getLeadsByStatus = (status: string) => {
    return leads?.filter(lead => lead.status === status) || [];
  };

  // Get statistics - use real counts from database
  const stats = counts || {
    total: leads?.length || 0,
    pending: leads?.filter(l => l.status === 'pending').length || 0,
    contacted: leads?.filter(l => l.status === 'contacted').length || 0,
    scheduled: leads?.filter(l => l.status === 'scheduled').length || 0,
    completed: leads?.filter(l => l.status === 'completed').length || 0,
  };

  return {
    leads,
    isLoading,
    updateLeadStatus,
    updateLeadNotes,
    deleteLead,
    bulkDeleteLeads,
    importLeads,
    getLeadsByStatus,
    stats,
    sendToKommo: useMutation({
      mutationFn: async (leads: PatientLead[]) => {
        const batchSize = 5;
        let sent = 0;

        for (let i = 0; i < leads.length; i += batchSize) {
          const batch = leads.slice(i, i + batchSize);
          const payload = batch.map(l => ({
            type: "new" as const,
            name: l.full_name,
            phone: l.mobile_phone,
            landline_phone: l.landline_phone || undefined,
            city: l.city || undefined,
            state: l.state || undefined,
            message: l.message || undefined,
            gender: l.gender || undefined,
            birth_date: l.birth_date || undefined,
            lead_id: l.id,
          }));

          const { data, error } = await supabase.functions.invoke("kommo-patient-lead", {
            body: payload,
          });

          if (error) throw error;
          
          if (data && data.results) {
            const batchSent = data.results.filter((r: any) => r.success).length;
            sent += batchSent;
            
            if (data.hasFailures) {
              const failures = data.results.filter((r: any) => !r.success);
              console.error("Some leads failed to sync with Kommo:", failures);
            }
          } else if (!data) {
            // Fallback for unexpected empty data
            sent += batch.length;
          }
        }

        return sent;
      },
      onSuccess: (count) => {
        queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
        queryClient.invalidateQueries({ queryKey: ["patient-leads-counts"] });
        toast({
          title: "Enviado ao Kommo",
          description: `${count} leads enviados ao CRM com sucesso.`,
        });
      },
      onError: (error: Error) => {
        queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
        toast({
          title: "Erro ao enviar ao Kommo",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
    promoteToTriage: useMutation({
      mutationFn: async (lead: PatientLead) => {
        
        const patientData = {
          full_name: lead.full_name,
          mobile_phone: lead.mobile_phone,
          phone: lead.landline_phone, // Mapping landline to phone
          email: null,
          cpf: null,
          gender: lead.gender,
          birth_date: lead.birth_date,
          state: lead.state,
          city: lead.city,
          treatment_needed: lead.message, // Mapping message to treatment_needed
          medical_history: lead.notes, // Mapping notes to medical_history
          current_stage: 'step1_atendimento',
          reception_status: 'entrada',
          kommo_lead_id: lead.kommo_lead_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          chk_necessities: false,
          chk_orientation: false,
          chk_dentaloffice: false,
          chk_scheduled: false
        };

        const { data, error } = await (supabase as any)
          .from("patients")
          .insert([patientData])
          .select()
          .single();

        if (error) throw error;

        // Mark lead as completed so it disappears from the list
        const { error: updateError } = await supabase
          .from("patient_leads")
          .update({ status: 'completed' })
          .eq("id", lead.id);

        if (updateError) console.error("Erro ao marcar lead como concluído:", updateError);

        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
        queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
        toast({
          title: "Promovido à Triagem",
          description: "O paciente agora está disponível na Fila 1 da Recepção.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Erro ao promover",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
    bulkPromoteToTriage: useMutation({
      mutationFn: async (leads: PatientLead[]) => {
        
        const patientsData = leads.map(lead => ({
          full_name: lead.full_name,
          mobile_phone: lead.mobile_phone,
          phone: lead.landline_phone,
          email: null,
          cpf: null,
          gender: lead.gender,
          birth_date: lead.birth_date,
          state: lead.state,
          city: lead.city,
          treatment_needed: lead.message,
          medical_history: lead.notes,
          current_stage: 'step1_atendimento',
          reception_status: 'entrada',
          kommo_lead_id: lead.kommo_lead_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          chk_necessities: false,
          chk_orientation: false,
          chk_dentaloffice: false,
          chk_scheduled: false
        }));

        const { data, error } = await (supabase as any)
          .from("patients")
          .insert(patientsData)
          .select();

        if (error) throw error;

        // Update all leads to completed status
        const leadIds = leads.map(l => l.id);
        const { error: updateError } = await supabase
          .from("patient_leads")
          .update({ status: 'completed' })
          .in("id", leadIds);

        if (updateError) console.error("Erro ao marcar leads como concluídos em massa:", updateError);

        return data;
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
        queryClient.invalidateQueries({ queryKey: ["patient-leads"] });
        toast({
          title: "Leads Promovidos",
          description: `${data.length} pacientes foram enviados para a Fila 1 da Recepção.`,
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Erro na promoção em massa",
          description: error.message,
          variant: "destructive",
        });
      },
    }),
  };
};

export const usePatientNotificationEmails = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all notification emails
  const { data: emails, isLoading } = useQuery({
    queryKey: ["patient-notification-emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patient_notification_emails")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as PatientNotificationEmail[];
    },
  });

  // Add email
  const addEmail = useMutation({
    mutationFn: async ({ email, name }: { email: string; name?: string }) => {
      const { data, error } = await supabase
        .from("patient_notification_emails")
        .insert({ email, name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notification-emails"] });
      toast({
        title: "Email adicionado",
        description: "O email foi adicionado à lista de notificações.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update email
  const updateEmail = useMutation({
    mutationFn: async ({ 
      id, 
      email, 
      name, 
      is_active 
    }: { 
      id: string; 
      email?: string; 
      name?: string; 
      is_active?: boolean;
    }) => {
      const updates: Partial<PatientNotificationEmail> = {};
      if (email !== undefined) updates.email = email;
      if (name !== undefined) updates.name = name;
      if (is_active !== undefined) updates.is_active = is_active;

      const { data, error } = await supabase
        .from("patient_notification_emails")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notification-emails"] });
      toast({
        title: "Email atualizado",
        description: "O email foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete email
  const deleteEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("patient_notification_emails")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-notification-emails"] });
      toast({
        title: "Email removido",
        description: "O email foi removido da lista de notificações.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    emails,
    isLoading,
    addEmail,
    updateEmail,
    deleteEmail,
  };
};
