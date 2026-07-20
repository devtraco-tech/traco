import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClassified } from "@/hooks/useClassifieds";
import { useUserRole } from "@/hooks/useUserRole";
import { ClassifiedLogs } from "@/components/classified/ClassifiedLogs";
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar } from "lucide-react";

const ClassifiedDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { data: classified, isLoading } = useClassified(id);

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      vaga: "Vaga",
      produto: "Produto",
      servico: "Serviço",
      outros: "Outros",
    };
    return labels[category] || category;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: <Badge variant="secondary">Rascunho</Badge>,
      pending_approval: <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pendente</Badge>,
      approved: <Badge variant="default" className="bg-green-600">Aprovado</Badge>,
      rejected: <Badge variant="destructive">Rejeitado</Badge>,
    };
    return variants[status as keyof typeof variants] || <Badge>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Carregando...</div>
      </div>
    );
  }

  if (!classified) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">Classificado não encontrado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/classifieds")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{classified.title}</h1>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">{getCategoryLabel(classified.category)}</Badge>
              {getStatusBadge(classified.status)}
            </div>
          </div>
        </div>
        {(isAdmin || classified.created_by) && (
          <Button onClick={() => navigate(`/classifieds/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>

      {(classified.photo_1_url || classified.photo_2_url || classified.photo_3_url) && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {classified.photo_1_url && (
                <img
                  src={classified.photo_1_url}
                  alt="Foto 1"
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              {classified.photo_2_url && (
                <img
                  src={classified.photo_2_url}
                  alt="Foto 2"
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
              {classified.photo_3_url && (
                <img
                  src={classified.photo_3_url}
                  alt="Foto 3"
                  className="w-full h-64 object-cover rounded-lg"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{classified.description}</p>
            </CardContent>
          </Card>

          {classified.review_notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notas de Revisão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{classified.review_notes}</p>
                {classified.reviewed_at && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Revisado em: {new Date(classified.reviewed_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {classified.price && (
            <Card>
              <CardHeader>
                <CardTitle>Preço</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">
                  R$ {classified.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
              <CardDescription>Entre em contato para mais detalhes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="font-semibold">{classified.contact_name}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${classified.contact_email}`} className="text-primary hover:underline">
                  {classified.contact_email}
                </a>
              </div>
              {classified.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${classified.contact_phone}`} className="text-primary hover:underline">
                    {classified.contact_phone}
                  </a>
                </div>
              )}
              {classified.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{classified.location}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Publicado em: {new Date(classified.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {classified.expires_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Expira em: {new Date(classified.expires_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {(isAdmin || classified.created_by) && (
        <ClassifiedLogs classifiedId={classified.id} />
      )}
    </div>
  );
};

export default ClassifiedDetails;
