import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, Search, Users } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { usePromotionalTeams, PromotionalTeam } from "@/hooks/usePromotionalTeams";
import { PromotionalTeamFormModal } from "@/components/team/PromotionalTeamFormModal";
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

const PromotionalTeams = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<PromotionalTeam | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);

  const {
    promotionalTeams,
    isLoading,
    createPromotionalTeam,
    updatePromotionalTeam,
    deletePromotionalTeam,
  } = usePromotionalTeams();

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const filteredTeams = promotionalTeams?.filter((team) =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateNew = () => {
    setSelectedTeam(null);
    setModalOpen(true);
  };

  const handleEdit = (team: PromotionalTeam) => {
    setSelectedTeam(team);
    setModalOpen(true);
  };

  const handleDelete = (teamId: string) => {
    setTeamToDelete(teamId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (teamToDelete) {
      deletePromotionalTeam.mutate(teamToDelete);
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    }
  };

  const handleSubmit = (teamData: Omit<PromotionalTeam, "id" | "created_at" | "updated_at">) => {
    if (selectedTeam) {
      updatePromotionalTeam.mutate({ id: selectedTeam.id, ...teamData });
    } else {
      createPromotionalTeam.mutate(teamData);
    }
    setModalOpen(false);
  };

  if (isLoading) {
    return <div className="p-8">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Equipes Promotoras
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie as equipes responsáveis pela promoção dos cursos
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Equipe
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Equipes</CardTitle>
          <CardDescription>
            Encontre equipes pelo nome ou descrição
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Digite o nome da equipe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeams?.map((team) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  {team.name}
                </span>
              </CardTitle>
              {team.description && (
                <CardDescription className="line-clamp-2">
                  {team.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-2">
              {team.contact_person && (
                <div className="text-sm">
                  <span className="font-medium">Responsável:</span>{" "}
                  {team.contact_person}
                </div>
              )}
              {team.email && (
                <div className="text-sm">
                  <span className="font-medium">E-mail:</span>{" "}
                  <a href={`mailto:${team.email}`} className="text-primary hover:underline">
                    {team.email}
                  </a>
                </div>
              )}
              {team.phone && (
                <div className="text-sm">
                  <span className="font-medium">Telefone:</span> {team.phone}
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(team)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDelete(team.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeams && filteredTeams.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm
                ? "Nenhuma equipe encontrada com esses critérios"
                : "Nenhuma equipe cadastrada ainda"}
            </p>
            {!searchTerm && (
              <Button onClick={handleCreateNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeira Equipe
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <PromotionalTeamFormModal
        team={selectedTeam}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={createPromotionalTeam.isPending || updatePromotionalTeam.isPending}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PromotionalTeams;
