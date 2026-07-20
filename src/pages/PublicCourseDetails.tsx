import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEOHead } from "@/components/seo/SEOHead";
import GoogleTagManager from "@/components/seo/GoogleTagManager";
import FacebookPixel from "@/components/seo/FacebookPixel";
import { CourseStructuredData } from "@/components/seo/CourseStructuredData";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  GraduationCap,
  User,
  Phone,
  Mail,
  ArrowLeft,
  CheckCircle,
  Globe,
  CreditCard,
} from "lucide-react";
import { format, isAfter, isEqual, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/utils";

// Check if course start date is today or in the past (immediate start)
const isImmediateStart = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  const startDate = parseLocalDate(dateStr);
  if (!startDate) return false;
  const today = startOfDay(new Date());
  return isEqual(startDate, today) || isAfter(today, startDate);
};

// Get the resolved display status: manual override > auto-calculated from date
const getResolvedDisplayStatus = (course: any): "open" | "immediate_start" | "waiting_list" | "full" | null => {
  if (course.display_status) return course.display_status;
  if (course.vacancies === 0) return "full";
  if (!course.effective_start_date) return null;
  const startDate = parseLocalDate(course.effective_start_date);
  if (!startDate) return null;
  const today = startOfDay(new Date());
  if (isAfter(startDate, today)) return "open";
  const threeMonthsAgo = new Date(today);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  if (startDate > threeMonthsAgo) return "immediate_start";
  return "waiting_list";
};
const PublicCourseDetails = () => {
  const { slug } = useParams<{
    slug: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const {
    data: course,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-course", slug],
    queryFn: async () => {
      // Try to find by slug first, then by id
      let query = supabase
        .from("courses")
        .select(
          `
          *,
          teachers (
            id,
            name,
            bio,
            photo_url,
            email,
            phone,
            cro,
            specialties
          ),
          promotional_teams (
            id,
            name,
            contact_person,
            email,
            phone
          )
        `,
        )
        .in("status", ["approved", "in_progress"]);

      // Check if slug looks like a UUID
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug || "");
      if (isUUID) {
        query = query.eq("id", slug);
      } else {
        query = query.eq("slug", slug);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // International phone - allow + prefix and digits only
  const formatPhone = (value: string) => {
    // Keep only digits and leading +
    const cleaned = value.replace(/[^\d+]/g, "");
    // Ensure + only at the start
    if (cleaned.startsWith("+")) {
      return "+" + cleaned.slice(1).replace(/\+/g, "");
    }
    return cleaned.replace(/\+/g, "");
  };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.length <= 20) {
      setFormData((prev) => ({
        ...prev,
        phone: formatted,
      }));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setIsSubmitting(true);
    try {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      if (phoneDigits.length < 8) {
        toast({
          title: "Telefone inválido",
          description: "Informe um número de telefone com pelo menos 8 dígitos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      const { error } = await supabase.functions.invoke("wordpress-courses", {
        method: "POST",
        body: {
          course_id: course.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpf: null,
          notes: null,
        },
      });
      if (error) throw error;
      
      // Track Facebook Pixel Lead event (client-side)
      if (window.fbq) {
        window.fbq('track', 'Lead', {
          content_name: course.title,
          content_category: course.area,
          currency: course.currency === 'dolar' ? 'USD' : 'BRL',
          value: course.investment,
        });
      }

      // Track Facebook CAPI Lead event (server-side)
      supabase.functions.invoke('fb-capi-event', {
        body: {
          event_name: 'Lead',
          event_source_url: window.location.href,
          user_data: {
            em: formData.email ? [formData.email.toLowerCase().trim()] : undefined,
            ph: formData.phone ? [formData.phone.replace(/\D/g, '')] : undefined,
            fn: formData.name ? [formData.name.split(' ')[0].toLowerCase().trim()] : undefined,
            ln: formData.name?.split(' ').length > 1 ? [formData.name.split(' ').slice(-1)[0].toLowerCase().trim()] : undefined,
          },
          custom_data: {
            content_name: course.title,
            content_category: course.area,
            currency: course.currency === 'dolar' ? 'USD' : 'BRL',
            value: course.investment,
          },
        },
      }).catch(err => console.warn('FB CAPI error:', err));

      // Redirect to thank you page
      const params = new URLSearchParams({
        name: formData.name,
        course: course.title,
      });
      navigate(`/obrigado?${params.toString()}`);
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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
  const getModalityLabel = (modality: string) => {
    switch (modality) {
      case "Especialização":
        return "Especialização";
      case "Imersão":
        return "Imersão";
      case "Aperfeiçoamento":
        return "Aperfeiçoamento";
      case "presencial":
        return "Presencial";
      case "online":
        return "Online";
      case "hibrido":
        return "Híbrido";
      default:
        return modality;
    }
  };
  const getLanguageLabel = (language?: string | null) => {
    switch (language) {
      case "english":
        return "Inglês";
      case "spanish":
        return "Espanhol";
      default:
        return "Português";
    }
  };
  const pageUrl = `${window.location.origin}/curso/${slug}`;
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div>
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Curso não encontrado</h1>
          <p className="text-muted-foreground mb-4">
            O curso que você está procurando não existe ou não está disponível.
          </p>
          <Link to="/cursos">
            <Button>Ver todos os cursos</Button>
          </Link>
        </div>
      </div>
    );
  }
  const courseCurrency = (course as any).currency;
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${course.title} | ABO Goiás`}
        description={course.description?.substring(0, 160) || `Curso de ${course.area} na ABO Goiás`}
        image={course.photo_1_url}
        url={pageUrl}
        type="course"
      />
      <GoogleTagManager />
      <FacebookPixel />
      <CourseStructuredData course={course} teacher={course.teachers} url={pageUrl} />
      
      <PublicHeader />

      {/* Hero Banner */}
      <header className="relative">
        {/* Desktop Banner */}
        <div
          className="hidden md:block h-[450px] bg-cover bg-center relative"
          style={{
            backgroundImage: `url(${(course as any).banner_desktop_url || course.photo_1_url})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        {/* Mobile Banner */}
        <div
          className="md:hidden h-80 bg-cover bg-center relative"
          style={{
            backgroundImage: `url(${(course as any).banner_mobile_url || course.photo_1_url})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        <div className="container mx-auto max-w-6xl px-4 relative -mt-24 z-10">
          <a
            href="https://abogoias.org.br/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para cursos
          </a>
          <Badge variant="secondary" className="mb-6">
            {course.area}
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{course.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              {getModalityLabel(course.modality)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-primary" />
              {course.workload} horas
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-4 w-4 text-primary" />
              {getLanguageLabel(course.language)}
            </span>
            {course.vacancies === 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-red-600 font-semibold">Curso Lotado</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content Area */}
          <div className="lg:col-span-2">
            {/* Sobre o Curso */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold border-b pb-2">Sobre o Curso</h2>

              {course.description && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Descrição</h3>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{course.description}</p>
                  </div>
                </div>
              )}

              {course.differentials && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Diferenciais</h3>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{course.differentials}</p>
                  </div>
                </div>
              )}

              {course.prerequisites && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Pré-requisitos</h3>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{course.prerequisites}</p>
                  </div>
                </div>
              )}

              {/* Photo Gallery */}
              {(course.photo_2_url || course.photo_3_url || course.photo_4_url) && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Galeria</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[course.photo_2_url, course.photo_3_url, course.photo_4_url]
                      .filter(Boolean)
                      .map((photo, index) => (
                        <img
                          key={index}
                          src={photo!}
                          alt={`${course.title} - Imagem ${index + 2}`}
                          className="rounded-lg w-full h-32 object-cover"
                          loading="lazy"
                        />
                      ))}
                  </div>
                </div>
              )}
            </section>

            {/* Professor */}
            <section className="space-y-6 mt-10">
              <h2 className="text-2xl font-bold border-b pb-2">Professor</h2>

              {course.teachers ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {course.teachers.photo_url && (
                        <img
                          src={course.teachers.photo_url}
                          alt={course.teachers.name}
                          className="w-32 h-32 rounded-full object-cover mx-auto md:mx-0"
                        />
                      )}
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="text-xl font-semibold mb-1">{course.teachers.name}</h3>
                        {course.teachers.cro && (
                          <p className="text-sm text-muted-foreground mb-2">CRO: {course.teachers.cro}</p>
                        )}
                        {course.teachers.specialties && course.teachers.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3 justify-center md:justify-start">
                            {course.teachers.specialties.map((spec: string) => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {course.teachers.bio && (
                          <p className="text-muted-foreground whitespace-pre-wrap">{course.teachers.bio}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Informações do professor em breve.</p>
                </div>
              )}
            </section>

            {/* Programa */}
            <section className="space-y-6 mt-10">
              <h2 className="text-2xl font-bold border-b pb-2">Programa</h2>

              {course.program ? (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Conteúdo Programático</h3>
                  <div className="prose prose-neutral max-w-none">
                    <p className="text-muted-foreground whitespace-pre-wrap">{course.program}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Conteúdo programático em breve.</p>
                </div>
              )}

              {course.duration && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Duração</h3>
                  <p className="text-muted-foreground">{course.duration}</p>
                </div>
              )}

              {course.periodicity && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">Periodicidade</h3>
                  <p className="text-muted-foreground">{course.periodicity}</p>
                </div>
              )}
            </section>

            {/* Observações */}
            {course.observations && (
              <section className="space-y-6 mt-10">
                <h2 className="text-2xl font-bold border-b pb-2">Observações</h2>
                <div className="prose prose-neutral max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">{course.observations}</p>
                </div>
              </section>
            )}

            {/* Equipe Promotora */}
            {course.promotional_teams && (
              <section className="space-y-6 mt-10">
                <h2 className="text-2xl font-bold border-b pb-2">Equipe Promotora</h2>
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-3">{course.promotional_teams.name}</h3>
                    <div className="space-y-2 text-muted-foreground">
                      {course.promotional_teams.contact_person && (
                        <p><span className="font-medium text-foreground">Contato:</span> {course.promotional_teams.contact_person}</p>
                      )}
                      {course.promotional_teams.email && (
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <a href={`mailto:${course.promotional_teams.email}`} className="hover:underline">
                            {course.promotional_teams.email}
                          </a>
                        </p>
                      )}
                      {course.promotional_teams.phone && (
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <a href={`tel:${course.promotional_teams.phone}`} className="hover:underline">
                            {course.promotional_teams.phone}
                          </a>
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {/* Mobile Investment Card */}
            <div className="lg:hidden mt-8 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Investimento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Installment Price - Highlighted */}
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-primary">Parcelado</span>
                    </div>
                    {course.installment_suggestion ? (
                      <>
                        <p className="text-2xl font-bold text-primary">
                          {course.installment_suggestion}x de{" "}
                          {formatCurrency(course.investment / Number(course.installment_suggestion), courseCurrency)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Total: {formatCurrency(course.investment, courseCurrency)}</p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-primary">{formatCurrency(course.investment, courseCurrency)}</p>
                    )}
                  </div>

                  {(() => {
                    const resolvedStatus = getResolvedDisplayStatus(course);
                    return (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Calendar className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Data de início</p>
                          {resolvedStatus === "immediate_start" ? (
                            <p className="font-bold text-green-600 animate-pulse">Início imediato</p>
                          ) : resolvedStatus === "waiting_list" ? (
                            <p className="font-bold text-yellow-600">Lista de espera</p>
                          ) : resolvedStatus === "full" ? (
                            <p className="font-bold text-red-600">Curso Lotado</p>
                          ) : course.effective_start_date ? (
                            <p className="font-semibold">
                              {format(parseLocalDate(course.effective_start_date) || new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                          ) : (
                            <p className="font-semibold text-muted-foreground">A definir</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  {course.vacancies === 0 && (
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-red-600" />
                      <p className="font-semibold text-red-600">Curso Lotado</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Solicitar Informações</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="mobile-name">Nome completo *</Label>
                        <Input
                          id="mobile-name"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile-email">E-mail *</Label>
                        <Input
                          id="mobile-email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="mobile-phone">Telefone *</Label>
                        <Input
                          id="mobile-phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          placeholder="+55 11 99999-0000"
                          maxLength={20}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? "Enviando..." : "Solicitar Informações"}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Ao enviar, você concorda em receber contato da nossa equipe.
                      </p>
                    </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto space-y-4 scrollbar-thin">
              {/* Price Card - Compact */}
              <Card className="shadow-lg border-primary/20">
                <CardContent className="p-4 space-y-3">
                  {/* Installment Price - Highlighted */}
                  <div className="bg-primary/10 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-primary">Parcelado</span>
                    </div>
                    {course.installment_suggestion ? (
                      <>
                        <p className="text-xl font-bold text-primary">
                          {course.installment_suggestion}x de{" "}
                          {formatCurrency(course.investment / Number(course.installment_suggestion), courseCurrency)}
                        </p>
                        <p className="text-xs text-muted-foreground">Total: {formatCurrency(course.investment, courseCurrency)}</p>
                      </>
                    ) : (
                      <p className="text-xl font-bold text-primary">{formatCurrency(course.investment, courseCurrency)}</p>
                    )}
                  </div>

                  {/* Start Date & Vacancies in row */}
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    {(() => {
                      const resolvedStatus = getResolvedDisplayStatus(course);
                      return (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          {resolvedStatus === "immediate_start" ? (
                            <span className="text-xs font-bold text-green-600 animate-pulse">Início imediato</span>
                          ) : resolvedStatus === "waiting_list" ? (
                            <span className="text-xs font-bold text-yellow-600">Lista de espera</span>
                          ) : resolvedStatus === "full" ? (
                            <span className="text-xs font-bold text-red-600">Curso Lotado</span>
                          ) : course.effective_start_date ? (
                            <span className="text-xs">
                              {format(parseLocalDate(course.effective_start_date) || new Date(), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">A definir</span>
                          )}
                        </div>
                      );
                    })()}
                    {course.vacancies === 0 && (
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-bold text-red-600">Lotado</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lead Form - More prominent */}
              <Card className="shadow-xl border-2 border-primary/30 bg-gradient-to-b from-card to-primary/5">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                   Solicitar Informações
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <Label htmlFor="name" className="text-xs">Nome completo *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Seu nome"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs">E-mail *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="seu@email.com"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="text-xs">Telefone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handlePhoneChange}
                        placeholder="+55 11 99999-0000"
                        maxLength={20}
                        required
                        className="h-9 text-sm"
                      />
                    </div>
                    <Button type="submit" className="w-full h-10 font-semibold" disabled={isSubmitting}>
                      {isSubmitting ? "Enviando..." : "Solicitar Informações"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center leading-tight">
                      Ao enviar, você concorda em receber contato da nossa equipe.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </main>

      <PublicFooter />

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/5562994007391?text=${encodeURIComponent(`Olá! Tenho interesse no curso "${course.title}" e gostaria de saber mais informações.`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BA5C] text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 group"
        aria-label="Contato via WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="hidden sm:inline font-medium">Fale Conosco</span>
      </a>
    </div>
  );
};
export default PublicCourseDetails;
