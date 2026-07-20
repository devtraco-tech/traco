import { useState } from "react";
import { useProfiles } from "@/hooks/useProfiles";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserEditDialog } from "@/components/user/UserEditDialog";
import { CreateUserModal } from "@/components/user/CreateUserModal";
import { Profile } from "@/hooks/useProfiles";
import { Search, Edit, Key, UserPlus, Filter, Shield, BriefcaseMedical, LogIn, Loader2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

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

const Users = () => {
  const navigate = useNavigate();
  const { isAdmin, isTriageCoordenador, isLoading: roleLoading } = useUserRole();
  const { profiles, isLoading: profilesLoading, error: profilesError } = useProfiles();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [systemFilter, setSystemFilter] = useState<"all" | "course" | "triage">("all");
  const [impersonateTarget, setImpersonateTarget] = useState<Profile | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const { toast } = useToast();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: deleteTarget.id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Usuário removido", description: `${deleteTarget.name} foi removido permanentemente.` });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Erro ao remover usuário", description: err.message || "Tente novamente", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };


  // Redireciona se não tiver nível de gestão
  if (!roleLoading && !isAdmin && !isTriageCoordenador) {
    navigate("/dashboard");
    return null;
  }

  const handleImpersonate = async () => {
    if (!impersonateTarget) return;
    setIsImpersonating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-impersonate-user", {
        body: {
          target_user_id: impersonateTarget.id,
          redirect_to: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
      if (!data?.action_link) throw new Error("Link não retornado");

      toast({
        title: "Entrando como " + impersonateTarget.name,
        description: "Você será deslogado e logado na conta do usuário.",
      });

      // Desloga sessão atual e abre o magic link na mesma aba
      await signOut();
      window.location.href = data.action_link;
    } catch (err: any) {
      console.error("Impersonate error:", err);
      toast({
        title: "Erro ao entrar como usuário",
        description: err.message || "Tente novamente",
        variant: "destructive",
      });
      setIsImpersonating(false);
      setImpersonateTarget(null);
    }
  };

  if (profilesError) {
    console.error("Profiles error:", profilesError);
  }

  const filteredProfiles = profiles?.filter((profile) => {
    if (!profile) return false;
    const nameStr = profile.name || "";
    const emailStr = profile.email || "";
    const matchesSearch = 
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      emailStr.toLowerCase().includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (systemFilter === "course") {
      return !!profile.department_id || profile.user_roles?.some(r => ["staff", "admin"].includes(r.role));
    }
    if (systemFilter === "triage") {
      return !!profile.triage_specialty_id || profile.user_roles?.some(r => r.role.startsWith("triage_"));
    }
    
    return true;
  });

  const handleEditUser = (profile: Profile) => {
    setSelectedUser(profile);
    setIsEditModalOpen(true);
  };

  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    switch (role) {
      case "admin": return <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-0">Admin</Badge>;
      case "coordenador": return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0">Coordenador</Badge>;
      case "clinica": return <Badge className="bg-sky-600 hover:bg-sky-700 text-white border-0">Clínica</Badge>;
      case "recepcao": return <Badge className="bg-teal-600 hover:bg-teal-700 text-white border-0">Recepção</Badge>;
      case "staff": return <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-0">Staff</Badge>;
      case "teacher": return <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-0">Professor</Badge>;
      case "student": return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white border-0">Estudante</Badge>;
      case "triage_dentista": return <Badge className="bg-sky-600 hover:bg-sky-700 text-white border-0 opacity-50">Dentista</Badge>;
      case "triage_atendente": return <Badge className="bg-teal-600 hover:bg-teal-700 text-white border-0 opacity-50">Atendente</Badge>;
      case "triage_coordenador": return <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 opacity-50">Coord. Triagem</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{role}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold">
            Gerenciamento de Usuários
          </CardTitle>
          <Button onClick={() => setIsCreateUserModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Usuário
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-md">
              <Button 
                variant={systemFilter === "all" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setSystemFilter("all")}
                className="text-xs h-8"
              >
                Todos
              </Button>
              <Button 
                variant={systemFilter === "course" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setSystemFilter("course")}
                className="text-xs h-8"
              >
                Cursos
              </Button>
              <Button 
                variant={systemFilter === "triage" ? "default" : "ghost"} 
                size="sm" 
                onClick={() => setSystemFilter("triage")}
                className="text-xs h-8"
              >
                Triagem
              </Button>
            </div>
          </div>

          {profilesError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
              Erro ao carregar usuários: {(profilesError as any).message || "Erro desconhecido"}
            </div>
          )}

          {profilesLoading ? (
            <div className="text-center py-8 text-muted-foreground animate-pulse">
              Carregando base de usuários...
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="p-2 bg-muted border-b text-[10px] text-muted-foreground flex justify-between">
                <span>Total na base: {profiles?.length || 0}</span>
                <span>Filtrados: {filteredProfiles?.length || 0}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-bold">Nome / Email</TableHead>
                    <TableHead>Papéis</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles && filteredProfiles.length > 0 ? (
                    filteredProfiles.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{profile.name}</span>
                            <span className="text-xs text-muted-foreground">{profile.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {profile.user_roles && profile.user_roles.length > 0 ? (
                              profile.user_roles.map((ur, idx) => (
                                <div key={idx}>{getRoleBadge(ur.role)}</div>
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Sem papel</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {profile.specialty?.name ? (
                            <div className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-100">
                              <BriefcaseMedical size={10} /> {profile.specialty.name}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {profile.department?.name ? (
                            <Badge variant="outline" className="text-[10px] font-normal italic">
                              {profile.department.name}
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Nenhum</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setImpersonateTarget(profile)}
                              className="bg-card hover:bg-muted border-border"
                              title="Entrar como este usuário"
                            >
                              <LogIn className="h-4 w-4 mr-2 text-primary" />
                              Logar como
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(profile)}
                              className="bg-card hover:bg-muted border-border"
                            >
                              <Edit className="h-4 w-4 mr-2 text-primary" />
                              Gerenciar
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget(profile)}
                                className="bg-card hover:bg-destructive/10 border-border"
                                title="Remover usuário"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Nenhum usuário encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserEditDialog
        user={selectedUser}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
      />

      <CreateUserModal
        open={isCreateUserModalOpen}
        onClose={() => setIsCreateUserModalOpen(false)}
      />

      <AlertDialog open={!!impersonateTarget} onOpenChange={(o) => !o && !isImpersonating && setImpersonateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Entrar como {impersonateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será deslogado da sua conta de admin e logado como{" "}
              <strong>{impersonateTarget?.email}</strong>. Para voltar à sua conta,
              faça logout e entre novamente com seu email/senha de admin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isImpersonating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImpersonate} disabled={isImpersonating}>
              {isImpersonating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando link...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Confirmar e entrar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente</strong> e não pode ser desfeita. O usuário{" "}
              <strong>{deleteTarget?.email}</strong> perderá o acesso e será removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDeleteUser(); }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removendo...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Confirmar remoção</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
};

export default Users;
