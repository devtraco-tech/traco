import { useState, useEffect, useMemo } from "react";
import { usePreTriage } from "@/hooks/usePreTriage";
import { useTriageConfig } from "@/hooks/useTriageConfig";
import { PatientData } from "@/hooks/mockPatientStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, UserPlus, Search,
  Phone, Calendar, AlertCircle, CheckCircle2,
  Clock, User, Activity, Building2, ChevronRight,
  ArrowRight, Stethoscope, MapPin, Mail, Pencil, Save, X, MessageCircle,
  LayoutGrid, List
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildWhatsappUrl, buildPatientWhatsappMessage } from "@/lib/whatsapp";
import { uppercasePatientPayload } from "@/lib/text";
import { CityCombobox } from "@/components/triage/CityCombobox";
import { BR_STATES } from "@/lib/brazil";
import { toast } from "sonner";
import { PatientRecordView } from "@/components/PatientRecordView";
import { CompactPatientCard } from "@/components/triage/CompactPatientCard";
import { TriageFilters, DEFAULT_FILTERS, applyTriageFilters } from "@/components/triage/TriageFilters";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReceptionSchedule } from "@/hooks/useReceptionSchedule";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeCpf, isValidCpfFormat, formatCpf } from "@/lib/cpfUtils";
import { DuplicateCpfDialog, ExistingPatientInfo } from "@/components/triage/DuplicateCpfDialog";

const KANBAN_COLUMNS = [
  {
    id: "entrada",
    label: "Novos / Pendentes",
    icon: <Clock className="h-4 w-4 text-amber-500" />,
    bg: "bg-amber-100 dark:bg-amber-950/30",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    badgeLabel: "Pendente",
  },
  {
    id: "aguardando_retorno",
    label: "Aguardando Retorno",
    icon: <Clock className="h-4 w-4 text-purple-500" />,
    bg: "bg-purple-100 dark:bg-purple-950/30",
    badge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    badgeLabel: "Retorno",
  },
  {
    id: "contato_realizado",
    label: "Agendados / Confirmados",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    bg: "bg-emerald-100 dark:bg-emerald-950/30",
    badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    badgeLabel: "Confirmado",
  },
  {
    id: "faltou",
    label: "Faltas / Não Compareceu",
    icon: <AlertCircle className="h-4 w-4 text-rose-500" />,
    bg: "bg-rose-100 dark:bg-rose-950/30",
    badge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    badgeLabel: "Faltou",
  },
];

const EMPTY_FORM = {
  full_name: "",
  phone: "",
  mobile_phone: "",
  cpf: "",
  email: "",
  birth_date: "",
  gender: "",
  city: "",
  state: "",
  treatment_needed: "",
  assigned_clinic_id: "",
  already_triaged: false,
  triaged_specialty_id: "",
};


