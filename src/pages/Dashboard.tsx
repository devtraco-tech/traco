import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  GraduationCap, 
  Users, 
  FileCheck, 
  TrendingUp, 
  BookOpen, 
  CheckCircle, 
  Building2, 
  Calendar,
  ArrowRight,
  Clock,
  Sparkles,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useStats } from "@/hooks/useStats";
import { useUpcomingCourses } from "@/hooks/useUpcomingCourses";
import { useRecentValidations } from "@/hooks/useRecentValidations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";

const Dashboard = () => {
  const { user } = useAuth();
  const { stats, isLoading } = useStats();
  const { data: upcomingCourses, isLoading: isLoadingCourses } = useUpcomingCourses();
  const { data: recentValidations, isLoading: isLoadingValidations } = useRecentValidations(4);

  const dashboardStats = [
    { 
      title: "Total de Cursos", 
      value: stats?.totalCourses || 0, 
      icon: BookOpen, 
      gradient: "from-blue-500 to-blue-400",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-500"
    },
    { 
      title: "Cursos Ativos", 
      value: stats?.activeCourses || 0, 
      icon: GraduationCap, 
      gradient: "from-primary to-primary/70",
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    { 
      title: "Cursos Para Validação", 
      value: stats?.coursesForValidation || 0, 
      icon: Clock, 
      gradient: "from-orange-500 to-orange-400",
      iconBg: "bg-orange-500/10",
      iconColor: "text-orange-500"
    },
    { 
      title: "Validações Pendentes", 
      value: stats?.pendingValidations || 0, 
      icon: FileCheck, 
      gradient: "from-warning to-warning/70",
      iconBg: "bg-warning/10",
      iconColor: "text-warning"
    },
  ];

  const quickActions = [
    { label: "Novo Curso", icon: Plus, to: "/courses/new", variant: "primary" as const },
    { label: "Ver Cursos", icon: BookOpen, to: "/courses", variant: "default" as const },
    { label: "Matrículas", icon: Users, to: "/registrations", variant: "default" as const },
    { label: "Professores", icon: GraduationCap, to: "/teachers", variant: "default" as const },
    { label: "Validações", icon: CheckCircle, to: "/validations", variant: "default" as const },
    { label: "Cobrança", icon: Building2, to: "/billing-companies", variant: "default" as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/80 p-6 sm:p-8 text-primary-foreground">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium opacity-90">Painel de Controle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">
              Bem-vindo de volta!
            </h1>
            <p className="text-primary-foreground/80 text-sm sm:text-base">
              {user?.email || "Usuário"}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {dashboardStats.map((stat, index) => (
            <Card 
              key={stat.title} 
              className="group relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${stat.iconBg} transition-transform group-hover:scale-110 duration-300`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <span className="text-2xl sm:text-3xl font-bold text-foreground">
                      {stat.value}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to}>
                  <Button 
                    variant={action.variant === "primary" ? "default" : "outline"}
                    className={`w-full h-auto flex-col gap-1.5 py-3 px-2 ${
                      action.variant === "primary" 
                        ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md" 
                        : "hover:bg-accent hover:border-primary/20"
                    }`}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="text-[10px] sm:text-xs font-medium">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Upcoming Courses */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  Próximos Cursos
                </CardTitle>
                <Link to="/courses">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-primary hover:text-primary">
                    Ver todos
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingCourses ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-muted/30">
                      <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !upcomingCourses?.length ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhum curso programado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingCourses.slice(0, 4).map((course, index) => (
                    <Link key={course.id} to={`/courses/${course.id}`}>
                      <div className="group flex gap-3 p-3 rounded-xl bg-muted/30 hover:bg-accent transition-all duration-200 border border-transparent hover:border-primary/10">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {course.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {course.effective_start_date 
                                ? format(parseLocalDate(course.effective_start_date) || new Date(), "dd MMM", { locale: ptBR })
                                : "A definir"}
                            </div>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="text-xs text-muted-foreground">
                              {course.vacancies} vagas
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0 self-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Validations */}
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-warning/5 to-transparent border-b border-border/50 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-warning/10">
                    <FileCheck className="h-4 w-4 text-warning" />
                  </div>
                  Validações Recentes
                </CardTitle>
                <Link to="/validations">
                  <Button variant="ghost" size="sm" className="text-xs gap-1 h-7 text-warning hover:text-warning">
                    Ver todas
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoadingValidations ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-xl bg-muted/30">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : !recentValidations?.length ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                    <FileCheck className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Nenhuma validação encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentValidations.map((validation) => {
                    const totalDepts = validation.departments.length;
                    const allApproved = validation.approved_count === totalDepts;
                    const hasCorrection = validation.correction_count > 0;

                    const statusConfig = allApproved 
                      ? { bg: "bg-success/10", text: "text-success", border: "border-success/20", label: "Aprovado" }
                      : hasCorrection 
                        ? { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20", label: "Correção" }
                        : { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20", label: "Pendente" };

                    return (
                      <Link key={validation.course_id} to="/validations">
                        <div className="group p-3 rounded-xl bg-muted/30 hover:bg-accent transition-all duration-200 border border-transparent hover:border-primary/10">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {validation.course_title}
                            </h4>
                            <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} text-[10px] px-2 py-0.5 font-medium`}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-success to-success/80 rounded-full transition-all duration-500"
                                style={{ width: `${(validation.approved_count / totalDepts) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {validation.approved_count}/{totalDepts}
                            </span>
                          </div>

                          {/* Department pills */}
                          <div className="flex items-center gap-1 flex-wrap">
                            {validation.departments.slice(0, 5).map((dept) => {
                              const deptStatus = dept.status === "approved" 
                                ? "bg-success/20 text-success" 
                                : dept.status === "pending_correction"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-warning/20 text-warning";
                              return (
                                <span 
                                  key={dept.department_id}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${deptStatus}`}
                                >
                                  {dept.department_name.slice(0, 3).toUpperCase()}
                                </span>
                              );
                            })}
                            {validation.departments.length > 5 && (
                              <span className="text-[9px] text-muted-foreground font-medium">
                                +{validation.departments.length - 5}
                              </span>
                            )}
                          </div>

                          {/* Traço (Admin) and date */}
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                            <span className="text-[10px] text-muted-foreground">
                              {validation.course_creator ? (
                                <>
                                  <span className="font-medium text-foreground/80">{validation.course_creator.name.split(' ')[0]}</span>
                                  {validation.course_creator.department_name && (
                                    <span className="ml-1 text-muted-foreground/70">
                                      ({validation.course_creator.department_name})
                                    </span>
                                  )}
                                </>
                              ) : (
                                "—"
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(validation.last_activity), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;