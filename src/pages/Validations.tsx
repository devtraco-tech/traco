import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useValidations, Validation } from "@/hooks/useValidations";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ValidationReviewModalEnhanced } from "@/components/validation/ValidationReviewModalEnhanced";
import { CoursePublishModal } from "@/components/validation/CoursePublishModal";
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Rocket, Filter, UserPlus, Search, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

type StatusFilter = "all" | "pending" | "correction" | "approved";
type SortOption = "updated_desc" | "updated_asc" | "pending_first" | "title_asc";

const statusColors: Record<string, string> = {
  pending_review: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  approved: "bg-green-500/10 text-green-700 border-green-500/30",
  rejected: "bg-red-500/10 text-red-700 border-red-500/30",
  pending_correction: "bg-orange-500/10 text-orange-700 border-orange-500/30",
};

const statusLabels: Record<string, string> = {
  pending_review: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  pending_correction: "Correção",
};

const statusIcons: Record<string, React.ElementType> = {
  pending_review: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  pending_correction: AlertCircle,
};

const departmentLabels: Record<string, string> = {
  educacao: "Educação",
  projetos: "Projetos",
  admin: "Administração",
  checkbasico: "Check Básico",
  comercial: "Comercial",
  eduq: "EduQ",
  financeiro: "Financeiro",
  marketing: "Marketing",
  reservas: "Reservas",
  coordenador: "Coordenador",
};

