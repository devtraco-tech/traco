import { useClassifiedLogs } from "@/hooks/useClassifieds";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatBrazilDate } from "@/lib/dateUtils";
import { Loader2, CheckCircle2, XCircle, FileText, Plus } from "lucide-react";

interface ClassifiedLogsProps {
  classifiedId: string;
}

export const ClassifiedLogs = ({ classifiedId }: ClassifiedLogsProps) => {
  const { data: logs, isLoading, error } = useClassifiedLogs(classifiedId);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "approved":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "updated":
        return <FileText className="h-5 w-5 text-blue-600" />;
      case "created":
        return <Plus className="h-5 w-5 text-muted-foreground" />;
      default:
        return <FileText className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: "Criado",
      approved: "Aprovado",
      rejected: "Rejeitado",
      updated: "Atualizado",
    };
    return labels[action] || action;
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      case "updated":
        return "secondary";
      case "created":
        return "outline";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Logs</CardTitle>
          <CardDescription>Registro de todas as ações realizadas neste classificado</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Logs</CardTitle>
          <CardDescription>Registro de todas as ações realizadas neste classificado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">Erro ao carregar logs</p>
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Logs</CardTitle>
          <CardDescription>Registro de todas as ações realizadas neste classificado</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhum log disponível ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Logs</CardTitle>
        <CardDescription>Registro de todas as ações realizadas neste classificado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
              <div className="flex-shrink-0 mt-1">
                {getActionIcon(log.action)}
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getActionBadgeVariant(log.action) as any}>
                    {getActionLabel(log.action)}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatBrazilDate(log.created_at)}
                  </span>
                </div>
                {log.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{log.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
