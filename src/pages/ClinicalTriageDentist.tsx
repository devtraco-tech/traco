import { useState, useMemo, useEffect } from "react";
import { useClinicalTriage } from "@/hooks/useClinicalTriage";
import { useTriageConfig } from "@/hooks/useTriageConfig";
import { useUserRole } from "@/hooks/useUserRole";
import { PatientData } from "@/hooks/mockPatientStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, AlertTriangle, Activity, Stethoscope,
  FileText, CalendarRange, Clock, CheckCircle2,
  AlertCircle, Phone, FileDigit, Building2, MapPin,
  Trash2, ArrowRight, User, ChevronRight, GraduationCap, RotateCcw,
  LayoutGrid, List, Calendar
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { PatientRecordView } from "@/components/PatientRecordView";
import { TriageFilters, DEFAULT_FILTERS, applyTriageFilters } from "@/components/triage/TriageFilters";
import { CompactPatientCard } from "@/components/triage/CompactPatientCard";
import { PatientAttachments } from "@/components/triage/PatientAttachments";
import { cn } from "@/lib/utils";

const STATUS_COLUMNS = [
  { id: "agendado", label: "Aguardando Consulta", color: "border-t-amber-400", bg: "bg-amber-100 dark:bg-amber-950/30", icon: <Clock className="h-4 w-4 text-amber-600" /> },
  { id: "consultou", label: "Consultado / Em Triagem", color: "border-t-blue-400", bg: "bg-blue-100 dark:bg-blue-950/30", icon: <Stethoscope className="h-4 w-4 text-blue-600" /> },
  { id: "faltou", label: "Faltaram", color: "border-t-rose-400", bg: "bg-rose-100 dark:bg-rose-950/30", icon: <AlertCircle className="h-4 w-4 text-rose-600" /> },
];

