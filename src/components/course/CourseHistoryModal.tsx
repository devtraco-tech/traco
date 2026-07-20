import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCourseHistory } from "@/hooks/useCourseHistory";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Clock, User, FileEdit } from "lucide-react";

interface CourseHistoryModalProps {
  courseId: string;
  open: boolean;
  onClose: () => void;
}

const fieldLabels: Record<string, string> = {
  title: "Título",
  area: "Área",
  description: "Descrição",
  workload: "Carga Horária",
  investment: "Investimento",
  vacancies: "Vagas",
  status: "Status",
  suggested_start_date: "Data Sugerida de Início",
  effective_start_date: "Data Efetiva de Início",
  language: "Idioma",
  modality: "Modalidade",
};

const changeTypeLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  created: { label: "Criado", variant: "secondary" },
  updated: { label: "Atualizado", variant: "default" },
  status_changed: { label: "Status Alterado", variant: "outline" },
};

export const CourseHistoryModal = ({ courseId, open, onClose }: CourseHistoryModalProps) => {
  const { history, isLoading } = useCourseHistory(courseId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico de Alterações</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={changeTypeLabels[entry.change_type]?.variant || "default"}>
                        {changeTypeLabels[entry.change_type]?.label || entry.change_type}
                      </Badge>
                      {entry.field_name && (
                        <span className="text-sm font-medium">
                          {fieldLabels[entry.field_name] || entry.field_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.change_date), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  {entry.description && (
                    <p className="text-sm text-muted-foreground mb-2">{entry.description}</p>
                  )}

                  {entry.old_value && entry.new_value && (
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Valor Anterior</p>
                        <p className="bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-900">
                          {entry.old_value}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Novo Valor</p>
                        <p className="bg-green-50 dark:bg-green-950/20 p-2 rounded border border-green-200 dark:border-green-900">
                          {entry.new_value}
                        </p>
                      </div>
                    </div>
                  )}

                  {entry.profiles && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>
                        Alterado por: <span className="font-medium">{entry.profiles.name}</span>
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma alteração registrada para este curso.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
