import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LogCategory = "course" | "classified" | "validation" | "notification";

export interface SystemLog {
  id: string;
  category: LogCategory;
  action: string;
  timestamp: string;
  user: { id: string; name: string; email: string } | null;
  resource: { id: string; type: string; title: string } | null;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
}

interface UseSystemLogsParams {
  fromDate?: string; // ISO
  toDate?: string;   // ISO
  enabled?: boolean;
}

export const useSystemLogs = ({ fromDate, toDate, enabled = true }: UseSystemLogsParams = {}) => {
  return useQuery({
    queryKey: ["system-logs", fromDate, toDate],
    enabled,
    staleTime: 30_000,
    queryFn: async (): Promise<SystemLog[]> => {
      // Fetch all sources in parallel with date filters server-side
      const courseHistoryQ = supabase
        .from("course_history")
        .select("id, course_id, changed_by, change_date, change_type, field_name, old_value, new_value, description")
        .order("change_date", { ascending: false })
        .limit(1000);
      if (fromDate) courseHistoryQ.gte("change_date", fromDate);
      if (toDate) courseHistoryQ.lte("change_date", toDate);

      const classifiedLogsQ = supabase
        .from("classified_logs")
        .select("id, classified_id, performed_by, action, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (fromDate) classifiedLogsQ.gte("created_at", fromDate);
      if (toDate) classifiedLogsQ.lte("created_at", toDate);

      const validationHistoryQ = supabase
        .from("course_validation_history")
        .select("id, validation_id, previous_status, new_status, changed_by, comments, change_date")
        .order("change_date", { ascending: false })
        .limit(1000);
      if (fromDate) validationHistoryQ.gte("change_date", fromDate);
      if (toDate) validationHistoryQ.lte("change_date", toDate);

      const notificationsQ = supabase
        .from("notifications")
        .select("id, user_id, title, message, type, reference_id, reference_type, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (fromDate) notificationsQ.gte("created_at", fromDate);
      if (toDate) notificationsQ.lte("created_at", toDate);

      const [courseHistory, classifiedLogs, validationHistory, notifs] = await Promise.all([
        courseHistoryQ,
        classifiedLogsQ,
        validationHistoryQ,
        notificationsQ,
      ]);

      // Collect IDs we need to enrich
      const userIds = new Set<string>();
      const courseIds = new Set<string>();
      const classifiedIds = new Set<string>();
      const validationIds = new Set<string>();

      (courseHistory.data || []).forEach((r: any) => {
        if (r.changed_by) userIds.add(r.changed_by);
        if (r.course_id) courseIds.add(r.course_id);
      });
      (classifiedLogs.data || []).forEach((r: any) => {
        if (r.performed_by) userIds.add(r.performed_by);
        if (r.classified_id) classifiedIds.add(r.classified_id);
      });
      (validationHistory.data || []).forEach((r: any) => {
        if (r.changed_by) userIds.add(r.changed_by);
        if (r.validation_id) validationIds.add(r.validation_id);
      });
      (notifs.data || []).forEach((r: any) => {
        if (r.user_id) userIds.add(r.user_id);
        if (r.reference_type === "course" && r.reference_id) courseIds.add(r.reference_id);
        if (r.reference_type === "classified" && r.reference_id) classifiedIds.add(r.reference_id);
      });

      // Resolve validation -> course
      let validationsMap = new Map<string, { id: string; course_id: string }>();
      if (validationIds.size > 0) {
        const { data: vals } = await supabase
          .from("course_validations")
          .select("id, course_id")
          .in("id", Array.from(validationIds));
        (vals || []).forEach((v: any) => {
          validationsMap.set(v.id, v);
          if (v.course_id) courseIds.add(v.course_id);
        });
      }

      // Fetch profiles, courses, classifieds in parallel
      const [profilesRes, coursesRes, classifiedsRes] = await Promise.all([
        userIds.size > 0
          ? supabase.from("profiles").select("id, name, email").in("id", Array.from(userIds))
          : Promise.resolve({ data: [] as any[] }),
        courseIds.size > 0
          ? supabase.from("courses").select("id, title").in("id", Array.from(courseIds))
          : Promise.resolve({ data: [] as any[] }),
        classifiedIds.size > 0
          ? supabase.from("classifieds").select("id, title").in("id", Array.from(classifiedIds))
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profilesMap = new Map<string, { id: string; name: string; email: string }>();
      (profilesRes.data || []).forEach((p: any) => profilesMap.set(p.id, p));
      const coursesMap = new Map<string, { id: string; title: string }>();
      (coursesRes.data || []).forEach((c: any) => coursesMap.set(c.id, c));
      const classifiedsMap = new Map<string, { id: string; title: string }>();
      (classifiedsRes.data || []).forEach((c: any) => classifiedsMap.set(c.id, c));

      const userOf = (id: string | null) => (id && profilesMap.get(id)) || null;

      const logs: SystemLog[] = [];

      // course_history
      (courseHistory.data || []).forEach((r: any) => {
        const c = coursesMap.get(r.course_id);
        logs.push({
          id: `ch-${r.id}`,
          category: "course",
          action: r.change_type,
          timestamp: r.change_date,
          user: userOf(r.changed_by),
          resource: c ? { id: c.id, type: "course", title: c.title } : { id: r.course_id, type: "course", title: "Curso removido" },
          field: r.field_name,
          oldValue: r.old_value,
          newValue: r.new_value,
          description: r.description,
        });
      });

      // classified_logs
      (classifiedLogs.data || []).forEach((r: any) => {
        const cl = classifiedsMap.get(r.classified_id);
        logs.push({
          id: `cl-${r.id}`,
          category: "classified",
          action: r.action,
          timestamp: r.created_at,
          user: userOf(r.performed_by),
          resource: cl ? { id: cl.id, type: "classified", title: cl.title } : { id: r.classified_id, type: "classified", title: "Classificado removido" },
          field: null,
          oldValue: null,
          newValue: null,
          description: r.notes,
        });
      });

      // course_validation_history
      (validationHistory.data || []).forEach((r: any) => {
        const v = validationsMap.get(r.validation_id);
        const c = v ? coursesMap.get(v.course_id) : null;
        logs.push({
          id: `vh-${r.id}`,
          category: "validation",
          action: r.new_status === "approved" ? "approved" : r.new_status === "rejected" ? "rejected" : "status_changed",
          timestamp: r.change_date,
          user: userOf(r.changed_by),
          resource: c ? { id: c.id, type: "course", title: c.title } : { id: r.validation_id, type: "validation", title: "Validação" },
          field: "status",
          oldValue: r.previous_status,
          newValue: r.new_status,
          description: r.comments,
        });
      });

      // notifications
      (notifs.data || []).forEach((r: any) => {
        let resource: SystemLog["resource"] = null;
        if (r.reference_type === "course" && r.reference_id) {
          const c = coursesMap.get(r.reference_id);
          resource = c ? { id: c.id, type: "course", title: c.title } : { id: r.reference_id, type: "course", title: r.title };
        } else if (r.reference_type === "classified" && r.reference_id) {
          const cl = classifiedsMap.get(r.reference_id);
          resource = cl ? { id: cl.id, type: "classified", title: cl.title } : { id: r.reference_id, type: "classified", title: r.title };
        }
        logs.push({
          id: `nt-${r.id}`,
          category: "notification",
          action: r.type || "notification",
          timestamp: r.created_at,
          user: userOf(r.user_id),
          resource,
          field: null,
          oldValue: null,
          newValue: null,
          description: `${r.title}: ${r.message}`,
        });
      });

      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return logs;
    },
  });
};