export default function ClinicalTriageDentist() {
  const { patients, isLoading: pLoading, updatePatientClinicalData, advanceToCAPSelection, deletePatient } = useClinicalTriage();
  const { specialties, procedures, isLoading: cLoading } = useTriageConfig();
  const { userName } = useUserRole();

  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<string>("baixa");
  const [isReturn, setIsReturn] = useState(false);


  // Checklist de encaminhamento
  const [chkNecessities, setChkNecessities] = useState(false);
  const [chkOrientation, setChkOrientation] = useState(false);
  const [chkDentalOffice, setChkDentalOffice] = useState(false);

  // Alternância de Visualização e Paginação
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProcedures = useMemo(
    () => procedures.filter(p => selectedSpecialties.includes(p.specialty_id)),
    [procedures, selectedSpecialties]
  );
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filteredPatients = applyTriageFilters(patients as any[], filters);

  const triagedByUsers = useMemo(() => {
    if (!patients) return [];
    return Array.from(new Set(patients.map(p => (p as any).triaged_by_name).filter(Boolean))) as string[];
  }, [patients]);

  const expandedPatients = useMemo(() => {
    return filteredPatients.flatMap((patient: any) => {
      if (patient.specialties && patient.specialties.length > 1) {
        return patient.specialties.map((specId: string) => ({
          ...patient,
          display_specialty_id: specId,
          duplicate_key: `${patient.id}-${specId}`
        }));
      }
      return [{
        ...patient,
        display_specialty_id: patient.specialties?.[0] || patient.assigned_specialty_id,
        duplicate_key: patient.id
      }];
    });
  }, [filteredPatients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, viewMode]);

  const handleOpenDetails = (patient: PatientData) => {
    setSelectedPatient(patient);
    setMedicalHistory(patient.medical_history || "");
    setSelectedSpecialties((patient as any).specialties || ((patient as any).assigned_specialty_id ? [(patient as any).assigned_specialty_id] : []));
    setSelectedProcedures(patient.treatment_types || []);
    setUrgency(patient.urgency || "baixa");
    setChkNecessities(Boolean((patient as any).chk_necessities));
    setChkOrientation(Boolean((patient as any).chk_orientation));
    setChkDentalOffice(Boolean((patient as any).chk_dentaloffice));
    setIsReturn(false);
  };


  const onDragStart = (e: React.DragEvent, patientId: string) => {
    e.dataTransfer.setData("patient_id", patientId);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedOverColumn !== columnId) setDraggedOverColumn(columnId);
  };

  const handleMarkNoShow = async (patient: any) => {
    const today = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const prevNotes = (patient.medical_history || "").trim();
    const noteLine = `Não compareceu na Triagem Clínica no dia ${today}`;
    const newNotes = prevNotes ? `${prevNotes}\n${noteLine}` : noteLine;
    const newCount = (patient.no_show_count || 0) + 1;

    const updates: any = {
      medical_history: newNotes,
      no_show_count: newCount,
    };

    if (newCount >= 3) {
      updates.current_stage = "step3_selecao_cap";
      updates.cap_status = "declinado_falta";
      updates.reception_status = "contato_realizado";
      updates.dentist_status = "faltou";
      toast.success("Paciente atingiu 3 faltas e foi movido para 'Declinado por Falta' na Fila de Espera.");
    } else {
      updates.current_stage = "step1_atendimento";
      updates.reception_status = "faltou";
      updates.chk_scheduled = false;
      updates.dentist_status = "faltou";
      toast.success("Paciente marcado como falta e enviado de volta para a Recepção.");
    }

    updatePatientClinicalData.mutate({
      id: patient.id,
      updates,
    });
  };

  const onDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const patientId = e.dataTransfer.getData("patient_id");
    if (patientId) {
      const patient = patients.find(p => p.id === patientId);
      if (patient && columnId === "faltou") {
        handleMarkNoShow(patient);
        return;
      }
      updatePatientClinicalData.mutate({ id: patientId, updates: { dentist_status: columnId, triaged_by_name: userName } });
      toast.success(`Status atualizado para: ${columnId}`);
    }
  };

  const validateFields = (opts?: { skipSpecialty?: boolean }) => {
    if (!medicalHistory.trim()) {
      toast.error("O campo Anamnese é obrigatório.");
      return false;
    }
    if (!opts?.skipSpecialty) {
      if (selectedSpecialties.length === 0) {
        toast.error("Selecione pelo menos uma especialidade.");
        return false;
      }
      if (selectedProcedures.length === 0) {
        toast.error("Selecione pelo menos um procedimento.");
        return false;
      }
    }
    if (!urgency) {
      toast.error("Selecione o nível de urgência.");
      return false;
    }
    return true;
  };

  const handleMarkReturn = (examReturn = false) => {
    if (!selectedPatient) return;
    // Retorno é opcional em especialidade/procedimento
    if (!validateFields({ skipSpecialty: true })) return;

    updatePatientClinicalData.mutate({
      id: selectedPatient.id,
      updates: {
        medical_history: medicalHistory.toUpperCase(),
        specialties: [],
        assigned_specialty_id: null,
        treatment_types: [],
        urgency: urgency as any,
        dentist_status: null,
        current_stage: 'step1_atendimento',
        reception_status: 'aguardando_retorno',
        is_return: !examReturn,
        is_exam_return: examReturn,
        triaged_by_name: userName,
        chk_necessities: chkNecessities,
        chk_orientation: chkOrientation,
        chk_dentaloffice: chkDentalOffice
      } as any
    }, {
      onSuccess: () => {
        toast.success(examReturn ? "Paciente marcado como Retorno por Exames!" : "Paciente retornado para a Triagem com sucesso!");
        setSelectedPatient(null);
      }
    });
  };


  const handleSaveAssessment = () => {
    if (!selectedPatient) return;
    if (!validateFields()) return;

    updatePatientClinicalData.mutate({
      id: selectedPatient.id,
      updates: {
        medical_history: medicalHistory.toUpperCase(),
        specialties: selectedSpecialties,
        assigned_specialty_id: selectedSpecialties[0] || null,
        treatment_types: selectedProcedures,
        urgency: urgency as any,
        dentist_status: 'consultou',
        triaged_by_name: userName,
        chk_necessities: chkNecessities,
        chk_orientation: chkOrientation,
        chk_dentaloffice: chkDentalOffice
      } as any
    }, {
      onSuccess: () => {
        toast.success("Avaliação salva provisoriamente com sucesso!");
      }
    });
  };

  const handleAdvanceToCAP = () => {
    if (!selectedPatient) return;
    if (!validateFields()) return;

    advanceToCAPSelection.mutate({
      id: selectedPatient.id,
      updates: {
        medical_history: medicalHistory.toUpperCase(),
        specialties: selectedSpecialties,
        assigned_specialty_id: selectedSpecialties[0] || null,
        treatment_types: selectedProcedures,
        urgency: urgency as any,
        dentist_status: 'consultou',
        triaged_by_name: userName,
        chk_necessities: chkNecessities,
        chk_orientation: chkOrientation,
        chk_dentaloffice: chkDentalOffice
      } as any
    }, {
      onSuccess: () => {
        setSelectedPatient(null);
      },
    });
  };



  if ((pLoading || cLoading) && patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Activity className="h-12 w-12 text-blue-500 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-lg">Carregando Triagem Clínica 3...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-[#0f172a] text-white border-b border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-emerald-600/10 opacity-50" />
        <div className="container mx-auto px-6 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Triagem Clínica 3</h1>
              <p className="text-white/50 text-sm font-medium">Avaliação odontológica especializada e mapeamento de necessidades.</p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="bg-card/5 border-white/10 text-white hover:bg-card/10 rounded-xl px-6 h-12 font-bold transition-all"
              >
                Painel Geral
              </Button>
              <Badge variant="outline" className="h-12 px-6 rounded-xl bg-card/5 border-white/10 text-white font-bold uppercase text-[10px] flex items-center gap-2 shadow-none transition-all">
                <Users className="h-4 w-4" /> {patients.length} Pacientes na Fila
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 space-y-10 pb-32 pt-8">
        <TriageFilters value={filters} onChange={setFilters} specialties={specialties} procedures={procedures} triagedByUsers={triagedByUsers} />

      {/* VIEW TOGGLE */}
      <div className="flex justify-end items-center gap-2 bg-muted/20 p-1.5 rounded-2xl border border-border w-fit ml-auto">
        <Button
          variant={viewMode === 'card' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('card')}
          className="rounded-xl px-4 h-9 font-bold text-xs uppercase"
        >
          <LayoutGrid className="h-4 w-4 mr-2" /> Card
        </Button>
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
          className="rounded-xl px-4 h-9 font-bold text-xs uppercase"
        >
          <List className="h-4 w-4 mr-2" /> Lista
        </Button>
      </div>

      {viewMode === 'card' ? (
        /* KANBAN BOARD */
        <div className="kanban-fixed-scroll md:gap-8">
          {STATUS_COLUMNS.map(column => (
            <div
              key={column.id}
              className={`flex-1 min-w-[340px] w-full flex flex-col gap-5 rounded-3xl border border-border bg-card shadow-sm ${column.bg} p-6 min-h-[75vh] md:min-h-0 transition-all duration-300 ${draggedOverColumn === column.id ? 'ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-900/20 translate-y-[-4px]' : ''}`}
              onDragOver={(e) => onDragOver(e, column.id)}
              onDragLeave={() => setDraggedOverColumn(null)}
              onDrop={(e) => onDrop(e, column.id)}
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl bg-background shadow-sm border border-border`}>{column.icon}</div>
                  <h3 className="font-extrabold text-foreground uppercase text-sm tracking-tight">{column.label}</h3>
                </div>
                <Badge variant="secondary" className="bg-card/80 text-foreground font-black border shadow-sm rounded-lg px-2.5 text-sm">
                  {expandedPatients.filter((p: any) => (p.dentist_status || 'agendado') === column.id).length}
                </Badge>
              </div>

              <div className="flex flex-col gap-4 py-2 md:flex-1 md:min-h-0 overflow-y-auto pr-1">
                {expandedPatients.filter((p: any) => (p.dentist_status || 'agendado') === column.id).map((patient: any) => (
                  <CompactPatientCard
                    key={patient.duplicate_key}
                    patient={patient}
                    specialties={specialties}
                    onDragStart={onDragStart}
                    onClick={handleOpenDetails}
                  />
                ))}
                {expandedPatients.filter((p: any) => (p.dentist_status || 'agendado') === column.id).length === 0 && (
                  <div className="border-2 border-dashed border-border/30 rounded-3xl p-12 flex flex-col items-center justify-center text-center opacity-40">
                    <div className="h-12 w-12 rounded-2xl bg-card border border-border flex items-center justify-center mb-3">
                      {column.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fila Vazia</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4 bg-card p-6 rounded-[2.5rem] border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-foreground">Paciente</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Urgência</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Queixa Inicial</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Especialidades</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Procedimentos</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Faltas</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Tempo Parado</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Status</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const itemsPerPage = 10;
                const totalPages = Math.ceil(expandedPatients.length / itemsPerPage);
                const paginated = expandedPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                return (
                  <>
                    {paginated.map(patient => {
                      const currentStatus = STATUS_COLUMNS.find(c => c.id === (patient.dentist_status || 'agendado'));
                      const patientSpec = specialties.find(s => s.id === patient.display_specialty_id)?.name || "---";

                      return (
                        <TableRow key={patient.duplicate_key} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetails(patient)}>
                          <TableCell className="font-bold text-foreground">
                            <div>{patient.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold mb-1">{patient.cpf || "Sem CPF"} • {patient.mobile_phone || "Sem Celular"}</div>
                            <div className="flex gap-1 flex-wrap">
                              {patient.is_return && (
                                <Badge className="bg-amber-500 text-white text-[8px] px-1.5 py-0 font-black border-none">
                                  RETORNO
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {patient.urgency && (
                              <Badge className={`text-[8px] px-1.5 py-0 font-black shadow-none border-none ${patient.urgency === 'alta' ? 'bg-rose-500' : patient.urgency === 'media' ? 'bg-amber-500 text-amber-950' : 'bg-emerald-500'}`}>
                                {patient.urgency.toUpperCase()}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs italic">"{patient.treatment_needed || "Não informado"}"</TableCell>
                          <TableCell className="text-xs max-w-[150px] truncate">
                            <Badge variant="outline" className="text-[9px] font-bold text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800">
                              {patientSpec}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-blue-100 bg-card text-blue-600 font-bold">
                              {patient.treatment_types?.length || 0} PROCEDIMENTOS
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {patient.no_show_count > 0 ? (
                              <Badge className="bg-rose-500 text-white font-bold text-[10px] rounded-lg">
                                {patient.no_show_count}x
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap" title={`Criado em: ${format(new Date(patient.created_at), "dd/MM/yyyy HH:mm")}`}>
                                Criado há {formatDistanceToNow(new Date(patient.created_at), { locale: ptBR })}
                              </span>
                              <Badge variant="outline" className="w-fit font-bold text-[9px] rounded-lg border-rose-500/30 text-rose-600 bg-rose-500/5 uppercase">
                                Fila: {formatDistanceToNow(new Date(patient.updated_at || patient.created_at), { locale: ptBR })}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("font-bold text-[10px] rounded-lg border bg-card text-foreground", currentStatus?.color)}>
                              {currentStatus?.label || "Aguardando"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl font-bold text-xs uppercase" onClick={(e) => { e.stopPropagation(); handleOpenDetails(patient); }}>
                              Ver Ficha
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginated.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-bold">
                          Nenhum paciente encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })()}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {(() => {
            const itemsPerPage = 10;
            const totalPages = Math.ceil(expandedPatients.length / itemsPerPage);
            if (totalPages <= 1) return null;
            return (
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="rounded-xl font-bold uppercase text-xs"
                >
                  Anterior
                </Button>
                <span className="text-xs font-bold text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="rounded-xl font-bold uppercase text-xs"
                >
                  Próxima
                </Button>
              </div>
            );
          })()}
        </div>
      )}

        <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
          <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
            <DialogHeader className="p-8 bg-card text-foreground border-b border-border">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-3xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                  <GraduationCap className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground uppercase truncate">{selectedPatient?.full_name}</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Triagem Clínica 3 • Avaliação Completa</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-8 space-y-12 bg-card">
              {selectedPatient && <PatientRecordView patient={selectedPatient} />}

              {selectedPatient && (
                <div className="pt-6 border-t border-border">
                  <PatientAttachments patientId={selectedPatient.id} />
                </div>
              )}

              <div className="space-y-8 pt-8 border-t border-border">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" /> Nível de Urgência Técnica
                  </h4>
                  <RadioGroup value={urgency} onValueChange={setUrgency} className="flex gap-4">
                    {[
                      { id: "baixa", label: "Baixa", color: "bg-emerald-500" },
                      { id: "media", label: "Média", color: "bg-amber-500" },
                      { id: "alta", label: "Alta", color: "bg-rose-500" }
                    ].map(u => (
                      <div
                        key={u.id}
                        className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${urgency === u.id ? 'bg-card border-foreground/20 ring-2 ring-foreground/5 scale-[1.02]' : 'bg-muted/30 border-border opacity-60'}`}
                        onClick={() => setUrgency(u.id)}
                      >
                        <RadioGroupItem value={u.id} id={u.id} className={u.color} />
                        <Label htmlFor={u.id} className="font-black uppercase text-[10px] tracking-widest cursor-pointer">{u.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-500" /> Evolução da Anamnese
                  </Label>
                  <Textarea
                    placeholder="Registre aqui as observações técnicas, histórico médico relevante e conclusões da triagem inicial..."
                    className="min-h-[150px] bg-muted/30 border-border focus:bg-card rounded-2xl shadow-none p-6 text-sm font-medium leading-relaxed"
                    value={medicalHistory}
                    onChange={e => setMedicalHistory(e.target.value)}
                  />
                </div>

                <div className={`space-y-4`}>


                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-purple-500" /> Especialidades UNIFAN
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specialties.filter(s => s.is_active && s.institution === 'UNIFAN').map(s => {
                      const isChecked = selectedSpecialties.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${isChecked ? 'bg-purple-500/10 border-purple-500 text-purple-700 ring-1 ring-purple-200 shadow-sm' : 'bg-card border-border text-muted-foreground hover:border-foreground/20'}`}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedSpecialties(selectedSpecialties.filter(id => id !== s.id));
                              // Limpar procedimentos pertencentes à especialidade desmarcada
                              const specProcs = procedures.filter(p => p.specialty_id === s.id).map(p => p.id);
                              setSelectedProcedures(prev => prev.filter(pid => !specProcs.includes(pid)));
                            } else {
                              setSelectedSpecialties([...selectedSpecialties, s.id]);
                            }
                          }}
                        >
                          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isChecked ? 'bg-purple-500 border-purple-500' : 'border-slate-300'}`}>
                            {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight truncate">{s.name}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* ABO Specialties */}
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 pt-2 border-t border-border mt-4">
                    <Stethoscope className="h-4 w-4 text-emerald-500" /> Especialidades Clínicas ABO *
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specialties.filter(s => s.is_active && (!s.institution || s.institution === 'ABO')).map(s => {
                      const isChecked = selectedSpecialties.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${isChecked ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 ring-1 ring-emerald-200 shadow-sm' : 'bg-card border-border text-muted-foreground hover:border-foreground/20'}`}
                          onClick={() => {
                            if (isChecked) {
                              setSelectedSpecialties(selectedSpecialties.filter(id => id !== s.id));
                              // Limpar procedimentos pertencentes à especialidade desmarcada
                              const specProcs = procedures.filter(p => p.specialty_id === s.id).map(p => p.id);
                              setSelectedProcedures(prev => prev.filter(pid => !specProcs.includes(pid)));
                            } else {
                              setSelectedSpecialties([...selectedSpecialties, s.id]);
                            }
                          }}
                        >
                          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                            {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                          </div>
                          <span className="text-xs font-bold uppercase tracking-tight truncate">{s.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`space-y-4`}>
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">

                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Procedimentos Necessários *
                  </Label>
                  {selectedSpecialties.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic px-1">Selecione pelo menos uma especialidade acima para ver os procedimentos.</p>
                  ) : (
                    <div className="space-y-6">
                      {selectedSpecialties.map(specId => {
                        const spec = specialties.find(s => s.id === specId);
                        const specProcs = procedures.filter(p => p.specialty_id === specId);
                        if (specProcs.length === 0) return null;
                        return (
                          <div key={specId} className="space-y-2 p-4 rounded-2xl border border-border bg-muted/20">
                            <h4 className="text-[10px] font-black uppercase text-blue-500 tracking-wider mb-2">{spec?.name}</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {specProcs.map(proc => {
                                const isChecked = selectedProcedures.includes(proc.id);
                                return (
                                  <div
                                    key={proc.id}
                                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center gap-3 active:scale-[0.98] ${isChecked ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 ring-1 ring-emerald-200 shadow-sm' : 'bg-card border-border text-muted-foreground hover:border-foreground/20'}`}
                                    onClick={() => {
                                      if (isChecked) {
                                        setSelectedProcedures(selectedProcedures.filter(id => id !== proc.id));
                                      } else {
                                        setSelectedProcedures([...selectedProcedures, proc.id]);
                                      }
                                    }}
                                  >
                                    <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                                      {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                    <span className="text-xs font-bold uppercase tracking-tight truncate">{proc.name}</span>
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

                {/* CHECKLIST DE ENCAMINHAMENTO */}
                <div className="space-y-4 pt-6 border-t border-border">
                  <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Checklist de Encaminhamento
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { id: 'chk_necessities', label: 'Necessidades', icon: <FileText className="h-3.5 w-3.5" />, val: chkNecessities, setter: setChkNecessities },
                      { id: 'chk_orientation', label: 'Orientações', icon: <Phone className="h-3.5 w-3.5" />, val: chkOrientation, setter: setChkOrientation },
                      { id: 'chk_dentaloffice', label: 'Consultório', icon: <Building2 className="h-3.5 w-3.5" />, val: chkDentalOffice, setter: setChkDentalOffice },
                    ].map(item => (
                      <div
                        key={item.id}
                        onClick={() => item.setter(!item.val)}
                        className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${
                          item.val
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-500'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                          item.val ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-card border border-border text-muted-foreground'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tight text-center">{item.label}</span>
                        {item.val && (
                          <div className="absolute top-2 right-2 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Migração de Etapa */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-border">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-amber-500 block ml-1 flex items-center gap-1.5">
                    <RotateCcw className="h-3 w-3" /> Migrar para Outra Etapa
                  </Label>
                  <Select
                    value={selectedPatient?.current_stage}
                    onValueChange={val =>
                      updatePatientClinicalData.mutate(
                        { id: selectedPatient!.id, updates: { current_stage: val, triaged_by_name: userName } },
                        { onSuccess: () => setSelectedPatient(null) }
                      )
                    }
                  >
                    <SelectTrigger className="bg-amber-50/30 hover:bg-amber-50/50 border-amber-100/50 font-bold h-11 rounded-xl shadow-none text-amber-700 text-xs uppercase">
                      <SelectValue placeholder="Mover para outra fila..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-amber-50 shadow-xl">
                      <SelectItem value="step1_atendimento">Agendamento Triagem 3</SelectItem>
                      <SelectItem value="step2_triagem_clinica">Fila 2: Triagem Clínica 3 (atual)</SelectItem>
                      <SelectItem value="step3_selecao_cap">Fila de Espera</SelectItem>
                      <SelectItem value="arquivado">Arquivar Registro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-10 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex flex-col md:flex-row items-center gap-8 group">
                <div className="bg-card h-20 w-20 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform flex-shrink-0">
                  <ArrowRight className="h-10 w-10 text-emerald-500" />
                </div>
                <div className="text-center md:text-left space-y-2 flex-1">
                  <h4 className="font-extrabold text-emerald-500 text-xl tracking-tight uppercase">Concluir para Atendimento CAP</h4>
                  <p className="text-emerald-600/70 dark:text-emerald-400/70 text-xs font-bold uppercase leading-relaxed">Avaliação finalizada? Envie o paciente para a fila de alocação em turmas e procedimentos.</p>
                </div>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 px-10 rounded-2xl shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-xs transition-all whitespace-nowrap"
                  onClick={handleAdvanceToCAP}
                >
                  FINALIZAR TRIAGEM
                </Button>
              </div>
            </div>

            <div className="p-6 bg-muted/50 border-t border-border flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="ghost" onClick={() => setSelectedPatient(null)} className="font-bold text-muted-foreground hover:text-foreground hover:bg-transparent">FECHAR FICHA</Button>
              <Button variant="outline" onClick={handleSaveAssessment} className="border-border text-foreground font-bold hover:bg-card rounded-xl px-12 h-10 shadow-sm">SALVAR PROVISORIAMENTE</Button>
              <Button onClick={() => handleMarkReturn(false)} className="bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl px-12 h-10 shadow-sm uppercase">Marcar Retorno</Button>
              <Button onClick={() => handleMarkReturn(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl px-12 h-10 shadow-sm uppercase">Marcar Retorno por Exames</Button>
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}

