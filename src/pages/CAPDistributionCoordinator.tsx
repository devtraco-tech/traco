import { useState, useMemo, useEffect } from "react";
import { useCAPDistribution } from "@/hooks/useCAPDistribution";
import { useTriageConfig } from "@/hooks/useTriageConfig";
import { useClinicalTriageSchedule } from "@/hooks/useClinicalTriageSchedule";
import { PatientData } from "@/hooks/mockPatientStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Filter, GraduationCap, MapPin, CheckCircle2,
  Clock, UsersRound, CalendarSearch, AlertTriangle, AlertCircle,
  Activity, ArrowRight, User, ChevronRight, Search, RotateCcw,
  Calendar as CalendarIcon, LayoutGrid, List
} from "lucide-react";
import { PatientRecordView } from "@/components/PatientRecordView";
import { TriageFilters, DEFAULT_FILTERS, applyTriageFilters } from "@/components/triage/TriageFilters";
import { CompactPatientCard } from "@/components/triage/CompactPatientCard";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCpf } from "@/lib/cpfUtils";
import { uppercasePatientPayload } from "@/lib/text";
const STATUS_COLUMNS = [
  { id: "aguardando_vaga", label: "Aguardando Vaga", color: "border-t-amber-400", bg: "bg-amber-50/10 dark:bg-amber-900/10", icon: <Clock className="h-4 w-4 text-amber-600" /> },
  { id: "em_negociacao", label: "Em Contato", color: "border-t-blue-400", bg: "bg-blue-50/10 dark:bg-blue-900/10", icon: <UsersRound className="h-4 w-4 text-blue-600" /> },
  { id: "entrevista_agendada", label: "Procedimento Agendado", color: "border-t-purple-400", bg: "bg-purple-50/10 dark:bg-purple-900/10", icon: <CalendarSearch className="h-4 w-4 text-purple-600" /> },
  { id: "recusado_cap", label: "Recusados", color: "border-t-rose-400", bg: "bg-rose-50/10 dark:bg-rose-900/10", icon: <AlertTriangle className="h-4 w-4 text-rose-600" /> },
  { id: "faltou", label: "Faltaram", color: "border-t-rose-300", bg: "bg-rose-50/5 dark:bg-rose-950/5", icon: <AlertCircle className="h-4 w-4 text-rose-500" /> },
  { id: "declinado_falta", label: "Declinado por Falta", color: "border-t-red-600", bg: "bg-red-950/10 dark:bg-red-950/20", icon: <AlertTriangle className="h-4 w-4 text-red-600" /> },
];

