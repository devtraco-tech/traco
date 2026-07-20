import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Course } from "./useCourses";

export const useUpcomingCourses = () => {
  return useQuery({
    queryKey: ["upcoming-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          teachers (
            id,
            name
          )
        `)
        .in("status", ["approved", "in_progress"])
        .not("effective_start_date", "is", null)
        .gte("effective_start_date", new Date().toISOString().split("T")[0])
        .order("effective_start_date", { ascending: true })
        .limit(5);

      if (error) throw error;
      
      return data as (Course & { teachers?: { id: string; name: string } | null })[];
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
};
