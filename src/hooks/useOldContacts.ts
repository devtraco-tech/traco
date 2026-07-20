import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OldContact {
  id: string;
  nome: string;
  celular: string;
  creation_date: string | null;
  modified_date: string | null;
  created_at: string;
  kommo_sent: boolean;
}

interface OldContactInsert {
  nome: string;
  celular: string;
  creation_date?: string;
  modified_date?: string;
}

export const useOldContacts = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["old-contacts"],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("old_contacts")
        .select("*", { count: "exact" })
        .order("creation_date", { ascending: false });
      
      if (error) throw error;
      return { data: data as OldContact[], count: count || 0 };
    },
  });

  const importContacts = useMutation({
    mutationFn: async (contactsToImport: OldContactInsert[]) => {
      // Process in batches of 500
      const batchSize = 500;
      let imported = 0;
      
      for (let i = 0; i < contactsToImport.length; i += batchSize) {
        const batch = contactsToImport.slice(i, i + batchSize);
        const { error } = await supabase
          .from("old_contacts")
          .insert(batch);
        
        if (error) throw error;
        imported += batch.length;
      }
      
      return imported;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["old-contacts"] });
      toast({
        title: "Importação concluída",
        description: `${count} contatos importados com sucesso.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("old_contacts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["old-contacts"] });
      toast({
        title: "Contato excluído",
        description: "O contato foi removido com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkDeleteContacts = useMutation({
    mutationFn: async (ids: string[]) => {
      // Process in batches of 50 to avoid URL length limits
      const batchSize = 50;
      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const { error } = await supabase
          .from("old_contacts")
          .delete()
          .in("id", batch);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["old-contacts"] });
      toast({
        title: "Contatos excluídos",
        description: "Os contatos selecionados foram removidos.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendToKommo = useMutation({
    mutationFn: async (contacts: OldContact[]) => {
      const batchSize = 5;
      let sent = 0;

      for (let i = 0; i < contacts.length; i += batchSize) {
        const batch = contacts.slice(i, i + batchSize);
        const payload = batch.map(c => ({
          type: "old" as const,
          name: c.nome,
          phone: c.celular,
          old_contact_id: c.id,
        }));

        const { data, error } = await supabase.functions.invoke("kommo-patient-lead", {
          body: payload,
        });

        if (error) throw error;
        sent += batch.length;
      }

      return sent;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["old-contacts"] });
      toast({
        title: "Enviado ao Kommo",
        description: `${count} contatos enviados ao CRM com sucesso.`,
      });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["old-contacts"] });
      toast({
        title: "Erro ao enviar ao Kommo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    contacts: contacts?.data || [],
    totalCount: contacts?.count || 0,
    isLoading,
    importContacts,
    deleteContact,
    bulkDeleteContacts,
    sendToKommo,
  };
};
