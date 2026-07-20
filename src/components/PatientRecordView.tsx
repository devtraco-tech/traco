import { PatientData } from "@/hooks/mockPatientStore";
import { useTriageConfig } from "@/hooks/useTriageConfig";
import { SectionTitle, InfoCard, InfoField } from "@/components/ui/modal-kit";
import {
  Stethoscope, ShieldAlert, Info, CheckCircle2, MessageCircle,
} from "lucide-react";
import { buildWhatsappUrl, buildPatientWhatsappMessage } from "@/lib/whatsapp";
import { format } from "date-fns";

export function PatientRecordView({ patient }: { patient: PatientData }) {
  const { procedures, clinics } = useTriageConfig();

  const patientProcedures = procedures.filter((p) => patient.treatment_types?.includes(p.id));

  const whatsappUrl = buildWhatsappUrl(
    patient.mobile_phone,
    buildPatientWhatsappMessage(patient.full_name),
  );

  const clinicName =
    clinics && clinics.length > 0
      ? clinics.find((c) => c.id === patient.assigned_clinic_id)?.name || "Não atribuída"
      : "Carregando...";

  return (
    <div className="flex flex-col gap-6">
      {/* DADOS PESSOAIS */}
      <section className="space-y-3">
        <SectionTitle>Dados Pessoais</SectionTitle>
        <InfoCard>
          <InfoField
            label="Nascimento"
            value={patient.birth_date ? format(new Date(patient.birth_date), "dd/MM/yyyy") : "--"}
          />
          <InfoField label="CPF" value={patient.cpf || "--"} />
          <InfoField
            label="WhatsApp / Celular"
            value={
              whatsappUrl ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-1.5"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {patient.mobile_phone}
                </a>
              ) : (
                patient.mobile_phone || "--"
              )
            }
          />
          <InfoField label="Localidade" value={`${patient.city || "--"} - ${patient.state || "--"}`} />
          <InfoField
            label="Unidade de Referência"
            value={clinicName}
            valueClassName="text-rose-500 uppercase"
            className="col-span-2 lg:col-span-4"
          />
        </InfoCard>
      </section>

      {/* TRIAGEM CLÍNICA */}
      <section className="space-y-3">
        <SectionTitle
          count={
            patient.urgency === "alta"
              ? "Urgência alta"
              : patient.urgency === "media"
                ? "Urgência média"
                : undefined
          }
        >
          Triagem Clínica
        </SectionTitle>

        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
              <Info className="h-3 w-3" /> Queixa Principal
            </span>
            <p className="text-sm text-foreground leading-relaxed bg-background p-3 rounded-xl border border-border italic">
              "{patient.treatment_needed || "Nenhum relato inicial."}"
            </p>
          </div>

          {(patient.medical_history || patient.urgency === "alta") && (
            <div>
              <span className="text-[10px] font-bold text-red-500 uppercase mb-1.5 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" /> Observações Médicas (Anamnese)
              </span>
              <p className="text-sm text-foreground font-medium bg-red-50/40 p-3 rounded-xl border border-red-100">
                {patient.medical_history || "Sem observações críticas relatadas."}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* PROCEDIMENTOS */}
      <section className="space-y-3">
        <SectionTitle count={`${patientProcedures.length} itens`}>
          Procedimentos Especializados Mapeados
        </SectionTitle>
        <div className="bg-background rounded-2xl p-5 border border-border">
          {patientProcedures.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              Nenhum procedimento específico foi marcado na triagem técnica para este paciente.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {patientProcedures.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50/60 border border-emerald-200 rounded-lg"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-tight">{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* EXAMES */}
      {(patient.has_exams || patient.dentist_requested_exams) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patient.has_exams && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> Exames Apresentados
              </span>
              <p className="text-xs font-medium text-amber-900 leading-tight">
                TIPO: {patient.exams_type || "N/A"} | VALIDADE: {patient.exams_validity || "N/A"}
              </p>
            </div>
          )}
          {patient.dentist_requested_exams && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
              <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">
                Exames Solicitados
              </span>
              <p className="text-xs font-medium text-blue-900 leading-tight">
                {patient.dentist_requested_exams}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
