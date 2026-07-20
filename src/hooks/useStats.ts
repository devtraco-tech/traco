import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useStats = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      // Get total courses (archived and non-archived)
      const { count: totalCoursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true });

      // Get active courses (approved and not archived)
      const { count: activeCoursesCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved")
        .eq("is_archived", false);

      // Get courses pending validation (not archived)
      const { count: coursesForValidationCount } = await supabase
        .from("courses")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_approval")
        .eq("is_archived", false);

      // Get active students (users with student role)
      const { count: studentsCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student");

      // Get pending validations (excluding archived courses)
      const { count: validationsCount } = await supabase
        .from("course_validations")
        .select("id, courses!inner(is_archived)", { count: "exact", head: true })
        .eq("status", "pending_review")
        .eq("courses.is_archived", false);

      // Get active registrations
      const { count: registrationsCount } = await supabase
        .from("course_registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      return {
        totalCourses: totalCoursesCount || 0,
        activeCourses: activeCoursesCount || 0,
        coursesForValidation: coursesForValidationCount || 0,
        activeStudents: studentsCount || 0,
        pendingValidations: validationsCount || 0,
        activeRegistrations: registrationsCount || 0,
      };
    },
  });

  return {
    stats,
    isLoading,
  };
};
