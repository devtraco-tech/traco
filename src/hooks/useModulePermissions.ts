import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

export type ModuleKey =
  | "fila1_recepcao"
  | "fila2_clinica"
  | "fila3_cap"
  | "agenda_recepcao"
  | "agenda_clinica"
  | "todos_pacientes"
  | "leads";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  fila1_recepcao: "Agendamento Triagem 3",
  fila2_clinica: "Fila 2: Triagem Clínica 3",
  fila3_cap: "Fila de Espera",
  agenda_recepcao: "Agenda de Triagem Clínica 3",
  agenda_clinica: "Agenda Clínica Cursos",
  todos_pacientes: "Todos os Pacientes",
  leads: "Leads",
};

export const ALL_MODULES = Object.keys(MODULE_LABELS) as ModuleKey[];

export type ModulePermission = {
  id?: string;
  user_id: string;
  module: ModuleKey;
  can_view: boolean;
  can_edit: boolean;
};

/**
 * Returns current user's permissions for each module.
 * Admins always pass.
 */
export const useMyModulePermissions = () => {
  const { user } = useAuth();
  const { isAdmin, isTriageCoordenador, isTriageAtendente, isTriageDentista, isLoading: roleLoading } = useUserRole();

  const { data, isLoading } = useQuery({
    queryKey: ["my-module-permissions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("user_module_permissions")
        .select("*")
        .eq("user_id", user.id);
      if (error) {
        console.error(error);
        return [];
      }
      return (data || []) as ModulePermission[];
    },
    enabled: !!user?.id,
  });

  // Default permissions derived from legacy roles when no explicit row exists
  const defaultsByRole = (m: ModuleKey, action: "view" | "edit"): boolean => {
    if (isAdmin) return true;
    if (isTriageCoordenador) return true;
    
    const allowedModules: ModuleKey[] = [];
    if (isTriageAtendente) {
      allowedModules.push("fila1_recepcao", "agenda_recepcao", "todos_pacientes", "leads");
    }
    if (isTriageDentista) {
      allowedModules.push("fila2_clinica", "agenda_recepcao");
    }
    
    return allowedModules.includes(m);
  };

  const can = (m: ModuleKey, action: "view" | "edit" = "view"): boolean => {
    if (isAdmin) return true;
    const explicit = data?.find((p) => p.module === m);
    if (explicit) {
      console.log(`Explicit permission for ${m}:`, explicit);
      return action === "edit" ? explicit.can_edit : explicit.can_view;
    }
    const def = defaultsByRole(m, action);
    if (m === "fila2_clinica") console.log(`Fallback permission for ${m}:`, def);
    return def;
  };

  return {
    permissions: data || [],
    can,
    isLoading: isLoading || roleLoading,
  };
};

/**
 * Admin-only hook to manage all users' permissions.
 */
export const useManageModulePermissions = () => {
  const queryClient = useQueryClient();

  const allPermissionsQuery = useQuery({
    queryKey: ["all-module-permissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("user_module_permissions")
        .select("*");
      if (error) throw error;
      return (data || []) as ModulePermission[];
    },
  });

  const upsertPermission = useMutation({
    mutationFn: async (p: ModulePermission) => {
      const { error } = await (supabase as any)
        .from("user_module_permissions")
        .upsert(
          { user_id: p.user_id, module: p.module, can_view: p.can_view, can_edit: p.can_edit },
          { onConflict: "user_id,module" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-module-permissions"] });
      queryClient.invalidateQueries({ queryKey: ["my-module-permissions"] });
    },
  });

  return {
    allPermissions: allPermissionsQuery.data || [],
    isLoading: allPermissionsQuery.isLoading,
    upsertPermission,
  };
};
