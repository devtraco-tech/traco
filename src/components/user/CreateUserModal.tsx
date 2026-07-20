import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, User, Shield, BriefcaseMedical, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/auth/PasswordStrengthIndicator";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_ROLES = [
  { id: "admin", label: "Administrador", system: "geral" },
  { id: "triage_atendente", label: "Recepção", system: "triagem" },
  { id: "triage_dentista", label: "Clínica", system: "triagem" },
  { id: "triage_coordenador", label: "Coordenador", system: "cursos" },
];

export const CreateUserModal = ({ open, onClose }: CreateUserModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState("none");
  const [specialtyId, setSpecialtyId] = useState("none");
  const [restrictToOwnArea, setRestrictToOwnArea] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("patient_specialties").select("id, name").order("name");
      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  const toggleRole = (roleId: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setSelectedRoles([]);
    setDepartmentId("none");
    setSpecialtyId("none");
    setRestrictToOwnArea(false);
    setShowPassword(false);

  };

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, email e senha.", variant: "destructive" });
      return;
    }
    if (!validatePasswordStrength(password)) {
      toast({
        title: "Senha fraca",
        description: "Mínimo 8 caracteres, uma maiúscula, uma minúscula e um número.",
        variant: "destructive",
      });
      return;
    }
    if (selectedRoles.length === 0) {
      toast({ title: "Selecione ao menos um papel", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const primaryRole = selectedRoles[0];
      const body: Record<string, string> = {
        email: email.trim(),
        password,
        name: name.trim(),
        role: primaryRole,
      };
      if (departmentId && departmentId !== "none") body.department_id = departmentId;

      const response = await supabase.functions.invoke("admin-create-user", { body });
      if (response.error) throw new Error(response.error.message || "Erro ao criar usuário");
      if (response.data?.error) throw new Error(response.data.error);

      const newUserId: string | undefined = response.data?.user?.id || response.data?.userId || response.data?.id;

      // Insert additional roles (beyond the primary one already added by the edge function)
      if (newUserId && selectedRoles.length > 1) {
        const extra = selectedRoles.slice(1).map((role) => ({ user_id: newUserId, role }));
        await (supabase as any).from("user_roles").insert(extra);
      }

      // Update specialty for triage coordinator
      if (newUserId && selectedRoles.includes("coordenador") && specialtyId !== "none") {
        await (supabase as any).from("profiles").update({ triage_specialty_id: specialtyId }).eq("id", newUserId);
      }

      // Escopo de visualização (restringir à própria área)
      if (newUserId && restrictToOwnArea) {
        await (supabase as any).from("profiles").update({ restrict_to_own_area: true }).eq("id", newUserId);
      }


      toast({ title: "Usuário criado", description: `${name} foi criado com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      resetForm();
      onClose();
    } catch (error: any) {
      toast({ title: "Erro ao criar usuário", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-muted border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="h-5 w-5" /> Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>Defina dados, papéis (cursos + triagem) e departamento.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <div className="px-6 border-b bg-card">
            <TabsList className="bg-transparent h-12 w-full justify-start gap-4">
              <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full flex gap-2">
                <User size={16} /> Dados
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full flex gap-2">
                <Shield size={16} /> Permissões
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 max-h-[500px] overflow-y-auto">
            <TabsContent value="profile" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do usuário" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </div>
                <PasswordStrengthIndicator password={password} />
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="mt-0 h-full">
              <Tabs defaultValue="geral" className="w-full flex h-full gap-4">
                <TabsList className="flex flex-col h-auto w-48 justify-start items-stretch bg-muted/50 p-2 rounded-lg gap-1 border">
                  <TabsTrigger value="geral" className="justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <Shield size={16} /> Geral
                  </TabsTrigger>
                  <TabsTrigger value="triagem" className="justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <BriefcaseMedical size={16} /> Triagem
                  </TabsTrigger>
                  <TabsTrigger value="cursos" className="justify-start gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    <GraduationCap size={16} /> Cursos
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 min-h-[300px]">
                  <TabsContent value="geral" className="mt-0 space-y-4">
                    <div className="flex items-center gap-2 font-bold mb-3 pb-2 border-b">
                      <Shield size={16} className="text-orange-500" /> Permissões de Acesso Geral
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {AVAILABLE_ROLES.filter((r) => r.system === "geral").map((r) => (
                        <label key={r.id} className="flex items-center space-x-2 p-3 rounded-lg border bg-muted cursor-pointer hover:border-primary/50 transition-colors">
                          <Checkbox checked={selectedRoles.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                          <span className="text-sm font-medium">{r.label}</span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2 font-bold">
                        <Shield size={16} className="text-purple-500" /> Escopo de Visualização
                      </div>
                      <label className="flex items-start gap-3 p-3 rounded-lg border bg-purple-50/40 cursor-pointer hover:border-purple-300 transition-colors">
                        <Checkbox checked={restrictToOwnArea} onCheckedChange={(v) => setRestrictToOwnArea(Boolean(v))} />
                        <div>
                          <p className="text-sm font-medium">Restringir à própria área/curso</p>
                          <p className="text-xs text-muted-foreground">O usuário verá apenas pacientes/dados da sua especialidade de triagem e do seu departamento.</p>
                        </div>
                      </label>
                    </div>
                  </TabsContent>


                  <TabsContent value="triagem" className="mt-0 space-y-4">
                    <div className="flex items-center gap-2 font-bold mb-3 pb-2 border-b">
                      <BriefcaseMedical size={16} className="text-blue-500" /> Permissões do Módulo Triagem
                    </div>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {AVAILABLE_ROLES.filter((r) => r.system === "triagem").map((r) => (
                        <label key={r.id} className="flex items-center space-x-2 p-3 rounded-lg border bg-blue-50/50 cursor-pointer hover:border-blue-400/50 transition-colors">
                          <Checkbox checked={selectedRoles.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                          <span className="text-sm font-medium">{r.label}</span>
                        </label>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="cursos" className="mt-0 space-y-4">
                    <div className="flex items-center gap-2 font-bold mb-3 pb-2 border-b">
                      <GraduationCap size={16} className="text-purple-500" /> Permissões do Módulo Cursos / Coordenação
                    </div>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      {AVAILABLE_ROLES.filter((r) => r.system === "cursos").map((r) => (
                        <label key={r.id} className="flex items-center space-x-2 p-3 rounded-lg border bg-purple-50/30 cursor-pointer hover:border-purple-400/50 transition-colors">
                          <Checkbox checked={selectedRoles.includes(r.id)} onCheckedChange={() => toggleRole(r.id)} />
                          <span className="text-sm font-medium">{r.label}</span>
                        </label>
                      ))}
                    </div>

                    {selectedRoles.includes("coordenador") && (
                      <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-purple-600">Especialidade Clínica (Triagem)</Label>
                          <Select value={specialtyId} onValueChange={setSpecialtyId}>
                            <SelectTrigger className="bg-card"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem especialidade</SelectItem>
                              {specialties.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-purple-600">Departamento Responsável (Cursos)</Label>
                          <Select value={departmentId} onValueChange={setDepartmentId}>
                            <SelectTrigger className="bg-card"><SelectValue placeholder="Selecione o departamento..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum departamento</SelectItem>
                              {departments.map((d: any) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name.charAt(0).toUpperCase() + d.name.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleCreate} disabled={isLoading || !validatePasswordStrength(password)}>
            {isLoading ? "Criando..." : "Criar Usuário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
