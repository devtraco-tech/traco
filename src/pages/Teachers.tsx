import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTeachers, Teacher } from "@/hooks/useTeachers";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TeacherFormModal } from "@/components/teacher/TeacherFormModal";
import { TeacherPhoto } from "@/components/teacher/TeacherPhoto";
import { UserPlus, Edit, Eye, Power, Search } from "lucide-react";

const Teachers = () => {
  const navigate = useNavigate();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { teachers, isLoading, createTeacher, updateTeacher, toggleTeacherStatus } = useTeachers(includeInactive);

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  // Get unique specialties for filter
  const allSpecialties = teachers
    ?.flatMap((t) => t.specialties || [])
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort() || [];

  // Filter teachers
  const filteredTeachers = teachers?.filter((teacher) => {
    const matchesSearch = teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.cro?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecialty = !selectedSpecialty || 
      teacher.specialties?.includes(selectedSpecialty);

    return matchesSearch && matchesSpecialty;
  });

  const handleCreateOrUpdate = (data: Omit<Teacher, "id" | "created_at" | "updated_at">) => {
    if (selectedTeacher) {
      updateTeacher.mutate(
        { id: selectedTeacher.id, ...data },
        {
          onSuccess: () => {
            setModalOpen(false);
            setSelectedTeacher(null);
          },
        }
      );
    } else {
      createTeacher.mutate(data, {
        onSuccess: () => {
          setModalOpen(false);
          setSelectedTeacher(null);
        },
      });
    }
  };

  const handleToggleStatus = (teacher: Teacher) => {
    toggleTeacherStatus.mutate({
      id: teacher.id,
      is_active: !teacher.is_active,
    });
  };

  if (isLoading) {
    return <div className="container mx-auto p-6">Carregando...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Professores</h1>
          <p className="text-muted-foreground">Gerencie os professores do sistema</p>
        </div>
        <Button
          onClick={() => {
            setSelectedTeacher(null);
            setModalOpen(true);
          }}
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Professor
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CRO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="">Todas as Especialidades</option>
                {allSpecialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="include-inactive"
                checked={includeInactive}
                onCheckedChange={setIncludeInactive}
              />
              <Label htmlFor="include-inactive">Incluir inativos</Label>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {filteredTeachers?.length || 0} professor(es) encontrado(s)
            </span>
            {(searchTerm || selectedSpecialty) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedSpecialty("");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeachers?.map((teacher) => (
          <Card key={teacher.id} className={!teacher.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <TeacherPhoto
                    photoUrl={teacher.photo_url}
                    name={teacher.name}
                    size="sm"
                  />
                  <div>
                    <CardTitle className="text-lg">{teacher.name}</CardTitle>
                    {teacher.cro && (
                      <p className="text-sm text-muted-foreground">CRO: {teacher.cro}</p>
                    )}
                  </div>
                </div>
                <Badge variant={teacher.is_active ? "default" : "secondary"}>
                  {teacher.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {teacher.email && (
                <p className="text-sm text-muted-foreground">{teacher.email}</p>
              )}
              {teacher.phone && (
                <p className="text-sm text-muted-foreground">{teacher.phone}</p>
              )}
              
              {teacher.specialties && teacher.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {teacher.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline" className="text-xs">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              )}

              {teacher.bio && (
                <p className="text-sm line-clamp-2">{teacher.bio}</p>
              )}

              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTeacher(teacher);
                        setModalOpen(true);
                      }}
                    >
                      <Edit className="mr-1 h-3 w-3" />
                      Editar
                    </Button>
                    <Button
                      variant={teacher.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(teacher)}
                    >
                      <Power className="mr-1 h-3 w-3" />
                      {teacher.is_active ? "Desativar" : "Ativar"}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTeachers?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum professor encontrado
          </CardContent>
        </Card>
      )}

      <TeacherFormModal
        teacher={selectedTeacher}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedTeacher(null);
        }}
        onSubmit={handleCreateOrUpdate}
        isSubmitting={createTeacher.isPending || updateTeacher.isPending}
      />
    </div>
  );
};

export default Teachers;
