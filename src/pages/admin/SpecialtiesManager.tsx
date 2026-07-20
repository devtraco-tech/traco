import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useTriageConfig, Specialty } from "@/hooks/useTriageConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit, GraduationCap, Stethoscope, Settings, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export default function SpecialtiesManager({ institution = "ABO" }: { institution?: "ABO" | "UNIFAN" }) {
  const { specialties, procedures, classes, isLoading, addSpecialty, updateSpecialty, deleteSpecialty, addProcedure, deleteProcedure, addClass, deleteClass } = useTriageConfig();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  
  const [newSpecName, setNewSpecName] = useState("");
  const [newProcName, setNewProcName] = useState("");
  const [newClassName, setNewClassName] = useState("");

  const handleSaveName = () => {
    if (!selectedSpecialty || !editNameValue) return;
    const upperName = editNameValue.toUpperCase();
    updateSpecialty.mutate({
      id: selectedSpecialty.id,
      updates: { name: upperName }
    }, {
      onSuccess: () => {
        setSelectedSpecialty(prev => prev ? { ...prev, name: upperName } : null);
        setIsEditingName(false);
      }
    });
  };

  const handleCreateSpecialty = () => {
    if (!newSpecName) return;
    addSpecialty.mutate({ name: newSpecName, description: `Criada via Gestão (${institution})`, institution });
    setNewSpecName("");
  };

  const handleAddProcedure = () => {
    if (!newProcName || !selectedSpecialty) return;
    addProcedure.mutate({ specialty_id: selectedSpecialty.id, name: newProcName });
    setNewProcName("");
  };

  const handleCreateClass = () => {
    if (!newClassName || !selectedSpecialty) return;
    addClass.mutate({ 
      name: newClassName, 
      specialty_id: selectedSpecialty.id,
      status: "active",
      is_active: true
    });
    setNewClassName("");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Activity className="h-10 w-10 text-slate-300 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-xs uppercase tracking-widest">Carregando Configurações...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] font-bold tracking-[0.2em] px-3 py-1 bg-card shadow-sm text-muted-foreground uppercase">Configurações Base</Badge>
          <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">Especialidades {institution === "UNIFAN" ? "UNIFAN" : ""}</h1>
          <p className="text-sm font-medium text-muted-foreground">Gerenciamento de especialidades mestre, procedimentos e turmas acadêmicas {institution === "UNIFAN" ? "da UNIFAN" : "da ABO"}.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border rounded-[2rem] shadow-sm bg-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-extrabold text-foreground uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-blue-500" /> Nova Especialidade
              </h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nome da Especialidade</Label>
                <Input 
                  placeholder="Ex: Prótese Dentária..." 
                  className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card transition-all shadow-none font-bold text-xs"
                  value={newSpecName}
                  onChange={e => setNewSpecName(e.target.value)}
                />
                <Button 
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/10 transition-all mt-2" 
                  onClick={handleCreateSpecialty} 
                  disabled={!newSpecName}
                >
                  CADASTRAR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card className="border-border rounded-[2.5rem] shadow-sm bg-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground py-6 px-8">Especialidade Mestre</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground py-6">Procedimentos</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground py-6">Turmas Ativas</TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right px-8">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {specialties.filter(s => (s.institution || "ABO") === institution).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-24 text-muted-foreground font-bold uppercase text-[10px] tracking-widest opacity-40">Nenhuma especialidade no sistema</TableCell>
                  </TableRow>
                ) : (
                  specialties.filter(s => (s.institution || "ABO") === institution).map(spec => {
                    const specProcedures = procedures.filter(p => p.specialty_id === spec.id);
                    return (
                      <TableRow key={spec.id} className="group hover:bg-muted/50 border-border transition-colors">
                        <TableCell className="font-extrabold text-foreground uppercase text-xs px-8 py-5 group-hover:text-blue-600 transition-colors tracking-tight">{spec.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-black text-[9px] border-border bg-card text-muted-foreground px-2">{specProcedures.length} ITENS</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-black text-[9px] border-indigo-100 bg-indigo-50/50 text-indigo-600 px-2 tracking-tighter">
                            {classes.filter(c => c.specialty_id === spec.id).length} TURMAS
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="font-black text-[10px] uppercase text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all rounded-xl h-9 px-4" onClick={() => {
                              setSelectedSpecialty(spec);
                              setIsModalOpen(true);
                            }}>
                              <Edit className="h-3.5 w-3.5 mr-2" /> Gerenciar
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-xl"
                              onClick={() => {
                                const procCount = procedures.filter(p => p.specialty_id === spec.id).length;
                                const msg = procCount > 0
                                  ? `Excluir "${spec.name}"? Isso também excluirá ${procCount} procedimento(s) vinculado(s).`
                                  : `Excluir "${spec.name}"?`;
                                if (confirm(msg)) deleteSpecialty.mutate(spec.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setIsEditingName(false);
          setSelectedSpecialty(null);
        }
      }}>
        <DialogContent className="sm:max-w-[700px] p-0 border-none rounded-3xl shadow-2xl overflow-hidden">
          <DialogHeader className="p-8 bg-card border-b border-border">
             <div className="flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                  <Settings className="h-7 w-7 text-blue-500" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editNameValue}
                        onChange={e => setEditNameValue(e.target.value)}
                        className="h-9 font-black uppercase text-xs rounded-xl max-w-[250px] bg-muted/30"
                      />
                      <Button
                        size="sm"
                        onClick={handleSaveName}
                        disabled={!editNameValue || updateSpecialty.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 rounded-lg text-[10px] uppercase tracking-widest px-3"
                      >
                        Salvar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingName(false)}
                        className="font-bold h-8 rounded-lg text-[10px] uppercase tracking-widest text-muted-foreground"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground truncate max-w-[350px]">
                        {selectedSpecialty?.name}
                      </DialogTitle>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        onClick={() => {
                          setEditNameValue(selectedSpecialty?.name || "");
                          setIsEditingName(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest mt-1">Configurações Técnicas e Turmas</DialogDescription>
                </div>
             </div>
          </DialogHeader>

          <div className="p-8 bg-card">
            <Tabs defaultValue="procedures" className="w-full">
              <TabsList className="bg-muted/50 p-1.5 rounded-2xl border border-border w-full mb-8 h-auto flex gap-1">
                <TabsTrigger value="procedures" className="flex-1 px-6 py-3 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl transition-all flex items-center justify-center gap-2">
                  <Stethoscope className="h-4 w-4" /> Procedimentos
                </TabsTrigger>
                <TabsTrigger value="classes" className="flex-1 px-6 py-3 font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl transition-all flex items-center justify-center gap-2">
                  <GraduationCap className="h-4 w-4" /> Turmas Ativas
                </TabsTrigger>
              </TabsList>

              <TabsContent value="procedures" className="py-2 space-y-6 focus-visible:outline-none">
                <div className="flex gap-3 bg-muted p-4 rounded-2xl border border-border">
                  <Input 
                    placeholder="Adicionar novo procedimento (Ex: Extração)" 
                    className="h-11 rounded-xl border-border bg-card shadow-none font-bold text-xs flex-1"
                    value={newProcName}
                    onChange={e => setNewProcName(e.target.value)}
                  />
                  <Button 
                    className="h-11 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] px-6 transition-all hover:bg-slate-800"
                    onClick={handleAddProcedure} 
                    disabled={!newProcName}
                  >
                    INSERIR
                  </Button>
                </div>

                <div className="bg-card border border-border rounded-3xl overflow-hidden max-h-[350px] overflow-y-auto shadow-sm">
                  <Table>
                    <TableBody>
                      {procedures.filter(p => p.specialty_id === selectedSpecialty?.id).length === 0 ? (
                        <TableRow>
                          <TableCell className="text-center py-12 text-slate-300 font-bold uppercase text-[9px] tracking-widest italic">Nenhum item mapeado</TableCell>
                        </TableRow>
                      ) : (
                        procedures.filter(p => p.specialty_id === selectedSpecialty?.id).map((proc, index) => (
                          <TableRow key={proc.id} className="group hover:bg-muted/50 transition-colors border-border">
                            <TableCell className="w-12 text-[10px] font-black text-slate-300 text-center">{index + 1}</TableCell>
                            <TableCell className="font-bold text-foreground uppercase tracking-tight text-xs">{proc.name}</TableCell>
                            <TableCell className="text-right pr-6">
                              <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Excluir o procedimento "${proc.name}"?`)) deleteProcedure.mutate(proc.id); }} className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="classes" className="py-2 space-y-6 focus-visible:outline-none">
                <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50 space-y-4">
                  <div className="flex items-center gap-3">
                     <div className="h-10 w-10 bg-card rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm"><Plus className="h-5 w-5 text-indigo-500" /></div>
                     <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Nova Turma Especializada</h4>
                        <p className="text-[9px] font-bold text-indigo-500 opacity-60 uppercase">Vincular grupo acadêmico ao CAP</p>
                     </div>
                  </div>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Ex: T24 - Implante" 
                      value={newClassName}
                      onChange={e => setNewClassName(e.target.value)}
                      className="h-11 bg-card border-indigo-100 shadow-none font-bold text-xs flex-1 rounded-xl"
                    />
                    <Button 
                      className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-indigo-500/10 transition-all" 
                      onClick={handleCreateClass} 
                      disabled={!newClassName}
                    >
                      ADICIONAR
                    </Button>
                  </div>
                </div>

                <div className="bg-card border border-border rounded-3xl overflow-hidden max-h-[300px] overflow-y-auto shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="py-4 px-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Turma</TableHead>
                        <TableHead className="py-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Contexto</TableHead>
                        <TableHead className="py-4 px-6 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classes.filter(c => c.specialty_id === selectedSpecialty?.id).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-12 text-slate-300 font-bold uppercase text-[9px] tracking-widest italic">Nenhuma turma ativa</TableCell>
                        </TableRow>
                      ) : (
                        classes.filter(c => c.specialty_id === selectedSpecialty?.id).map((cls) => (
                          <TableRow key={cls.id} className="group hover:bg-muted/50 border-border">
                            <TableCell className="px-6 py-4 font-black text-indigo-500 text-[10px] uppercase tracking-widest">{cls.name}</TableCell>
                            <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                              Módulo Triagem (Ativo)
                            </TableCell>
                            <TableCell className="text-right px-6 py-4">
                              <Button variant="ghost" size="icon" onClick={() => deleteClass.mutate(cls.id)} className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <div className="p-4 bg-muted/50 border-t border-border flex justify-center">
             <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold text-muted-foreground hover:text-foreground uppercase text-[10px] tracking-widest">FECHAR</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
