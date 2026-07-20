import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Registration {
  id: string;
  course_id: string;
  user_id: string;
  enrollment_date: string;
  completion_date?: string;
  status: "active" | "completed" | "cancelled";
  notes?: string;
  courses?: {
    title: string;
    area: string;
    vacancies: number;
  };
  profiles?: {
    name: string;
    email: string;
  };
}

export const useRegistrations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: registrations, isLoading } = useQuery({
    queryKey: ["registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_registrations")
        .select(`
          *,
          courses(title, area, vacancies)
        `)
        .order("enrollment_date", { ascending: false });

      if (error) throw error;

      // Fetch profile data for each registration
      const registrationsWithProfiles = await Promise.all(
        (data || []).map(async (reg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", reg.user_id)
            .single();

          return {
            ...reg,
            profiles: profile,
          };
        })
      );

      return registrationsWithProfiles as any;
    },
  });

  const { data: activeRegistrations } = useQuery({
    queryKey: ["active-registrations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_registrations")
        .select(`
          *,
          courses(title, area, vacancies)
        `)
        .eq("status", "active")
        .order("enrollment_date", { ascending: false });

      if (error) throw error;

      // Fetch profile data for each registration
      const registrationsWithProfiles = await Promise.all(
        (data || []).map(async (reg) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", reg.user_id)
            .single();

          return {
            ...reg,
            profiles: profile,
          };
        })
      );

      return registrationsWithProfiles as any;
    },
  });

  const getAvailableVacancies = async (courseId: string) => {
    const { data: course } = await supabase
      .from("courses")
      .select("vacancies")
      .eq("id", courseId)
      .single();

    const { count } = await supabase
      .from("course_registrations")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId)
      .eq("status", "active");

    return {
      total: course?.vacancies || 0,
      occupied: count || 0,
      available: (course?.vacancies || 0) - (count || 0),
    };
  };

  const createRegistration = useMutation({
    mutationFn: async (registrationData: {
      course_id: string;
      user_id: string;
      notes?: string;
    }) => {
      // Check available vacancies
      const vacancies = await getAvailableVacancies(registrationData.course_id);
      
      if (vacancies.available <= 0) {
        throw new Error("Não há vagas disponíveis para este curso");
      }

      // Check if user is already registered
      const { data: existing } = await supabase
        .from("course_registrations")
        .select("id")
        .eq("course_id", registrationData.course_id)
        .eq("user_id", registrationData.user_id)
        .eq("status", "active")
        .single();

      if (existing) {
        throw new Error("Estudante já está matriculado neste curso");
      }

      const { data, error } = await supabase
        .from("course_registrations")
        .insert([{
          ...registrationData,
          status: "active",
          enrollment_date: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["active-registrations"] });
      toast({
        title: "Matrícula realizada com sucesso!",
        description: "O estudante foi matriculado no curso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao realizar matrícula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRegistrationStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: "active" | "completed" | "cancelled";
      notes?: string;
    }) => {
      const updateData: any = { status };
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      if (status === "completed") {
        updateData.completion_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("course_registrations")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations"] });
      queryClient.invalidateQueries({ queryKey: ["active-registrations"] });
      toast({
        title: "Status atualizado com sucesso!",
        description: "O status da matrícula foi alterado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    registrations,
    activeRegistrations,
    isLoading,
    createRegistration,
    updateRegistrationStatus,
    getAvailableVacancies,
  };
};
