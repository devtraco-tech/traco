import { useState } from "react";
import { useTriageDashboard } from "@/hooks/useTriageDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Activity, AlertTriangle, Building2, ChevronRight, Stethoscope, BriefcaseMedical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TriageDashboard() {
  const { stats, specialtyChartData, isPending, patientsWithSpecialty, specialtyMap, procedureMap } = useTriageDashboard();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Activity className="h-12 w-12 text-blue-500 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-lg">Carregando indicadores estratégicos...</p>
      </div>
    );
  }

  const urgencyChartData = [
    { name: "Alta", value: stats.fila3PorUrgencia.alta, fill: "hsl(var(--destructive))", bg: "bg-red-500" },
    { name: "Média", value: stats.fila3PorUrgencia.media, fill: "#f59e0b", bg: "bg-amber-500" },
    { name: "Baixa", value: stats.fila3PorUrgencia.baixa, fill: "#10b981", bg: "bg-emerald-500" },
  ];

  const getUrgencyBadge = (p: any) => {
    const u = (p.urgency || p.urgency_level || "").toString().toLowerCase();
    if (u === "alta") return <Badge variant="destructive" className="text-[10px]">Alta Urgência</Badge>;
    if (u === "media" || u === "média") return <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">Média Urgência</Badge>;
    return <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">Baixa Urgência</Badge>;
  };

  const stageLabel = (stage: string): { label: string; cls: string } => {
    switch (stage) {
      case "step1_atendimento":
        return { label: "FILA  1: AGENDAMENTO TRIAGEM 3", cls: "bg-amber-100 text-amber-800 border-amber-200" };
      case "step2_triagem_clinica":
        return { label: "Triagem Clínica 3", cls: "bg-blue-100 text-blue-800 border-blue-200" };
      case "step3_selecao_cap":
        return { label: "FILA 3: FILA DE ESPERA", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" };
      default:
        return { label: stage || "—", cls: "bg-muted text-foreground" };
    }
  };

  const getPatientsGroupedByProcedure = (specialtyId: string) => {
    if (!specialtyId) return {};

    const patients = patientsWithSpecialty.filter((p: any) => {
      const inArray = Array.isArray(p.specialties) && p.specialties.includes(specialtyId);
      return inArray || p.assigned_specialty_id === specialtyId;
    });
    const groups: Record<string, any[]> = {};

    patients.forEach((p: any) => {
      const list = Array.isArray(p.treatment_types) && p.treatment_types.length > 0 ? p.treatment_types : ["sem_procedimento"];
      list.forEach((procId: string) => {
        if (!groups[procId]) groups[procId] = [];
        if (!groups[procId].find(existing => existing.id === p.id)) {
          groups[procId].push(p);
        }
      });
    });

    return groups;
  };

  const selectedSpecialtyName = selectedSpecialty ? specialtyMap.get(selectedSpecialty) || "Especialidade" : "";
  const groupedPatients = selectedSpecialty ? getPatientsGroupedByProcedure(selectedSpecialty) : {};

  const getPatientsGroupedByStage = (specialtyId: string) => {
    if (!specialtyId) return { step1_atendimento: [], step2_triagem_clinica: [], step3_selecao_cap: [], others: [] };

    const patients = patientsWithSpecialty.filter((p: any) => {
      const inArray = Array.isArray(p.specialties) && p.specialties.includes(specialtyId);
      return inArray || p.assigned_specialty_id === specialtyId;
    });

    const groups: Record<string, any[]> = {
      step1_atendimento: [],
      step2_triagem_clinica: [],
      step3_selecao_cap: [],
      others: [],
    };

    patients.forEach((p: any) => {
      const stage = p.current_stage;
      if (stage === "step1_atendimento") {
        groups.step1_atendimento.push(p);
      } else if (stage === "step2_triagem_clinica") {
        groups.step2_triagem_clinica.push(p);
      } else if (stage === "step3_selecao_cap") {
        groups.step3_selecao_cap.push(p);
      } else {
        groups.others.push(p);
      }
    });

    return groups;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0f172a] text-white border-b border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-50" />
        <div className="container mx-auto px-6 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestão Clínica</h1>
              <p className="text-white/50 text-sm font-medium">Todos os pacientes com especialidade atribuída, em qualquer fila, agrupados por procedimento.</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="bg-card/5 border-white/10 text-white hover:bg-card/10 rounded-xl px-6 h-12 font-bold transition-all"
              >
                Voltar ao Início
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 space-y-12">

        {/* KPIs Principais e Urgência */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Funil Geral */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: "Total Cadastrados", val: stats.total, sub: "Funil Geral", icon: <Users className="h-5 w-5" />, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
              { label: "FILA 3: FILA DE ESPERA", val: stats.fila3Aguardando, sub: "Aguardando Vaga", icon: <Building2 className="h-5 w-5" />, color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20" },
            ].map((kpi, i) => (
              <div key={i} className={`p-8 rounded-[2rem] border ${kpi.color} bg-card shadow-sm hover:shadow-md transition-all duration-300 group`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-2xl bg-background shadow-sm group-hover:scale-110 transition-transform">
                    {kpi.icon}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-80">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-extrabold tracking-tighter text-foreground">{kpi.val}</p>
                    <p className="text-xs font-bold text-muted-foreground truncate">{kpi.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
 
          {/* Card de Urgência consolidado */}
          <Card className="lg:col-span-4 border-border rounded-[2rem] shadow-sm bg-card overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <h3 className="font-extrabold text-foreground uppercase text-xs tracking-widest flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Urgência na Fila de Espera
              </h3>
            </div>
            <CardContent className="p-6 space-y-5">
              {urgencyChartData.map((u) => {
                const total = urgencyChartData.reduce((s, x) => s + x.value, 0) || 1;
                return (
                  <div key={u.name}>
                    <div className="flex justify-between mb-2 items-end">
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{u.name}</span>
                      <span className="text-xl font-black tracking-tight text-foreground">{u.value} <span className="text-xs font-medium text-muted-foreground ml-1">pacientes</span></span>
                    </div>
                    <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 rounded-full ${u.bg}`}
                        style={{ width: `${(u.value / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Grid de Especialidades */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <BriefcaseMedical className="h-6 w-6 text-emerald-500" />
            <h2 className="text-xl font-bold tracking-tight text-foreground">FILA 3: FILA DE ESPERA por Especialidade</h2>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto pr-2 -mr-2 rounded-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {specialtyChartData.length > 0 ? (
                specialtyChartData.map((specialty, idx) => (
                  <div 
                    key={specialty.id || idx}
                    onClick={() => specialty.id && setSelectedSpecialty(specialty.id)}
                    className="group cursor-pointer relative overflow-hidden bg-card border border-border hover:border-emerald-500/50 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 group-hover:-translate-y-1 group-hover:translate-x-1">
                      <Stethoscope className="w-16 h-16 text-emerald-500" />
                    </div>
                    
                    <div className="relative z-10">
                      <h3 className="font-bold text-xs text-muted-foreground mb-3 pr-6 line-clamp-2 min-h-[32px] group-hover:text-emerald-600 transition-colors uppercase">
                        {specialty.name}
                      </h3>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-3xl font-black text-foreground group-hover:text-emerald-600 transition-colors">{specialty.value}</span>
                          <span className="text-[10px] font-medium text-muted-foreground block mt-0.5">pacientes aguardando</span>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-600 p-1.5 rounded-full group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-12 text-center bg-muted/30 border border-dashed rounded-3xl">
                  <p className="text-muted-foreground font-medium">Não há pacientes aguardando em especialidades na Fila de Espera.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Modal de Pacientes por Especialidade (Kanban) */}
      <Dialog open={!!selectedSpecialty} onOpenChange={(open) => !open && setSelectedSpecialty(null)}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-[2rem]">
          <DialogHeader className="p-6 border-b bg-muted/30 shrink-0">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-600">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Quadro da Especialidade</span>
                {selectedSpecialtyName}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden p-6 bg-muted/10">
            {selectedSpecialty && (() => {
              const patientsGroupedByStage = getPatientsGroupedByStage(selectedSpecialty);
              return (
                <div className="kanban-fixed-scroll h-full gap-4">
                  {/* Column 1: Agendamento Triagem 3 */}
                  <div className="flex flex-col bg-card/60 rounded-2xl border border-border p-4 min-w-[280px] md:flex-1 md:min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <span className="text-xs font-black uppercase tracking-widest text-amber-600">FILA  1: AGENDAMENTO TRIAGEM 3</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-bold">{patientsGroupedByStage.step1_atendimento.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-3 pr-2">
                        {patientsGroupedByStage.step1_atendimento.map((p: any) => (
                          <PatientKanbanCard key={p.id} patient={p} procedureMap={procedureMap} getUrgencyBadge={getUrgencyBadge} />
                        ))}
                        {patientsGroupedByStage.step1_atendimento.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground italic font-semibold">Sem pacientes</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Column 2: Triagem Clínica 3 */}
                  <div className="flex flex-col bg-card/60 rounded-2xl border border-border p-4 min-w-[280px] md:flex-1 md:min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <span className="text-xs font-black uppercase tracking-widest text-blue-600">Triagem Clínica 3</span>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 font-bold">{patientsGroupedByStage.step2_triagem_clinica.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-3 pr-2">
                        {patientsGroupedByStage.step2_triagem_clinica.map((p: any) => (
                          <PatientKanbanCard key={p.id} patient={p} procedureMap={procedureMap} getUrgencyBadge={getUrgencyBadge} />
                        ))}
                        {patientsGroupedByStage.step2_triagem_clinica.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground italic font-semibold">Sem pacientes</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Column 3: Fila de Espera */}
                  <div className="flex flex-col bg-card/60 rounded-2xl border border-border p-4 min-w-[280px] md:flex-1 md:min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <span className="text-xs font-black uppercase tracking-widest text-emerald-600">FILA 3: FILA DE ESPERA</span>
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-bold">{patientsGroupedByStage.step3_selecao_cap.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-3 pr-2">
                        {patientsGroupedByStage.step3_selecao_cap.map((p: any) => (
                          <PatientKanbanCard key={p.id} patient={p} procedureMap={procedureMap} getUrgencyBadge={getUrgencyBadge} />
                        ))}
                        {patientsGroupedByStage.step3_selecao_cap.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground italic font-semibold">Sem pacientes</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Column 4: Outros */}
                  <div className="flex flex-col bg-card/60 rounded-2xl border border-border p-4 min-w-[280px] md:flex-1 md:min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Outros / Em Atend.</span>
                      <Badge variant="outline" className="font-bold">{patientsGroupedByStage.others.length}</Badge>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="space-y-3 pr-2">
                        {patientsGroupedByStage.others.map((p: any) => (
                          <PatientKanbanCard key={p.id} patient={p} procedureMap={procedureMap} getUrgencyBadge={getUrgencyBadge} />
                        ))}
                        {patientsGroupedByStage.others.length === 0 && (
                          <div className="text-center py-8 text-xs text-muted-foreground italic font-semibold">Sem pacientes</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PatientKanbanCard({ patient, procedureMap, getUrgencyBadge }: { patient: any; procedureMap: Map<string, string>; getUrgencyBadge: any }) {
  const procedures = Array.isArray(patient.treatment_types) ? patient.treatment_types : [];
  return (
    <div className="p-3 rounded-xl border bg-card flex flex-col gap-2 hover:border-emerald-500/50 transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 overflow-hidden min-w-0">
          <span className="font-bold text-xs truncate uppercase">{patient.full_name || patient.name || "Sem nome"}</span>
          {patient.cpf && <span className="text-[9px] text-muted-foreground font-mono">{patient.cpf}</span>}
        </div>
        <div className="shrink-0">{getUrgencyBadge(patient)}</div>
      </div>
      
      {procedures.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {procedures.map((procId: string) => {
            const name = procedureMap.get(procId) || procId;
            return (
              <Badge key={procId} variant="secondary" className="text-[8px] px-1 py-0.5 font-bold uppercase truncate max-w-[150px]">
                {name}
              </Badge>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-1 items-center mt-1 text-[9px] text-muted-foreground font-semibold">
        {patient.mobile_phone && (
          <span>📱 {patient.mobile_phone}</span>
        )}
        {(patient.city || patient.state) && (
          <span>📍 {[patient.city, patient.state].filter(Boolean).join("/")}</span>
        )}
      </div>
    </div>
  );
}
