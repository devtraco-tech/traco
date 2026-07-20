import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTriageConfig } from "@/hooks/useTriageConfig";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TriageFilters, DEFAULT_FILTERS, applyTriageFilters } from "@/components/triage/TriageFilters";
import { Activity, Users, Clock, CheckCircle2, MailQuestion, AlertTriangle, FileText, Phone, Building2, Archive, Trash2, ArrowRightCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CityCombobox } from "@/components/triage/CityCombobox";
import { BR_STATES } from "@/lib/brazil";
import { PatientRecordView } from "@/components/PatientRecordView";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

const STAGE_LABEL: Record<string, string> = {
  step1_atendimento: "FILA  1: AGENDAMENTO TRIAGEM 3",
  step2_triagem_clinica: "Fila 2: Triagem Clínica 3",
  step3_selecao_cap: "FILA 3: FILA DE ESPERA",
  em_atendimento: "Em Atendimento",
  arquivado: "Arquivado",
  lead: "Lead (Site)",
};

// Filas e suas colunas para importação manual de pacientes
const QUEUE_OPTIONS: {
  id: string;
  label: string;
  statusField: "reception_status" | "dentist_status" | "cap_status";
  columns: { value: string; label: string }[];
}[] = [
  {
    id: "step1_atendimento",
    label: "Fila 1 — Agendamento Triagem 3",
    statusField: "reception_status",
    columns: [
      { value: "entrada", label: "Novos / Pendentes" },
      { value: "aguardando_retorno", label: "Aguardando Retorno" },
      { value: "contato_realizado", label: "Agendados / Confirmados" },
      { value: "faltou", label: "Faltas / Não Compareceu" },
    ],
  },
  {
    id: "step2_triagem_clinica",
    label: "Fila 2 — Triagem Clínica 3",
    statusField: "dentist_status",
    columns: [
      { value: "agendado", label: "Aguardando Consulta" },
      { value: "consultou", label: "Consultado / Em Triagem" },
      { value: "faltou", label: "Faltaram" },
    ],
  },
  {
    id: "step3_selecao_cap",
    label: "Fila 3 — Fila de Espera (CAP)",
    statusField: "cap_status",
    columns: [
      { value: "aguardando_vaga", label: "Aguardando Vaga" },
      { value: "em_negociacao", label: "Em Negociação" },
      { value: "entrevista_agendada", label: "Entrevista Agendada" },
      { value: "recusado_cap", label: "Recusado" },
      { value: "faltou", label: "Faltou" },
      { value: "declinado_falta", label: "Declinado por Falta" },
    ],
  },
];

// Classifica em "Não atendido" / "Em atendimento" / "Concluído"
const getAttendanceState = (p: any): "lead" | "waiting" | "in_progress" | "done" => {
  if (p.isLead) return "lead";
  if (p.current_stage === "step1_atendimento" && (!p.reception_status || p.reception_status === "entrada")) {
    return "waiting";
  }
  if (p.current_stage === "arquivado" || p.cap_status === "finalizado") return "done";
  return "in_progress";
};

const AttendanceBadge = ({ state }: { state: ReturnType<typeof getAttendanceState> }) => {
  if (state === "lead") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 text-[10px] uppercase font-bold gap-1">
        <MailQuestion className="h-3 w-3" /> Não atendido (Lead)
      </Badge>
    );
  }
  if (state === "waiting") {
    return (
      <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200 text-[10px] uppercase font-bold gap-1">
        <Clock className="h-3 w-3" /> Aguardando atendimento
      </Badge>
    );
  }
  if (state === "done") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 text-[10px] uppercase font-bold gap-1">
        <CheckCircle2 className="h-3 w-3" /> Concluído
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] uppercase font-bold border-blue-300 text-blue-700">
      Em atendimento
    </Badge>
  );
};

