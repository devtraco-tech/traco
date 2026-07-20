import { Card, CardContent } from "@/components/ui/card";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, User, Calendar, MessageCircle, Clock } from "lucide-react";
import { buildWhatsappUrl, buildPatientWhatsappMessage } from "@/lib/whatsapp";

interface CompactPatientCardProps {
  patient: any;
  specialties: any[];
  onDragStart: (e: any, id: string) => void;
  onClick: (patient: any) => void;
  children?: React.ReactNode;
}

export function CompactPatientCard({ patient, specialties, onDragStart, onClick, children }: CompactPatientCardProps) {
  const isReturn = patient.is_return;
  const noShowCount = patient.no_show_count || 0;
  
  const initials = patient.full_name?.substring(0, 2).toUpperCase() || "PA";
  
  const specId = patient.specialties?.[0] || patient.assigned_specialty_id || patient.display_specialty_id;
  const specName = specId && specialties ? specialties.find((s: any) => s.id === specId)?.name : null;

  const daysInSystem = patient.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(patient.created_at).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <Card
      key={patient.id}
      draggable
      onDragStart={e => onDragStart(e, patient.id)}
      className="group shrink-0 cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all duration-200 border-border bg-card rounded-2xl shadow-sm overflow-hidden flex flex-col"
      onClick={() => onClick(patient)}
    >
      <CardContent className="p-3 flex-1 flex flex-col">
        {/* Top Tags Row */}
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          {noShowCount > 0 && (
            <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase flex items-center gap-1 shadow-sm">
              <AlertCircle className="h-2.5 w-2.5" />
              FALTOU {noShowCount}x
            </span>
          )}
          {isReturn && (
            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase shadow-sm">
              RETORNO
            </span>
          )}
          {patient.is_exam_return && (
            <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-black uppercase shadow-sm">
              RETORNO EXAMES
            </span>
          )}
          {patient.urgency && (
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase text-white shadow-sm ${patient.urgency === 'alta' ? 'bg-rose-500' : patient.urgency === 'media' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
              {patient.urgency}
            </span>
          )}
          {specName && (
            <span className="text-[9px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-sm uppercase">
              {specName}
            </span>
          )}
          {patient.treatment_types && patient.treatment_types.length > 0 && (
            <span className="text-[9px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-sm uppercase">
              {patient.treatment_types.length} PROC
            </span>
          )}
        </div>

        {/* Name and Meta */}
        <div className="flex flex-col gap-0.5 mb-2">
          <h3 className="font-bold text-foreground text-sm truncate group-hover:text-blue-600 transition-colors" title={patient.full_name}>
            {patient.full_name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-medium text-muted-foreground">
            <span>{patient.cpf || "Sem CPF"}</span>
            <span className="text-muted-foreground/30">•</span>
            {patient.mobile_phone && buildWhatsappUrl(patient.mobile_phone) ? (
              <a
                href={buildWhatsappUrl(patient.mobile_phone, buildPatientWhatsappMessage(patient.full_name))!}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-emerald-600 hover:text-emerald-700 hover:underline inline-flex items-center gap-0.5 font-bold"
                title="Abrir conversa no WhatsApp"
              >
                <MessageCircle className="h-3 w-3" />
                {patient.mobile_phone}
              </a>
            ) : (
              <span className="text-muted-foreground/70">{patient.mobile_phone || "Sem Celular"}</span>
            )}
            <span className="text-muted-foreground/30">•</span>
            <span className="truncate max-w-[120px]">{patient.city || "Sem Cidade"}</span>
          </div>
        </div>

        {/* Queixa Row */}
        <div className="text-[11px] leading-tight text-foreground/80 italic mb-3 bg-muted/30 p-1.5 rounded border border-border/50 border-l-2 border-l-blue-400">
          "{patient.treatment_needed || "Motivo não informado"}"
        </div>

        {/* Extra Info Passed as Children */}
        {children && <div className="mb-3">{children}</div>}

        <div className="flex-1" />

        {/* Footer Bar */}
        <div className="pt-2.5 mt-auto border-t border-border flex flex-wrap items-center justify-between gap-2 text-[9px] font-bold text-muted-foreground uppercase bg-muted/10 -mx-3 -mb-3 px-3 pb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 truncate max-w-[100px]" title={`Atendente: ${patient.triaged_by_name || "Nenhum"}`}>
              <User className="h-3 w-3 text-blue-500" />
              <span className="truncate">{patient.triaged_by_name?.split(" ")[0] || "Sem Atend."}</span>
            </div>
            
            {patient.stage_updated_at && (
              <div className="flex items-center gap-1.5 text-amber-600" title="Tempo na fila atual">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(patient.stage_updated_at), { locale: ptBR }).replace('aproximadamente ', '')} na fila
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {daysInSystem !== null && (
              <div
                className="flex items-center gap-1 text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-sm normal-case font-bold"
                title={`No sistema há ${daysInSystem} dia(s) desde a primeira entrada`}
              >
                <Clock className="h-3 w-3" />
                {daysInSystem}d no sistema
              </div>
            )}
            <div className="flex items-center gap-1.5" title={`Criado em: ${format(new Date(patient.created_at), "dd MMM yyyy HH:mm", { locale: ptBR })}`}>
              <Calendar className="h-3 w-3 text-slate-400" />
              {format(new Date(patient.created_at), "dd/MM/yy")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
