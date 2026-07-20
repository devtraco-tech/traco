import { useState, useMemo } from "react";
import { useTriageConfig, Appointment } from "@/hooks/useTriageConfig";
import { format, addDays, subDays, isSameDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Stethoscope, Activity, FileText, Building2, Users, Search, PlusCircle, CheckCircle2 } from "lucide-react";
import { PatientRecordView } from "@/components/PatientRecordView";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function ClinicSchedule() {
  const { clinics, specialties, appointments, procedures, classes, isLoading: isConfigLoading, addAppointment, updateAppointment } = useTriageConfig();

  const { data: allPatients = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ["all-triage-patients-full"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("patients")
        .select("*");
      if (error) throw error;
      return (data || []) as any[];
    }
  });

  const isLoading = isConfigLoading || isPatientsLoading;

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClinicId, setSelectedClinicId] = useState<string>("c1");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>("all");
  const [selectedProcedureId, setSelectedProcedureId] = useState<string>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [newPatientId, setNewPatientId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [checkedProcedures, setCheckedProcedures] = useState<string[]>([]);
  
  // Auto-select first clinic when loaded or if current selection is invalid
  useMemo(() => {
    if (clinics.length > 0 && (selectedClinicId === "c1" || !clinics.find(c => c.id === selectedClinicId))) {
      setSelectedClinicId(clinics[0].id);
    }
  }, [clinics, selectedClinicId]);

  const handlePrevDay = () => setSelectedDate(prev => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  const filteredAppointments = useMemo(() => {
    const capScheduledAppointments: Appointment[] = allPatients
      .filter(
        (patient) =>
          patient.cap_status === 'entrevista_agendada' &&
          patient.scheduled_date &&
          patient.assigned_clinic_id
      )
      .map((patient) => {
        const [datePart, timePartRaw] = patient.scheduled_date.split('T');
        const startTime = (timePartRaw || '00:00:00').slice(0, 5);
        const [h, m] = startTime.split(':').map(Number);
        const endMinutes = h * 60 + m + 30;
        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

        return {
          id: `cap-${patient.id}-${patient.scheduled_date}`,
          clinic_id: patient.assigned_clinic_id,
          specialty_id: patient.assigned_specialty_id || undefined,
          patient_id: patient.id,
          patient_name: patient.full_name,
          date: datePart,
          start_time: startTime,
          end_time: endTime,
          status: 'scheduled',
          notes: 'Agendamento originado do lead em Procedimento Agendado',
        } as Appointment;
      });

    const mergedAppointments = [...appointments];
    const existingPatientScheduleKeys = new Set(
      appointments.map((apt) => `${apt.patient_id || 'none'}-${apt.date}-${apt.start_time}-${apt.clinic_id}`)
    );

    for (const capApt of capScheduledAppointments) {
      const key = `${capApt.patient_id || 'none'}-${capApt.date}-${capApt.start_time}-${capApt.clinic_id}`;
      if (!existingPatientScheduleKeys.has(key)) {
        mergedAppointments.push(capApt);
      }
    }

    return mergedAppointments.filter(a => {
      const rawDate = (a as any).date || (a as any).scheduled_date;
      if (!rawDate) return false;
      const aptDateStr = String(rawDate).includes('T') ? String(rawDate).split('T')[0] : String(rawDate);
      const selectedDayStr = format(selectedDate, 'yyyy-MM-dd');
      
      let isInRange = false;
      if (viewMode === 'day') {
        isInRange = aptDateStr === selectedDayStr;
      } else if (viewMode === 'week') {
        const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
        const end = endOfWeek(selectedDate, { weekStartsOn: 0 });
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        isInRange = aptDateStr >= startStr && aptDateStr <= endStr;
      } else if (viewMode === 'month') {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');
        isInRange = aptDateStr >= startStr && aptDateStr <= endStr;
      }

      const isCorrectClinic = a.clinic_id === selectedClinicId;
      const isCorrectSpecialty = !selectedSpecialtyId || selectedSpecialtyId === 'all' || a.specialty_id === selectedSpecialtyId;
      const patient = allPatients.find(p => p.id === a.patient_id);
      const isCorrectProcedure = !selectedProcedureId || selectedProcedureId === 'all' || (patient?.treatment_types?.includes(selectedProcedureId));
      const isCorrectClass = !selectedClassId || selectedClassId === 'all' || (patient?.assigned_class_id === selectedClassId);

      return isInRange && isCorrectClinic && isCorrectSpecialty && isCorrectProcedure && isCorrectClass;
    });
  }, [appointments, selectedClinicId, selectedSpecialtyId, selectedProcedureId, selectedClassId, selectedDate, viewMode, allPatients]);

  const pendingPatients = useMemo(() => {
    return allPatients.filter(p => p.cap_status === 'entrevista_agendada');
  }, [allPatients]);

  const handleOpenSlot = (time: string) => {
    setSelectedTimeSlot(time);
    setIsNewModalOpen(true);
    setNewPatientId("");
    setNewNotes("");
  };

  const handleSaveAppointment = () => {
    if (!newPatientId || !selectedClinicId) return;
    const patient = allPatients.find(p => p.id === newPatientId);
    if (!patient) return;
    const [h, m] = selectedTimeSlot.split(':').map(Number);
    const endStr = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    addAppointment.mutate({
      clinic_id: selectedClinicId,
      specialty_id: selectedSpecialtyId || undefined,
      patient_id: patient.id,
      patient_name: patient.full_name,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTimeSlot,
      end_time: endStr,
      status: 'scheduled',
      notes: newNotes,
    });
    setIsNewModalOpen(false);
  };

  const handleOpenAppointment = (apt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedAppointment(apt);
    setIsFinishing(false);
    setCheckedProcedures([]);
  };

  const linkedPatient = selectedAppointment?.patient_id ? allPatients.find(p => p.id === selectedAppointment.patient_id) : null;
  const linkedProcedures = useMemo(() => {
    if (!linkedPatient || !linkedPatient.treatment_types) return [];
    return procedures.filter(p => linkedPatient.treatment_types?.includes(p.id));
  }, [linkedPatient, procedures]);

  const handleStartCheckout = () => {
    setIsFinishing(true);
    if (linkedProcedures) setCheckedProcedures(linkedProcedures.map(p => p.id));
  };

  const toggleProcedure = (procId: string) => {
    setCheckedProcedures(prev => prev.includes(procId) ? prev.filter(id => id !== procId) : [...prev, procId]);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedAppointment) return;
    const incomplete = linkedProcedures.some(p => !checkedProcedures.includes(p.id));
    updateAppointment.mutate({ id: selectedAppointment.id, updates: { status: 'completed' } });
    if (linkedPatient) {
      const cap_status = incomplete ? 'aguardando_vaga' : 'finalizado';
      const dentist_status = 'consultou';
      await (supabase as any).from("patients").update({
        cap_status,
        dentist_status,
        updated_at: new Date().toISOString()
      }).eq("id", linkedPatient.id);
    }
    setSelectedAppointment(null);
    setIsFinishing(false);
  };

  const hoursGrid = Array.from({ length: 11 }, (_, i) => {
    const hh = String(i + 8).padStart(2, '0');
    return [`${hh}:00`, `${hh}:30`]; 
  }).flat();

  const renderWeeklyView = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 min-h-[500px] bg-muted/10">
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayApts = filteredAppointments.filter(a => {
            const aptDateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            return aptDateStr === dayStr;
          });
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toString()} className={`flex flex-col border border-border rounded-3xl bg-card shadow-sm overflow-hidden transition-all ${isToday ? 'ring-2 ring-blue-500/10 border-blue-100' : ''}`}>
              <div className={`p-4 text-center border-b border-border ${isToday ? 'bg-blue-50/50' : ''}`}>
                <div className={`text-[10px] uppercase font-black tracking-widest ${isToday ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {format(day, "EEE", { locale: ptBR })}
                </div>
                <div className={`text-xl font-black mt-1 ${isToday ? 'text-blue-900' : 'text-slate-700'}`}>{format(day, "dd")}</div>
              </div>
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px]">
                {dayApts.length === 0 ? (
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center py-10 italic">Livre</div>
                ) : (
                  dayApts.sort((a,b) => a.start_time.localeCompare(b.start_time)).map(apt => (
                    <div 
                      key={apt.id} 
                      className={`p-3 rounded-2xl border text-[10px] leading-tight cursor-pointer hover:shadow-md transition-all ${apt.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-blue-50 border-blue-100 text-blue-900'}`}
                      onClick={(e) => handleOpenAppointment(apt, e)}
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
        {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
          <div key={d} className="bg-slate-50/80 p-4 text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest">{d}</div>
        ))}
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayApts = filteredAppointments.filter(a => {
            const aptDateStr = a.date.includes('T') ? a.date.split('T')[0] : a.date;
            return aptDateStr === dayStr;
          });
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={day.toString()} 
              className={`min-h-[120px] p-3 bg-card transition-colors hover:bg-muted/20 cursor-pointer flex flex-col gap-2 ${!isCurrentMonth ? 'opacity-20 pointer-events-none' : ''}`}
              onClick={() => { setSelectedDate(day); setViewMode('day'); }}
            >
              <span className={`text-xs font-black h-7 w-7 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-muted-foreground'}`}>
                {format(day, "d")}
              </span>
              <div className="flex-1 overflow-y-auto space-y-1">
                {dayApts.slice(0, 3).map(apt => (
                  <div key={apt.id} className="text-[9px] font-bold bg-blue-50/50 border border-blue-100 text-blue-700 rounded-lg px-2 py-1 truncate uppercase tracking-tighter">
                    {apt.start_time} {apt.patient_name}
                  </div>
                ))}
                {dayApts.length > 3 && (
                  <div className="text-[9px] text-blue-400 font-black uppercase tracking-widest ml-1">+{dayApts.length - 3} itens</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading && appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Activity className="h-12 w-12 text-blue-500 animate-pulse" />
        <p className="text-muted-foreground animate-pulse font-medium text-lg">Sincronizando agenda clínica...</p>
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
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agenda Clínica Cursos</h1>
              <p className="text-white/50 text-sm font-medium">Controle de horários, execução de procedimentos e checkout.</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6">
               <div className="flex items-center gap-2 bg-card/5 p-2 rounded-2xl border border-white/10 backdrop-blur-md">
                  <div className="flex gap-1 border-r border-white/10 pr-3 mr-1">
                    <Button variant="ghost" size="sm" onClick={() => setViewMode('day')} className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-background text-foreground shadow-xl' : 'text-white/40 hover:bg-card/10 hover:text-white'}`}>Dia</Button>
                    <Button variant="ghost" size="sm" onClick={() => setViewMode('week')} className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-background text-foreground shadow-xl' : 'text-white/40 hover:bg-card/10 hover:text-white'}`}>Semana</Button>
                    <Button variant="ghost" size="sm" onClick={() => setViewMode('month')} className={`h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-background text-foreground shadow-xl' : 'text-white/40 hover:bg-card/10 hover:text-white'}`}>Mês</Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-10 w-10 rounded-xl text-white/40 hover:bg-card/10 hover:text-white"><ChevronLeft className="h-5 w-5" /></Button>
                    <Button variant="ghost" onClick={handleToday} className="px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-card/10">
                      {viewMode === 'day' ? format(selectedDate, "dd 'de' MMM", { locale: ptBR }) : 
                       viewMode === 'week' ? `Semana ${format(selectedDate, "w")}` : 
                       format(selectedDate, "MMMM 'de' yyyy", { locale: ptBR })}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-10 w-10 rounded-xl text-white/40 hover:bg-card/10 hover:text-white"><ChevronRight className="h-5 w-5" /></Button>
                  </div>
               </div>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
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
                <Search className="h-3.5 w-3.5 text-blue-500"/> Filtros de Agenda
              </h3>
            </div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Unidade Clínica</Label>
                  <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                    <SelectTrigger className="w-full bg-muted/50 hover:bg-background border-border h-11 rounded-xl text-xs font-bold shadow-none transition-all">
                      <SelectValue placeholder="Escolha a Clínica" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {clinics.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Especialidade / Fila</Label>
                  <Select value={selectedSpecialtyId} onValueChange={setSelectedSpecialtyId}>
                    <SelectTrigger className="w-full bg-slate-50/50 hover:bg-card border-border h-11 rounded-xl text-xs font-bold shadow-none transition-all">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todas as Áreas</SelectItem>
                      {specialties.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-6 border-t border-border space-y-4">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Procedimento</Label>
                  <Select value={selectedProcedureId} onValueChange={setSelectedProcedureId}>
                    <SelectTrigger className="w-full bg-slate-50/50 h-11 rounded-xl text-xs font-bold border-border shadow-none">
                      <SelectValue placeholder="Qualquer procedimento" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Filtrar Procedimento</SelectItem>
                      {procedures.filter(p => selectedSpecialtyId === 'all' || p.specialty_id === selectedSpecialtyId).map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground ml-1">Turma (CAP)</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full bg-slate-50/50 h-11 rounded-xl text-xs font-bold border-border shadow-none">
                      <SelectValue placeholder="Qualquer turma" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="all">Todas as Turmas</SelectItem>
                      {classes.filter(c => selectedSpecialtyId === 'all' || c.specialty_id === selectedSpecialtyId).map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="border-border rounded-[2.5rem] shadow-sm overflow-hidden bg-card">
            <CardContent className="p-0">
              {viewMode === 'day' ? (
                <div className="h-[750px] overflow-y-auto scrollbar-hide">
                  {hoursGrid.map((time) => {
                    const slotAppointments = filteredAppointments.filter(a => {
                      const [h, m] = a.start_time.split(':').map(Number);
                      const [sh, sm] = time.split(':').map(Number);
                      const aptMins = h * 60 + m;
                      const slotMins = sh * 60 + sm;
                      return aptMins >= slotMins && aptMins < slotMins + 30;
                    });
                    const isHourLine = time.endsWith(':00');
                    return (
                      <div key={time} className={`flex group transition-colors ${isHourLine ? 'border-t border-border' : 'border-t border-border border-dashed'} min-h-[5.5rem]`}>
                        <div className="w-20 flex-shrink-0 text-center flex items-center justify-center bg-muted/20 border-r border-border">
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${isHourLine ? 'text-foreground' : 'text-slate-300'}`}>
                            {time}
                          </span>
                        </div>
                        <div 
                          className="flex-1 p-3 flex flex-row flex-wrap gap-4 relative cursor-pointer hover:bg-slate-50 transition-all"
                          onClick={() => handleOpenSlot(time)}
                        >
                          {slotAppointments.length === 0 && (
                            <div className="absolute inset-x-0 inset-y-0 opacity-0 group-hover:opacity-100 flex items-center justify-center bg-card/50 backdrop-blur-sm transition-all pointer-events-none">
                              <span className="text-[10px] font-black text-blue-600 bg-card border border-blue-100 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 uppercase tracking-widest">
                                <PlusCircle className="h-4 w-4" /> Marcar às {time}
                              </span>
                            </div>
                          )}
                          {slotAppointments.map(apt => (
                            <div 
                              key={apt.id}
                              className={`rounded-[1.5rem] p-4 shadow-sm flex flex-col justify-between overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer min-w-[200px] border relative ${apt.status === 'completed' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'}`}
                              onClick={(e) => handleOpenAppointment(apt, e)}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <h4 className={`font-black uppercase text-xs tracking-tight truncate ${apt.status === 'completed' ? 'text-emerald-900' : 'text-blue-900'}`}>{apt.patient_name}</h4>
                                  <span className="text-[9px] font-black opacity-40 flex items-center gap-1 shrink-0">
                                    <Clock className="h-2.5 w-2.5" /> {apt.start_time}
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className={`text-[9px] font-bold uppercase flex items-center gap-1.5 ${apt.status === 'completed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                                    <Building2 className="h-3 w-3 opacity-60" /> {clinics.find(c => c.id === apt.clinic_id)?.name}
                                  </div>
                                  <div className="text-[9px] font-black text-muted-foreground flex items-center gap-1.5 uppercase">
                                    <Stethoscope className="h-3 w-3 opacity-60" /> {specialties.find(s => s.id === apt.specialty_id)?.name || "Misto"}
                                  </div>
                                </div>
                              </div>
                              {apt.status === 'completed' && (
                                <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-emerald-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : viewMode === 'week' ? (renderWeeklyView()) : (renderMonthlyView())}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedAppointment} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="sm:max-w-[750px] p-0 border-none rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
          <DialogHeader className="p-8 bg-card border-b border-border">
             <div className="flex items-center gap-6">
                <div className={`h-16 w-16 rounded-3xl flex items-center justify-center border shadow-sm transition-colors ${selectedAppointment?.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
                  {selectedAppointment?.status === 'completed' ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                </div>
                <div className="text-left flex-1">
                  <DialogTitle className="text-2xl font-black uppercase tracking-tight text-foreground">{selectedAppointment?.patient_name}</DialogTitle>
                  <DialogDescription className="text-muted-foreground font-bold text-[10px] uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <CalendarIcon className="h-3 w-3" /> {selectedAppointment?.date ? format(new Date(selectedAppointment.date), "dd 'de' MMMM", { locale: ptBR }) : "--"} • {selectedAppointment?.start_time} - {selectedAppointment?.end_time}
                  </DialogDescription>
                </div>
                {selectedAppointment?.status === 'completed' && <Badge className="bg-emerald-500 text-[10px] font-black px-3 py-1 uppercase shadow-none ring-0">CONCLUÍDO</Badge>}
             </div>
          </DialogHeader>

          <div className="p-8 space-y-10 bg-card">
            {!isFinishing && linkedPatient && <PatientRecordView patient={linkedPatient} />}
            {isFinishing && linkedPatient && (
              <div className="space-y-8 animate-in slide-in-from-right-2 duration-300">
                <div className="p-8 rounded-[2rem] bg-amber-50/50 border border-amber-100 space-y-4 shadow-sm">
                  <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-500"/> Validação de Execução Clínica
                  </h3>
                  <p className="text-[10px] font-bold text-amber-700/70 uppercase leading-relaxed tracking-tight">
                    Marque apenas o que foi finalizado. Itens incompletos retornarão para liberação de agenda na Fila 3 para uma próxima sessão clínica.
                  </p>
                  <div className="grid gap-3 pt-4">
                    {linkedProcedures.map(proc => (
                      <div key={proc.id} className={`flex items-center space-x-4 p-4 rounded-2xl border transition-all ${checkedProcedures.includes(proc.id) ? 'bg-card border-amber-300 shadow-sm' : 'bg-transparent border-amber-100 opacity-60'}`}>
                        <Checkbox 
                          id={`finish-proc-${proc.id}`} 
                          checked={checkedProcedures.includes(proc.id)}
                          onCheckedChange={() => toggleProcedure(proc.id)}
                          className="h-5 w-5 rounded-md border-amber-300 data-[state=checked]:bg-amber-600"
                        />
                        <label htmlFor={`finish-proc-${proc.id}`} className="text-sm font-extrabold text-amber-900 uppercase cursor-pointer flex-1">
                          {proc.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-8 bg-slate-50/50 border-t border-border flex flex-col sm:flex-row gap-4">
            {selectedAppointment?.status !== 'completed' && !isFinishing && (
              <Button className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20 transition-all" onClick={handleStartCheckout}>
                INICIAR CHECKOUT CLÍNICO
              </Button>
            )}
            {isFinishing && (
              <div className="flex w-full gap-4">
                <Button variant="ghost" className="flex-1 font-bold text-muted-foreground" onClick={() => setIsFinishing(false)}>CANCELAR</Button>
                <Button className="flex-[2] h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20" onClick={handleConfirmCheckout}>
                  FINALIZAR SESSÃO E DAR ALTA
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  </div>
);
}
