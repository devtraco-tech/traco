import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, User, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCpf } from "@/lib/cpfUtils";

const STAGE_LABELS: Record<string, string> = {
  step1_atendimento: "Agendamento Triagem 3",
  step2_triagem_clinica: "Fila 2: Triagem Clínica 3",
  step3_selecao_cap: "Fila de Espera",
  arquivado: "Arquivado",
};

export interface ExistingPatientInfo {
  id: string;
  full_name: string;
  cpf?: string | null;
  current_stage?: string | null;
  created_at?: string | null;
}

interface DuplicateCpfDialogProps {
  open: boolean;
  existing: ExistingPatientInfo | null;
  onOpenExisting?: (patient: ExistingPatientInfo) => void;
  onCancel: () => void;
}

export function DuplicateCpfDialog({ open, existing, onOpenExisting, onCancel }: DuplicateCpfDialogProps) {
  if (!existing) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-md rounded-3xl border-rose-200 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 mx-auto">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
          </div>
          <DialogTitle className="text-xl font-black uppercase tracking-tight text-center text-foreground">
            CPF já cadastrado
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground font-medium">
            Encontramos um paciente com este CPF no sistema. Não é possível criar um cadastro duplicado.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 rounded-2xl p-5 space-y-3 border border-border">
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome</p>
              <p className="font-bold text-foreground truncate">{existing.full_name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-[10px] font-black text-muted-foreground mt-1 shrink-0 w-4 text-center">#</span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">CPF</p>
              <p className="font-bold text-foreground">{formatCpf(existing.cpf || "")}</p>
            </div>
          </div>
          {existing.current_stage && (
            <div className="flex items-start gap-3">
              <ArrowRight className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Etapa atual</p>
                <p className="font-bold text-foreground">{STAGE_LABELS[existing.current_stage] || existing.current_stage}</p>
              </div>
            </div>
          )}
          {existing.created_at && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cadastrado em</p>
                <p className="font-bold text-foreground">{format(new Date(existing.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel} className="rounded-xl font-bold uppercase text-xs">
            Cancelar
          </Button>
          {onOpenExisting && (
            <Button
              onClick={() => onOpenExisting(existing)}
              className="rounded-xl font-black uppercase text-xs bg-blue-600 hover:bg-blue-700"
            >
              Abrir cadastro existente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