const Validations = () => {
  const navigate = useNavigate();
  const { validations, pendingValidations, validationHistory, isLoading, reviewValidation, approveCourse } = useValidations();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [selectedValidation, setSelectedValidation] = useState<Validation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishingCourseInfo, setPublishingCourseInfo] = useState<{id: string, title: string} | null>(null);
  const [creatingUsers, setCreatingUsers] = useState(false);
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Filters and sorting
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("updated_desc");


  const departments = useMemo(() => {
    const uniqueDepts = new Set(
      validations?.map(v => v.departments?.name)
        .filter((name): name is string => typeof name === 'string' && name.trim() !== "") || []
    );
    return Array.from(uniqueDepts);
  }, [validations]);

  const areas = useMemo(() => {
    const uniqueAreas = new Set(
      validations?.map(v => v.courses?.area)
        .filter((area): area is string => typeof area === 'string' && area.trim() !== "") || []
    );
    return Array.from(uniqueAreas);
  }, [validations]);

  // Filter validations but keep all validations for matching courses
  const filteredPendingValidations = useMemo(() => {
    if (!pendingValidations) return [];
    
    // First, group by course
    const courseGroups = new Map<string, Validation[]>();
    pendingValidations.forEach(v => {
      if (!courseGroups.has(v.course_id)) {
        courseGroups.set(v.course_id, []);
      }
      courseGroups.get(v.course_id)!.push(v);
    });
    
    // Filter courses based on criteria, but return ALL validations for matching courses
    const result: Validation[] = [];
    
    courseGroups.forEach((validations, courseId) => {
      const firstValidation = validations[0];
      
      // Check course-level filters
      const matchesDept = departmentFilter === "all" || validations.some(v => v.departments.name === departmentFilter);
      const matchesArea = areaFilter === "all" || firstValidation.courses.area === areaFilter;
      const matchesCourse = courseFilter === "" || firstValidation.courses.title.toLowerCase().includes(courseFilter.toLowerCase());
      
      // Check if course has any validation matching the status filter
      let matchesStatus = true;
      switch (statusFilter) {
        case "pending":
          matchesStatus = validations.some(v => v.status === "pending_review");
          break;
        case "correction":
          matchesStatus = validations.some(v => v.status === "pending_correction");
          break;
        case "approved":
          matchesStatus = validations.some(v => v.status === "approved");
          break;
        default:
          matchesStatus = true;
      }
      
      // If course matches all filters, include ALL its validations
      if (matchesDept && matchesArea && matchesCourse && matchesStatus) {
        result.push(...validations);
      }
    });
    
    return result;
  }, [pendingValidations, departmentFilter, areaFilter, courseFilter, statusFilter]);

  const validationsByCourse = useMemo(() => {
    const grouped = new Map<string, { course: Validation["courses"]; validations: Validation[]; latestUpdate: string }>();
    
    filteredPendingValidations?.forEach(validation => {
      const courseId = validation.course_id;
      if (!grouped.has(courseId)) {
        grouped.set(courseId, { 
          course: validation.courses, 
          validations: [], 
          latestUpdate: validation.updated_at || validation.submission_date 
        });
      }
      const group = grouped.get(courseId)!;
      group.validations.push(validation);
      // Track most recent update
      const validationDate = validation.updated_at || validation.submission_date;
      if (validationDate > group.latestUpdate) {
        group.latestUpdate = validationDate;
      }
    });
    
    // Sort courses based on selected option
    const sortedEntries = Array.from(grouped.entries()).sort(([, a], [, b]) => {
      switch (sortOption) {
        case "updated_desc":
          return new Date(b.latestUpdate).getTime() - new Date(a.latestUpdate).getTime();
        case "updated_asc":
          return new Date(a.latestUpdate).getTime() - new Date(b.latestUpdate).getTime();
        case "pending_first":
          const aPending = a.validations.filter(v => v.status === "pending_review").length;
          const bPending = b.validations.filter(v => v.status === "pending_review").length;
          return bPending - aPending;
        case "title_asc":
          return a.course.title.localeCompare(b.course.title);
        default:
          return 0;
      }
    });
    
    return new Map(sortedEntries);
  }, [filteredPendingValidations, sortOption]);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(courseId)) {
        newSet.delete(courseId);
      } else {
        newSet.add(courseId);
      }
      return newSet;
    });
  };

  const handlePublishCourse = (courseId: string, courseTitle: string) => {
    setPublishingCourseInfo({ id: courseId, title: courseTitle });
    setPublishModalOpen(true);
  };

  const confirmPublish = (effectiveDate: Date) => {
    if (publishingCourseInfo) {
      approveCourse.mutate(
        { 
          courseId: publishingCourseInfo.id, 
          effectiveStartDate: effectiveDate.toISOString() 
        },
        {
          onSuccess: () => {
            setPublishModalOpen(false);
            setPublishingCourseInfo(null);
          }
        }
      );
    }
  };

  const handleReview = (
    validationId: string, 
    status: "approved" | "rejected" | "pending_correction", 
    reviewNotes: string,
    updatedCourse?: any
  ) => {
    reviewValidation.mutate(
      { validationId, status, reviewNotes, updatedCourse },
      {
        onSuccess: () => {
          setModalOpen(false);
          setSelectedValidation(null);
        },
      }
    );
  };

  const handleCreateDepartmentUsers = async () => {
    setCreatingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-department-users');
      
      if (error) throw error;
      
      const results = data?.results || [];
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.filter((r: any) => !r.success).length;
      
      toast({
        title: "Usuários criados",
        description: `${successCount} criados, ${failCount} falharam.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingUsers(false);
    }
  };

  const getStatusSummary = (validations: Validation[]) => {
    const pending = validations.filter(v => v.status === "pending_review").length;
    const approved = validations.filter(v => v.status === "approved").length;
    const correction = validations.filter(v => v.status === "pending_correction").length;
    return { pending, approved, correction, total: validations.length };
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Carregando validações...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4">
      {/* Header compacto */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Validações</h1>
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700">
            <Clock className="mr-1 h-3 w-3" />
            {filteredPendingValidations?.length || 0}
          </Badge>
        </div>
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCreateDepartmentUsers}
            disabled={creatingUsers}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {creatingUsers ? "Criando..." : "Criar Usuários"}
          </Button>
        )}
      </div>

      {/* Filtros compactos */}
      <Card className="border-dashed">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {/* Status buttons */}
            <div className="flex gap-1">
              {(["all", "pending", "correction", "approved"] as StatusFilter[]).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all" && "Todos"}
                  {status === "pending" && "Pendentes"}
                  {status === "correction" && "Correção"}
                  {status === "approved" && "Aprovados"}
                </Button>
              ))}
            </div>

            <div className="h-4 w-px bg-border" />

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="h-7 w-[130px] text-xs">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Deptos</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>
                    {departmentLabels[dept] || dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Áreas</SelectItem>
                {areas.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[150px] max-w-[250px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar curso..."
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="h-7 pl-7 text-xs"
              />
            </div>

            <div className="h-4 w-px bg-border" />

            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="h-7 w-[150px] text-xs">
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Recentes primeiro</SelectItem>
                <SelectItem value="updated_asc">Antigos primeiro</SelectItem>
                <SelectItem value="pending_first">Mais pendentes</SelectItem>
                <SelectItem value="title_asc">Título A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="h-9">
          <TabsTrigger value="pending" className="text-xs">Pendentes</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-3 flex-1 overflow-hidden">
          {validationsByCourse.size === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma validação pendente
              </CardContent>
            </Card>
          ) : (
            <Card className="flex flex-col h-[calc(100vh-300px)]">
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {Array.from(validationsByCourse.entries()).map(([courseId, { course, validations: courseValidations }]) => {
                    const isExpanded = expandedCourses.has(courseId);
                    const summary = getStatusSummary(courseValidations);
                    
                    return (
                      <Collapsible key={courseId} open={isExpanded} onOpenChange={() => toggleCourse(courseId)}>
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <CollapsibleTrigger asChild>
                            <button className="flex items-center gap-3 flex-1 text-left">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{course.title}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{course.area}</span>
                                  {course.creator && (
                                    <>
                                      <span className="text-xs text-muted-foreground/50">•</span>
                                      <span className="text-xs text-muted-foreground">
                                        por <span className="font-medium text-foreground/80">{course.creator.name}</span>
                                        {course.creator.department_name && (
                                          <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px]">
                                            {course.creator.department_name}
                                          </Badge>
                                        )}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Status mini badges */}
                            <div className="flex items-center gap-1">
                              {summary.pending > 0 && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                                  <Clock className="h-2.5 w-2.5 mr-0.5" />
                                  {summary.pending}
                                </Badge>
                              )}
                              {summary.approved > 0 && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-500/10 text-green-700 border-green-500/30">
                                  <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                                  {summary.approved}
                                </Badge>
                              )}
                              {summary.correction > 0 && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-orange-500/10 text-orange-700 border-orange-500/30">
                                  <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                                  {summary.correction}
                                </Badge>
                              )}
                            </div>
                            
                            {isAdmin && (
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePublishCourse(courseId, course.title);
                                }}
                                disabled={approveCourse.isPending}
                              >
                                <Rocket className="h-3 w-3 mr-1" />
                                Publicar
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="px-3 pb-3">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead className="h-8 text-xs">Departamento</TableHead>
                                  <TableHead className="h-8 text-xs">Status</TableHead>
                                  <TableHead className="h-8 text-xs">Data</TableHead>
                                  <TableHead className="h-8 text-xs w-[80px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {courseValidations.map((validation) => {
                                  const StatusIcon = statusIcons[validation.status];
                                  return (
                                    <TableRow key={validation.id} className="hover:bg-muted/30">
                                      <TableCell className="py-2 text-sm">
                                        {departmentLabels[validation.departments.name] || validation.departments.name}
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[validation.status]}`}>
                                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                                          {statusLabels[validation.status]}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-2 text-xs text-muted-foreground">
                                        {format(new Date(validation.submission_date), "dd/MM/yy", { locale: ptBR })}
                                      </TableCell>
                                      <TableCell className="py-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={() => {
                                            setSelectedValidation(validation);
                                            setModalOpen(true);
                                          }}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-3">
          <Card>
            <ScrollArea className="max-h-[calc(100vh-320px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Curso</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validations?.map((validation) => {
                    const StatusIcon = statusIcons[validation.status];
                    return (
                      <TableRow key={validation.id}>
                        <TableCell className="py-2">
                          <div>
                            <p className="text-sm font-medium truncate max-w-[200px]">{validation.courses.title}</p>
                            <p className="text-xs text-muted-foreground">{validation.courses.area}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-sm">
                          {departmentLabels[validation.departments.name] || validation.departments.name}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[validation.status]}`}>
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />
                            {statusLabels[validation.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground">
                          {format(new Date(validation.submission_date), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="py-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setSelectedValidation(validation);
                              setModalOpen(true);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-3 flex-1 overflow-hidden">
          <Card className="flex flex-col h-[calc(100vh-300px)]">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Curso</TableHead>
                    <TableHead className="text-xs">Departamento</TableHead>
                    <TableHead className="text-xs">Alteração</TableHead>
                    <TableHead className="text-xs">Data/Hora</TableHead>
                    <TableHead className="text-xs">Responsável</TableHead>
                    <TableHead className="text-xs">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationHistory?.map((history: any) => {
                    const StatusIcon = statusIcons[history.new_status as keyof typeof statusIcons];
                    return (
                      <TableRow key={history.id}>
                        <TableCell className="py-2">
                          <div className="max-w-[180px]">
                            <p className="text-sm font-medium truncate">{history.course_title || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{history.course_area || ""}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {departmentLabels[history.department_name as keyof typeof departmentLabels] || history.department_name || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[history.previous_status as keyof typeof statusColors] || ""}`}>
                              {statusLabels[history.previous_status as keyof typeof statusLabels] || "—"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">→</span>
                            <Badge variant="outline" className={`text-[10px] h-5 ${statusColors[history.new_status as keyof typeof statusColors]}`}>
                              {StatusIcon && <StatusIcon className="h-2.5 w-2.5 mr-0.5" />}
                              {statusLabels[history.new_status as keyof typeof statusLabels]}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(history.change_date), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="py-2">
                          <span className="text-xs font-medium">{history.changed_by_name || "Sistema"}</span>
                        </TableCell>
                        <TableCell className="py-2 text-xs text-muted-foreground max-w-[200px]">
                          <p className="truncate" title={history.comments || ""}>
                            {history.comments || "—"}
                          </p>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedValidation && (
        <ValidationReviewModalEnhanced
          validation={selectedValidation}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedValidation(null);
          }}
          onReview={handleReview}
          isSubmitting={reviewValidation.isPending}
          isAdmin={isAdmin}
        />
      )}

      {publishingCourseInfo && (
        <CoursePublishModal
          open={publishModalOpen}
          onClose={() => {
            setPublishModalOpen(false);
            setPublishingCourseInfo(null);
          }}
          courseTitle={publishingCourseInfo.title}
          onConfirm={confirmPublish}
          isSubmitting={approveCourse.isPending}
        />
      )}
    </div>
  );
};

export default Validations;
