import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ClinicalTriageAppointment = {
  id: string;
  patient_id: string;
  patient_name: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string | null;
  duration_min: number | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export const useClinicalTriageSchedule = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["clinical-triage-appointments"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clinical_triage_appointments")
        .select("*")
        .order("scheduled_date", { ascending: true });
      if (error) throw error;
      return (data || []) as ClinicalTriageAppointment[];
    },
  });

  const create = useMutation({
    mutationFn: async (apt: Partial<ClinicalTriageAppointment>) => {
      const duration = apt.duration_min || 30;
      let end_time = apt.end_time;
      if (!end_time && apt.start_time) {
        const [h, m] = apt.start_time.split(":").map(Number);
        const total = h * 60 + m + duration;
        end_time = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
      }
      const { error } = await (supabase as any).from("clinical_triage_appointments").insert({
        ...apt,
        end_time,
        duration_min: duration,
        status: apt.status || "scheduled",
        created_by: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-triage-appointments"] });
      toast.success("Consulta agendada");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao agendar"),
  });

  const update = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClinicalTriageAppointment> }) => {
      const { error } = await (supabase as any)
        .from("clinical_triage_appointments")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clinical-triage-appointments"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("clinical_triage_appointments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical-triage-appointments"] });
      toast.success("Agendamento removido");
    },
  });

  return { appointments: query.data || [], isLoading: query.isLoading, create, update, remove };
};