export default function PreTriageReception() {
  const { patients, isLoading: pLoading, updatePatient, advanceToClinicalTriage, createPatient } = usePreTriage();
  const { clinics, specialties, procedures, isLoading: cLoading } = useTriageConfig();

  const { appointments, create: createAppt, update: updateAppt, remove: removeAppt } = useReceptionSchedule();

  const formatApptDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    try {
      const clean = dateStr.trim();
      const d = clean.includes("T") ? new Date(clean) : new Date(`${clean}T00:00:00`);
      if (isNaN(d.getTime())) return "Data inválida";
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    } catch (err) {
      return "Data inválida";
    }
  };
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);
  const [newPatientData, setNewPatientData] = useState({ ...EMPTY_FORM });

  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [expandedPatients, setExpandedPatients] = useState<string[]>([]);
  
  const triagedByUsers = useMemo(() => {
    if (!patients) return [];
    return Array.from(new Set(patients.map(p => p.triaged_by_name).filter(Boolean))) as string[];
  }, [patients]);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, viewMode]);

  // Modal de agendamento
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [schedulePatient, setSchedulePatient] = useState<PatientData | null>(null);
  const [moveAfterSchedule, setMoveAfterSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [scheduleDuration, setScheduleDuration] = useState(30);
  const [scheduleNotes, setScheduleNotes] = useState("");

  // Duplicata de CPF
  const [duplicateInfo, setDuplicateInfo] = useState<ExistingPatientInfo | null>(null);

  const handleOpenDetails = (patient: PatientData) => {
    setSelectedPatient(patient);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (!selectedPatient) return;
    setEditData({
      full_name: selectedPatient.full_name || "",
      cpf: (selectedPatient as any).cpf || "",
      mobile_phone: (selectedPatient as any).mobile_phone || "",
      phone: (selectedPatient as any).phone || "",
      email: (selectedPatient as any).email || "",
      birth_date: (selectedPatient as any).birth_date ? (selectedPatient as any).birth_date.split("T")[0] : "",
      gender: (selectedPatient as any).gender || "",
      city: (selectedPatient as any).city || "",
      state: (selectedPatient as any).state || "",
      treatment_needed: (selectedPatient as any).treatment_needed || "",
      assigned_clinic_id: (selectedPatient as any).assigned_clinic_id || "",
      reception_status: selectedPatient.reception_status || "entrada",
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPatient) return;

    const newCpfNorm = normalizeCpf(editData.cpf);
    const oldCpfNorm = normalizeCpf((selectedPatient as any).cpf);

    // Se o CPF foi alterado, valida formato e checa duplicidade
    if (newCpfNorm && newCpfNorm !== oldCpfNorm) {
      if (!isValidCpfFormat(newCpfNorm)) {
        toast.error("CPF inválido. Informe os 11 dígitos.");
        return;
      }
      const cpfFormatted = formatCpf(newCpfNorm);
      const { data: dup } = await (supabase as any)
        .from("patients")
        .select("id, full_name, cpf, current_stage, created_at")
        .or(`cpf.eq.${newCpfNorm},cpf.eq.${cpfFormatted}`)
        .neq("id", selectedPatient.id)
        .limit(1)
        .maybeSingle();
      if (dup) {
        setDuplicateInfo(dup as ExistingPatientInfo);
        return;
      }
    }

    const payload: any = uppercasePatientPayload({
      ...editData,
      cpf: newCpfNorm || null,
      assigned_clinic_id: editData.assigned_clinic_id || null,
      birth_date: editData.birth_date || null,
    });

    updatePatient.mutate(
      { id: selectedPatient.id, updates: payload },
      {
        onSuccess: (updatedData) => {
          setIsEditing(false);
          setSelectedPatient(prev => updatedData ? { ...prev, ...updatedData } : { ...prev, ...payload });
          toast.success("Dados do paciente atualizados!");
        },
      }
    );
  };


  const setEditField = (field: string, value: string) =>
    setEditData(prev => ({ ...prev, [field]: value }));


  const handleReceptionStatusChange = (patientId: string, newStatus: string) => {
    updatePatient.mutate({ id: patientId, updates: { reception_status: newStatus } });
    if (selectedPatient?.id === patientId) {
      setSelectedPatient(prev => prev ? { ...prev, reception_status: newStatus as any } : prev);
    }
  };

  const handleChecklistToggle = (field: 'chk_necessities' | 'chk_orientation' | 'chk_dentaloffice' | 'chk_scheduled') => {
    if (!selectedPatient?.id) return;
    const newValue = !Boolean((selectedPatient as any)[field]);
    
    updatePatient.mutate(
      { id: selectedPatient.id, updates: { [field]: newValue } },
      {
        onSuccess: (updatedData) => {
          setSelectedPatient(prev => prev ? { ...prev, ...updatedData } : null);
        }
      }
    );
  };

  const isChecklistComplete = Boolean(selectedPatient?.chk_scheduled);


  const handleStageChange = (patientId: string, newStage: string) => {
    const updates: any = { current_stage: newStage };
    if (newStage === 'step2_triagem_clinica') updates.dentist_status = 'agendado';
    if (newStage === 'step3_selecao_cap') updates.cap_status = 'aguardando_vaga';
    updatePatient.mutate({ id: patientId, updates });
    toast.success(`Paciente movido para ${newStage === 'step2_triagem_clinica' ? 'Triagem Clínica 3' : newStage === 'step3_selecao_cap' ? 'Atendimento CAP' : 'Recepção'}!`);
    setSelectedPatient(null);
  };

  const handleCreatePatient = async () => {
    const required: { key: keyof typeof newPatientData; label: string }[] = [
      { key: "full_name", label: "Nome completo" },
      { key: "cpf", label: "CPF" },
      { key: "mobile_phone", label: "Celular" },
      { key: "birth_date", label: "Data de nascimento" },
      { key: "gender", label: "Gênero" },
      { key: "city", label: "Cidade" },
      { key: "state", label: "Estado (UF)" },
      { key: "treatment_needed", label: "Tratamento desejado" },
    ];
    const missing = required.filter((r) => !String(newPatientData[r.key] || "").trim());
    if (missing.length) {
      toast.error(`Campos obrigatórios: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    const cpfNormalized = normalizeCpf(newPatientData.cpf);
    if (!isValidCpfFormat(cpfNormalized)) {
      toast.error("CPF inválido. Informe os 11 dígitos.");
      return;
    }

    // Checagem de duplicata: tenta tanto o CPF normalizado quanto o formatado (legado)
    const cpfFormatted = formatCpf(cpfNormalized);
    const { data: dup, error: dupErr } = await (supabase as any)
      .from("patients")
      .select("id, full_name, cpf, current_stage, created_at")
      .or(`cpf.eq.${cpfNormalized},cpf.eq.${cpfFormatted}`)
      .limit(1)
      .maybeSingle();

    if (dupErr) {
      console.error("Erro ao verificar CPF duplicado:", dupErr);
    }

    if (dup) {
      setDuplicateInfo(dup as ExistingPatientInfo);
      return;
    }

    if (newPatientData.already_triaged && !newPatientData.triaged_specialty_id) {
      toast.error("Selecione a especialidade de destino do paciente já triado.");
      return;
    }

    const { already_triaged, triaged_specialty_id, ...formRest } = newPatientData;

    const payload: any = uppercasePatientPayload({
      ...formRest,
      cpf: cpfNormalized,
      assigned_clinic_id: newPatientData.assigned_clinic_id || null,
      birth_date: newPatientData.birth_date || null,
    });

    if (already_triaged && triaged_specialty_id) {
      // Pula a coluna "Novos/Pendentes" e vai direto para a fila da especialidade (CAP)
      payload.current_stage = "step3_selecao_cap";
      payload.reception_status = "contato_realizado";
      payload.assigned_specialty_id = triaged_specialty_id;
      payload.specialties = [triaged_specialty_id];
      payload.cap_status = "aguardando_vaga";
      payload.is_return = false;
    }


    createPatient.mutate(payload, {
      onSuccess: () => {
        setIsAddingPatient(false);
        setNewPatientData({ ...EMPTY_FORM });
      },
    });
  };


  const patientHasAppointment = (patient: any) => {
    if (Boolean(patient?.chk_scheduled)) return true;
    return (appointments || []).some(
      (a: any) => a.patient_id === patient.id && a.status !== "canceled"
    );
  };

  const openScheduleFor = (patient: any, andMove: boolean) => {
    setSchedulePatient(patient);
    setMoveAfterSchedule(andMove);
    setScheduleDate(new Date());
    setScheduleTime("09:00");
    setScheduleDuration(30);
    setScheduleNotes("");
    setScheduleOpen(true);
  };

  const handleMarkNoShow = async (patient: any) => {
    // Cancela agendamentos ativos do paciente (em vez de remover, assim mantemos a data do agendamento perdido)
    const active = (appointments || []).filter(
      (a: any) => a.patient_id === patient.id && a.status !== "canceled" && a.status !== "cancelled"
    );
    for (const a of active) {
      try {
        await updateAppt.mutateAsync({ id: a.id, updates: { status: "canceled" } });
      } catch (err) {
        console.error("Erro ao cancelar agendamento:", err);
      }
    }
    // Anotação de não comparecimento preservando histórico
    const today = format(new Date(), "dd/MM/yyyy", { locale: ptBR });
    const prevNotes = (patient.medical_history || "").trim();
    const noteLine = `Não compareceu no dia ${today}`;
    const newNotes = prevNotes ? `${prevNotes}\n${noteLine}` : noteLine;
    const newCount = (patient.no_show_count || 0) + 1;

    const updates: any = {
      chk_scheduled: false,
      medical_history: newNotes,
      no_show_count: newCount,
    };

    if (newCount >= 3) {
      updates.current_stage = "step3_selecao_cap";
      updates.cap_status = "declinado_falta";
      updates.reception_status = "contato_realizado"; // Para manter consistência
      toast.success("Paciente marcado como falta. Atingiu 3 faltas e foi movido para 'Declinado por Falta' na Fila de Espera.");
    } else {
      updates.reception_status = "faltou";
      toast.success("Paciente marcado como falta.");
    }

    updatePatient.mutate({
      id: patient.id,
      updates,
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

  const onDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const patientId = e.dataTransfer.getData("patient_id");
    if (!patientId) return;
    const patient = (patients as any[]).find(p => p.id === patientId);
    if (!patient) return;

    if (columnId === "contato_realizado") {
      if (!patientHasAppointment(patient)) {
        openScheduleFor(patient, true);
        return;
      }
      handleReceptionStatusChange(patientId, columnId);
      toast.success("Movido para Agendados / Confirmados!");
      return;
    }

    if (columnId === "faltou") {
      handleMarkNoShow(patient);
      return;
    }

    handleReceptionStatusChange(patientId, columnId);
    toast.success("Status atualizado!");
  };

  const filteredPatients = applyTriageFilters(patients as any[], filters);

  const stats = {
    total: patients.length,
    new: patients.filter(p => p.reception_status === "entrada").length,
    contacted: patients.filter(p => p.reception_status === "contato_realizado").length,
    noShow: patients.filter(p => p.reception_status === "faltou").length,
  };

  const setField = (field: string, value: string | boolean) =>
    setNewPatientData(prev => ({ ...prev, [field]: value }));


  if ((pLoading || cLoading) && patients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Activity className="h-12 w-12 text-blue-500 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-lg">Carregando Recepção...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-[#0f172a] text-white border-b border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10 opacity-50" />
        <div className="container mx-auto px-6 py-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">FILA  1: AGENDAMENTO TRIAGEM 3</h1>
              <p className="text-white/50 text-sm font-medium">Primeiro contato e agendamento da triagem clínica de pacientes.</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="bg-card/5 border-white/10 text-white hover:bg-card/10 rounded-xl px-6 h-12 font-bold transition-all"
              >
                Painel Geral
              </Button>
              <Button onClick={() => setIsAddingPatient(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black h-12 px-8 rounded-xl shadow-xl shadow-blue-500/20 transition-all border-none uppercase tracking-widest text-xs">
                <UserPlus className="h-5 w-5 mr-3" /> NOVO CADASTRO
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 space-y-10 pb-32">

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total no Fluxo", val: stats.total, icon: <Users className="h-4 w-4" />, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
          { label: "Pendentes", val: stats.new, icon: <Clock className="h-4 w-4" />, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
          { label: "Agendados", val: stats.contacted, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
          { label: "Faltas", val: stats.noShow, icon: <AlertCircle className="h-4 w-4" />, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-2xl border ${stat.color} shadow-sm group hover:-translate-y-1 transition-all duration-300 bg-card`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{stat.label}</p>
                <p className="text-3xl font-black tracking-tight text-foreground">{stat.val}</p>
              </div>
              <div className="p-3 rounded-xl bg-background shadow-sm border border-border group-hover:scale-110 transition-transform">
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <TriageFilters value={filters} onChange={setFilters} specialties={specialties || []} procedures={procedures || []} triagedByUsers={triagedByUsers} />

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
          {KANBAN_COLUMNS.map(column => (
            <div
              key={column.id}
              className={`flex-1 min-w-[320px] flex flex-col gap-4 rounded-[2.5rem] border border-border ${column.bg} p-6 min-h-[70vh] md:min-h-0 transition-all duration-300 ${draggedOverColumn === column.id ? "ring-2 ring-blue-500/20 bg-blue-50/40 -translate-y-1" : ""}`}
              onDragOver={e => onDragOver(e, column.id)}
              onDragLeave={() => setDraggedOverColumn(null)}
              onDrop={e => onDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-card shadow-sm border border-border">{column.icon}</div>
                  <h3 className="font-extrabold text-foreground uppercase text-sm tracking-tight leading-none">{column.label}</h3>
                </div>
                <Badge variant="secondary" className="bg-card/80 text-foreground font-black border shadow-sm rounded-lg px-2.5 text-sm">
                  {filteredPatients.filter(p => (p.reception_status || "entrada") === column.id).length}
                </Badge>
              </div>

              {/* Cards */}
              <div className="flex flex-col gap-4 md:flex-1 md:min-h-0 overflow-y-auto pr-1">
                {filteredPatients
                  .filter(p => (p.reception_status || "entrada") === column.id)
                  .map(patient => (
                    <CompactPatientCard
                      patient={patient}
                      specialties={specialties || []}
                      onDragStart={onDragStart}
                      onClick={handleOpenDetails}
                    >
                      <div className="mt-1 flex items-center justify-between gap-2">
                        {(() => {
                          const patientAppts = (appointments || [])
                            .filter((a: any) => a.patient_id === patient.id)
                            .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
                          if (patientAppts.length === 0) return <div />;
                          const activeAppt = patientAppts.find((a: any) => a.status !== "canceled" && a.status !== "cancelled");
                          const appt = activeAppt || patientAppts[0];
                          const isMiss = (patient.reception_status || "entrada") === "faltou" || appt.status === "canceled" || appt.status === "cancelled";
                          return (
                            <div className={`flex items-center gap-1.5 text-[9px] font-bold ${isMiss ? "text-rose-500" : "text-emerald-600"}`}>
                              <Calendar className="h-3 w-3" />
                              {isMiss ? "Faltou em " : "Agendado p/ "}
                              {formatApptDate(appt.scheduled_date)}
                              {appt.start_time ? ` ${appt.start_time}` : ""}
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 truncate">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{clinics?.find(c => c.id === patient.assigned_clinic_id)?.name || "Sem clínica"}</span>
                        </div>
                      </div>
                    </CompactPatientCard>

                  ))}

                {filteredPatients.filter(p => (p.reception_status || "entrada") === column.id).length === 0 && (
                  <div className="border-2 border-dashed border-border/30 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center group/empty transition-all hover:border-blue-500/30">
                    <div className="h-16 w-16 rounded-[2rem] bg-card border border-border shadow-sm flex items-center justify-center mb-4 group-hover/empty:scale-110 transition-transform">
                      {column.icon}
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover/empty:text-blue-500 transition-colors">Arraste para cá</p>
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
                <TableHead className="font-bold text-xs uppercase text-foreground">Cidade - UF</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Queixa/Necessidade</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Agendamento</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Faltas</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Tempo Parado</TableHead>
                <TableHead className="font-bold text-xs uppercase text-foreground">Status</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const itemsPerPage = 10;
                const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
                const paginated = filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                
                return (
                  <>
                    {paginated.map(patient => {
                      const patientAppts = (appointments || [])
                        .filter((a: any) => a.patient_id === patient.id)
                        .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime());
                      const activeAppt = patientAppts.find((a: any) => a.status !== "canceled" && a.status !== "cancelled");
                      const appt = activeAppt || patientAppts[0];
                      
                      const currentStatus = KANBAN_COLUMNS.find(c => c.id === (patient.reception_status || "entrada"));
                      const isMiss = (patient.reception_status || "entrada") === "faltou" || appt?.status === "canceled" || appt?.status === "cancelled";

                      return (
                        <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetails(patient)}>
                          <TableCell className="font-bold text-foreground">
                            <div>{patient.full_name}</div>
                            <div className="text-[10px] text-muted-foreground font-semibold mb-1">{patient.cpf || "Sem CPF"} • {patient.mobile_phone || "Sem Celular"}</div>
                            <div className="flex gap-1 flex-wrap">
                              {patient.is_return && (
                                <Badge className="bg-amber-500 text-white text-[8px] px-1.5 py-0 font-black border-none">
                                  RETORNO
                                </Badge>
                              )}
                              {(() => {
                                const specId = patient.specialties?.[0] || patient.assigned_specialty_id;
                                const specName = specId && specialties ? specialties.find((s: any) => s.id === specId)?.name : null;
                                if (specName) {
                                  return (
                                    <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-purple-100 bg-purple-50 text-purple-600 font-bold uppercase dark:bg-purple-900/20 dark:border-purple-800">
                                      {specName}
                                    </Badge>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{patient.city ? `${patient.city} - ${patient.state}` : "---"}</TableCell>
                          <TableCell className="text-xs italic">"{patient.treatment_needed || "Não informado"}"</TableCell>
                          <TableCell className="text-xs">
                            {appt?.scheduled_date ? (
                              <div className={cn("font-bold", isMiss ? "text-rose-500" : "text-emerald-600")}>
                                {isMiss ? "Faltou em: " : "Agendado p/: "}
                                {formatApptDate(appt.scheduled_date)} {appt.start_time || ""}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Não agendado</span>
                            )}
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
                            <Badge className={cn("font-bold text-[10px] rounded-lg border", currentStatus?.badge)}>
                              {currentStatus?.badgeLabel || "Pendente"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 rounded-xl font-bold text-xs uppercase" onClick={(e) => { e.stopPropagation(); handleOpenDetails(patient); }}>
                              Ver Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {paginated.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-bold">
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
            const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
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

      {/* MODAL: Patient Details */}
      <Dialog open={!!selectedPatient} onOpenChange={open => { if (!open) { setSelectedPatient(null); setIsEditing(false); } }}>
        <DialogContent className="sm:max-w-[750px] max-h-[95vh] overflow-y-auto p-0 border-none shadow-2xl rounded-3xl">
          <DialogHeader className="p-8 bg-card text-foreground border-b border-border">
            <div className="flex items-center gap-6">
              <div className={`h-16 w-16 rounded-3xl flex items-center justify-center border shadow-sm transition-all ${isEditing ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'}`}>
                {isEditing ? <Pencil className="h-8 w-8 text-amber-500" /> : <User className="h-8 w-8 text-blue-500" />}
              </div>
              <div className="text-left flex-1 min-w-0">
                <DialogTitle className="text-2xl font-extrabold tracking-tight text-foreground uppercase truncate">
                  {isEditing ? "Editar Dados do Paciente" : selectedPatient?.full_name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
                  {isEditing ? "Ajuste as informações e salve para confirmar" : `Agendamento Triagem 3 • ${selectedPatient?.reception_status?.replace("_", " ")}`}
                </DialogDescription>
              </div>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                  className="h-9 px-4 rounded-xl border-border text-muted-foreground hover:bg-muted/30 font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5 flex-shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" /> EDITAR
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditing(false)}
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-rose-500 hover:bg-rose-50 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="p-8 space-y-10 bg-card">
            {/* VIEW MODE */}
            {!isEditing && selectedPatient && <PatientRecordView patient={selectedPatient} />}

            {/* EDIT MODE */}
            {isEditing && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dados Pessoais</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</Label>
                      <Input className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={editData.full_name || ""} onChange={e => setEditField("full_name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF</Label>
                      <Input placeholder="000.000.000-00" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={editData.cpf || ""} onChange={e => setEditField("cpf", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Nascimento</Label>
                      <Input type="date" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={editData.birth_date || ""} onChange={e => setEditField("birth_date", e.target.value)} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gênero</Label>
                      <Select value={editData.gender || ""} onValueChange={val => setEditField("gender", val)}>
                        <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contato</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Celular / WhatsApp</Label>
                      <Input placeholder="(00) 00000-0000" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={editData.mobile_phone || ""} onChange={e => setEditField("mobile_phone", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone Fixo</Label>
                      <Input placeholder="(00) 0000-0000" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={editData.phone || ""} onChange={e => setEditField("phone", e.target.value)} />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</Label>
                      <Input type="email" placeholder="email@exemplo.com" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={editData.email || ""} onChange={e => setEditField("email", e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Localidade</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">UF</Label>
                      <Select value={editData.state || ""} onValueChange={val => { setEditField("state", val); setEditField("city", ""); }}>
                        <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none"><SelectValue placeholder="UF" /></SelectTrigger>
                        <SelectContent className="rounded-xl max-h-60">
                          {BR_STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cidade</Label>
                      <CityCombobox uf={editData.state} value={editData.city} onChange={(c) => setEditField("city", c)} className="h-11 rounded-xl border-border bg-muted/30 text-xs" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-3">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Triagem Inicial</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Queixa / Tratamento Necessário</Label>
                      <Textarea placeholder="Descreva o motivo da visita..." className="rounded-xl border-border bg-muted/30 focus:bg-card font-medium text-xs shadow-none min-h-[80px] p-4" value={editData.treatment_needed || ""} onChange={e => setEditField("treatment_needed", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Clínica / Unidade</Label>
                      <Select value={editData.assigned_clinic_id || ""} onValueChange={val => setEditField("assigned_clinic_id", val)}>
                        <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none"><SelectValue placeholder="Selecionar unidade..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 h-12 rounded-xl border-border font-bold text-muted-foreground uppercase text-[10px] tracking-widest">
                    <X className="h-4 w-4 mr-2" /> CANCELAR
                  </Button>
                  <Button
                    className="flex-[2] h-12 rounded-xl bg-foreground hover:bg-foreground/90 text-white font-black uppercase text-[10px] tracking-widest shadow-lg transition-all"
                    onClick={handleSaveEdit}
                    disabled={updatePatient.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updatePatient.isPending ? "SALVANDO..." : "SALVAR ALTERAÇÕES"}
                  </Button>
                </div>
              </div>
            )}

            {/* Controls - view mode only */}
            {!isEditing && (
              <>
                <div className="grid md:grid-cols-2 gap-6 pt-8 border-t border-border">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block ml-1">Status na Recepção</Label>
                    <Select value={selectedPatient?.reception_status} onValueChange={val => handleReceptionStatusChange(selectedPatient!.id, val)}>
                      <SelectTrigger className="bg-muted/50 hover:bg-muted/30 border-border font-bold h-12 rounded-xl shadow-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-border shadow-xl">
                        <SelectItem value="entrada">Nova Entrada (Pendente)</SelectItem>
                        <SelectItem value="contato_realizado">Contato Realizado / Agendado</SelectItem>
                        <SelectItem value="faltou">Paciente Faltou à Agenda</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-amber-500 block ml-1">Migrar para Outra Etapa</Label>
                    <Select value={selectedPatient?.current_stage} onValueChange={val => selectedPatient && handleStageChange(selectedPatient.id, val)}>
                      <SelectTrigger className="bg-amber-50/30 hover:bg-amber-50/50 border-amber-100/50 font-bold h-12 rounded-xl shadow-none text-amber-700 text-xs uppercase"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl border-amber-50 shadow-xl">
                        <SelectItem value="step1_atendimento">Agendamento Triagem 3 (atual)</SelectItem>
                        <SelectItem value="step2_triagem_clinica">Fila 2: Triagem Clínica 3</SelectItem>
                        <SelectItem value="step3_selecao_cap">Fila de Espera</SelectItem>
                        <SelectItem value="arquivado">Arquivar Registro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* CHECKLIST DE RECEPÇÃO */}
                {selectedPatient && (
                  <div className="grid grid-cols-1 gap-3 py-6 border-t border-border">
                    {[
                      { id: 'chk_scheduled', label: 'Agendamento', icon: <Calendar className="h-3.5 w-3.5" /> },
                    ].map(item => (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (item.id === 'chk_scheduled') {
                            setScheduleDate(new Date());
                            setScheduleTime("09:00");
                            setScheduleDuration(30);
                            setScheduleNotes("");
                            setScheduleOpen(true);
                          } else {
                            handleChecklistToggle(item.id as any);
                          }
                        }}
                        className={`relative flex flex-col items-center gap-3 p-5 rounded-[2rem] border transition-all cursor-pointer ${
                          (selectedPatient as any)?.[item.id]
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-500'
                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center transition-all ${
                          (selectedPatient as any)?.[item.id] ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-card border border-border text-muted-foreground'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tight text-center">{item.label}</span>
                        {(selectedPatient as any)?.[item.id] && (
                          <div className="absolute top-3 right-3 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                            <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={`p-8 rounded-[2rem] border shadow-sm flex flex-col md:flex-row items-center gap-6 group transition-all ${isChecklistComplete ? 'bg-blue-50 border-blue-100' : 'bg-muted/30 border-border opacity-60 grayscale'}`}>
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg border group-hover:scale-110 transition-transform flex-shrink-0 ${isChecklistComplete ? 'bg-card border-blue-50 shadow-blue-500/10' : 'bg-muted border-border shadow-none grayscale'}`}>
                    <Stethoscope className={`h-8 w-8 ${isChecklistComplete ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="text-center md:text-left space-y-1.5 flex-1">
                    <h4 className={`font-extrabold text-lg tracking-tight uppercase ${isChecklistComplete ? 'text-blue-500' : 'text-muted-foreground'}`}>Avançar para Triagem Clínica 3</h4>
                    <p className={`text-[10px] font-bold uppercase leading-relaxed ${isChecklistComplete ? 'text-blue-600/70' : 'text-muted-foreground'}`}>
                      {isChecklistComplete ? "Paciente pronto para avaliação técnica do dentista especialista?" : "Complete o checklist acima para liberar o avanço."}
                    </p>
                  </div>
                  <Button
                    className={`font-black h-12 px-8 rounded-xl shadow-lg uppercase tracking-widest text-xs whitespace-nowrap transition-all ${isChecklistComplete ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10' : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'}`}
                    onClick={() => { 
                      if (isChecklistComplete) {
                        advanceToClinicalTriage.mutate(selectedPatient!.id); 
                        setSelectedPatient(null); 
                      } else {
                        toast.error("Complete o checklist antes de liberar.");
                      }
                    }}
                  >
                    LIBERAR DENTISTA
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="p-4 bg-muted/50 border-t border-border flex justify-center">
            <Button variant="ghost" onClick={() => { setSelectedPatient(null); setIsEditing(false); }} className="font-bold text-muted-foreground hover:text-foreground hover:bg-transparent uppercase text-[10px] tracking-widest">FECHAR FICHA</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Novo Paciente — Formulário Completo */}
      <Dialog open={isAddingPatient} onOpenChange={setIsAddingPatient}>
        <DialogContent className="sm:max-w-[700px] p-0 border-none rounded-3xl overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="p-8 bg-card border-b border-border">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <UserPlus className="h-7 w-7 text-blue-500" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">Novo Atendimento</DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">Cadastro completo de novo paciente na recepção</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8 bg-card">
            {/* Dados Pessoais */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dados Pessoais</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo <span className="text-rose-500">*</span></Label>
                  <Input className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={newPatientData.full_name} onChange={e => setField("full_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">CPF <span className="text-rose-500">*</span></Label>
                  <Input placeholder="000.000.000-00" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={newPatientData.cpf} onChange={e => setField("cpf", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Data de Nascimento <span className="text-rose-500">*</span></Label>
                  <Input type="date" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={newPatientData.birth_date} onChange={e => setField("birth_date", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gênero <span className="text-rose-500">*</span></Label>
                  <Select value={newPatientData.gender} onValueChange={val => setField("gender", val)}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Feminino</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Contato</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Celular / WhatsApp <span className="text-rose-500">*</span></Label>
                  <Input placeholder="(00) 00000-0000" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={newPatientData.mobile_phone} onChange={e => setField("mobile_phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Telefone Fixo</Label>
                  <Input placeholder="(00) 0000-0000" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={newPatientData.phone} onChange={e => setField("phone", e.target.value)} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail (opcional)</Label>
                  <Input type="email" placeholder="email@exemplo.com" className="h-11 rounded-xl border-border bg-muted/30 focus:bg-card font-bold text-xs shadow-none" value={newPatientData.email} onChange={e => setField("email", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Localidade */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Localidade</h4>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estado (UF) <span className="text-rose-500">*</span></Label>
                  <Select value={newPatientData.state} onValueChange={val => { setField("state", val); setField("city", ""); }}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none"><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60">
                      {BR_STATES.map(s => <SelectItem key={s.uf} value={s.uf}>{s.uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Cidade <span className="text-rose-500">*</span></Label>
                  <CityCombobox uf={newPatientData.state} value={newPatientData.city} onChange={(c) => setField("city", c)} className="h-11 rounded-xl border-border bg-muted/30 text-xs" />
                </div>
              </div>
            </div>

            {/* Triagem Inicial */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-2">
                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Triagem Inicial</h4>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Queixa / Tratamento Necessário <span className="text-rose-500">*</span></Label>
                  <Textarea
                    placeholder="Descreva o motivo da visita ou tratamento necessário..."
                    className="rounded-xl border-border bg-muted/30 focus:bg-card font-medium text-xs shadow-none min-h-[80px] p-4"
                    value={newPatientData.treatment_needed}
                    onChange={e => setField("treatment_needed", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Clínica / Unidade de Referência</Label>
                  <Select value={newPatientData.assigned_clinic_id} onValueChange={val => setField("assigned_clinic_id", val)}>
                    <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none">
                      <SelectValue placeholder="Selecionar unidade (opcional)..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 pt-2 border-t border-border">
                  <div
                    onClick={() => setField("already_triaged", !newPatientData.already_triaged)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${newPatientData.already_triaged ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-muted/30 border-border text-muted-foreground hover:border-foreground/20'}`}
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center ${newPatientData.already_triaged ? 'bg-emerald-500 border-emerald-500' : 'border-border'}`}>
                      {newPatientData.already_triaged && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider">Paciente já triado (Lista antiga)</p>
                      <p className="text-[9px] font-medium opacity-80">Vai direto para a fila da especialidade, pulando "Novos/Pendentes".</p>
                    </div>
                  </div>

                  {newPatientData.already_triaged && (
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">Especialidade de Destino <span className="text-rose-500">*</span></Label>
                      <Select value={newPatientData.triaged_specialty_id} onValueChange={val => setField("triaged_specialty_id", val)}>
                        <SelectTrigger className="h-11 rounded-xl border-border bg-muted/30 font-bold text-xs shadow-none">
                          <SelectValue placeholder="Selecionar especialidade..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {specialties.filter(s => s.is_active).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          <DialogFooter className="p-8 bg-muted/30 border-t border-border flex flex-col sm:flex-row gap-4">
            <Button variant="ghost" onClick={() => setIsAddingPatient(false)} className="font-bold uppercase text-muted-foreground rounded-xl px-6">CANCELAR</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white font-black h-12 px-8 rounded-xl shadow-lg shadow-blue-500/10 uppercase tracking-widest text-xs flex-1 transition-all"
              onClick={handleCreatePatient}
              disabled={createPatient.isPending}
            >
              {createPatient.isPending ? "CADASTRANDO..." : "CADASTRAR E RECEPCIONAR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Agendar Triagem (calendário) */}
      <Dialog open={scheduleOpen} onOpenChange={(open) => { setScheduleOpen(open); if (!open) { setSchedulePatient(null); setMoveAfterSchedule(false); } }}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              Agendar Triagem
            </DialogTitle>
            <DialogDescription>
              {(schedulePatient || selectedPatient)?.full_name || "Paciente"} — selecione data, horário e duração.
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs"
              disabled={!(schedulePatient || selectedPatient) || !scheduleDate || !scheduleTime || createAppt.isPending}
              onClick={async () => {
                const target = schedulePatient || selectedPatient;
                if (!target || !scheduleDate) return;
                try {
                  await createAppt.mutateAsync({
                    patient_id: target.id,
                    patient_name: target.full_name,
                    scheduled_date: format(scheduleDate, "yyyy-MM-dd"),
                    start_time: scheduleTime,
                    duration_min: scheduleDuration,
                    notes: scheduleNotes,
                  });
                  // Marca o checklist como agendado, salva data e (se veio do Kanban) move para Agendados
                  const updates: any = {
                    chk_scheduled: true,
                    scheduled_date: new Date(`${format(scheduleDate, "yyyy-MM-dd")}T${scheduleTime}:00`).toISOString(),
                  };
                  if (moveAfterSchedule) updates.reception_status = "contato_realizado";
                  updatePatient.mutate({
                    id: target.id,
                    updates,
                  }, {
                    onSuccess: (updated) => {
                      setSelectedPatient(prev => prev && prev.id === target.id ? { ...prev, ...updated, chk_scheduled: true } : prev);
                    }
                  });
                  if (moveAfterSchedule) toast.success("Agendado e movido para Agendados / Confirmados!");
                  setScheduleOpen(false);
                  setSchedulePatient(null);
                  setMoveAfterSchedule(false);
                } catch (e) {
                  // erro já tratado no hook
                }
              }}
            >
              {createAppt.isPending ? "Salvando..." : "Confirmar Agendamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de CPF duplicado */}
      <DuplicateCpfDialog
        open={!!duplicateInfo}
        existing={duplicateInfo}
        onCancel={() => setDuplicateInfo(null)}
        onOpenExisting={(p) => {
          // Tenta achar o paciente na lista carregada para abrir a ficha
          const found = (patients as any[]).find(x => x.id === p.id);
          setDuplicateInfo(null);
          setIsAddingPatient(false);
          if (found) {
            handleOpenDetails(found);
          } else {
            toast.info("Paciente está em outra etapa do funil. Acesse pela fila correspondente.");
          }
        }}
      />
    </main>
  </div>
);
}
