import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit, Trash2, Archive, ArchiveRestore, ExternalLink, UserCog, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCourses, Course } from "@/hooks/useCourses";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState } from "react";
import { CourseCreatorModal } from "@/components/course/CourseCreatorModal";

type StatusFilter = "all" | "pending" | "correction" | "approved";
type SortOption = "updated_desc" | "updated_asc" | "created_desc" | "created_asc" | "title_asc" | "title_desc";

const Courses = () => {
  const navigate = useNavigate();
  const { courses, isLoading, deleteCourse, toggleArchiveCourse, updateCourseCreator } = useCourses();
  const { canEditCourses, isAdmin } = useUserRole();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("updated_desc");
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  const [courseToRestore, setCourseToRestore] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string>("draft");
  const [courseToEditCreator, setCourseToEditCreator] = useState<Course | null>(null);

  const getStatusBadge = (status?: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "Rascunho", variant: "secondary" },
      pending_approval: { label: "Aguardando Aprovação", variant: "outline" },
      approved: { label: "Aprovado", variant: "default" },
      in_progress: { label: "Em Andamento", variant: "default" },
      completed: { label: "Concluído", variant: "secondary" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      archived: { label: "Arquivado", variant: "secondary" },
    };
    
    const config = statusConfig[status || "draft"] || { label: status || "Desconhecido", variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredCourses = courses?.filter((course) => {
    // Filter by archive status
    if (!showArchived && course.is_archived) return false;
    if (showArchived && !course.is_archived) return false;

    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (statusFilter) {
      case "pending":
        return course.status === "pending_approval";
      case "correction":
        return course.status === "draft";
      case "approved":
        return ["approved", "in_progress", "completed"].includes(course.status || "");
      default:
        return true;
    }
  });

  const sortedCourses = filteredCourses?.sort((a, b) => {
    switch (sortOption) {
      case "updated_desc":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "updated_asc":
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      case "created_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "created_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "title_asc":
        return a.title.localeCompare(b.title);
      case "title_desc":
        return b.title.localeCompare(a.title);
      default:
        return 0;
    }
  });

  const handleDelete = (courseId: string) => {
    deleteCourse.mutate(courseId, {
      onSuccess: () => {
        setCourseToDelete(null);
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
              <p className="text-muted-foreground">Gerencie todos os cursos do sistema</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Voltar
              </Button>
              {canEditCourses && (
                <Button onClick={() => navigate("/courses/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Curso
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle>Lista de Cursos</CardTitle>
              </div>
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant={!showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(false)}
                >
                  Ativos
                </Button>
                <Button
                  variant={showArchived ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowArchived(true)}
                >
                  Arquivados
                </Button>
                <div className="border-l border-border"></div>
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("pending")}
                >
                  Pendentes
                </Button>
                <Button
                  variant={statusFilter === "correction" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("correction")}
                >
                  Em Alteração
                </Button>
                <Button
                  variant={statusFilter === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("approved")}
                >
                  Aprovados
                </Button>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar cursos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                  <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Ordenar por..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated_desc">Última atualização (recente)</SelectItem>
                      <SelectItem value="updated_asc">Última atualização (antiga)</SelectItem>
                      <SelectItem value="created_desc">Data de criação (recente)</SelectItem>
                      <SelectItem value="created_asc">Data de criação (antiga)</SelectItem>
                      <SelectItem value="title_asc">Título (A-Z)</SelectItem>
                      <SelectItem value="title_desc">Título (Z-A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando cursos...</div>
            ) : filteredCourses && filteredCourses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Vagas</TableHead>
                    <TableHead>Investimento</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Última atualização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {sortedCourses?.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="font-medium">{course.title}</TableCell>
                      <TableCell>{course.area}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{course.creator?.name || "—"}</span>
                            {course.creator?.departments?.name && (
                              <Badge variant="outline" className="w-fit text-xs mt-1">
                                {course.creator.departments.name === 'coordenador' ? 'Coordenador' : 
                                 course.creator.departments.name}
                              </Badge>
                            )}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setCourseToEditCreator(course)}
                              title="Alterar criador"
                            >
                              <UserCog className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{course.modality}</TableCell>
                      <TableCell>{course.vacancies}</TableCell>
                      <TableCell>R$ {course.investment.toFixed(2)}</TableCell>
                      <TableCell>{course.created_at ? format(new Date(course.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</TableCell>
                      <TableCell>
                        {course.updated_at ? format(new Date(course.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(course.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {course.slug && ['approved', 'in_progress'].includes(course.status || '') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/curso/${course.slug}`, '_blank')}
                              title="Ver página pública"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/courses/${course.id}`)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(isAdmin || (user && course.created_by === user.id)) && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigate(`/courses/${course.id}/edit`)}
                                title="Editar curso"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      if (course.is_archived) {
                                        setCourseToRestore(course.id);
                                        setRestoreStatus("draft");
                                      } else {
                                        toggleArchiveCourse.mutate({ courseId: course.id, isArchived: true });
                                      }
                                    }}
                                    title={course.is_archived ? "Restaurar curso" : "Arquivar curso"}
                                  >
                                    {course.is_archived ? (
                                      <ArchiveRestore className="h-4 w-4" />
                                    ) : (
                                      <Archive className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCourseToDelete(course.id)}
                                    title="Excluir curso"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum curso encontrado. Crie seu primeiro curso!
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita e todas as validações associadas também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => courseToDelete && handleDelete(courseToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!courseToRestore} onOpenChange={() => setCourseToRestore(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Curso</DialogTitle>
            <DialogDescription>
              Escolha o status para o curso após a restauração.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={restoreStatus} onValueChange={setRestoreStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCourseToRestore(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (courseToRestore) {
                  toggleArchiveCourse.mutate({
                    courseId: courseToRestore,
                    isArchived: false,
                    restoreStatus: restoreStatus as any,
                  });
                  setCourseToRestore(null);
                }
              }}
            >
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para alterar criador do curso */}
      <CourseCreatorModal
        open={!!courseToEditCreator}
        onOpenChange={(open) => !open && setCourseToEditCreator(null)}
        courseId={courseToEditCreator?.id || ""}
        courseTitle={courseToEditCreator?.title || ""}
        currentCreatorId={courseToEditCreator?.created_by}
        onSave={(courseId, newCreatorId) => {
          updateCourseCreator.mutate({ courseId, newCreatorId }, {
            onSuccess: () => setCourseToEditCreator(null),
          });
        }}
        isLoading={updateCourseCreator.isPending}
      />
    </div>
  );
};

export default Courses;
