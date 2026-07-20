import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Calendar, Users, Clock, DollarSign, Download, History, MapPin, BookOpen, Target, Zap, FileText, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CourseHistoryModal } from "@/components/course/CourseHistoryModal";
import { TeacherPhoto } from "@/components/teacher/TeacherPhoto";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { parseLocalDate } from "@/lib/utils";
import { useState } from "react";

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditCourses, isAdmin } = useUserRole();
  const { user } = useAuth();
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          teachers (
            id,
            name,
            email,
            phone,
            bio,
            specialties,
            photo_url,
            cro
          ),
          promotional_teams (
            id,
            name,
            contact_person,
            email,
            phone
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Carregando curso...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Curso não encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/courses")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
                <p className="text-muted-foreground">{course.area}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {course.slug && ['approved', 'in_progress'].includes(course.status || '') && (
                <Button variant="outline" onClick={() => window.open(`/curso/${course.slug}`, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Página Pública
                </Button>
              )}
              <Button variant="outline" onClick={() => setHistoryOpen(true)}>
                <History className="mr-2 h-4 w-4" />
                Ver Histórico
              </Button>
              {((isAdmin) || (course && user && course.created_by === user.id)) ? (
                <Button onClick={() => navigate(`/courses/${id}/edit`)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Curso
                </Button>
              ) : (
                <Button
                  onClick={async () => {
                    try {
                      const { data: { user: currentUser } } = await supabase.auth.getUser();
                      const { data: departments, error: deptError } = await supabase
                        .from("departments")
                        .select("id");

                      if (deptError) throw deptError;

                      if (departments && departments.length > 0) {
                        const validationEntries = departments.map((dept) => ({
                          course_id: id,
                          user_id: currentUser?.id,
                          department_id: dept.id,
                          status: "pending_review" as const,
                        }));

                        const { error: validationError } = await supabase
                          .from("course_validations")
                          .insert(validationEntries);

                        if (validationError) throw validationError;
                      }

                      // Simple feedback
                      // eslint-disable-next-line no-undef
                      alert("Solicitação de alteração enviada com sucesso.");
                    } catch (err: any) {
                      // eslint-disable-next-line no-undef
                      alert("Erro ao enviar solicitação: " + (err.message || String(err)));
                    }
                  }}
                >
                  Solicitar alteração
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Key Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status Badge */}
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                    <Badge className="capitalize">
                      {course.status === 'draft' ? 'Rascunho' :
                       course.status === 'pending_approval' ? 'Aguardando Aprovação' :
                       course.status === 'approved' ? 'Aprovado' :
                       course.status === 'in_progress' ? 'Em Andamento' :
                       course.status === 'completed' ? 'Concluído' :
                       course.status === 'cancelled' ? 'Cancelado' :
                       course.status === 'archived' ? 'Arquivado' : course.status}
                    </Badge>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Área</p>
                    <Badge variant="outline">{course.area}</Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Modalidade</p>
                    <Badge variant="outline" className="capitalize">{course.modality}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Info Cards */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Informações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Investimento</p>
                    <p className="font-bold text-lg">
                      {(course as any).currency === 'dolar' ? '$' : 'R$'} {course.investment?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>

                <Separator />
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Carga Horária</p>
                    <p className="font-semibold">{course.workload}h</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Vagas</p>
                    <p className="font-semibold">{course.vacancies}</p>
                  </div>
                </div>

                {course.effective_installment && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Parcelamento</p>
                        <p className="font-semibold">Até {course.effective_installment}x</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Dates */}
            {(course.effective_start_date || course.suggested_start_date) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Datas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {course.effective_start_date && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Início (Efetivo)</p>
                      <p className="font-semibold">{parseLocalDate(course.effective_start_date)?.toLocaleDateString('pt-BR') || course.effective_start_date}</p>
                    </div>
                  )}
                  {course.suggested_start_date && course.suggested_start_date.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Datas Sugeridas</p>
                      <ul className="space-y-1">
                        {course.suggested_start_date.map((date: string, idx: number) => (
                          <li key={idx} className="text-sm">{new Date(date).toLocaleDateString('pt-BR')}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs for organized content */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="professor">Professor</TabsTrigger>
                <TabsTrigger value="files">Arquivos</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Photos Gallery */}
                {(course.photo_1_url || course.photo_2_url || course.photo_3_url || course.photo_4_url) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Galeria de Fotos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[course.photo_1_url, course.photo_2_url, course.photo_3_url, course.photo_4_url]
                          .filter(Boolean)
                          .map((url, i) => (
                            <div key={i} className="relative overflow-hidden rounded-lg">
                              <img
                                src={url}
                                alt={`Foto ${i + 1}`}
                                className="w-full h-48 object-cover hover:scale-105 transition-transform"
                              />
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Description */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Descrição
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{course.description}</p>
                  </CardContent>
                </Card>

                {/* Differentials */}
                {course.differentials && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Diferenciais
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{course.differentials}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Program */}
                {course.program && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Programa do Curso
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{course.program}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Prerequisites */}
                {course.prerequisites && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Pré-requisitos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{course.prerequisites}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Técnicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Grid of details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left column */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Idioma</p>
                          <p className="font-semibold">{course.language || "Português"}</p>
                        </div>
                        
                        {course.duration && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Duração</p>
                              <p className="font-semibold">{course.duration}</p>
                            </div>
                          </>
                        )}
                        
                        {course.periodicity && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Periodicidade</p>
                              <p className="font-semibold">{course.periodicity}</p>
                            </div>
                          </>
                        )}

                        {course.target_audience && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Público-alvo</p>
                              <p className="font-semibold capitalize">{course.target_audience.replace(/_/g, ' ')}</p>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right column */}
                      <div className="space-y-4">
                        {course.installment_suggestion && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Parcelamento Sugerido</p>
                            <p className="font-semibold">{course.installment_suggestion}x</p>
                          </div>
                        )}

                        {course.suggested_repayment_type && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Tipo de Repasse (Sugerido)</p>
                              <p className="font-semibold">{course.suggested_repayment_type}</p>
                            </div>
                          </>
                        )}

                        {course.effective_repayment_type && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Tipo de Repasse (Efetivo)</p>
                              <p className="font-semibold">{course.effective_repayment_type}</p>
                            </div>
                          </>
                        )}

                        {course.effective_repayment_value && (
                          <>
                            <Separator />
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Valor de Repasse (Efetivo)</p>
                              <p className="font-semibold">{course.effective_repayment_value}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Observations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {course.observations || "Nenhuma observação registrada."}
                    </p>
                  </CardContent>
                </Card>

                {/* Equipe Promotora */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Equipe Promotora
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {course.promotional_teams ? (
                      <div className="space-y-3">
                        <p className="text-lg font-semibold">{course.promotional_teams.name}</p>
                        {course.promotional_teams.contact_person && (
                          <div>
                            <p className="text-sm text-muted-foreground">Pessoa de Contato</p>
                            <p className="font-medium">{course.promotional_teams.contact_person}</p>
                          </div>
                        )}
                        {course.promotional_teams.email && (
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <a href={`mailto:${course.promotional_teams.email}`} className="text-primary hover:underline font-medium">
                              {course.promotional_teams.email}
                            </a>
                          </div>
                        )}
                        {course.promotional_teams.phone && (
                          <div>
                            <p className="text-sm text-muted-foreground">Telefone</p>
                            <a href={`tel:${course.promotional_teams.phone}`} className="text-primary hover:underline font-medium">
                              {course.promotional_teams.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Nenhuma equipe promotora vinculada.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Professor Tab */}
              <TabsContent value="professor">
                {course.teachers ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Informações do Professor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col sm:flex-row gap-6">
                        <TeacherPhoto
                          photoUrl={course.teachers.photo_url}
                          name={course.teachers.name}
                          size="md"
                          className="flex-shrink-0"
                        />
                        
                        <div className="flex-1 space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Nome</p>
                            <p className="text-2xl font-bold">{course.teachers.name}</p>
                          </div>

                          {course.teachers.cro && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">CRO</p>
                              <p className="font-semibold">{course.teachers.cro}</p>
                            </div>
                          )}

                          {course.teachers.specialties && course.teachers.specialties.length > 0 && (
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Especialidades</p>
                              <div className="flex flex-wrap gap-2">
                                {course.teachers.specialties.map((specialty: string, index: number) => (
                                  <Badge key={index} variant="secondary">{specialty}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {course.teachers.bio && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Biografia</p>
                          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{course.teachers.bio}</p>
                        </div>
                      )}

                      {(course.teachers.email || course.teachers.phone) && (
                        <>
                          <Separator />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {course.teachers.email && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Email</p>
                                <a href={`mailto:${course.teachers.email}`} className="text-primary hover:underline font-semibold">
                                  {course.teachers.email}
                                </a>
                              </div>
                            )}
                            {course.teachers.phone && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                                <a href={`tel:${course.teachers.phone}`} className="text-primary hover:underline font-semibold">
                                  {course.teachers.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground">Nenhum professor atribuído a este curso.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files">
                {(course.schedule_file_url || course.materials_file_url || course.project_file_url) ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5" />
                        Arquivos do Curso
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {course.schedule_file_url && (
                        <Button variant="outline" className="w-full justify-start h-auto py-3" asChild>
                          <a href={course.schedule_file_url} download>
                            <Download className="mr-3 h-5 w-5 flex-shrink-0" />
                            <div className="text-left">
                              <p className="font-semibold">Cronograma</p>
                              <p className="text-xs text-muted-foreground">Baixar arquivo</p>
                            </div>
                          </a>
                        </Button>
                      )}
                      {course.materials_file_url && (
                        <Button variant="outline" className="w-full justify-start h-auto py-3" asChild>
                          <a href={course.materials_file_url} download>
                            <Download className="mr-3 h-5 w-5 flex-shrink-0" />
                            <div className="text-left">
                              <p className="font-semibold">Lista de Materiais</p>
                              <p className="text-xs text-muted-foreground">Baixar arquivo</p>
                            </div>
                          </a>
                        </Button>
                      )}
                      {course.project_file_url && (
                        <Button variant="outline" className="w-full justify-start h-auto py-3" asChild>
                          <a href={course.project_file_url} download>
                            <Download className="mr-3 h-5 w-5 flex-shrink-0" />
                            <div className="text-left">
                              <p className="font-semibold">Projeto</p>
                              <p className="text-xs text-muted-foreground">Baixar arquivo</p>
                            </div>
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-muted-foreground">Nenhum arquivo disponível para este curso.</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {id && (
        <CourseHistoryModal
          courseId={id}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
};

export default CourseDetails;
