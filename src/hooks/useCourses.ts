import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { courseCacheConfig } from "@/lib/queryConfig";

export interface CourseCreator {
  id: string;
  name: string;
  email: string;
  department_id?: string;
  departments?: {
    id: string;
    name: string;
  };
}

export interface Course {
  id: string;
  title: string;
  area: string;
  teacher_id?: string;
  language?: string;
  modality: "presencial" | "online" | "hibrido";
  target_audience: "cirurgioes_dentistas" | "tecnicos" | "auxiliares" | "estudantes" | "outros";
  vacancies: number;
  workload: number;
  investment: number;
  accepts_students?: boolean;
  prerequisites?: string;
  suggested_start_date?: string[];
  selection_date?: string;
  effective_start_date?: string;
  end_date?: string;
  description: string;
  differentials?: string;
  program?: string;
  periodicity?: string;
  duration?: string;
  schedule_file_url?: string;
  materials_file_url?: string;
  project_file_url?: string;
  photo_1_url: string;
  photo_2_url: string;
  photo_3_url: string;
  photo_4_url: string;
  competitors?: string;
  observations?: string;
  status?: "draft" | "pending_approval" | "approved" | "in_progress" | "completed" | "cancelled";
  slug?: string;
  promotional_team_id?: string;
  billing_company_id?: string;
  is_archived?: boolean;
  display_status?: string | null;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  creator?: CourseCreator;
}

export const useCourses = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      // Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      // Get unique creator IDs
      const creatorIds = [...new Set(coursesData.map(c => c.created_by).filter(Boolean))];

      if (creatorIds.length === 0) {
        return coursesData as Course[];
      }

      // Fetch creators with their departments
      const { data: creatorsData, error: creatorsError } = await supabase
        .from("profiles")
        .select(`
          id,
          name,
          email,
          department_id,
          departments (
            id,
            name
          )
        `)
        .in("id", creatorIds);

      if (creatorsError) {
        console.error("Error fetching creators:", creatorsError);
        return coursesData as Course[];
      }

      // Map creators to courses
      const creatorsMap = new Map(creatorsData?.map(c => [c.id, c]) || []);
      
      return coursesData.map(course => ({
        ...course,
        creator: course.created_by ? creatorsMap.get(course.created_by) as CourseCreator | undefined : undefined,
      })) as Course[];
    },
    ...courseCacheConfig,
  });

  const createCourse = useMutation({
    mutationFn: async (courseData: Omit<Course, "id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Ensure language is a valid enum value
      const validLanguage = courseData.language === "portuguese" || courseData.language === "english" || courseData.language === "spanish"
        ? courseData.language
        : "portuguese";
      
      // Ensure modality is valid
      const validModality = courseData.modality === "presencial" || courseData.modality === "online" || courseData.modality === "hibrido"
        ? courseData.modality
        : "presencial";
      
      const validTargetAudience = ["cirurgioes_dentistas", "tecnicos", "auxiliares", "estudantes", "outros"].includes(courseData.target_audience)
        ? courseData.target_audience
        : "outros";
      
      const validStatus = courseData.status && ["draft", "pending_approval", "approved", "in_progress", "completed", "cancelled"].includes(courseData.status)
        ? courseData.status
        : "pending_approval";
      
      const { data, error } = await supabase
        .from("courses")
        .insert([{ 
          ...courseData, 
          language: validLanguage, 
          modality: validModality,
          target_audience: validTargetAudience,
          status: validStatus,
          created_by: user?.id 
        }])
        .select()
        .single();

      if (error) throw error;

      // Get all departments
      const { data: departments, error: deptError } = await supabase
        .from("departments")
        .select("id");

      if (deptError) throw deptError;

      // Create validation entries for each department
      if (departments && departments.length > 0) {
        const validationEntries = departments.map((dept) => ({
          course_id: data.id,
          user_id: user?.id,
          department_id: dept.id,
          status: "pending_review" as const,
        }));

        const { error: validationError } = await supabase
          .from("course_validations")
          .insert(validationEntries);

        if (validationError) throw validationError;
      }

      // Send email notification (fire and forget - don't block course creation)
      supabase.functions.invoke("send-new-course-notification", {
        body: { course_id: data.id },
      }).then((response) => {
        if (response.error) {
          console.error("Error sending course notification:", response.error);
        } else {
          console.log("Course notification sent:", response.data);
        }
      }).catch((err) => {
        console.error("Failed to send course notification:", err);
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["validations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-validations"] });
      toast({
        title: "Curso criado com sucesso!",
        description: "O curso foi adicionado ao sistema e os administradores foram notificados.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCourse = useMutation({
    mutationFn: async (courseId: string) => {
      // First delete related course_validations
      const { error: validationError } = await supabase
        .from("course_validations")
        .delete()
        .eq("course_id", courseId);

      if (validationError) throw validationError;

      // Then delete the course
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["validations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-validations"] });
      toast({
        title: "Curso excluído com sucesso!",
        description: "O curso foi removido do sistema.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleArchiveCourse = useMutation({
    mutationFn: async ({ courseId, isArchived, restoreStatus }: { courseId: string; isArchived: boolean; restoreStatus?: "draft" | "pending_approval" | "approved" | "in_progress" | "completed" | "cancelled" }) => {
      // When archiving, change status to 'archived'
      // When restoring, use the provided restoreStatus or default to 'draft'
      const newStatus = isArchived ? 'archived' : (restoreStatus || 'draft');
      
      const { error } = await supabase
        .from("courses")
        .update({ is_archived: isArchived, status: newStatus as any })
        .eq("id", courseId);

      if (error) throw error;

      // If restoring to approved status, send approval email to notification groups
      if (!isArchived && newStatus === 'approved') {
        supabase.functions.invoke("send-course-approval-email", {
          body: { course_id: courseId },
        }).then((response) => {
          if (response.error) {
            console.error("Error sending approval email:", response.error);
          } else {
            console.log("Approval email sent:", response.data);
          }
        }).catch((err) => {
          console.error("Failed to send approval email:", err);
        });
      }
    },
    onSuccess: (_, { isArchived }) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["validations"] });
      queryClient.invalidateQueries({ queryKey: ["pending-validations"] });
      const action = isArchived ? "arquivado" : "restaurado";
      toast({
        title: "Sucesso!",
        description: `Curso ${action} com sucesso.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao arquivar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateCourseCreator = useMutation({
    mutationFn: async ({ courseId, newCreatorId }: { courseId: string; newCreatorId: string }) => {
      const { error } = await supabase
        .from("courses")
        .update({ created_by: newCreatorId })
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Criador alterado com sucesso!",
        description: "O criador do curso foi atualizado.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar criador",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    courses,
    isLoading,
    createCourse,
    deleteCourse,
    toggleArchiveCourse,
    updateCourseCreator,
  };
};
