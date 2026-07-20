import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ChartDatum { id?: string; name: string; value: number; }

export const useTriageDashboard = () => {
  const { data, isPending, isFetching, error } = useQuery({
    queryKey: ["triage-dashboard-stats"],
    queryFn: async () => {
      const [patientsRes, specialtiesRes, proceduresRes] = await Promise.all([
        (supabase as any).from("patients").select("*"),
        (supabase as any).from("patient_specialties").select("id, name"),
        (supabase as any).from("patient_procedures").select("id, name"),
      ]);

      if (patientsRes.error) throw patientsRes.error;

      const patients: any[] = patientsRes.data || [];
      const specialties: any[] = specialtiesRes.data || [];
      const procedures: any[] = proceduresRes.data || [];

      const specialtyMap = new Map<string, string>(specialties.map((s: any) => [s.id, s.name]));
      const procedureMap = new Map<string, string>(procedures.map((p: any) => [p.id, p.name]));

      return { patients, specialtyMap, procedureMap };
    },
    refetchInterval: 30000,
  });

  const patients: any[] = data?.patients || [];
  const specialtyMap = data?.specialtyMap || new Map<string, string>();
  const procedureMap = data?.procedureMap || new Map<string, string>();

  // Pacientes da Fila 3 (Triagem Clínica 3) — não-recusados
  const fila3Patients = patients.filter(
    (p) => p.current_stage === "step3_selecao_cap" && p.reception_status !== "nao_selecionado"
  );

  // Pacientes com QUALQUER especialidade atribuída (em qualquer fila), excluindo recusados
  const patientsWithSpecialty = patients.filter((p) => {
    if (p.reception_status === "nao_selecionado") return false;
    const hasArray = Array.isArray(p.specialties) && p.specialties.length > 0;
    return hasArray || !!p.assigned_specialty_id;
  });

  // Contagem de especialidades (todas as filas — considera array antigo + assigned_specialty_id)
  const specialtyCounts = new Map<string, number>();
  patientsWithSpecialty.forEach((p) => {
    const ids = new Set<string>();
    (Array.isArray(p.specialties) ? p.specialties : []).forEach((id: string) => {
      if (id) ids.add(id);
    });
    if (p.assigned_specialty_id) ids.add(p.assigned_specialty_id);
    ids.forEach((id) => specialtyCounts.set(id, (specialtyCounts.get(id) || 0) + 1));
  });
  const specialtyChartData = Array.from(specialtyCounts.entries())
    .map(([id, value]) => ({ id, name: specialtyMap.get(id) || "Sem nome", value }))
    .sort((a, b) => b.value - a.value);

  // Contagem de tipos de tratamento na Fila 3
  const treatmentCounts = new Map<string, number>();
  fila3Patients.forEach((p) => {
    const list: string[] = Array.isArray(p.treatment_types) ? p.treatment_types : [];
    list.forEach((id) => {
      if (!id) return;
      treatmentCounts.set(id, (treatmentCounts.get(id) || 0) + 1);
    });
  });
  const treatmentChartData = Array.from(treatmentCounts.entries())
    .map(([id, value]) => ({ id, name: procedureMap.get(id) || "Sem nome", value }))
    .sort((a, b) => b.value - a.value);

  // Urgência: tenta urgency (text) e urgency_level (enum) — usa o que estiver populado
  const urgencyOf = (p: any): string => (p.urgency || p.urgency_level || "").toString().toLowerCase();

  const fila3PorUrgencia = {
    alta: fila3Patients.filter((p) => urgencyOf(p) === "alta").length,
    media: fila3Patients.filter((p) => ["media", "média"].includes(urgencyOf(p))).length,
    baixa: fila3Patients.filter((p) => urgencyOf(p) === "baixa").length,
  };

  const fila3SemEspecialidade = fila3Patients.filter(
    (p) => (!Array.isArray(p.specialties) || p.specialties.length === 0) && !p.assigned_specialty_id
  ).length;

  const stats = {
    total: patients.length,
    fila1Recepcao: patients.filter((p) => p.current_stage === "step1_atendimento").length,
    fila2Dentista: patients.filter((p) => p.current_stage === "step2_triagem_clinica").length,
    fila3Aguardando: fila3Patients.length,

    // Urgência geral (todos)
    urgencyAlta: patients.filter((p) => urgencyOf(p) === "alta").length,
    urgencyMedia: patients.filter((p) => ["media", "média"].includes(urgencyOf(p))).length,
    urgencyBaixa: patients.filter((p) => urgencyOf(p) === "baixa").length,

    fila3PorUrgencia,
    fila3SemEspecialidade,
  };

  return {
    isPending,
    isFetching,
    isLoading: isPending,
    error,
    stats,
    specialtyChartData,
    treatmentChartData,
    fila3Patients,
    patientsWithSpecialty,
    specialtyMap,
    procedureMap,
  };
};