export default function CAPDistributionCoordinator() {
  const { patients, isLoading: pLoading, routePatientsToClinic } = useCAPDistribution();
  const { clinics, classes, addAppointment, specialties, procedures, isLoading: cLoading } = useTriageConfig();
  const { create: createClinicalAppt } = useClinicalTriageSchedule();

  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [statusSelection, setStatusSelection] = useState<string>("");
  const [specialtiesSelection, setSpecialtiesSelection] = useState<string[]>([]);
  const [classSelection, setClassSelection] = useState<string>("");
  const [dateSelection, setDateSelection] = useState<string>("");
  const [timeSelection, setTimeSelection] = useState<string>("");
  const [proceduresSelection, setProceduresSelection] = useState<string[]>([]);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const triagedByUsers = useMemo(() => {
    if (!patients) return [];
    return Array.from(new Set(patients.map(p => (p as any).triaged_by_name).filter(Boolean))) as string[];
  }, [patients]);

  // Alternância de Visualização e Paginação
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de agendamento
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [schedulePatient, setSchedulePatient] = useState<PatientData | null>(null);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleSpecialties, setScheduleSpecialties] = useState<string[]>([]);
  const [scheduleClass, setScheduleClass] = useState<string>("");
  const [scheduleProcedures, setScheduleProcedures] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, viewMode]);

  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importAsOldContacts, setImportAsOldContacts] = useState(false);

  const downloadCsvTemplate = () => {
    const headers = ["Nome", "CPF", "Telefone", "Cidade/UF", "Urgencia", "Observacoes"];
    const rows = [
      ["JOAO DA SILVA", "12345678909", "62999999999", "GOIANIA/GO", "alta", "Paciente necessita de implante dentario urgente."],
      ["MARIA OLIVEIRA", "98765432100", "62988888888", "ANAPOLIS/GO", "media", "Necessita de tratamento de canal."]
    ];
    
    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => `"${val}"`).join(";"))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_fila_espera.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      try {
        const rows = parseCsv(text);
        if (rows.length === 0) {
          toast.error("Nenhum dado encontrado no arquivo CSV.");
          setImporting(false);
          return;
        }

        // Fetch existing CPFs to prevent duplicates
        const { data: existingPatients, error: fetchErr } = await (supabase as any)
          .from("patients")
          .select("cpf");
        if (fetchErr) throw fetchErr;

        const existingCpfs = new Set((existingPatients || []).map((p: any) => normalizeCpf(p.cpf)).filter(Boolean));

        const payloads: any[] = [];
        let duplicateCount = 0;

        for (const row of rows) {
          const rawName = row["nome"] || row["nome completo"] || "";
          const rawCpf = row["cpf"] || "";
          const rawPhone = row["telefone"] || row["celular"] || "";
          const rawCityUf = row["cidade/uf"] || row["cidade"] || "";
          const rawUrgency = (row["urgencia"] || row["urgência"] || "baixa").toLowerCase().trim();
          const rawObs = row["observacoes"] || row["observações"] || row["queixa"] || "";

          if (!rawName.trim()) continue;

          const cpfNormalized = normalizeCpf(rawCpf);
          if (cpfNormalized && existingCpfs.has(cpfNormalized)) {
            duplicateCount++;
            continue;
          }

          // Split Cidade/UF
          let city = "";
          let state = "";
          if (rawCityUf) {
            const parts = rawCityUf.split(/[/-]/);
            city = parts[0]?.trim() || "";
            state = parts[1]?.trim() || "";
          }

          const payload = uppercasePatientPayload({
            full_name: rawName,
            cpf: cpfNormalized || null,
            mobile_phone: rawPhone ? normalizeCpf(rawPhone) : null,
            city: city,
            state: state,
            urgency: ['alta', 'media', 'baixa'].includes(rawUrgency) ? rawUrgency : 'baixa',
            treatment_needed: rawObs,
            current_stage: 'step3_selecao_cap',
            cap_status: 'aguardando_vaga',
            reception_status: 'contato_realizado',
            created_at: importAsOldContacts ? new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          });
          payloads.push(payload);
        }

        if (payloads.length > 0) {
          const { error: insertErr } = await (supabase as any)
            .from("patients")
            .insert(payloads);
          if (insertErr) throw insertErr;
          
          toast.success(`${payloads.length} pacientes importados com sucesso! ${duplicateCount > 0 ? `(${duplicateCount} CPFs duplicados ignorados)` : ""}`);
          setImportOpen(false);
          // Refetch queries
          window.location.reload(); // Simple reload to sync data
        } else {
          toast.info("Nenhum novo paciente importado. Todos os CPFs já existiam ou estavam vazios.");
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Erro ao importar CSV: ${err.message || 'Verifique o formato'}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    // Find headers row (first non-empty line)
    let headerLineIdx = 0;
    while (headerLineIdx < lines.length && !lines[headerLineIdx].trim()) {
      headerLineIdx++;
    }
    if (headerLineIdx >= lines.length) return [];

    const headers = lines[headerLineIdx].split(/[;,]/).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    const results = [];
    for (let i = headerLineIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const rowValues = [];
      let insideQuote = false;
      let currentValue = "";
      
      for (let charIdx = 0; charIdx < line.length; charIdx++) {
        const char = line[charIdx];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if ((char === ',' || char === ';') && !insideQuote) {
          rowValues.push(currentValue.trim());
          currentValue = "";
        } else {
          currentValue += char;
        }
      }
      rowValues.push(currentValue.trim());
      
      const rowObj: Record<string, string> = {};
      headers.forEach((header, idx) => {
        let val = rowValues[idx] || "";
        val = val.replace(/^["']|["']$/g, '');
        rowObj[header] = val;
      });
      results.push(rowObj);
    }
    return results;
  };

  const handleOpenSchedule = (patient: PatientData, prefill?: { date?: string; time?: string; procedures?: string[] }) => {
    setSchedulePatient(patient);
    setScheduleDate(prefill?.date ? new Date(`${prefill.date}T00:00:00`) : new Date());
    setScheduleTime(prefill?.time || "09:00");
    setScheduleDuration(30);
    setScheduleNotes("");
    setScheduleSpecialties((patient as any)?.specialties || ((patient as any)?.assigned_specialty_id ? [(patient as any).assigned_specialty_id] : []));
    setScheduleClass((patient as any)?.assigned_class_id || "");
    setScheduleProcedures(prefill?.procedures || (Array.isArray((patient as any)?.treatment_types) ? (patient as any).treatment_types : []));
    setScheduleOpen(true);
  };

  // Turmas disponíveis para a especialidade escolhida no agendamento
  const availableScheduleClasses = scheduleSpecialties.length > 0
    ? classes.filter((c: any) => scheduleSpecialties.includes(c.specialty_id))
    : [];

  // Procedimentos disponíveis para a especialidade escolhida no agendamento
  const availableProcedures = scheduleSpecialties.length > 0
    ? procedures.filter((p: any) => scheduleSpecialties.includes(p.specialty_id))
    : [];

  const toggleProcedure = (id: string) =>
    setScheduleProcedures(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);


  const isLoading = pLoading || cLoading;

  // Turmas disponíveis (modal de detalhes) filtradas pela especialidade selecionada
  const availableDetailClasses = specialtiesSelection.length > 0
    ? classes.filter((c: any) => specialtiesSelection.includes(c.specialty_id))
    : classes;

  const availableProceduresForDetails = specialtiesSelection.length > 0
    ? procedures.filter((p: any) => specialtiesSelection.includes(p.specialty_id))
    : [];

  const handleOpenDetails = (patient: PatientData) => {
    setSelectedPatient(patient);
    setStatusSelection(patient.kanban_status || "aguardando_vaga");
    setSpecialtiesSelection((patient as any)?.specialties || ((patient as any)?.assigned_specialty_id ? [(patient as any).assigned_specialty_id] : []));
    setClassSelection((patient as any).assigned_class_id || "");
    setDateSelection(patient.scheduled_date ? patient.scheduled_date.split('T')[0] : "");
    setTimeSelection(patient.scheduled_date && patient.scheduled_date.includes('T') ? patient.scheduled_date.split('T')[1].substring(0, 5) : "");
    setProceduresSelection(Array.isArray((patient as any).treatment_types) ? (patient as any).treatment_types : []);
  };

  const handleSaveAndAdvance = () => {
    if (!selectedPatient) return;

    // Se a decisão for "Procedimento Agendado", abrir o modal de calendário em vez de salvar direto
    if (statusSelection === 'entrevista_agendada') {
      const patient = selectedPatient;
      setSelectedPatient(null);
      handleOpenSchedule(patient, { date: dateSelection, time: timeSelection, procedures: proceduresSelection });
      return;
    }

    const selectedClass = classes.find((c: any) => c.id === classSelection);
    const derivedClinicId = selectedClass?.clinic_id || "";

    routePatientsToClinic.mutate({
      id: selectedPatient.id,
      status: statusSelection,
      clinic_id: derivedClinicId,
      clinic_class: classSelection,
      specialty_id: specialtiesSelection[0] || "",
      specialties: specialtiesSelection,
      treatment_types: proceduresSelection,
    } as any, {
      onSuccess: () => setSelectedPatient(null)
    });
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
    const noteLine = `Não compareceu no Atendimento CAP no dia ${today}`;
    const newNotes = prevNotes ? `${prevNotes}\n${noteLine}` : noteLine;
    const newCount = (patient.no_show_count || 0) + 1;

    if (newCount >= 3) {
      routePatientsToClinic.mutate({
        id: patient.id,
        status: "declinado_falta",
        no_show_count: newCount,
        medical_history: newNotes
      });
      toast.success("Paciente atingiu 3 faltas e foi movido para 'Declinado por Falta'!");
    } else {
      routePatientsToClinic.mutate({
        id: patient.id,
        status: "faltou",
        no_show_count: newCount,
        medical_history: newNotes
      });
      toast.success("Paciente marcado como falta.");
    }
  };

  const onDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const patientId = e.dataTransfer.getData("patient_id");
    if (!patientId) return;

    const patient = patients.find((p: any) => p.id === patientId);
    if (!patient) return;

    if (columnId === 'faltou') {
      handleMarkNoShow(patient);
      return;
    }

    // Se for movido para "Procedimento Agendado", abrir modal de agendamento em vez de salvar direto
    if (columnId === 'entrevista_agendada') {
      handleOpenSchedule(patient as any);
      return;
    }
    routePatientsToClinic.mutate({ id: patientId, status: columnId });
  };

  const filteredPatients = applyTriageFilters(patients, filters);

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

  const columns = STATUS_COLUMNS.map(col => ({
    ...col,
    patients: expandedPatients.filter((p: any) => p.kanban_status === col.id)
  }));

  if ((pLoading || cLoading) && patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Activity className="h-12 w-12 text-blue-500 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-lg">Carregando Fila de Espera...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-[#0f172a] text-white border-b border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 opacity-50" />
        <div className="container mx-auto px-6 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">FILA 3: FILA DE ESPERA</h1>
              <p className="text-white/50 text-sm font-medium">Gestão de vagas clínicas e alocação de pacientes em turmas.</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="bg-card/5 border-white/10 text-white hover:bg-card/10 rounded-xl px-6 h-12 font-bold transition-all"
              >
                Painel Geral
              </Button>
              <Button 
                onClick={() => setImportOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 border-none text-white rounded-xl px-6 h-12 font-bold transition-all uppercase text-[10px] tracking-widest"
              >
                Importar CSV
              </Button>
              <Badge variant="outline" className="h-12 px-6 rounded-xl bg-card/5 border-white/10 text-white font-bold uppercase text-[10px] flex items-center gap-2 shadow-none transition-all">
                <UsersRound className="h-4 w-4" /> {patients.length} Pacientes em Fluxo
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 space-y-6 py-10 pb-32">
        <TriageFilters value={filters} onChange={setFilters} specialties={specialties} procedures={procedures} showUrgency triagedByUsers={triagedByUsers} />

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
          <div className="kanban-fixed-scroll">
            {columns.map(column => (
              <div
                key={column.id}
                className={`flex-1 min-w-[320px] flex flex-col gap-4 rounded-[2.5rem] border border-border bg-card/50 p-6 min-h-[70vh] md:min-h-0 transition-all duration-300 ${draggedOverColumn === column.id ? "ring-2 ring-blue-500/20 bg-blue-50/40 -translate-y-1" : ""}`}
                onDragOver={e => onDragOver(e, column.id)}
                onDragLeave={() => setDraggedOverColumn(null)}
                onDrop={e => onDrop(e, column.id)}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-2xl bg-card shadow-sm border border-border">{column.icon}</div>
                    <h3 className="font-extrabold text-foreground uppercase text-sm tracking-tight leading-none">{column.label}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-card/80 text-foreground font-black border shadow-sm rounded-lg px-2.5 text-sm">
                    {column.patients.length}
                  </Badge>
                </div>

                <div className="flex flex-col gap-4 md:flex-1 md:min-h-0 overflow-y-auto pr-1">
                  {column.patients.map((patient: any) => (
                    <CompactPatientCard
                      key={patient.duplicate_key}
                      patient={patient}
                      specialties={specialties}
                      onDragStart={onDragStart}
                      onClick={handleOpenDetails}
                    />
                  ))}

                  {column.patients.length === 0 && (
                    <div className="border-2 border-dashed border-border/30 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center opacity-40">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Arraste para cá</p>
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
                  <TableHead className="font-bold text-xs uppercase text-foreground">Especialidade</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-foreground">Procedimentos</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-foreground">Faltas</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-foreground">Tempo Parado</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-foreground">Status da Fila</TableHead>
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
                      {paginated.map((patient: any) => {
                        const currentStatus = STATUS_COLUMNS.find(c => c.id === patient.kanban_status);
                        const patientSpec = specialties.find(s => s.id === patient.display_specialty_id)?.name || "---";

                        return (
                          <TableRow key={patient.duplicate_key} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetails(patient as any)}>
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
                              {patient.urgency ? (
                                <Badge className={`text-[8px] px-1.5 py-0 font-black shadow-none border-none ${patient.urgency === 'alta' ? 'bg-rose-500' : patient.urgency === 'media' ? 'bg-amber-500 text-amber-950' : 'bg-emerald-500'}`}>
                                  {patient.urgency.toUpperCase()}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">---</span>
                              )}
                            </TableCell>
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
                              <Button variant="ghost" size="sm" className="h-8 rounded-xl font-bold text-xs uppercase" onClick={(e) => { e.stopPropagation(); handleOpenDetails(patient as any); }}>
                                Ver Prontuário
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {paginated.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-bold">
                            Nenhum paciente na fila de espera.
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

        {/* DIALOG DE IMPORTAÇÃO CSV */}
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight">Importar Pacientes (CSV)</DialogTitle>
              <DialogDescription>
                Selecione uma planilha em formato CSV com as colunas: <strong>Nome, CPF, Telefone, Cidade/UF, Urgencia, Observacoes</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="p-4 rounded-xl border bg-muted/30 text-xs text-muted-foreground leading-relaxed">
                <p className="font-bold text-foreground mb-1">Notas importantes:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>CPFs já existentes no banco de dados serão ignorados automaticamente para evitar duplicidade.</li>
                  <li>O arquivo deve usar delimitador de ponto e vírgula (;) ou vírgula (,).</li>
                  <li>Todos os dados textuais importados serão salvos em MAIÚSCULAS no prontuário.</li>
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-black uppercase tracking-widest">Planilha CSV *</Label>
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  disabled={importing} 
                  className="rounded-xl cursor-pointer"
                />
              </div>
              <div className="flex flex-col gap-2 mt-4">
                <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importAsOldContacts}
                    onChange={(e) => setImportAsOldContacts(e.target.checked)}
                    className="rounded border-input text-primary focus:ring-primary"
                  />
                  Importar como contatos antigos (data de chegada há mais de 1 ano)
                </Label>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t border-border pt-4">
              <Button 
                variant="outline" 
                onClick={downloadCsvTemplate} 
                className="rounded-xl font-bold uppercase text-xs w-full sm:w-auto"
              >
                Baixar Modelo CSV
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => setImportOpen(false)} 
                className="rounded-xl font-bold uppercase text-xs w-full sm:w-auto text-muted-foreground"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedPatient} onOpenChange={open => { if (!open) setSelectedPatient(null); }}>
          <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
            <DialogHeader className="p-8 bg-card text-foreground border-b border-border">
               <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-sm">
                    <GraduationCap className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground uppercase truncate">{selectedPatient?.full_name}</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1">Atendimento CAP • Alocação de Turmas</DialogDescription>
                  </div>
               </div>
            </DialogHeader>

            <div className="p-8 space-y-12 bg-card">
              {selectedPatient && <PatientRecordView patient={selectedPatient} />}

              <div className="space-y-10 pt-8 border-t border-border">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" /> Decisão da Distribuição
                    </h4>
                    <RadioGroup value={statusSelection} onValueChange={setStatusSelection} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {STATUS_COLUMNS.map(col => (
                        <div 
                          key={col.id} 
                          className={`flex items-center space-x-3 p-4 rounded-2xl border transition-all cursor-pointer ${statusSelection === col.id ? 'bg-card border-foreground/20 ring-2 ring-slate-900/5' : 'bg-slate-50/30 border-border opacity-60'}`}
                          onClick={() => setStatusSelection(col.id)}
                        >
                          <RadioGroupItem value={col.id} id={col.id} className="text-foreground" />
                          <Label htmlFor={col.id} className="font-bold text-slate-700 cursor-pointer text-[10px] uppercase tracking-tight">{col.label}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                 </div>

                 {(statusSelection === 'entrevista_agendada' || statusSelection === 'em_negociacao') && (
                   <div className="p-8 rounded-[2rem] bg-blue-50 border border-blue-100 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400">
                     <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-xl bg-card flex items-center justify-center border border-blue-100"><MapPin className="h-4 w-4 text-blue-500" /></div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900">Alocação Clínica</h4>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-blue-700/70 ml-1 block mb-2">Especialidade</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-blue-100 bg-white/50 p-3">
                            {specialties.filter((s: any) => s.is_active).map((s: any) => (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                                <input
                                  type="checkbox"
                                  checked={specialtiesSelection.includes(s.id)}
                                  onChange={() => {
                                    setSpecialtiesSelection(prev => {
                                      const newVal = prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id];
                                      const cls = classes.find((c: any) => c.id === classSelection);
                                      if (cls && !newVal.includes(cls.specialty_id)) setClassSelection("");
                                      return newVal;
                                    });
                                  }}
                                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                />
                                {s.name}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-blue-700/70 ml-1">Turma de Destino</Label>
                          <Select value={classSelection} onValueChange={setClassSelection} disabled={specialtiesSelection.length === 0}>
                            <SelectTrigger className="bg-card border-none h-12 rounded-xl text-sm font-bold shadow-sm">
                              <SelectValue placeholder={specialtiesSelection.length > 0 ? "Escolha a Turma" : "Selecione uma especialidade"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {availableDetailClasses.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground italic">Nenhuma turma para esta especialidade</div>
                              ) : availableDetailClasses.map((c: any) => {
                                const clinic = clinics.find((cl: any) => cl.id === c.clinic_id);
                                return (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}{clinic ? ` — ${clinic.name}` : ""}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {statusSelection === 'entrevista_agendada' && (
                          <>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-bold uppercase text-blue-700/70 ml-1">Data Prevista</Label>
                              <Input type="date" className="bg-card border-none h-12 rounded-xl shadow-sm text-sm font-bold" value={dateSelection} onChange={(e) => setDateSelection(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[9px] font-bold uppercase text-blue-700/70 ml-1">Horário (Opcional)</Label>
                              <Input type="time" className="bg-card border-none h-12 rounded-xl shadow-sm text-sm font-bold" value={timeSelection} onChange={(e) => setTimeSelection(e.target.value)} />
                            </div>
                          </>
                        )}
                     </div>

                     <div className="pt-2">
                       <Label className="text-xs font-bold uppercase text-blue-700/70 ml-1 block mb-2">Procedimentos</Label>
                       {!specialtiesSelection || specialtiesSelection.length === 0 ? (
                         <p className="text-xs text-muted-foreground italic ml-1">Selecione uma especialidade para ver os procedimentos disponíveis.</p>
                       ) : availableProceduresForDetails.length === 0 ? (
                         <p className="text-xs text-muted-foreground italic ml-1">Nenhum procedimento cadastrado para esta especialidade.</p>
                       ) : (
                         <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-blue-100 bg-white/50 p-3">
                           {availableProceduresForDetails.map((proc: any) => (
                             <label key={proc.id} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                               <input
                                 type="checkbox"
                                 checked={proceduresSelection.includes(proc.id)}
                                 onChange={() => setProceduresSelection(prev => prev.includes(proc.id) ? prev.filter(x => x !== proc.id) : [...prev, proc.id])}
                                 className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                               />
                               {proc.name}
                             </label>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>
                 )}

                 {/* Migração de Etapa */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6 border-t border-border">
                   <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-amber-500 block ml-1 flex items-center gap-1.5">
                        <RotateCcw className="h-3 w-3" /> Migrar para Outra Etapa
                      </Label>
                      <Select
                        value={selectedPatient?.current_stage}
                        onValueChange={val => {
                          routePatientsToClinic.mutate({ id: selectedPatient!.id, status: val });
                          setSelectedPatient(null);
                        }}
                      >
                        <SelectTrigger className="bg-amber-50/30 hover:bg-amber-50/50 border-amber-100/50 font-bold h-11 rounded-xl shadow-none text-amber-700 text-xs uppercase">
                          <SelectValue placeholder="Mover para outra fila..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-amber-50 shadow-xl">
                          <SelectItem value="step1_atendimento">Agendamento Triagem 3</SelectItem>
                          <SelectItem value="step2_triagem_clinica">Fila 2: Triagem Clínica 3</SelectItem>
                          <SelectItem value="step3_selecao_cap">Fila de Espera (atual)</SelectItem>
                          <SelectItem value="arquivado">Arquivar Registro</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                 </div>

                 <div className="p-10 rounded-[2.5rem] bg-indigo-50 border border-indigo-100 flex flex-col md:flex-row items-center gap-8 group">
                   <div className="bg-card h-20 w-20 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-indigo-500/10 border border-indigo-50 group-hover:scale-110 transition-transform flex-shrink-0">
                      <ArrowRight className="h-10 w-10 text-indigo-500" />
                   </div>
                   <div className="text-center md:text-left space-y-2 flex-1">
                     <h4 className="font-extrabold text-indigo-900 text-xl tracking-tight uppercase">Confirmar Direcionamento</h4>
                     <p className="text-indigo-700/70 text-xs font-bold uppercase leading-relaxed">Persistir alterações no prontuário do paciente e atualizar o Atendimento CAP.</p>
                   </div>
                   <Button 
                     className="bg-indigo-600 hover:bg-indigo-700 text-white font-black h-14 px-10 rounded-2xl shadow-xl shadow-indigo-500/20 uppercase tracking-widest text-xs transition-all whitespace-nowrap"
                     disabled={
                       routePatientsToClinic.isPending || 
                       !statusSelection || 
                       (statusSelection === 'entrevista_agendada' && (!dateSelection || !timeSelection))
                     }
                     onClick={handleSaveAndAdvance}
                   >
                     {routePatientsToClinic.isPending ? "Processando..." : "Salvar Mudanças"}
                   </Button>
                 </div>
              </div>
            </div>

            <div className="p-6 bg-muted/50 border-t border-border flex flex-col sm:flex-row gap-4 justify-center items-center font-bold text-muted-foreground">
               <Button variant="ghost" onClick={() => setSelectedPatient(null)} className="hover:text-slate-600 hover:bg-transparent uppercase text-[10px] tracking-widest">FECHAR FICHA</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* MODAL: Agendar Procedimento CAP (calendário) */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent className="sm:max-w-[480px] rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight">
                Agendar Procedimento — Atendimento CAP
              </DialogTitle>
              <DialogDescription>
                {schedulePatient?.full_name || "Paciente"} — selecione data, horário e duração.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Data *</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-bold h-11 rounded-xl",
                        !scheduleDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduleDate ? format(scheduleDate, "PPP", { locale: ptBR }) : "Escolha uma data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComp
                      mode="single"
                      selected={scheduleDate}
                      onSelect={(d) => {
                        setScheduleDate(d);
                        setCalendarOpen(false);
                      }}
                      initialFocus
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Horário *</Label>
                  <Input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="h-11 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Duração (min)</Label>
                  <Input
                    type="number"
                    min={5}
                    step={5}
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(Number(e.target.value) || 30)}
                    className="h-11 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Especialidade *</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-border p-3">
                  {specialties.filter((s: any) => s.is_active).map((s: any) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={scheduleSpecialties.includes(s.id)}
                        onChange={() => {
                          setScheduleSpecialties(prev => {
                            const newVal = prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id];
                            // clear class if it doesn't match new specialties
                            const cls = classes.find((c: any) => c.id === scheduleClass);
                            if (cls && !newVal.includes(cls.specialty_id)) setScheduleClass("");
                            return newVal;
                          });
                        }}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Turma *</Label>
                <Select value={scheduleClass} onValueChange={(v) => setScheduleClass(v)} disabled={scheduleSpecialties.length === 0}>
                  <SelectTrigger className="h-11 rounded-xl font-bold">
                    <SelectValue placeholder={scheduleSpecialties.length > 0 ? "Escolha a turma" : "Selecione uma especialidade"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {availableScheduleClasses.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground italic">Nenhuma turma para esta especialidade</div>
                    ) : availableScheduleClasses.map((c: any) => {
                      const clinic = clinics.find((cl: any) => cl.id === c.clinic_id);
                      return (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{clinic ? ` — ${clinic.name}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Procedimentos *</Label>
                {!scheduleSpecialties || scheduleSpecialties.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Selecione uma especialidade para ver os procedimentos disponíveis.</p>
                ) : availableProcedures.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum procedimento cadastrado para esta especialidade.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-border p-3">
                    {availableProcedures.map((proc: any) => (
                      <label key={proc.id} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={scheduleProcedures.includes(proc.id)}
                          onChange={() => toggleProcedure(proc.id)}
                          className="h-4 w-4 rounded border-border"
                        />
                        {proc.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs font-black uppercase tracking-widest mb-2 block">Observações</Label>
                <Textarea
                  value={scheduleNotes}
                  onChange={(e) => setScheduleNotes(e.target.value)}
                  placeholder="Opcional"
                  className="rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setScheduleOpen(false)} className="font-bold uppercase">
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs"
                disabled={!schedulePatient || !scheduleDate || !scheduleTime || scheduleSpecialties.length === 0 || !scheduleClass || scheduleProcedures.length === 0 || createClinicalAppt.isPending}
                onClick={async () => {
                  if (!schedulePatient || !scheduleDate) return;
                  if (scheduleSpecialties.length === 0) { toast.error("Selecione a especialidade."); return; }
                  if (!scheduleClass) { toast.error("Selecione a turma."); return; }
                  if (scheduleProcedures.length === 0) { toast.error("Selecione ao menos um procedimento."); return; }
                  const dateStr = format(scheduleDate, "yyyy-MM-dd");
                  const procNames = scheduleProcedures
                    .map(id => procedures.find((p: any) => p.id === id)?.name)
                    .filter(Boolean)
                    .join(", ");
                  const fullNotes = [scheduleNotes, procNames ? `Procedimentos: ${procNames}` : ""].filter(Boolean).join(" | ");
                  const selectedClass = classes.find((c: any) => c.id === scheduleClass);
                  try {
                    await createClinicalAppt.mutateAsync({
                      patient_id: schedulePatient.id,
                      patient_name: schedulePatient.full_name,
                      scheduled_date: dateStr,
                      start_time: scheduleTime,
                      duration_min: scheduleDuration,
                      notes: fullNotes,
                    });
                    // Move o paciente para "Procedimento Agendado" e salva especialidade + turma + procedimentos
                    routePatientsToClinic.mutate({
                      id: schedulePatient.id,
                      status: 'entrevista_agendada',
                      specialty_id: scheduleSpecialties[0] || "",
                      specialties: scheduleSpecialties,
                      clinic_class: scheduleClass,
                      clinic_id: selectedClass?.clinic_id || "",
                      scheduled_date: `${dateStr}T${scheduleTime}:00`,
                      treatment_types: scheduleProcedures,
                    } as any);
                    setScheduleOpen(false);
                  } catch (e) {
                    // erro tratado no hook
                  }
                }}
              >
                {createClinicalAppt.isPending ? "Salvando..." : "Confirmar Agendamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
