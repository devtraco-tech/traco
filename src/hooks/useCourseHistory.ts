import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CourseHistoryEntry {
  id: string;
  course_id: string;
  changed_by: string | null;
  change_date: string;
  change_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export const useCourseHistory = (courseId?: string) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ["course-history", courseId],
    queryFn: async () => {
      if (!courseId) return [];

      const { data, error } = await supabase
        .from("course_history")
        .select("*")
        .eq("course_id", courseId)
        .order("change_date", { ascending: false });

      if (error) throw error;

      // Fetch user profiles separately
      const historyWithProfiles = await Promise.all(
        (data || []).map(async (entry) => {
          if (entry.changed_by) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("name, email")
              .eq("id", entry.changed_by)
              .single();
            
            return {
              ...entry,
              profiles: profile || undefined,
            };
          }
          return entry;
        })
      );

      return historyWithProfiles as CourseHistoryEntry[];
    },
    enabled: !!courseId,
  });

  return {
    history,
    isLoading,
  };
};
