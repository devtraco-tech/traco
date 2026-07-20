import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: rolesData, isLoading: isLoadingRoles } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error checking roles:", error);
        return [];
      }
      return data?.map(r => r.role as string) || [];
    },
    enabled: !!user?.id,
  });

  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["user-profile-department", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          triage_specialty_id,
          department_id,
          departments (
            id,
            name
          )
        `)
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching profile details:", error);
        return null;
      }
      return data as any;
    },
    enabled: !!user?.id,
  });

  const roles = rolesData || [];
  const isAdmin = roles.includes("admin");
  const isCoordenador = roles.includes("coordenador") || roles.includes("triage_coordenador");
  const isClinica = roles.includes("clinica") || roles.includes("triage_dentista");
  const isRecepcao = roles.includes("recepcao") || roles.includes("triage_atendente");
  
  // Triage Roles (compatibilidade com as novas e antigas)
  const isTriageAtendente = isRecepcao || roles.includes("triage_atendente");
  const isTriageDentista = isClinica || roles.includes("triage_dentista") || roles.includes("dentista");
  const isTriageCoordenador = isCoordenador || roles.includes("triage_coordenador");
  
  console.log("useUserRole =>", { roles, isTriageAtendente, isTriageDentista });
  
  // Legacy Course System Check (maintaining backwards compatibility)
  const isCourseStaff = roles.includes("staff");
  const department = profileData?.departments as { id: string; name: string } | null;
  
  // No novo modelo, qualquer coordenador pode editar cursos se ele quiser, ou deixamos a verificação antiga
  const canEditCourses = isAdmin || isCoordenador || isCourseStaff || department?.name === "coordenador";

  return {
    isAdmin,
    // Cursos API
    isCoordenador: isCoordenador || department?.name === "coordenador",
    isCourseStaff,
    canEditCourses,
    department,
    // Triagem API
    isTriageAtendente,
    isTriageDentista,
    isTriageCoordenador,
    triageSpecialtyId: profileData?.triage_specialty_id || null,
    userName: profileData?.name || null,
    
    isLoading: isLoadingRoles || isLoadingProfile,
  };
};
