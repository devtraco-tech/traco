import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import { useToast } from "@/hooks/use-toast";
import { BasicInfoStep } from "./steps/BasicInfoStep";
import { CourseDetailsStep } from "./steps/CourseDetailsStep";
import { ScheduleStep } from "./steps/ScheduleStep";
import { ContentStep } from "./steps/ContentStep";
import { FinalizationStep } from "./steps/FinalizationStep";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseLocalDate } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

const steps = [
  { id: 1, name: "Informações Básicas", component: BasicInfoStep },
  { id: 2, name: "Detalhes do Curso", component: CourseDetailsStep },
  { id: 3, name: "Cronograma", component: ScheduleStep },
  { id: 4, name: "Conteúdo", component: ContentStep },
  { id: 5, name: "Finalização", component: FinalizationStep },
];

interface CourseWizardProps {
  courseId?: string;
}

export const CourseWizard = ({ courseId }: CourseWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(!!courseId);
  const navigate = useNavigate();
  const { createCourse } = useCourses();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdmin, canEditCourses } = useUserRole();
  const [canEdit, setCanEdit] = useState(true);

  // Load existing course data if editing
  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;
      
      setIsLoading(true);
      try {
        const { data: course, error } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .single();

        if (error) throw error;

        if (course) {
          // Map database fields back to form fields
          
          const suggestedDates = course.suggested_start_date 
            ? course.suggested_start_date.map((d: string) => parseLocalDate(d)).filter(Boolean) 
            : [];
          const selectionDate = parseLocalDate(course.selection_date);
          const effectiveDate = parseLocalDate(course.effective_start_date);
          
          setFormData({
            // Basic Info
            name: course.title,
            area: course.area,
            language: course.language === "portuguese" ? "Português"
              : course.language === "english" ? "Inglês"
              : course.language === "spanish" ? "Espanhol"
              : "Português",
            modality: course.modality === "presencial" ? "presencial"
              : course.modality === "online" ? "online"
              : "hibrido",
            courseType: "Especialização",
            targetAudience: course.target_audience === "cirurgioes_dentistas" ? "Cirurgiões-dentistas" : "",
            accepts_students: course.accepts_students ?? false,
            promotional_team_id: course.promotional_team_id || "",
            billing_company_id: course.billing_company_id || "",
            suggestedStartDate: suggestedDates,
            selectionDate: selectionDate,
            effectiveDate: effectiveDate,
            totalValue: course.investment?.toString() || "",
            installmentSuggestion: (course as any).installment_suggestion || "",
            effectiveValue: course.investment?.toString() || "",
            effectiveInstallment: (course as any).effective_installment || "",
            suggestedRepaymentType: (course as any).suggested_repayment_type || "",
            suggestedRepaymentValue: (course as any).suggested_repayment_value || "",
            effectiveRepaymentType: (course as any).effective_repayment_type || "",
            effectiveRepaymentValue: (course as any).effective_repayment_value || "",
            
            // Course Details - carregar todos os campos do banco
            teacher_id: course.teacher_id || "",
            totalWorkload: course.workload?.toString() || "",
            maxStudents: `${course.vacancies}/${course.vacancies}`,
            classCount: (course as any).class_count?.toString() || "1",
            theoreticalWorkload: (course as any).theoretical_workload?.toString() || "0",
            practicalWorkload: (course as any).practical_workload?.toString() || "0",
            nature: (course as any).nature || "",
            otherProfessors: (course as any).other_professors || "",
            courseMaterials: (course as any).course_materials ?? false,
            requiredEquipment: (course as any).required_equipment || "",
            
            // Content
            prerequisites: course.prerequisites || "",
            description: course.description || "",
            differentials: course.differentials || "",
            program: course.program || "",
            periodicity: course.periodicity || "",
            duration: course.duration || "",
            
            // Schedule & Files
            schedule_file_url: course.schedule_file_url || "",
            materials_file_url: course.materials_file_url || "",
            project_file_url: course.project_file_url || "",
            competitors: course.competitors || "",
            
            // Media
            photo_1_url: course.photo_1_url || "",
            photo_2_url: course.photo_2_url || "",
            photo_3_url: course.photo_3_url || "",
            photo_4_url: course.photo_4_url || "",
            banner_desktop_url: (course as any).banner_desktop_url || "",
            banner_mobile_url: (course as any).banner_mobile_url || "",
            
            // Final
            observations: course.observations || "",
            
            // Currency
            currency: (course as any).currency || "real",
          });
          // Determine if current user can edit this course
          try {
            setCanEdit(!!(canEditCourses || (user && course.created_by && user.id === course.created_by)));
          } catch (err) {
            setCanEdit(false);
          }
        }
      } catch (error: any) {
        toast({
          title: "Erro ao carregar curso",
          description: error.message,
          variant: "destructive",
        });
        navigate("/courses");
      } finally {
        setIsLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, navigate, toast]);

  const progress = (currentStep / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleNext = (data: any) => {
    setFormData({ ...formData, ...data });
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (data: any) => {
    if (isSubmitting) return;
    
    const finalData = { ...formData, ...data };
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!finalData.photo_1_url) {
        toast({
          title: "Foto obrigatória",
          description: "Por favor, adicione pelo menos a primeira foto do curso.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Map form fields to database schema
      const mappedData = {
        title: finalData.name,
        area: finalData.area,
        teacher_id: finalData.teacher_id || null,
        language: (finalData.language?.toLowerCase() === "português" ? "portuguese" 
          : finalData.language?.toLowerCase() === "inglês" ? "english"
          : finalData.language?.toLowerCase() === "espanhol" ? "spanish" 
          : "portuguese") as "portuguese" | "english" | "spanish",
        modality: (finalData.modality?.toLowerCase() === "presencial" ? "presencial"
          : finalData.modality?.toLowerCase() === "online" ? "online"
          : finalData.modality?.toLowerCase() === "hibrido" || finalData.modality?.toLowerCase() === "híbrida" ? "hibrido"
          : "presencial") as "presencial" | "online" | "hibrido",
        target_audience: "cirurgioes_dentistas" as const,
        accepts_students: finalData.accepts_students ?? false,
        vacancies: parseInt(finalData.maxStudents?.split("/")[1] || "10"),
        workload: parseInt(finalData.totalWorkload || "0"),
        investment: parseFloat(finalData.totalValue || "0"),
        prerequisites: finalData.prerequisites || null,
        // Format dates as YYYY-MM-DD without timezone conversion
        suggested_start_date: finalData.suggestedStartDate && finalData.suggestedStartDate.length > 0 
          ? finalData.suggestedStartDate.map((d: Date) => {
              const date = new Date(d);
              return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }) 
          : null,
        selection_date: finalData.selectionDate 
          ? `${new Date(finalData.selectionDate).getFullYear()}-${String(new Date(finalData.selectionDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(finalData.selectionDate).getDate()).padStart(2, '0')}`
          : null,
        effective_start_date: finalData.effectiveDate 
          ? `${new Date(finalData.effectiveDate).getFullYear()}-${String(new Date(finalData.effectiveDate).getMonth() + 1).padStart(2, '0')}-${String(new Date(finalData.effectiveDate).getDate()).padStart(2, '0')}`
          : null,
        end_date: null,
        description: finalData.description || "Curso profissionalizante",
        differentials: finalData.differentials || null,
        program: finalData.program || null,
        periodicity: finalData.periodicity || null,
        duration: finalData.duration || null,
        schedule_file_url: finalData.schedule_file_url || null,
        materials_file_url: finalData.materials_file_url || null,
        project_file_url: finalData.project_file_url || null,
        photo_1_url: finalData.photo_1_url,
        photo_2_url: finalData.photo_2_url || null,
        photo_3_url: finalData.photo_3_url || null,
        photo_4_url: finalData.photo_4_url || null,
        banner_desktop_url: finalData.banner_desktop_url || null,
        banner_mobile_url: finalData.banner_mobile_url || null,
        competitors: finalData.competitors || null,
        observations: finalData.observations || null,
        promotional_team_id: finalData.promotional_team_id || null,
        billing_company_id: finalData.billing_company_id || null,
        suggested_repayment_type: finalData.suggestedRepaymentType || null,
        suggested_repayment_value: finalData.suggestedRepaymentValue || null,
        effective_repayment_type: finalData.effectiveRepaymentType || null,
        effective_repayment_value: finalData.effectiveRepaymentValue || null,
        installment_suggestion: finalData.installmentSuggestion || null,
        effective_installment: finalData.effectiveInstallment ? String(finalData.effectiveInstallment) : "1",
        // New fields
        class_count: parseInt(finalData.classCount || "1"),
        theoretical_workload: parseInt(finalData.theoreticalWorkload || "0"),
        practical_workload: parseInt(finalData.practicalWorkload || "0"),
        nature: finalData.nature || null,
        other_professors: finalData.otherProfessors || null,
        course_materials: finalData.courseMaterials ?? false,
        required_equipment: finalData.requiredEquipment || null,
        currency: (finalData.currency === "dolar" ? "dolar" : "real") as "real" | "dolar",
        status: "pending_approval" as const,
        is_archived: false, // Ensure course is moved to active when edited
      };

      if (courseId) {
        // Update existing course only if user can edit (admin or creator)
        // Re-fetch course to check owner reliably
        const { data: courseRecord, error: courseFetchError } = await supabase
          .from("courses")
          .select("created_by")
          .eq("id", courseId)
          .single();

        if (courseFetchError) throw courseFetchError;

        const currentUserId = user?.id;
        const isOwner = !!(currentUserId && courseRecord && courseRecord.created_by === currentUserId);

        if (canEditCourses || isOwner) {
          // Update course and reset all validations to pending_review
          const { error } = await supabase
            .from("courses")
            .update(mappedData)
            .eq("id", courseId);

          if (error) throw error;

          // Reset all validations to pending_review
          const { error: validationError } = await supabase
            .from("course_validations")
            .update({
              status: "pending_review",
              review_notes: null,
              reviewed_by: null,
              reviewed_at: null,
            })
            .eq("course_id", courseId);

          if (validationError) {
            console.error("Error resetting validations:", validationError);
          }

          toast({
            title: "Curso atualizado com sucesso!",
            description: "As validações foram resetadas. Redirecionando...",
          });

          setTimeout(() => {
            navigate("/courses");
          }, 1500);
        } else {
          // User is NOT allowed to update directly - show error
          toast({
            title: "Sem permissão",
            description: "Você não tem permissão para editar este curso.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Create new course - add pending_approval status
        const result = await createCourse.mutateAsync({ ...mappedData, status: "pending_approval" } as any);
        
        if (result) {
          toast({
            title: "Curso criado com sucesso!",
            description: "Redirecionando para o dashboard...",
          });

          setTimeout(() => {
            navigate("/dashboard");
          }, 1500);
        }
      }
    } catch (error: any) {
      console.error("Error creating/updating course:", error);
      toast({
        title: courseId ? "Erro ao atualizar curso" : "Erro ao criar curso",
        description: error.message || "Ocorreu um erro ao processar o curso.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-6 max-w-5xl">
          <Card className="shadow-lg">
            <CardContent className="py-12 text-center">
              Carregando dados do curso...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-6 max-w-5xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>{courseId ? "Editar Curso" : "Criar Novo Curso"}</CardTitle>
            <CardDescription>Etapa {currentStep} de {steps.length}</CardDescription>
            <Progress value={progress} className="mt-4" />
          </CardHeader>

          <CardContent>
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          currentStep > step.id
                            ? "bg-success border-success text-white"
                            : currentStep === step.id
                            ? "bg-primary border-primary text-white"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                      </div>
                      <span className="text-xs mt-2 text-center max-w-[80px] text-muted-foreground hidden md:block">
                        {step.name}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-12 mx-2 ${
                          currentStep > step.id ? "bg-success" : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <CurrentStepComponent
                data={formData}
                onNext={handleNext}
                onPrevious={handlePrevious}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isAdmin={isAdmin}
                canEditCourses={canEditCourses}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
