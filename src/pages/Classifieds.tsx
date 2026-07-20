import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClassifieds, useDeleteClassified, type Classified } from "@/hooks/useClassifieds";
import { useUserRole } from "@/hooks/useUserRole";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ClassifiedApprovalModal } from "@/components/classified/ClassifiedApprovalModal";
import { ArrowLeft, Plus, Search, Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Classifieds = () => {
  const navigate = useNavigate();
  const { data: classifieds, isLoading, isError, error } = useClassifieds();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const deleteClassified = useDeleteClassified();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classifiedToDelete, setClassifiedToDelete] = useState<string | null>(null);
  const [classifiedToReview, setClassifiedToReview] = useState<Classified | null>(null);

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: <Badge variant="secondary">Rascunho</Badge>,
      pending_approval: <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pendente</Badge>,
      approved: <Badge variant="default" className="bg-green-600">Aprovado</Badge>,
      rejected: <Badge variant="destructive">Rejeitado</Badge>,
    };
    return variants[status as keyof typeof variants] || <Badge>{status}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      vaga: "Vaga",
      produto: "Produto",
      servico: "Serviço",
      outros: "Outros",
    };
    return labels[category] || category;
  };

  const filteredClassifieds = classifieds?.filter((classified) => {
    const matchesSearch = classified.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         classified.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || classified.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || classified.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleDelete = () => {
    if (classifiedToDelete) {
      deleteClassified.mutate(classifiedToDelete);
      setClassifiedToDelete(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Classificados</h1>
            <p className="text-muted-foreground">Anúncios de vagas, produtos e serviços</p>
          </div>
        </div>
        <Button onClick={() => navigate("/classifieds/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Classificado
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Classificados</CardTitle>
          <CardDescription>
            Visualize e gerencie os classificados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar classificados..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vaga">Vaga</SelectItem>
                <SelectItem value="produto">Produto</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending_approval">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando classificados...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">
              <p>Erro ao carregar classificados</p>
              <p className="text-sm mt-2">{error?.message}</p>
            </div>
          ) : !filteredClassifieds?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum classificado encontrado</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/classifieds/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Classificado
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredClassifieds.map((classified) => (
                <Card key={classified.id} className="overflow-hidden">
                  {classified.photo_1_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={classified.photo_1_url}
                        alt={classified.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-1">{classified.title}</CardTitle>
                      {getStatusBadge(classified.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{getCategoryLabel(classified.category)}</Badge>
                      {classified.price && (
                        <span className="text-sm font-semibold text-primary">
                          R$ {classified.price.toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {classified.description}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/classifieds/${classified.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/classifieds/${classified.id}/edit`)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      {isAdmin && (
                        <>
                          {classified.status === "pending_approval" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setClassifiedToReview(classified)}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Revisar
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setClassifiedToDelete(classified.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!classifiedToDelete} onOpenChange={() => setClassifiedToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este classificado? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {classifiedToReview && (
        <ClassifiedApprovalModal
          classified={classifiedToReview}
          open={!!classifiedToReview}
          onClose={() => setClassifiedToReview(null)}
        />
      )}
    </div>
  );
};

export default Classifieds;
