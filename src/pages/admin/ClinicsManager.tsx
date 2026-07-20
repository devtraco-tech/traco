import { useState } from "react";
import { useTriageConfig } from "@/hooks/useTriageConfig";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Check, Edit3, Building2, Activity, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

export default function ClinicsManager() {
  const { clinics, isLoading, addClinic, updateClinic } = useTriageConfig();
  
  const [newClinicName, setNewClinicName] = useState("");
  const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
  const [editClinicName, setEditClinicName] = useState("");

  const handleCreateClinic = () => {
    if (!newClinicName) return;
    addClinic.mutate({ name: newClinicName });
    setNewClinicName("");
  };

  const handleSaveClinicEdit = (id: string) => {
    updateClinic.mutate({ id, updates: { name: editClinicName } });
    setEditingClinicId(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Activity className="h-10 w-10 text-slate-300 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-xs uppercase tracking-widest">Carregando Unidades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2">
          <Badge variant="outline" className="text-[10px] font-bold tracking-[0.2em] px-3 py-1 bg-card shadow-sm text-muted-foreground uppercase">Infraestrutura</Badge>
          <h1 className="text-4xl font-extrabold tracking-tighter text-foreground">Unidades Clínicas</h1>
          <p className="text-sm font-medium text-muted-foreground">Direcionamento de pacientes para polos de atendimento da ABO Goiás.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border rounded-[2rem] shadow-sm bg-card overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="font-extrabold text-foreground uppercase text-[10px] tracking-widest flex items-center gap-2">
                <Plus className="h-3.5 w-3.5 text-blue-500" /> Nova Unidade
              </h3>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Nome da Unidade Clínica</Label>
                <Input 
                  placeholder="Ex: ABO Matriz / Sede..." 
                  className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card transition-all shadow-none font-bold text-xs"
                  value={newClinicName}
                  onChange={e => setNewClinicName(e.target.value)}
                />
                <Button 
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-500/10 transition-all mt-2" 
                  onClick={handleCreateClinic} 
                  disabled={!newClinicName}
                >
                  CADASTRAR POLO
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
                  <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground py-6 px-8 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Unidade / Registro
                  </TableHead>
                  <TableHead className="font-extrabold text-[10px] uppercase tracking-widest text-muted-foreground py-6 text-right px-8">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinics.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-24 text-muted-foreground font-bold uppercase text-[10px] tracking-widest opacity-40">Nenhuma clínica cadastrada</TableCell>
                  </TableRow>
                ) : (
                  clinics.map(clinic => {
                    const isEditing = editingClinicId === clinic.id;

                    return (
                      <TableRow key={clinic.id} className="group hover:bg-muted/50 border-border transition-colors">
                        <TableCell className="px-8 py-5">
                          {isEditing ? (
                            <div className="flex items-center gap-3 animate-in fade-in duration-300">
                              <Input 
                                value={editClinicName} 
                                onChange={(e) => setEditClinicName(e.target.value)} 
                                className="h-10 px-4 rounded-xl border-blue-200 bg-card font-bold text-xs shadow-sm focus:ring-0"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border group-hover:bg-card transition-colors shadow-sm">
                                  <MapPin className="h-5 w-5 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                               </div>
                               <span className="font-extrabold text-foreground uppercase text-xs tracking-tight group-hover:text-blue-600 transition-colors">
                                 {clinic.name}
                               </span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-8">
                          {isEditing ? (
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleSaveClinicEdit(clinic.id)} 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl h-9 px-6 transition-all shadow-lg shadow-emerald-500/10"
                            >
                              <Check className="h-3.5 w-3.5 mr-2" /> Confirmar
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => {
                                setEditingClinicId(clinic.id);
                                setEditClinicName(clinic.name);
                              }}
                              className="font-black text-[10px] uppercase text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-all rounded-xl h-9 px-4"
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-2" /> Editar
                            </Button>
                          )}
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
    </div>
  );
}
