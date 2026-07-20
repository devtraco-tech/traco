import { useState, useMemo } from "react";
import { useReceptionSchedule, TriageAppointment } from "@/hooks/useReceptionSchedule";
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Activity, Search, PlusCircle, CheckCircle2, Trash2, User } from "lucide-react";
import { PatientRecordView } from "@/components/PatientRecordView";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const HOURS_GRID = Array.from({ length: 11 }, (_, i) => {
  const hh = String(i + 8).padStart(2, "0");
  return [`${hh}:00`, `${hh}:30`];
}).flat();

export default function ReceptionSchedule() {
  const { appointments, create, update, remove, isLoading } = useReceptionSchedule();

  const { data: allPatients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ["all-triage-patients-full"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("patients").select("*");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [searchPatient, setSearchPatient] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New appointment modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newSlot, setNewSlot] = useState<string>("");
  const [newPatientId, setNewPatientId] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newNotes, setNewNotes] = useState("");

  // View appointment modal
  const [selectedAppt, setSelectedAppt] = useState<TriageAppointment | null>(null);

  const handlePrev = () => setSelectedDate((d) => subDays(d, 1));
  const handleNext = () => setSelectedDate((d) => addDays(d, 1));
  const handleToday = () => setSelectedDate(new Date());

  const filteredAppointments = useMemo(() => {
    return appointments.filter((a) => {
      if (!a.scheduled_date) return false;
      const dateStr = a.scheduled_date;
      const sel = format(selectedDate, "yyyy-MM-dd");
      let inRange = false;
      if (viewMode === "day") inRange = dateStr === sel;
      else if (viewMode === "week") {
        const s = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        const e = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "yyyy-MM-dd");
        inRange = dateStr >= s && dateStr <= e;
      } else {
        const s = format(startOfMonth(selectedDate), "yyyy-MM-dd");
        const e = format(endOfMonth(selectedDate), "yyyy-MM-dd");
        inRange = dateStr >= s && dateStr <= e;
      }
      const matchesStatus = statusFilter === "all" || a.status === statusFilter;
      
      let matchesSearch = !searchPatient;
      if (searchPatient) {
        const query = searchPatient.toLowerCase();
        // check patient name on appointment
        const nameMatches = (a.patient_name || "").toLowerCase().includes(query);
        // check linked patient details (CPF and phone)
        const patient = a.patient_id ? allPatients.find(p => p.id === a.patient_id) : null;
        const cpfMatches = patient?.cpf ? patient.cpf.replace(/\D/g, "").includes(query.replace(/\D/g, "")) : false;
        const phoneMatches = patient?.mobile_phone ? patient.mobile_phone.replace(/\D/g, "").includes(query.replace(/\D/g, "")) : false;
        const patientNameMatches = patient?.full_name ? patient.full_name.toLowerCase().includes(query) : false;
        matchesSearch = nameMatches || patientNameMatches || cpfMatches || phoneMatches;
      }

      return inRange && matchesStatus && matchesSearch;
    });
  }, [appointments, selectedDate, viewMode, statusFilter, searchPatient, allPatients]);

  const getStatusClasses = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-50 border-emerald-100 text-emerald-950 hover:bg-emerald-100/50";
      case "completed":
        return "bg-blue-50 border-blue-100 text-blue-950 hover:bg-blue-100/50";
      case "cancelled":
      case "canceled":
        return "bg-rose-50 border-rose-100 text-rose-950 hover:bg-rose-100/50";
      default: // scheduled
        return "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100/50";
    }
  };

  const getStatusTextClasses = (status?: string) => {
    switch (status) {
      case "confirmed":
        return "text-emerald-950";
      case "completed":
        return "text-blue-950";
      case "cancelled":
      case "canceled":
        return "text-rose-950";
      default:
        return "text-slate-900";
    }
  };

  const linkedPatient = selectedAppt?.patient_id
    ? allPatients.find((p) => p.id === selectedAppt.patient_id)
    : null;

  const handleOpenSlot = (time: string) => {
    setNewSlot(time);
    setNewPatientId("");
    setNewDuration(30);
    setNewNotes("");
    setIsNewModalOpen(true);
  };

  const handleSaveNew = async () => {
    if (!newPatientId) {
      toast.error("Selecione um paciente");
      return;
    }
    const patient = allPatients.find((p) => p.id === newPatientId);
    await create.mutateAsync({
      patient_id: newPatientId,
      patient_name: patient?.full_name || null,
      scheduled_date: format(selectedDate, "yyyy-MM-dd"),
      start_time: newSlot,
      duration_min: newDuration,
      notes: newNotes,
    });
    setIsNewModalOpen(false);
  };

  const handleConfirmAppointment = async () => {
    if (!selectedAppt) return;
    await update.mutateAsync({ id: selectedAppt.id, updates: { status: "confirmed" } });
    setSelectedAppt(null);
  };

  const handleMarkAttended = async () => {
    if (!selectedAppt) return;
    await update.mutateAsync({ id: selectedAppt.id, updates: { status: "completed" } });
    if (selectedAppt.patient_id) {
      await (supabase as any)
        .from("patients")
        .update({ dentist_status: "consultou", updated_at: new Date().toISOString() })
        .eq("id", selectedAppt.patient_id);
    }
    setSelectedAppt(null);
  };

  const handleDelete = async () => {
    if (!selectedAppt) return;
    await remove.mutateAsync(selectedAppt.id);
    setSelectedAppt(null);
  };

  const renderWeeklyView = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 min-h-[500px] bg-muted/10">
        {days.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayApts = filteredAppointments.filter((a) => a.scheduled_date === dayStr);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toString()}
              className={`flex flex-col border border-border rounded-3xl bg-card shadow-sm overflow-hidden transition-all ${
                isToday ? "ring-2 ring-blue-500/10 border-blue-100" : ""
              }`}
            >
              <div className={`p-4 text-center border-b border-border ${isToday ? "bg-blue-50/50" : ""}`}>
                <div
                  className={`text-[10px] uppercase font-black tracking-widest ${
                    isToday ? "text-blue-600" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "EEE", { locale: ptBR })}
                </div>
                <div className={`text-xl font-black mt-1 ${isToday ? "text-blue-900" : "text-slate-700"}`}>
                  {format(day, "dd")}
                </div>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px]">
                {dayApts.length === 0 ? (
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-10 italic">
                    Livre
                  </div>
                ) : (
                  dayApts
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
                    .map((apt) => (
                      <div
                        key={apt.id}
                        className={`p-3 rounded-2xl border text-[10px] leading-tight cursor-pointer hover:shadow-md transition-all ${getStatusClasses(apt.status)}`}
                        onClick={() => setSelectedAppt(apt)}
                      >
                        <div className="font-extrabold flex items-center gap-1 mb-1">
                          <Clock className="h-3 w-3 opacity-50" /> {apt.start_time}
                        </div>
                        <div className="font-bold uppercase tracking-tight truncate">{apt.patient_name}</div>
                      </div>
                    ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthlyView = () => {
    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    return (
      <div className="grid grid-cols-7 gap-px bg-slate-100 border border-border rounded-[2.5rem] overflow-hidden shadow-sm">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
          <div
            key={d}
            className="bg-slate-50/80 p-4 text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayApts = filteredAppointments.filter((a) => a.scheduled_date === dayStr);
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toString()}
              className={`min-h-[120px] p-3 bg-card transition-colors hover:bg-muted/20 cursor-pointer flex flex-col gap-2 ${
                !isCurrentMonth ? "opacity-20 pointer-events-none" : ""
              }`}
              onClick={() => {
                setSelectedDate(day);
                setViewMode("day");
              }}
            >
              <span
                className={`text-xs font-black h-7 w-7 flex items-center justify-center rounded-xl transition-all ${
                  isToday ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="flex-1 overflow-y-auto space-y-1">
                {dayApts.slice(0, 3).map((apt) => (
                  <div
                    key={apt.id}
                    className={`text-[9px] font-bold rounded-lg px-2 py-1 truncate uppercase tracking-tighter border ${
                      apt.status === "confirmed"
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                        : apt.status === "completed"
                        ? "bg-blue-50 border-blue-100 text-blue-700"
                        : apt.status === "cancelled" || apt.status === "canceled"
                        ? "bg-rose-50 border-rose-100 text-rose-700"
                        : "bg-slate-50 border-slate-100 text-slate-700"
                    }`}
                  >
                    {apt.start_time} {apt.patient_name}
                  </div>
                ))}
                {dayApts.length > 3 && (
                  <div className="text-[9px] text-blue-400 font-black uppercase tracking-widest ml-1">
                    +{dayApts.length - 3} itens
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if ((isLoading || isPatientsLoading) && appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Activity className="h-12 w-12 text-blue-500 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-lg">Sincronizando agenda de triagem...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-[#0f172a] text-white border-b border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 opacity-50" />
        <div className="container mx-auto px-6 py-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agenda de Triagem Clínica 3</h1>
              <p className="text-white/50 text-sm font-medium">Recepção: marcação e controle dos horários de triagem clínica.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-2 bg-card/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                <div className="flex gap-1 border-r border-white/10 pr-3 mr-1">
                  {(["day", "week", "month"] as const).map((m) => (
                    <Button
                      key={m}
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewMode(m)}
                      className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        viewMode === m
                          ? "bg-background text-foreground shadow-xl"
                          : "text-white/40 hover:bg-card/10 hover:text-white"
                      }`}
                    >
                      {m === "day" ? "Dia" : m === "week" ? "Semana" : "Mês"}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePrev}
                    className="h-10 w-10 rounded-xl text-white/40 hover:bg-card/10 hover:text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleToday}
                    className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-card/10"
                  >
                    {viewMode === "day"
                      ? format(selectedDate, "dd 'de' MMM", { locale: ptBR })
                      : viewMode === "week"
                      ? `Semana ${format(selectedDate, "w")}`
                      : format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNext}
                    className="h-10 w-10 rounded-xl text-white/40 hover:bg-card/10 hover:text-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/dashboard")}
                className="bg-card/5 border-white/10 text-white hover:bg-card/10 rounded-xl px-6 h-12 font-bold transition-all"
              >
                Painel Principal
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 pb-32">
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border rounded-[2rem] shadow-sm bg-card overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/30">
                <h3 className="font-extrabold text-foreground uppercase text-[10px] tracking-widest flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-blue-500" /> Filtros
                </h3>
              </div>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">
                    Buscar paciente
                  </Label>
                  <Input
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                    placeholder="Nome..."
                    className="h-11 rounded-xl text-xs font-bold bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full bg-muted/50 hover:bg-background border-border h-11 rounded-xl text-xs font-bold shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="scheduled">Agendados</SelectItem>
                      <SelectItem value="confirmed">Confirmados</SelectItem>
                      <SelectItem value="completed">Concluídos</SelectItem>
                      <SelectItem value="cancelled">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-4 border-t border-border text-[10px] font-bold uppercase text-muted-foreground tracking-widest">
                  Total no período:{" "}
                  <span className="text-blue-600 text-base font-black">{filteredAppointments.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card className="border-border rounded-[2.5rem] shadow-sm overflow-hidden bg-card">
              <CardContent className="p-0">
                {viewMode === "day" ? (
                  <div className="h-[750px] overflow-y-auto scrollbar-hide">
                    {HOURS_GRID.map((time) => {
                      const slotAppts = filteredAppointments.filter((a) => {
                        const [h, m] = a.start_time.split(":").map(Number);
                        const [sh, sm] = time.split(":").map(Number);
                        const am = h * 60 + m;
                        const sM = sh * 60 + sm;
                        return am >= sM && am < sM + 30;
                      });
                      const isHourLine = time.endsWith(":00");
                      return (
                        <div
                          key={time}
                          className={`flex group transition-colors ${
                            isHourLine ? "border-t border-border" : "border-t border-border border-dashed"
                          } min-h-[5.5rem]`}
                        >
                          <div className="w-20 flex-shrink-0 text-center flex items-center justify-center bg-muted/20 border-r border-border">
                            <span
                              className={`text-[10px] font-black uppercase tracking-tighter ${
                                isHourLine ? "text-foreground" : "text-slate-300"
                              }`}
                            >
                              {time}
                            </span>
                          </div>
                          <div
                            className="flex-1 p-3 flex flex-row flex-wrap gap-4 relative cursor-pointer hover:bg-slate-50 transition-all"
                            onClick={() => handleOpenSlot(time)}
                          >
                            {slotAppts.length === 0 && (
                              <div className="absolute inset-x-0 inset-y-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-card/50 backdrop-blur-sm transition-all pointer-events-none">
                                <span className="text-[10px] font-black text-blue-600 bg-card border border-blue-100 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 uppercase tracking-widest">
                                  <PlusCircle className="h-4 w-4" /> Marcar às {time}
                                </span>
                              </div>
                            )}
                            {slotAppts.map((apt) => (
                              <div
                                key={apt.id}
                                className={`rounded-[1.5rem] p-4 shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer min-w-[200px] border relative ${getStatusClasses(apt.status)}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedAppt(apt);
                                }}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4
                                      className={`font-black uppercase text-xs tracking-tight truncate ${getStatusTextClasses(apt.status)}`}
                                    >
                                      {apt.patient_name || "Paciente"}
                                    </h4>
                                    <span className="text-[9px] font-black opacity-40 flex items-center gap-1 shrink-0">
                                      <Clock className="h-2.5 w-2.5" /> {apt.start_time}
                                    </span>
                                  </div>
                                  {apt.notes && (
                                    <div className="text-[9px] font-bold text-muted-foreground mt-2 truncate">
                                      {apt.notes}
                                    </div>
                                  )}
                                </div>
                                {apt.status === "completed" && (
                                  <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-emerald-500" />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : viewMode === "week" ? (
                  renderWeeklyView()
                ) : (
                  renderMonthlyView()
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* New appointment modal */}
        <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo agendamento de triagem</DialogTitle>
              <DialogDescription>
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })} às {newSlot}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Paciente *</Label>
                <Select value={newPatientId} onValueChange={setNewPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPatients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duração (minutos)</Label>
                <Input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNew} disabled={!newPatientId || create.isPending}>
                Agendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View appointment modal — full patient record */}
        <Dialog open={!!selectedAppt} onOpenChange={(o) => !o && setSelectedAppt(null)}>
          <DialogContent className="sm:max-w-[750px] p-0 border-none rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
            <DialogHeader className="p-8 bg-card border-b border-border">
              <div className="flex items-center gap-6">
                <div
                  className={`h-16 w-16 rounded-3xl flex items-center justify-center border shadow-sm transition-colors ${
                    selectedAppt?.status === "confirmed"
                      ? "bg-emerald-50 border-emerald-100 text-emerald-500"
                      : selectedAppt?.status === "completed"
                      ? "bg-blue-50 border-blue-100 text-blue-500"
                      : selectedAppt?.status === "cancelled" || selectedAppt?.status === "canceled"
                      ? "bg-rose-50 border-rose-100 text-rose-500"
                      : "bg-slate-50 border-slate-100 text-slate-500"
                  }`}
                >
                  {selectedAppt?.status === "completed" ? (
                    <CheckCircle2 className="h-8 w-8" />
                  ) : (
                    <User className="h-8 w-8" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <DialogTitle className="text-2xl font-extrabold uppercase tracking-tight text-foreground truncate">
                    {selectedAppt?.patient_name || "Paciente"}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" />{" "}
                    {selectedAppt?.scheduled_date
                      ? format(new Date(selectedAppt.scheduled_date + "T00:00"), "dd 'de' MMMM", { locale: ptBR })
                      : "--"}{" "}
                    • {selectedAppt?.start_time}
                    {selectedAppt?.end_time ? ` - ${selectedAppt.end_time}` : ""}
                  </DialogDescription>
                </div>
                {selectedAppt?.status === "confirmed" && (
                  <Badge className="bg-emerald-500 text-[10px] font-black px-3 py-1 uppercase shadow-none ring-0">
                    CONFIRMADO
                  </Badge>
                )}
                {selectedAppt?.status === "completed" && (
                  <Badge className="bg-blue-500 text-[10px] font-black px-3 py-1 uppercase shadow-none ring-0">
                    CONCLUÍDO
                  </Badge>
                )}
                {(selectedAppt?.status === "cancelled" || selectedAppt?.status === "canceled") && (
                  <Badge className="bg-rose-500 text-[10px] font-black px-3 py-1 uppercase shadow-none ring-0">
                    CANCELADO
                  </Badge>
                )}
                {selectedAppt?.status === "scheduled" && (
                  <Badge className="bg-slate-500 text-[10px] font-black px-3 py-1 uppercase shadow-none ring-0">
                    AGENDADO
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="p-8 space-y-6 bg-card">
              {selectedAppt?.notes && (
                <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">
                    Observações
                  </p>
                  <p className="text-sm text-foreground">{selectedAppt.notes}</p>
                </div>
              )}
              {linkedPatient ? (
                <PatientRecordView patient={linkedPatient} />
              ) : (
                <div className="text-sm text-muted-foreground italic text-center py-8">
                  Paciente não vinculado a um cadastro completo.
                </div>
              )}
            </div>

            <DialogFooter className="p-6 bg-muted/30 border-t border-border flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={handleDelete}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
              {selectedAppt?.status === "scheduled" && (
                <Button
                  onClick={handleConfirmAppointment}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Confirmar agendamento
                </Button>
              )}
              {selectedAppt?.status !== "completed" && (
                <Button
                  onClick={handleMarkAttended}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Marcar como atendido
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
