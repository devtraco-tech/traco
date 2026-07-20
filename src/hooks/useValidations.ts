import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validationCacheConfig } from "@/lib/queryConfig";

// Helper function to send approval email
async function sendApprovalEmail(courseId: string) {
  try {
    // Get course creator's email
    const { data: course } = await supabase
      .from("courses")
      .select("created_by, title")
      .eq("id", courseId)
      .single();

    if (!course?.created_by) {
      console.log("[sendApprovalEmail] No creator found for course");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", course.created_by)
      .single();

    if (!profile?.email) {
      console.log("[sendApprovalEmail] No email found for course creator");
      return;
    }

    // Call the edge function
    const { error } = await supabase.functions.invoke("send-course-approval-email", {
      body: {
        course_id: courseId,
        recipient_email: profile.email,
        recipient_name: profile.name,
      },
    });

    if (error) {
      console.error("[sendApprovalEmail] Edge function error:", error);
    } else {
      console.log("[sendApprovalEmail] Email sent successfully");
    }
  } catch (err) {
    console.error("[sendApprovalEmail] Error:", err);
  }
}

export interface Validation {
  id: string;
  course_id: string;
  user_id: string;
  department_id: string;
  status: "pending_review" | "approved" | "rejected" | "pending_correction";
  submission_date: string;
  updated_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  submission_notes?: string;
  review_notes?: string;
  courses: {
    title: string;
    area: string;
    language: string;
    modality: string;
    target_audience: string;
    accepts_students: boolean;
    vacancies: number;
    workload: number;
    investment: number;
    prerequisites?: string;
    suggested_start_date?: string[];
    selection_date?: string;
    effective_start_date?: string;
    description: string;
    differentials?: string;
    program?: string;
    periodicity?: string;
    duration?: string;
    teacher_id?: string;
    promotional_team_id?: string;
    billing_company_id?: string;
    photo_1_url: string;
    photo_2_url?: string;
    photo_3_url?: string;
    photo_4_url?: string;
    schedule_file_url?: string;
    materials_file_url?: string;
    project_file_url?: string;
    competitors?: string;
    observations?: string;
    created_by?: string;
    promotional_teams?: {
      id: string;
      name: string;
      description?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
    };
    billing_companies?: {
      id: string;
      name: string;
      cnpj?: string;
      address?: string;
      phone?: string;
      email?: string;
      contact_person?: string;
    };
    creator?: {
      id: string;
      name: string;
      department_name?: string;
    };
  };
  departments: {
    name: string;
  };
}

export const useValidations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: validations, isLoading } = useQuery({
    queryKey: ["validations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_validations")
        .select(`
          *,
          courses(*, promotional_teams(*), billing_companies(*)),
          departments(name)
        `)
        .order("submission_date", { ascending: false });

      if (error) throw error;

      // Fetch creators for all courses
      const creatorIds = [...new Set((data || []).map(v => v.courses?.created_by).filter(Boolean))];
      let creatorsMap = new Map<string, { name: string; department_name?: string }>();
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, departments(name)")
          .in("id", creatorIds);
        
        (profiles || []).forEach((p) => {
          creatorsMap.set(p.id, {
            name: p.name,
            department_name: (p.departments as any)?.name,
          });
        });
      }

      // Attach creator info to each validation's course
      const enrichedData = (data || []).map(v => {
        const creatorId = v.courses?.created_by;
        if (creatorId && creatorsMap.has(creatorId)) {
          const creator = creatorsMap.get(creatorId)!;
          return {
            ...v,
            courses: {
              ...v.courses,
              creator: {
                id: creatorId,
                name: creator.name,
                department_name: creator.department_name,
              },
            },
          };
        }
        return v;
      });

      return enrichedData as Validation[];
    },
    ...validationCacheConfig,
  });

  const { data: pendingValidations } = useQuery({
    queryKey: ["pending-validations"],
    queryFn: async () => {
      // First, get course IDs that have at least one pending validation
      const { data: pendingCourses, error: pendingError } = await supabase
        .from("course_validations")
        .select("course_id")
        .eq("status", "pending_review");

      if (pendingError) throw pendingError;

      const courseIds = [...new Set((pendingCourses || []).map(v => v.course_id))];
      
      if (courseIds.length === 0) {
        return [] as Validation[];
      }

      // Now get ALL validations for those courses (including approved ones)
      const { data, error } = await supabase
        .from("course_validations")
        .select(`
          *,
          courses(*, promotional_teams(*), billing_companies(*)),
          departments(name)
        `)
        .in("course_id", courseIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Fetch creators for all courses
      const creatorIds = [...new Set((data || []).map(v => v.courses?.created_by).filter(Boolean))];
      let creatorsMap = new Map<string, { name: string; department_name?: string }>();
      
      if (creatorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, departments(name)")
          .in("id", creatorIds);
        
        (profiles || []).forEach((p) => {
          creatorsMap.set(p.id, {
            name: p.name,
            department_name: (p.departments as any)?.name,
          });
        });
      }

      // Attach creator info to each validation's course
      const enrichedData = (data || []).map(v => {
        const creatorId = v.courses?.created_by;
        if (creatorId && creatorsMap.has(creatorId)) {
          const creator = creatorsMap.get(creatorId)!;
          return {
            ...v,
            courses: {
              ...v.courses,
              creator: {
                id: creatorId,
                name: creator.name,
                department_name: creator.department_name,
              },
            },
          };
        }
        return v;
      });

      return enrichedData as Validation[];
    },
    ...validationCacheConfig,
  });

  const reviewValidation = useMutation({
    mutationFn: async ({
      validationId,
      status,
      reviewNotes,
      updatedCourse,
    }: {
      validationId: string;
      status: "approved" | "rejected" | "pending_correction";
      reviewNotes: string;
      updatedCourse?: any;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      // Prevent non-admins from approving validations
      if (status === "approved") {
        const { data: adminCheck } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user?.id || "")
          .eq("role", "admin")
          .maybeSingle();
        
        if (!adminCheck) {
          throw new Error("Apenas administradores podem aprovar validações");
        }
      }
      const { data, error } = await supabase
        .from("course_validations")
        .update({
          status,
          review_notes: reviewNotes,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", validationId)
        .select()
        .single();

      if (error) throw error;

      // Update course if changes were made
      if (updatedCourse && data.course_id) {
        const { error: courseError } = await supabase
          .from("courses")
          .update(updatedCourse)
          .eq("id", data.course_id);

        if (courseError) throw courseError;
      }

      // Check if all validations for this course are approved
      if (status === "approved") {
        const { data: allValidations } = await supabase
          .from("course_validations")
          .select("status, course_id")
          .eq("course_id", data.course_id);

        const allApproved = allValidations?.every(v => v.status === "approved");

        if (allApproved) {
          // Update course status to approved
          await supabase
            .from("courses")
            .update({ status: "approved" })
            .eq("id", data.course_id);

          // Send approval email notification
          await sendApprovalEmail(data.course_id);
        }
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["validations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-validations"] });
      queryClient.invalidateQueries({ queryKey: ["validation-history"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      
      const statusMessages = {
        approved: "Validação aprovada com sucesso!",
        rejected: "Validação rejeitada.",
        pending_correction: "Alterações solicitadas.",
      };
      
      toast({
        title: statusMessages[variables.status],
        description: "O status foi atualizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao revisar validação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: validationHistory } = useQuery({
    queryKey: ["validation-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_validation_history")
        .select(`
          *,
          course_validations!inner(
            course_id,
            courses(id, title, area),
            departments(name)
          )
        `)
        .order("change_date", { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch changed_by names
      const changerIds = [...new Set((data || []).map(h => h.changed_by).filter(Boolean))];
      let changersMap = new Map<string, string>();
      
      if (changerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", changerIds);
        
        (profiles || []).forEach((p) => {
          changersMap.set(p.id, p.name);
        });
      }
      
      // Enrich data with names
      return (data || []).map(h => ({
        ...h,
        changed_by_name: h.changed_by ? changersMap.get(h.changed_by) || "Desconhecido" : null,
        course_title: h.course_validations?.courses?.title,
        course_area: h.course_validations?.courses?.area,
        department_name: h.course_validations?.departments?.name,
      }));
    },
  });

  const approveCourse = useMutation({
    mutationFn: async ({ courseId, effectiveStartDate }: { courseId: string; effectiveStartDate?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get all pending validations for this course
      const { data: pendingVals, error: fetchError } = await supabase
        .from("course_validations")
        .select("id")
        .eq("course_id", courseId)
        .eq("status", "pending_review");

      if (fetchError) throw fetchError;

      // Approve all pending validations
      const { error: updateError } = await supabase
        .from("course_validations")
        .update({
          status: "approved",
          review_notes: "Aprovado diretamente pelo administrador",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("course_id", courseId)
        .eq("status", "pending_review");

      if (updateError) throw updateError;

      // Update course status to approved and ensure it's not archived
      const { error: courseError } = await supabase
        .from("courses")
        .update({ 
          status: "approved", 
          is_archived: false,
          effective_start_date: effectiveStartDate 
        })
        .eq("id", courseId);

      if (courseError) throw courseError;

      // Send approval email notification
      await sendApprovalEmail(courseId);

      return courseId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-validations"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      
      toast({
        title: "Curso publicado com sucesso!",
        description: "Todas as validações foram aprovadas e o curso está disponível.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao publicar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    validations,
    pendingValidations,
    validationHistory,
    isLoading,
    reviewValidation,
    approveCourse,
  };
};
