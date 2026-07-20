import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Validation } from "@/hooks/useValidations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { parseLocalDate } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ValidationReviewModalProps {
  validation: Validation | null;
  open: boolean;
  onClose: () => void;
  onReview: (validationId: string, status: "approved" | "rejected" | "pending_correction", reviewNotes: string, updatedCourse?: any) => void;
  isSubmitting: boolean;
  isAdmin?: boolean;
}

export const ValidationReviewModalEnhanced = ({
  validation,
  open,
  onClose,
  onReview,
  isSubmitting,
  isAdmin = false,
}: ValidationReviewModalProps) => {
  const [reviewNotes, setReviewNotes] = useState("");
  const [editedCourse, setEditedCourse] = useState<any>(null);

  useEffect(() => {
    if (validation) {
      const course = validation.courses as any;
      setEditedCourse({
        title: course.title,
        area: course.area,
        language: course.language || 'portuguese',
        modality: course.modality || 'presencial',
        target_audience: course.target_audience || 'cirurgioes_dentistas',
        accepts_students: course.accepts_students ?? false,
        vacancies: course.vacancies || 0,
        workload: course.workload || 0,
        investment: course.investment || 0,
        prerequisites: course.prerequisites || '',
        suggested_start_date: course.suggested_start_date || null,
        effective_start_date: course.effective_start_date || null,
        description: course.description || '',
        differentials: course.differentials || '',
        program: course.program || '',
        periodicity: course.periodicity || '',
        duration: course.duration || '',
        teacher_id: course.teacher_id || null,
        billing_company_id: course.billing_company_id || null,
        photo_1_url: course.photo_1_url || '',
        photo_2_url: course.photo_2_url || '',
        photo_3_url: course.photo_3_url || '',
        photo_4_url: course.photo_4_url || '',
        schedule_file_url: course.schedule_file_url || '',
        materials_file_url: course.materials_file_url || '',
        project_file_url: course.project_file_url || '',
        competitors: course.competitors || '',
        observations: course.observations || '',
        // New fields
        class_count: course.class_count || 1,
        theoretical_workload: course.theoretical_workload || 0,
        practical_workload: course.practical_workload || 0,
        nature: course.nature || '',
        other_professors: course.other_professors || '',
        course_materials: course.course_materials ?? false,
        required_equipment: course.required_equipment || '',
      });
    }
  }, [validation]);

  const handleReview = (status: "approved" | "rejected" | "pending_correction") => {
    if (!validation) return;
    onReview(validation.id, status, reviewNotes, editedCourse);
    setReviewNotes("");
  };

  if (!validation) return null;

  const statusColors = {
    pending_review: "bg-yellow-500",
    approved: "bg-green-500",
    rejected: "bg-red-500",
    pending_correction: "bg-orange-500",
  };

  const statusLabels = {
    pending_review: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    pending_correction: "Alterações Solicitadas",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar e Editar Validação</DialogTitle>
          <DialogDescription>
            Revise e edite as informações do curso antes de aprovar ou rejeitar
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Informações</TabsTrigger>
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="media">Fotos e Arquivos</TabsTrigger>
            <TabsTrigger value="review">Revisão</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Curso*</Label>
                <Input
                  id="title"
                  value={editedCourse?.title || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Área*</Label>
                <Input
                  id="area"
                  value={editedCourse?.area || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, area: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma*</Label>
                <Select 
                  value={editedCourse?.language || ""} 
                  onValueChange={(value) => setEditedCourse({ ...editedCourse, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portuguese">Português</SelectItem>
                    <SelectItem value="english">Inglês</SelectItem>
                    <SelectItem value="spanish">Espanhol</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modality">Modalidade*</Label>
                <Select 
                  value={editedCourse?.modality || ""} 
                  onValueChange={(value) => setEditedCourse({ ...editedCourse, modality: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hibrido">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_audience">Público Alvo*</Label>
                <Select 
                  value={editedCourse?.target_audience || ""} 
                  onValueChange={(value) => setEditedCourse({ ...editedCourse, target_audience: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cirurgioes_dentistas">Cirurgiões-Dentistas</SelectItem>
                    <SelectItem value="tecnicos">Técnicos</SelectItem>
                    <SelectItem value="auxiliares">Auxiliares</SelectItem>
                    <SelectItem value="estudantes">Estudantes</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accepts_students">Aceita Acadêmicos?*</Label>
                <Select 
                  value={editedCourse?.accepts_students ? "true" : "false"} 
                  onValueChange={(value) => setEditedCourse({ ...editedCourse, accepts_students: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vacancies">Vagas*</Label>
                <Input
                  id="vacancies"
                  type="number"
                  value={editedCourse?.vacancies || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, vacancies: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workload">Carga Horária Total*</Label>
                <Input
                  id="workload"
                  type="number"
                  value={editedCourse?.workload || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, workload: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="investment">Investimento*</Label>
                <Input
                  id="investment"
                  type="number"
                  step="0.01"
                  value={editedCourse?.investment || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, investment: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="class_count">Número de Turmas</Label>
                <Input
                  id="class_count"
                  type="number"
                  value={editedCourse?.class_count || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, class_count: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theoretical_workload">CH Teórica</Label>
                <Input
                  id="theoretical_workload"
                  type="number"
                  value={editedCourse?.theoretical_workload || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, theoretical_workload: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="practical_workload">CH Prática</Label>
                <Input
                  id="practical_workload"
                  type="number"
                  value={editedCourse?.practical_workload || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, practical_workload: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nature">Natureza</Label>
                <Input
                  id="nature"
                  value={editedCourse?.nature || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, nature: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course_materials">Materiais Fornecidos</Label>
                <Select 
                  value={editedCourse?.course_materials ? "true" : "false"} 
                  onValueChange={(value) => setEditedCourse({ ...editedCourse, course_materials: value === "true" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sim</SelectItem>
                    <SelectItem value="false">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="other_professors">Demais Professores</Label>
                <Textarea
                  id="other_professors"
                  value={editedCourse?.other_professors || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, other_professors: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="required_equipment">Equipamentos Necessários</Label>
                <Textarea
                  id="required_equipment"
                  value={editedCourse?.required_equipment || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, required_equipment: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Apresentação do Curso*</Label>
                <Textarea
                  id="description"
                  value={editedCourse?.description || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="differentials">Diferenciais</Label>
                <Textarea
                  id="differentials"
                  value={editedCourse?.differentials || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, differentials: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="program">Programa do Curso*</Label>
                <Textarea
                  id="program"
                  value={editedCourse?.program || ""}
                  onChange={(e) => setEditedCourse({ ...editedCourse, program: e.target.value })}
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodicity">Periodicidade*</Label>
                  <Input
                    id="periodicity"
                    value={editedCourse?.periodicity || ""}
                    onChange={(e) => setEditedCourse({ ...editedCourse, periodicity: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duração*</Label>
                  <Input
                    id="duration"
                    value={editedCourse?.duration || ""}
                    onChange={(e) => setEditedCourse({ ...editedCourse, duration: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Fotos do Curso</Label>
                <div className="grid grid-cols-2 gap-4">
                  {editedCourse?.photo_1_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Foto 1</p>
                      <img src={editedCourse.photo_1_url} alt="Foto 1" className="w-full h-32 object-cover rounded-md" />
                    </div>
                  )}
                  {editedCourse?.photo_2_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Foto 2</p>
                      <img src={editedCourse.photo_2_url} alt="Foto 2" className="w-full h-32 object-cover rounded-md" />
                    </div>
                  )}
                  {editedCourse?.photo_3_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Foto 3</p>
                      <img src={editedCourse.photo_3_url} alt="Foto 3" className="w-full h-32 object-cover rounded-md" />
                    </div>
                  )}
                  {editedCourse?.photo_4_url && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Foto 4</p>
                      <img src={editedCourse.photo_4_url} alt="Foto 4" className="w-full h-32 object-cover rounded-md" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Arquivos</Label>
                <div className="space-y-2">
                  {editedCourse?.schedule_file_url && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs">📄 Cronograma:</span>
                      <a href={editedCourse.schedule_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                        Ver arquivo
                      </a>
                    </div>
                  )}
                  {editedCourse?.materials_file_url && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs">📄 Materiais:</span>
                      <a href={editedCourse.materials_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                        Ver arquivo
                      </a>
                    </div>
                  )}
                  {editedCourse?.project_file_url && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="text-xs">📄 Projeto:</span>
                      <a href={editedCourse.project_file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                        Ver arquivo
                      </a>
                    </div>
                  )}
                  {!editedCourse?.schedule_file_url && !editedCourse?.materials_file_url && !editedCourse?.project_file_url && (
                    <p className="text-xs text-muted-foreground">Nenhum arquivo anexado</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {editedCourse?.suggested_start_date && (
                  <div>
                    <Label className="text-sm font-semibold">Data Sugerida</Label>
                    <p className="text-sm">{parseLocalDate(editedCourse.suggested_start_date)?.toLocaleDateString('pt-BR') || editedCourse.suggested_start_date}</p>
                  </div>
                )}
                {editedCourse?.effective_start_date && (
                  <div>
                    <Label className="text-sm font-semibold">Data Efetiva</Label>
                    <p className="text-sm">{parseLocalDate(editedCourse.effective_start_date)?.toLocaleDateString('pt-BR') || editedCourse.effective_start_date}</p>
                  </div>
                )}
              </div>

              {editedCourse?.prerequisites && (
                <div>
                  <Label className="text-sm font-semibold">Pré-requisitos</Label>
                  <p className="text-sm bg-muted p-3 rounded-md">{editedCourse.prerequisites}</p>
                </div>
              )}

              {editedCourse?.competitors && (
                <div>
                  <Label className="text-sm font-semibold">Concorrentes</Label>
                  <p className="text-sm bg-muted p-3 rounded-md">{editedCourse.competitors}</p>
                </div>
              )}

              {editedCourse?.observations && (
                <div>
                  <Label className="text-sm font-semibold">Observações</Label>
                  <p className="text-sm bg-muted p-3 rounded-md">{editedCourse.observations}</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="review" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-sm font-semibold">Departamento</Label>
                <p className="text-sm">{validation.departments.name}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">Status Atual</Label>
                <Badge className={statusColors[validation.status]}>
                  {statusLabels[validation.status]}
                </Badge>
              </div>
            </div>

            {validation.submission_notes && (
              <div>
                <Label className="text-sm font-semibold">Observações da Submissão</Label>
                <p className="text-sm bg-muted p-3 rounded-md">{validation.submission_notes}</p>
              </div>
            )}

            {validation.review_notes && (
              <div>
                <Label className="text-sm font-semibold">Notas de Revisão Anterior</Label>
                <p className="text-sm bg-muted p-3 rounded-md">{validation.review_notes}</p>
              </div>
            )}

            <div>
              <Label htmlFor="review-notes">Notas de Revisão*</Label>
              <Textarea
                id="review-notes"
                placeholder="Adicione suas observações sobre esta validação..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="destructive"
            onClick={() => handleReview("rejected")}
            disabled={isSubmitting || !reviewNotes.trim()}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Rejeitar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleReview("pending_correction")}
            disabled={isSubmitting || !reviewNotes.trim()}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            Solicitar Alterações
          </Button>
          {isAdmin && (
            <Button
              onClick={() => handleReview("approved")}
              disabled={isSubmitting}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Aprovar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};