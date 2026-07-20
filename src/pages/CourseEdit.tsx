import { CourseWizard } from "@/components/course/CourseWizard";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const CourseEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { isAdmin, canEditCourses, isLoading: roleLoading } = useUserRole();

  // Fetch course to check ownership
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course-edit-check", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("courses")
        .select("created_by")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Check permissions and redirect if not allowed
  useEffect(() => {
    const allLoaded = !authLoading && !roleLoading && !courseLoading;
    
    if (allLoaded && !canEditCourses && (!user || !course || course.created_by !== user.id)) {
      navigate("/courses");
    }
  }, [authLoading, roleLoading, courseLoading, canEditCourses, user, course, navigate]);

  const allLoaded = !authLoading && !roleLoading && !courseLoading;
  const hasPermission = canEditCourses || (user && course && course.created_by === user.id);

  if (!allLoaded) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>;
  }

  if (!hasPermission) {
    return null;
  }
  
  return <CourseWizard courseId={id} />;
};

export default CourseEdit;
