import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";
import GoogleTagManager from "@/components/seo/GoogleTagManager";
import FacebookPixel from "@/components/seo/FacebookPixel";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, MapPin, Users, Search, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";

const PublicCourses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [modalityFilter, setModalityFilter] = useState<string>("all");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["public-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          id,
          title,
          slug,
          area,
          description,
          workload,
          investment,
          vacancies,
          modality,
          effective_start_date,
          photo_1_url,
          currency,
          teachers (name)
        `)
        .in("status", ["approved", "in_progress"])
        .eq("is_archived", false)
        .order("effective_start_date", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get unique areas for filters
  const areas = [...new Set(courses?.map((c) => c.area).filter(Boolean))].sort();
  
  // Fixed modalities
  const fixedModalities = [
    { value: "Especialização", label: "Especialização" },
    { value: "Imersão", label: "Imersão" },
    { value: "Aperfeiçoamento", label: "Aperfeiçoamento" },
  ];

  // Filter courses
  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesArea = areaFilter === "all" || course.area === areaFilter;
    const matchesModality = modalityFilter === "all" || course.modality === modalityFilter;

    return matchesSearch && matchesArea && matchesModality;
  });

  const getModalityLabel = (modality: string) => {
    const found = fixedModalities.find(m => m.value === modality);
    return found ? found.label : modality;
  };

  const formatCurrency = (value: number, currency?: string | null) => {
    if (currency === "dolar") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cursos | ABO Goiás - Associação Brasileira de Odontologia"
        description="Explore nossos cursos de especialização em odontologia. Formação de qualidade para cirurgiões-dentistas em Goiás."
        url={`${window.location.origin}/cursos`}
        type="website"
      />
      <GoogleTagManager />
      <FacebookPixel />

      <PublicHeader />

      {/* Hero Section */}
      <header className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nossos Cursos
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl">
            Formação de excelência em odontologia para transformar sua carreira
          </p>
        </div>
      </header>

      {/* Filters Section */}
      <section className="container mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as áreas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modalityFilter} onValueChange={setModalityFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as modalidades</SelectItem>
              {fixedModalities.map((modality) => (
                <SelectItem key={modality.value} value={modality.value}>
                  {modality.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-6">
            {filteredCourses?.length === 0 
              ? "Nenhum curso encontrado" 
              : `${filteredCourses?.length} curso${filteredCourses?.length !== 1 ? "s" : ""} encontrado${filteredCourses?.length !== 1 ? "s" : ""}`
            }
          </p>
        )}

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-6 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses?.map((course) => (
              <Link 
                key={course.id} 
                to={`/curso/${course.slug || course.id}`}
                className="group"
              >
                <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden bg-muted">
                    {course.photo_1_url ? (
                      <img
                        src={course.photo_1_url}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap className="h-16 w-16 text-muted-foreground/50" />
                      </div>
                    )}
                    <Badge className="absolute top-3 left-3" variant="secondary">
                      {course.area}
                    </Badge>
                  </div>
                  <CardHeader className="pb-2">
                    <h2 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </h2>
                    {course.teachers?.name && (
                      <p className="text-sm text-muted-foreground">
                        Prof. {course.teachers.name}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {course.workload}h
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {getModalityLabel(course.modality)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {course.vacancies} vagas
                      </span>
                    </div>
                    {course.effective_start_date && (
                      <div className="flex items-center gap-1 mt-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>
                          Início: {format(parseLocalDate(course.effective_start_date) || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-2 flex justify-between items-center border-t">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(course.investment, (course as any).currency)}
                    </span>
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredCourses?.length === 0 && (
          <div className="text-center py-16">
            <GraduationCap className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum curso encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros ou buscar por outros termos.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("");
                setAreaFilter("all");
                setModalityFilter("all");
              }}
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </section>

      <PublicFooter />
    </div>
  );
};

export default PublicCourses;