export default function AllPatients() {
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const { specialties, procedures } = useTriageConfig();
  const { isAdmin } = useUserRole();
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
  const [importQueue, setImportQueue] = useState<string>("");
  const [importColumn, setImportColumn] = useState<string>("");

  const queryClient = useQueryClient();
  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from("patients")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-patients-and-leads"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step1"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step2"] });
      queryClient.invalidateQueries({ queryKey: ["triage-patients-step3"] });
      queryClient.invalidateQueries({ queryKey: ["triage-dashboard-stats"] });
      toast.success("Cadastro do paciente atualizado em MAIÚSCULAS!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    }
  });

  const uppercasePatientPayload = (payload: any) => {
    const result = { ...payload };
    const textFields = ["full_name", "treatment_needed", "medical_history", "exams_type", "dentist_requested_exams"];
    textFields.forEach((field) => {
      if (typeof result[field] === "string") {
        result[field] = result[field].toUpperCase();
      }
    });
    return result;
  };

  const handleSaveEdit = (id: string, rawData: any) => {
    const uppercaseData = uppercasePatientPayload(rawData);
    updatePatientMutation.mutate({ id, updates: uppercaseData }, {
      onSuccess: () => {
        setSelectedPatient(null);
      }
    });
  };

  const handleImportToQueue = () => {
    if (!selectedPatient || !importQueue || !importColumn) {
      toast.error("Selecione a fila e a coluna de destino.");
      return;
    }
    const queue = QUEUE_OPTIONS.find((q) => q.id === importQueue);
    if (!queue) return;
    const updates: any = {
      current_stage: importQueue,
      // limpa os status das outras filas para evitar inconsistência
      reception_status: importQueue === "step1_atendimento" ? importColumn : "contato_realizado",
      dentist_status: importQueue === "step2_triagem_clinica" ? importColumn : null,
      cap_status: importQueue === "step3_selecao_cap" ? importColumn : null,
    };
    updates[queue.statusField] = importColumn;
    updatePatientMutation.mutate({ id: selectedPatient.id, updates }, {
      onSuccess: () => {
        toast.success(`Paciente importado para ${queue.label}.`);
        setImportQueue("");
        setImportColumn("");
        setSelectedPatient(null);
      },
    });
  };

  const leadActionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "archive" | "delete" }) => {
      if (action === "archive") {
        const { error } = await supabase
          .from("patient_leads")
          .update({ status: "archived", updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("patient_leads").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-patients-and-leads"] });
      toast.success(variables.action === "archive" ? "Lead arquivado!" : "Lead excluído!");
      setSelectedPatient(null);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const leadActionPending = leadActionMutation.isPending;

  const handleArchiveLead = (lead: any) => {
    leadActionMutation.mutate({ id: lead.id, action: "archive" });
  };

  const handleDeleteLead = (lead: any) => {
    if (!window.confirm(`Tem certeza que deseja excluir o lead "${lead.full_name}"? Esta ação não pode ser desfeita.`)) return;
    leadActionMutation.mutate({ id: lead.id, action: "delete" });
  };



  const specialtyMap = useMemo(
    () => new Map(specialties.map((s: any) => [s.id, s.name])),
    [specialties],
  );
  const procedureMap = useMemo(
    () => new Map(procedures.map((p: any) => [p.id, p.name])),
    [procedures],
  );

  const { data: mixedData = [], isLoading } = useQuery({
    queryKey: ["all-patients-and-leads"],
    queryFn: async () => {
      const [{ data: patientsData }, { data: leadsData }] = await Promise.all([
        supabase.from("patients").select("*").order("created_at", { ascending: false }).limit(2000),
        supabase.from("patient_leads").select("*").order("created_at", { ascending: false }).limit(2000),
      ]);

      const patients = patientsData || [];
      const patientCpfs = new Set(
        patients.map((p: any) => p.cpf ? p.cpf.replace(/\D/g, "") : "").filter(Boolean)
      );
      const patientPhones = new Set(
        patients.map((p: any) => p.mobile_phone ? p.mobile_phone.replace(/\D/g, "") : "").filter(Boolean)
      );

      const leads = (leadsData || [])
        .filter((lead: any) => {
          if (lead.status === "completed") return false;
          const leadCpf = lead.cpf ? lead.cpf.replace(/\D/g, "") : "";
          if (leadCpf && patientCpfs.has(leadCpf)) return false;
          const leadPhone = lead.mobile_phone ? lead.mobile_phone.replace(/\D/g, "") : "";
          if (leadPhone && patientPhones.has(leadPhone)) return false;
          return true;
        })
        .map((lead: any) => ({
          ...lead,
          isLead: true,
          current_stage: "lead",
        }));

      return [...patients, ...leads].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
  });

  const filtered = applyTriageFilters(mixedData as any[], filters);

  // Contadores
  const counts = useMemo(() => {
    const c = { leads: 0, waiting: 0, inProgress: 0, done: 0 };
    filtered.forEach((p: any) => {
      const s = getAttendanceState(p);
      if (s === "lead") c.leads++;
      else if (s === "waiting") c.waiting++;
      else if (s === "done") c.done++;
      else c.inProgress++;
    });
    return c;
  }, [filtered]);

  const getSpecialtyNames = (p: any): string[] => {
    const ids = new Set<string>();
    (Array.isArray(p.specialties) ? p.specialties : []).forEach((id: string) => id && ids.add(id));
    if (p.assigned_specialty_id) ids.add(p.assigned_specialty_id);
    return Array.from(ids).map((id) => specialtyMap.get(id) || "—").filter(Boolean);
  };

  const getProcedureNames = (p: any): string[] => {
    const arr = Array.isArray(p.treatment_types) ? p.treatment_types : [];
    return arr.map((id: string) => procedureMap.get(id)).filter(Boolean) as string[];
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0f172a] text-white border-b border-white/5">
        <div className="container mx-auto px-6 py-10">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Todos os Pacientes</h1>
          <p className="text-white/50 text-sm font-medium mt-2">
            Lista geral consolidada de pacientes (todas as filas) e leads recebidos pelo site.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 space-y-6">
        <TriageFilters
          value={filters}
          onChange={setFilters}
          specialties={specialties}
          procedures={procedures}
          showUrgency
          showExams
        />

        {/* Contadores resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Leads (Site)</p>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">{counts.leads}</p>
            <p className="text-[10px] text-amber-700">não atendidos</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-700">Aguardando</p>
            <p className="text-2xl font-extrabold text-orange-900 mt-1">{counts.waiting}</p>
            <p className="text-[10px] text-orange-700">na recepção</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Em atendimento</p>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">{counts.inProgress}</p>
            <p className="text-[10px] text-blue-700">filas 2 e 3</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Concluídos</p>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1">{counts.done}</p>
            <p className="text-[10px] text-emerald-700">finalizados</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Users className="h-4 w-4" /> {filtered.length} registro(s) exibido(s)
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <Activity className="h-8 w-8 animate-pulse text-blue-500" />
              <p className="text-xs uppercase font-bold text-muted-foreground">Carregando...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Atendimento</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Celular</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Procedimentos</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Exames</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                      Nenhum paciente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((p: any) => {
                    const state = getAttendanceState(p);
                    const specs = getSpecialtyNames(p);
                    const procs = getProcedureNames(p);
                    return (
                      <TableRow 
                        key={`${p.isLead ? "lead" : "pat"}-${p.id}`} 
                        className={cn("cursor-pointer hover:bg-muted/50 transition-colors", (state === "lead" || state === "waiting") && "bg-amber-50/30")}
                        onClick={() => setSelectedPatient(p)}
                      >
                        <TableCell><AttendanceBadge state={state} /></TableCell>
                        <TableCell className="font-bold">{p.full_name}</TableCell>
                        <TableCell className="text-xs">{p.cpf || "—"}</TableCell>
                        <TableCell className="text-xs">{p.mobile_phone || p.phone || "—"}</TableCell>
                        <TableCell className="text-xs">{p.city ? `${p.city} - ${p.state || ""}` : "—"}</TableCell>
                        <TableCell className="text-xs">
                          {specs.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : specs.length === 1 ? (
                            <Badge variant="outline" className="text-[10px]">{specs[0]}</Badge>
                          ) : (
                            <span title={specs.join(", ")}>
                              <Badge variant="outline" className="text-[10px]">{specs[0]}</Badge>
                              <span className="ml-1 text-[10px] text-muted-foreground">+{specs.length - 1}</span>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {procs.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span title={procs.join(", ")}>
                              <Badge variant="secondary" className="text-[10px]">{procs.length}</Badge>
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.urgency && (
                            <Badge className={
                              p.urgency === "alta" ? "bg-rose-500" :
                              p.urgency === "media" ? "bg-amber-500 text-amber-950" : "bg-emerald-500"
                            }>
                              {String(p.urgency).toUpperCase()}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!p.isLead && (
                            <Badge variant="outline" className={p.has_exams ? "border-emerald-300 text-emerald-600" : "border-border text-muted-foreground"}>
                              {p.has_exams ? "Sim" : "Não"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {STAGE_LABEL[p.current_stage] || p.current_stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.created_at ? format(new Date(p.created_at), "dd/MM/yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </main>

      {/* Dialog para visualização/edição */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => { if (!open) { setSelectedPatient(null); setImportQueue(""); setImportColumn(""); } }}>
        <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-card text-foreground border-b border-border">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0">
                <FileText className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground uppercase truncate">
                  {selectedPatient?.full_name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
                  Ficha do Paciente • {selectedPatient?.isLead ? "Lead do Site" : STAGE_LABEL[selectedPatient?.current_stage] || "Cadastro"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 bg-card">
            {selectedPatient?.isLead ? (
              <div className="space-y-6">
                <PatientRecordView patient={selectedPatient} />
                {isAdmin && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      className="flex-1 gap-2"
                      disabled={leadActionPending}
                      onClick={() => handleArchiveLead(selectedPatient)}
                    >
                      <Archive className="h-4 w-4" /> Arquivar Lead
                    </Button>
                    <Button
                      variant="destructive"
                      className="flex-1 gap-2"
                      disabled={leadActionPending}
                      onClick={() => handleDeleteLead(selectedPatient)}
                    >
                      <Trash2 className="h-4 w-4" /> Excluir Lead
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Tabs defaultValue="visualizar" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="visualizar">Visualização</TabsTrigger>
                  <TabsTrigger value="editar">Edição</TabsTrigger>
                </TabsList>
                <TabsContent value="visualizar" className="space-y-6">
                  {selectedPatient && <PatientRecordView patient={selectedPatient} />}

                  <div className="rounded-2xl border border-border bg-muted/20 p-5 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <ArrowRightCircle className="h-4 w-4 text-blue-500" /> Importar paciente para:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Fila de destino</Label>
                        <Select
                          value={importQueue}
                          onValueChange={(val) => { setImportQueue(val); setImportColumn(""); }}
                        >
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Escolha a fila..." />
                          </SelectTrigger>
                          <SelectContent>
                            {QUEUE_OPTIONS.map((q) => (
                              <SelectItem key={q.id} value={q.id}>{q.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Coluna de destino</Label>
                        <Select value={importColumn} onValueChange={setImportColumn} disabled={!importQueue}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Escolha a coluna..." />
                          </SelectTrigger>
                          <SelectContent>
                            {QUEUE_OPTIONS.find((q) => q.id === importQueue)?.columns.map((c) => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      onClick={handleImportToQueue}
                      disabled={!importQueue || !importColumn || updatePatientMutation.isPending}
                      className="w-full gap-2"
                    >
                      <ArrowRightCircle className="h-4 w-4" /> Importar Paciente
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="editar">
                  {selectedPatient && (
                    <PatientEditForm 
                      patient={selectedPatient} 
                      onSave={handleSaveEdit} 
                      onCancel={() => setSelectedPatient(null)} 
                      isSaving={updatePatientMutation.isPending}
                      specialties={specialties}
                      procedures={procedures}
                    />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PatientEditForm({ patient, onSave, onCancel, isSaving, specialties, procedures }: {
  patient: any;
  onSave: (id: string, data: any) => void;
  onCancel: () => void;
  isSaving: boolean;
  specialties: any[];
  procedures: any[];
}) {
  const [fullName, setFullName] = useState(patient.full_name || "");
  const [birthDate, setBirthDate] = useState(patient.birth_date || "");
  const [cpf, setCpf] = useState(patient.cpf || "");
  const [mobilePhone, setMobilePhone] = useState(patient.mobile_phone || "");
  const [state, setState] = useState(patient.state || "");
  const [city, setCity] = useState(patient.city || "");
  const [treatmentNeeded, setTreatmentNeeded] = useState(patient.treatment_needed || "");
  const [urgency, setUrgency] = useState(patient.urgency || "baixa");
  const [medicalHistory, setMedicalHistory] = useState(patient.medical_history || "");
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>(Array.isArray(patient.specialties) ? patient.specialties : []);
  const [selectedProcs, setSelectedProcs] = useState<string[]>(Array.isArray(patient.treatment_types) ? patient.treatment_types : []);
  const [chkNecessities, setChkNecessities] = useState(!!patient.chk_necessities);
  const [chkOrientation, setChkOrientation] = useState(!!patient.chk_orientation);
  const [chkDentalOffice, setChkDentalOffice] = useState(!!patient.chk_dentaloffice);
  const [hasExams, setHasExams] = useState(!!patient.has_exams);
  const [examsType, setExamsType] = useState(patient.exams_type || "");
  const [examsValidity, setExamsValidity] = useState(patient.exams_validity || "");
  const [dentistRequestedExams, setDentistRequestedExams] = useState(patient.dentist_requested_exams || "");

  const handleSave = () => {
    const rawData = {
      full_name: fullName,
      birth_date: birthDate || null,
      cpf: cpf || null,
      mobile_phone: mobilePhone || null,
      state: state || null,
      city: city || null,
      treatment_needed: treatmentNeeded,
      urgency,
      medical_history: medicalHistory,
      specialties: selectedSpecs,
      treatment_types: selectedProcs,
      chk_necessities: chkNecessities,
      chk_orientation: chkOrientation,
      chk_dentaloffice: chkDentalOffice,
      has_exams: hasExams,
      exams_type: examsType,
      exams_validity: examsValidity || null,
      dentist_requested_exams: dentistRequestedExams,
    };
    onSave(patient.id, rawData);
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
      {/* Dados Pessoais */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Dados Pessoais</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-xs font-bold uppercase text-muted-foreground">Nome Completo *</Label>
            <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="NOME DO PACIENTE" className="rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-xs font-bold uppercase text-muted-foreground">Data de Nascimento</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf" className="text-xs font-bold uppercase text-muted-foreground">CPF</Label>
            <Input id="cpf" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" className="rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobilePhone" className="text-xs font-bold uppercase text-muted-foreground">WhatsApp / Celular</Label>
            <Input id="mobilePhone" value={mobilePhone} onChange={e => setMobilePhone(e.target.value)} placeholder="(00) 00000-0000" className="rounded-xl h-11" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">UF</Label>
            <Select value={state} onValueChange={val => { setState(val); setCity(""); }}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Selecione a UF" />
              </SelectTrigger>
              <SelectContent>
                {BR_STATES.map(st => (
                  <SelectItem key={st.uf} value={st.uf}>{st.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Cidade</Label>
            <CityCombobox uf={state} value={city} onChange={setCity} className="h-11 rounded-xl text-xs" />
          </div>
        </div>
      </div>

      {/* Queixa Inicial */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Queixa Principal</h3>
        <div className="space-y-2">
          <Label htmlFor="treatmentNeeded" className="text-xs font-bold uppercase text-muted-foreground">Queixa/Necessidade Relatada</Label>
          <Textarea id="treatmentNeeded" value={treatmentNeeded} onChange={e => setTreatmentNeeded(e.target.value)} placeholder="Descreva a queixa inicial..." className="min-h-[100px] rounded-xl p-4 text-sm font-medium" />
        </div>
      </div>

      {/* Triagem Clínica */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Triagem Técnica</h3>
        
        {/* Urgência */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Nível de Urgência Técnica</Label>
          <RadioGroup value={urgency} onValueChange={setUrgency} className="flex gap-4">
            {[
              { id: "baixa", label: "Baixa", color: "bg-emerald-500" },
              { id: "media", label: "Média", color: "bg-amber-500" },
              { id: "alta", label: "Alta", color: "bg-rose-500" }
            ].map(u => (
              <div
                key={u.id}
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all cursor-pointer ${urgency === u.id ? 'bg-card border-foreground/20 ring-2 ring-foreground/5 scale-[1.01]' : 'bg-muted/30 border-border opacity-60'}`}
                onClick={() => setUrgency(u.id)}
              >
                <RadioGroupItem value={u.id} id={`urg-${u.id}`} className={u.color} />
                <Label htmlFor={`urg-${u.id}`} className="font-bold uppercase text-[10px] tracking-widest cursor-pointer">{u.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Anamnese */}
        <div className="space-y-2 pt-2">
          <Label htmlFor="medicalHistory" className="text-xs font-bold uppercase text-muted-foreground">Evolução da Anamnese</Label>
          <Textarea id="medicalHistory" value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} placeholder="Histórico médico relevante e observações técnicas..." className="min-h-[120px] rounded-xl p-4 text-sm font-medium" />
        </div>

        {/* Especialidades checkboxes */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Especialidades Necessárias *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {specialties.filter(s => s.is_active).map(s => {
              const isChecked = selectedSpecs.includes(s.id);
              return (
                <div
                  key={s.id}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${isChecked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-card border-border text-muted-foreground hover:border-foreground/20'}`}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedSpecs(selectedSpecs.filter(id => id !== s.id));
                      const specProcs = procedures.filter(p => p.specialty_id === s.id).map(p => p.id);
                      setSelectedProcs(prev => prev.filter(pid => !specProcs.includes(pid)));
                    } else {
                      setSelectedSpecs([...selectedSpecs, s.id]);
                    }
                  }}
                >
                  <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                    {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                  </div>
                  <span className="text-[9px] font-bold uppercase truncate">{s.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Procedimentos agrupados por especialidades selecionadas */}
        <div className="space-y-2 pt-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Procedimentos Necessários *</Label>
          {selectedSpecs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Selecione pelo menos uma especialidade para ver os procedimentos.</p>
          ) : (
            <div className="space-y-4">
              {selectedSpecs.map(specId => {
                const spec = specialties.find(s => s.id === specId);
                const specProcs = procedures.filter(p => p.specialty_id === specId);
                if (specProcs.length === 0) return null;
                return (
                  <div key={specId} className="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
                    <h4 className="text-[9px] font-black uppercase text-blue-500 tracking-wider">{spec?.name}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {specProcs.map(proc => {
                        const isChecked = selectedProcs.includes(proc.id);
                        return (
                          <div
                            key={proc.id}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${isChecked ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-card border-border text-muted-foreground hover:border-foreground/20'}`}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedProcs(selectedProcs.filter(id => id !== proc.id));
                              } else {
                                setSelectedProcs([...selectedProcs, proc.id]);
                              }
                            }}
                          >
                            <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                              {isChecked && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                            </div>
                            <span className="text-[9px] font-bold uppercase truncate">{proc.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="space-y-2 pt-4 border-t">
          <Label className="text-xs font-bold uppercase text-muted-foreground block mb-2">Checklist de Encaminhamento</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'chk_necessities', label: 'Necessidades', val: chkNecessities, setter: setChkNecessities },
              { id: 'chk_orientation', label: 'Orientações', val: chkOrientation, setter: setChkOrientation },
              { id: 'chk_dentaloffice', label: 'Consultório', val: chkDentalOffice, setter: setChkDentalOffice },
            ].map(item => (
              <div
                key={item.id}
                onClick={() => item.setter(!item.val)}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  item.val ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <span className="text-[9px] font-black uppercase tracking-tight text-center">{item.label}</span>
                <div className={`h-3 w-3 rounded border flex items-center justify-center ${item.val ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-border'}`}>
                  {item.val && <CheckCircle2 className="h-2 w-2 text-white" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Exames */}
        <div className="space-y-4 pt-4 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gerenciamento de Exames</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/15">
              <input type="checkbox" id="hasExams" checked={hasExams} onChange={e => setHasExams(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
              <Label htmlFor="hasExams" className="text-xs font-bold uppercase text-muted-foreground cursor-pointer">Paciente Apresentou Exames</Label>
            </div>
            {hasExams && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="examsType" className="text-xs font-bold uppercase text-muted-foreground">Tipo de Exames</Label>
                  <Input id="examsType" value={examsType} onChange={e => setExamsType(e.target.value)} placeholder="TIPO DO EXAME" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="examsValidity" className="text-xs font-bold uppercase text-muted-foreground">Validade dos Exames</Label>
                  <Input id="examsValidity" type="date" value={examsValidity} onChange={e => setExamsValidity(e.target.value)} className="rounded-xl h-11" />
                </div>
              </>
            )}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="dentistRequestedExams" className="text-xs font-bold uppercase text-muted-foreground">Exames Solicitados pelo Dentista</Label>
              <Textarea id="dentistRequestedExams" value={dentistRequestedExams} onChange={e => setDentistRequestedExams(e.target.value)} placeholder="Liste exames que foram solicitados..." className="min-h-[80px] rounded-xl p-4 text-sm font-medium" />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-6 border-t font-bold">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="button" onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground px-8">{isSaving ? "Salvando..." : "Salvar Edição"}</Button>
      </div>
    </div>
  );
}
