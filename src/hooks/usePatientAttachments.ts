import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type PatientAttachment = {
  id: string;
  patient_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  category: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export const usePatientAttachments = (patientId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["patient-attachments", patientId],
    queryFn: async () => {
      if (!patientId) return [];
      const { data, error } = await (supabase as any)
        .from("patient_attachments")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PatientAttachment[];
    },
    enabled: !!patientId,
  });

  const upload = useMutation({
    mutationFn: async ({ file, category }: { file: File; category?: string }) => {
      if (!patientId) throw new Error("patient_id required");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from("patient-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("patient-files").getPublicUrl(path);

      const { error: insErr } = await (supabase as any).from("patient_attachments").insert({
        patient_id: patientId,
        file_url: pub.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        category: category || (file.type.startsWith("image/") ? "photo" : "document"),
        uploaded_by: user?.id || null,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-attachments", patientId] });
      toast.success("Arquivo enviado");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao enviar arquivo"),
  });

  const remove = useMutation({
    mutationFn: async (att: PatientAttachment) => {
      // best-effort storage delete
      try {
        const url = new URL(att.file_url);
        const idx = url.pathname.indexOf("/patient-files/");
        if (idx >= 0) {
          const path = url.pathname.slice(idx + "/patient-files/".length);
          await supabase.storage.from("patient-files").remove([path]);
        }
      } catch {/* ignore */}
      const { error } = await (supabase as any)
        .from("patient_attachments")
        .delete()
        .eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-attachments", patientId] });
      toast.success("Arquivo removido");
    },
  });

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    upload,
    remove,
  };
};
