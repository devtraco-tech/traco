import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DepartmentStatus {
  department_id: string;
  department_name: string;
  status: "pending_review" | "approved" | "rejected" | "pending_correction";
}

export interface GroupedValidation {
  course_id: string;
  course_title: string;
  last_activity: string;
  course_creator?: {
    id: string;
    name: string;
    department_name?: string;
  };
  last_modified_by?: {
    id: string;
    name: string;
    department_name?: string;
  };
  departments: DepartmentStatus[];
  pending_count: number;
  approved_count: number;
  correction_count: number;
}

export const useRecentValidations = (limit = 5) => {
  return useQuery({
    queryKey: ["recent-validations-grouped", limit],
    queryFn: async () => {
      // Fetch recent validations with course and department info
      // Only include courses that are not archived
      const { data, error } = await supabase
        .from("course_validations")
        .select(`
          id,
          course_id,
          status,
          submission_date,
          reviewed_at,
          reviewed_by,
          user_id,
          courses!inner(id, title, is_archived, created_by),
          departments(id, name)
        `)
        .eq("courses.is_archived", false)
        .order("submission_date", { ascending: false });

      if (error) throw error;

      // Collect unique user IDs (reviewed_by, user_id, and created_by)
      const userIds = new Set<string>();
      (data || []).forEach((v) => {
        if (v.reviewed_by) userIds.add(v.reviewed_by);
        if (v.user_id) userIds.add(v.user_id);
        if (v.courses?.created_by) userIds.add(v.courses.created_by);
      });

      // Fetch profiles for all users
      let profilesMap = new Map<string, { name: string; department_name?: string }>();
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, departments(name)")
          .in("id", Array.from(userIds));

        (profiles || []).forEach((p) => {
          profilesMap.set(p.id, {
            name: p.name,
            department_name: (p.departments as any)?.name,
          });
        });
      }

      // Group by course
      const courseMap = new Map<string, GroupedValidation>();

      (data || []).forEach((validation) => {
        const courseId = validation.course_id;
        const courseTitle = validation.courses?.title || "Curso";
        const creatorId = validation.courses?.created_by;
        const deptId = validation.departments?.id || "";
        const deptName = validation.departments?.name || "";
        const status = validation.status as DepartmentStatus["status"];
        const activityDate = validation.reviewed_at || validation.submission_date;
        const modifierId = validation.reviewed_by || validation.user_id;

        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            course_id: courseId,
            course_title: courseTitle,
            last_activity: activityDate,
            course_creator: creatorId && profilesMap.has(creatorId) ? {
              id: creatorId,
              name: profilesMap.get(creatorId)!.name,
              department_name: profilesMap.get(creatorId)!.department_name,
            } : undefined,
            last_modified_by: undefined,
            departments: [],
            pending_count: 0,
            approved_count: 0,
            correction_count: 0,
          });
        }

        const group = courseMap.get(courseId)!;
        
        // Update last activity and modifier if more recent
        if (new Date(activityDate) > new Date(group.last_activity)) {
          group.last_activity = activityDate;
          if (modifierId && profilesMap.has(modifierId)) {
            const profile = profilesMap.get(modifierId)!;
            group.last_modified_by = {
              id: modifierId,
              name: profile.name,
              department_name: profile.department_name,
            };
          }
        }

        // Set initial modifier if not set
        if (!group.last_modified_by && modifierId && profilesMap.has(modifierId)) {
          const profile = profilesMap.get(modifierId)!;
          group.last_modified_by = {
            id: modifierId,
            name: profile.name,
            department_name: profile.department_name,
          };
        }

        // Add department status
        group.departments.push({
          department_id: deptId,
          department_name: deptName,
          status,
        });

        // Update counts
        if (status === "pending_review") group.pending_count++;
        else if (status === "approved") group.approved_count++;
        else if (status === "pending_correction") group.correction_count++;
      });

      // Convert to array and sort by last activity
      const grouped = Array.from(courseMap.values())
        .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
        .slice(0, limit);

      return grouped;
    },
  });
};
