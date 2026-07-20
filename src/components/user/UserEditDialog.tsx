import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/hooks/useProfiles";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { User, Shield, Lock, Phone, UserCircle, BriefcaseMedical, GraduationCap, CalendarIcon, ShieldCheck, ShieldOff } from "lucide-react";

interface UserEditDialogProps {
  user: Profile | null;
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_ROLES = [
  { id: "admin", label: "Administrador", system: "geral" },
  { id: "triage_atendente", label: "Recepção", system: "triagem" },
  { id: "triage_dentista", label: "Clínica", system: "triagem" },
  { id: "triage_coordenador", label: "Coordenador", system: "cursos" },
];

export function UserEditDialog({ user, open, onClose }: UserEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile data
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    cpf: "",
    cro: "",
    department_id: "",
    triage_specialty_id: "",
    date_bypass_until: null as Date | null,
    restrict_to_own_area: false,
  });


  // Role management
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  
  // Password management
  const [newPassword, setNewPassword] = useState("");

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departments").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: specialties } = useQuery({
    queryKey: ["specialties"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("patient_specialties").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (user) {
      const bypassDate = (user as any).date_bypass_until 
        ? new Date((user as any).date_bypass_until + "T12:00:00") 
        : null;
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        cpf: user.cpf || "",
        cro: user.cro || "",
        department_id: user.department_id || "",
        triage_specialty_id: user.triage_specialty_id || "",
        date_bypass_until: bypassDate,
        restrict_to_own_area: Boolean((user as any).restrict_to_own_area),
      });

      
      // Set multi-roles
      if (user.user_roles && user.user_roles.length > 0) {
        setSelectedRoles(user.user_roles.map(r => r.role));
      } else {
        setSelectedRoles([]);
      }
      setNewPassword("");
      setActiveTab("profile");
    }
  }, [user]);

  const toggleRole = (roleId: string) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(r => r !== roleId) 
        : [...prev, roleId]
    );
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // 1. Update Profile (Base Data + Specialty + Department)
      const bypassValue = formData.date_bypass_until 
        ? format(formData.date_bypass_until, "yyyy-MM-dd") 
        : null;
      const { error: profileError } = await (supabase as any)
        .from("profiles")
        .update({
          name: formData.name,
          phone: formData.phone,
          cpf: formData.cpf,
          cro: formData.cro,
          department_id: formData.department_id || null,
          triage_specialty_id: formData.triage_specialty_id || null,
          date_bypass_until: bypassValue,
          restrict_to_own_area: formData.restrict_to_own_area,
        })

        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update Roles (Multi-Role Logic)
      const currentRoleIds = user.user_roles?.map(r => r.role) || [];
      const hasChanged = 
        currentRoleIds.length !== selectedRoles.length || 
        !currentRoleIds.every(r => selectedRoles.includes(r));

      if (hasChanged) {
        
        
        // Delete all and insert new set
        await supabase.from("user_roles").delete().eq("user_id", user.id);
        
        if (selectedRoles.length > 0) {
          const rolesToInsert = selectedRoles.map(roleId => ({
            user_id: user.id,
            role: roleId
          }));
          
          const { error: roleError } = await (supabase as any).from("user_roles").insert(rolesToInsert);
          if (roleError) {
            console.error("Error inserting updated roles:", roleError);
            throw roleError;
          }
        }
      }

      // 3. Update Password (if provided)
      if (newPassword) {
        const { error: pwdError } = await supabase.functions.invoke("admin-update-password", {
          body: { userId: user.id, newPassword },
        });
        if (pwdError) throw pwdError;
      }

      toast({
        title: "Sucesso!",
        description: `Dados de ${user.name} foram atualizados completamente.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      onClose();
    } catch (err: any) {
      console.error(err);
      let errorMessage = err.message || "Ocorreu um erro ao salvar os dados.";
      
      if (err.code === "23505" || err.message?.includes("profiles_cpf_key")) {
        errorMessage = "Este CPF já está cadastrado para outro usuário. Por favor, verifique.";
      }

      toast({
        title: "Erro na atualização",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        <div className="bg-muted p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200">
              <UserCircle size={32} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{user?.name || "Usuário"}</DialogTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 border-b bg-card">
            <TabsList className="bg-transparent h-12 w-full justify-start gap-4">
              <TabsTrigger value="profile" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full flex gap-2">
                <User size={16} /> Dados Cadastrais
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full flex gap-2">
                <Shield size={16} /> Permissões
              </TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 h-full flex gap-2">
                <Lock size={16} /> Segurança
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 h-[450px] overflow-y-auto bg-card">
            <TabsContent value="profile" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone / WhatsApp</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>CRO (Se dentista)</Label>
                  <Input value={formData.cro} onChange={(e) => setFormData({...formData, cro: e.target.value})} />
                </div>
              </div>

              {/* Bypass de Data */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={18} className="text-amber-600" />
                    <Label className="text-sm font-bold text-amber-800">Bypass da Trava de Data</Label>
                  </div>
                  {formData.date_bypass_until && formData.date_bypass_until > new Date() ? (
                    <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
                      <ShieldCheck size={12} className="mr-1" /> Ativa até {format(formData.date_bypass_until, "dd/MM/yyyy")}
                    </Badge>
                  ) : formData.date_bypass_until ? (
                    <Badge variant="outline" className="text-red-500 border-red-300 text-xs">
                      <ShieldOff size={12} className="mr-1" /> Expirada
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-amber-700">
                  Permite que o usuário crie cursos sem a restrição de antecedência mínima (6/9 meses). Selecione até quando essa permissão será válida.
                </p>
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !formData.date_bypass_until && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date_bypass_until 
                          ? format(formData.date_bypass_until, "dd/MM/yyyy", { locale: ptBR })
                          : "Selecionar data limite"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date_bypass_until || undefined}
                        onSelect={(date) => setFormData({...formData, date_bypass_until: date || null})}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        locale={ptBR}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {formData.date_bypass_until && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => setFormData({...formData, date_bypass_until: null})}
                    >
                      Remover
                    </Button>
                  )}
                </div>
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
                    <div className="flex items-center gap-2 text-foreground font-bold mb-4 pb-2 border-b">
                      <Shield size={18} className="text-orange-500" /> Permissões de Acesso Geral
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {AVAILABLE_ROLES.filter(r => r.system === "geral").map(role => (
                        <div key={role.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-muted hover:bg-muted transition-colors cursor-pointer">
                          <Checkbox 
                            id={`edit-${role.id}`} 
                            checked={selectedRoles.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          <Label htmlFor={`edit-${role.id}`} className="cursor-pointer font-medium">{role.label}</Label>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-4 border-t space-y-3">
                      <div className="flex items-center gap-2 text-foreground font-bold">
                        <Shield size={16} className="text-purple-500" /> Escopo de Visualização
                      </div>
                      <label className="flex items-start gap-3 p-3 rounded-lg border bg-purple-50/40 cursor-pointer hover:border-purple-300 transition-colors">
                        <Checkbox
                          checked={formData.restrict_to_own_area}
                          onCheckedChange={(v) => setFormData({ ...formData, restrict_to_own_area: Boolean(v) })}
                        />
                        <div>
                          <p className="text-sm font-medium">Restringir à própria área/curso</p>
                          <p className="text-xs text-muted-foreground">O usuário verá apenas pacientes/dados da sua especialidade de triagem e do seu departamento.</p>
                        </div>
                      </label>
                      {formData.restrict_to_own_area && !formData.triage_specialty_id && !formData.department_id && (
                        <p className="text-xs text-amber-600 font-medium">Defina uma Especialidade de triagem e/ou Departamento para o escopo funcionar.</p>
                      )}
                    </div>
                  </TabsContent>


                  <TabsContent value="triagem" className="mt-0 space-y-4">
                    <div className="flex items-center gap-2 text-foreground font-bold mb-4 pb-2 border-b">
                      <BriefcaseMedical size={18} className="text-blue-500" /> Permissões do Módulo Triagem
                    </div>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                      {AVAILABLE_ROLES.filter(r => r.system === "triagem").map(role => (
                        <div key={role.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer">
                          <Checkbox 
                            id={`edit-${role.id}`} 
                            checked={selectedRoles.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          <Label htmlFor={`edit-${role.id}`} className="cursor-pointer font-medium">{role.label}</Label>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="cursos" className="mt-0 space-y-4">
                    <div className="flex items-center gap-2 text-foreground font-bold mb-4 pb-2 border-b">
                      <GraduationCap size={18} className="text-purple-500" /> Permissões do Módulo Cursos / Coordenação
                    </div>
                    <div className="grid grid-cols-1 gap-4 mb-4">
                      {AVAILABLE_ROLES.filter(r => r.system === "cursos").map(role => (
                        <div key={role.id} className="flex items-center space-x-3 p-3 rounded-lg border bg-purple-50/30 hover:bg-purple-50 transition-colors cursor-pointer">
                          <Checkbox 
                            id={`edit-${role.id}`} 
                            checked={selectedRoles.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          <Label htmlFor={`edit-${role.id}`} className="cursor-pointer font-medium">{role.label}</Label>
                        </div>
                      ))}
                    </div>

                    {selectedRoles.includes("coordenador") && (
                      <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-lg shadow-sm mt-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-purple-600 font-bold uppercase tracking-wider">Especialidade Clínica (Triagem)</Label>
                          <Select
                            value={formData.triage_specialty_id || "none"}
                            onValueChange={(v) => setFormData({...formData, triage_specialty_id: v === "none" ? "" : v})}
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Selecione a especialidade..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem especialidade vinculada</SelectItem>
                              {specialties?.filter((s: any) => s.id).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-purple-600 font-bold uppercase tracking-wider">Departamento Responsável (Cursos)</Label>
                          <Select
                            value={formData.department_id || "none"}
                            onValueChange={(v) => setFormData({...formData, department_id: v === "none" ? "" : v})}
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Selecione o departamento..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum departamento</SelectItem>
                              {departments?.filter((d: any) => d.id).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-4">
              <div className="bg-red-50 border border-red-100 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-bold mb-1">
                  <Lock size={18} /> Redefinição de Senha
                </div>
                <p className="text-xs text-red-600 mb-4">
                  Como administrador, você pode forçar uma nova senha para o usuário. Ele perderá a senha antiga imediatamente.
                </p>
                <div className="space-y-2">
                  <Label>Nova Senha Temporária / Definitiva</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo 8 caracteres..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-card"
                  />
                  <p className="text-[10px] text-muted-foreground italic">Deixe em branco para NÃO alterar a senha atual.</p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-6 bg-muted border-t flex items-center justify-between">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateProfile} disabled={isSubmitting} className="bg-primary px-8">
            {isSubmitting ? "Salvando Alterações..." : "Salvar Configurações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
