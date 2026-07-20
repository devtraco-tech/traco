import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, BookOpen } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Registrations = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const { courses, isLoading } = useCourses();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Filter only approved and not archived courses
  const activeCourses = courses?.filter(
    (course) => course.status === "approved" && !course.is_archived
  ) || [];

  const filteredCourses = activeCourses.filter((course) =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.area?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const updateVacanciesMutation = useMutation({
    mutationFn: async ({ courseId, newVacancies }: { courseId: string; newVacancies: number }) => {
      if (newVacancies < 0) {
        throw new Error("Número de vagas não pode ser negativo");
      }

      const { error } = await supabase
        .from("courses")
        .update({ vacancies: newVacancies })
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Sucesso",
        description: "Número de vagas atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar vagas",
        variant: "destructive",
      });
    },
  });

  const updateDisplayStatusMutation = useMutation({
    mutationFn: async ({ courseId, displayStatus }: { courseId: string; displayStatus: string | null }) => {
      const { error } = await supabase
        .from("courses")
        .update({ display_status: displayStatus })
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({
        title: "Sucesso",
        description: "Status de exibição atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const handleIncreaseVacancies = (courseId: string, currentVacancies: number) => {
    updateVacanciesMutation.mutate({
      courseId,
      newVacancies: currentVacancies + 1,
    });
  };

  const handleDecreaseVacancies = (courseId: string, currentVacancies: number) => {
    if (currentVacancies > 0) {
      updateVacanciesMutation.mutate({
        courseId,
        newVacancies: currentVacancies - 1,
      });
    }
  };

  const getDisplayStatusLabel = (status: string | null) => {
    switch (status) {
      case "open": return "Aberto";
      case "immediate_start": return "Início Imediato";
      case "waiting_list": return "Lista de Espera";
      case "full": return "Lotado";
      default: return "Automático";
    }
  };

  const getDisplayStatusBadge = (status: string | null) => {
    switch (status) {
      case "open": return <Badge className="bg-blue-500">Aberto</Badge>;
      case "immediate_start": return <Badge className="bg-green-500 animate-pulse">Início Imediato</Badge>;
      case "waiting_list": return <Badge className="bg-yellow-500">Lista de Espera</Badge>;
      case "full": return <Badge variant="destructive">Lotado</Badge>;
      default: return <Badge variant="outline">Automático</Badge>;
    }
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Carregando cursos ativos...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Vagas</h1>
          <p className="text-muted-foreground">Controle as vagas disponíveis dos cursos ativos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do curso ou área..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredCourses.length} curso(s) encontrado(s)</span>
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredCourses.map((course) => (
          <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                {/* Course Photo */}
                <div className="md:col-span-1">
                  {course.photo_1_url ? (
                    <img
                      src={course.photo_1_url}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-lg shadow-md"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="md:col-span-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{course.title}</h3>
                    <p className="text-sm text-muted-foreground">{course.area}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Modalidade</p>
                    <Badge className="mt-1 capitalize">
                      {course.modality === "presencial" ? "Presencial" :
                       course.modality === "online" ? "Online" : "Híbrido"}
                    </Badge>
                  </div>
                </div>

                {/* Course Details */}
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Público-alvo</p>
                    <p className="font-medium capitalize text-sm">{course.target_audience?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Carga Horária</p>
                    <p className="font-medium">{course.workload}h</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Investimento</p>
                    <p className="font-medium">R$ {course.investment?.toLocaleString("pt-BR")}</p>
                  </div>
                </div>

                {/* Vacancies & Status Control */}
                <div className="md:col-span-1 flex flex-col items-center justify-center space-y-4 md:border-l md:pl-6">
                  <div className="text-center w-full">
                    <p className="text-sm text-muted-foreground mb-2">Vagas Disponíveis</p>
                    <Input
                      type="number"
                      min={0}
                      value={course.vacancies}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 0) {
                          updateVacanciesMutation.mutate({ courseId: course.id, newVacancies: val });
                        }
                      }}
                      className="text-4xl font-bold text-primary text-center w-24 h-14 mx-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {course.vacancies === 0 && (
                      <Badge variant="destructive" className="mt-2">Curso Lotado</Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2 w-full">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handleDecreaseVacancies(course.id, course.vacancies)}
                      disabled={course.vacancies <= 0 || updateVacanciesMutation.isPending}
                      className="flex-1"
                    >
                      <Minus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => handleIncreaseVacancies(course.id, course.vacancies)}
                      disabled={updateVacanciesMutation.isPending}
                      className="flex-1"
                    >
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="w-full pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2 text-center">Status de Exibição</p>
                    <Select
                      value={course.display_status || "auto"}
                      onValueChange={(value) => {
                        updateDisplayStatusMutation.mutate({
                          courseId: course.id,
                          displayStatus: value === "auto" ? null : value,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">🔄 Automático (pela data)</SelectItem>
                        <SelectItem value="open">🔵 Aberto</SelectItem>
                        <SelectItem value="immediate_start">🟢 Início Imediato</SelectItem>
                        <SelectItem value="waiting_list">🟡 Lista de Espera</SelectItem>
                        <SelectItem value="full">🔴 Lotado</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="mt-2 flex justify-center">
                      {getDisplayStatusBadge(course.display_status)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            {activeCourses.length === 0
              ? "Nenhum curso ativo encontrado"
              : "Nenhum curso encontrado com os filtros aplicados"}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Registrations;
