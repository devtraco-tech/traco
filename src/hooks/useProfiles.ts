import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
  cro?: string;
  avatar_url?: string;
  department_id?: string;
  triage_specialty_id?: string;
  created_at?: string;
  updated_at?: string;
  department?: {
    name: string;
  };
  specialty?: {
    name: string;
  };
  user_roles?: {
    role: string;
  }[];
}

export const useProfiles = () => {
  const { data: profiles, isLoading, error } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      try {
        // 1. Fetch profiles with related name-only data
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select(`
            *,
            department:departments (name),
            specialty:patient_specialties (name)
          `)
          .order("name", { ascending: true });

        if (profilesError) throw profilesError;

        // 2. Fetch all roles separately to avoid join issues
        const { data: rolesData, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");

        if (rolesError) {
          console.error("Error fetching roles:", rolesError);
          // If roles fail, we still return profiles
          return profilesData as any as Profile[];
        }

        // 3. Map roles to profiles
        const combinedData = (profilesData || []).map(profile => {
          const userRoles = (rolesData || [])
            .filter(r => String(r.user_id) === String(profile.id))
            .map(r => ({ role: r.role }));
          
          return {
            ...profile,
            user_roles: userRoles
          };
        });

        
        return combinedData as any as Profile[];
      } catch (err) {
        console.error("Critical error in useProfiles:", err);
        throw err;
      }
    },
  });

  return {
    profiles,
    isLoading,
    error: error as any,
  };
};
