import { CourseWizard } from "@/components/course/CourseWizard";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const CourseCreate = () => {
  const { canEditCourses, isLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !canEditCourses) {
      navigate("/courses");
    }
  }, [canEditCourses, isLoading, navigate]);

  if (!canEditCourses) {
    return null;
  }

  return <CourseWizard />;
};

export default CourseCreate;
