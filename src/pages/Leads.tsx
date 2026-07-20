import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCourseLeads } from "@/hooks/useCourseLeads";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Trash2 } from "lucide-react";

const statusOptions = [
  { value: "pending", label: "Pendente", color: "bg-yellow-500" },
  { value: "contacted", label: "Contatado", color: "bg-blue-500" },
  { value: "converted", label: "Convertido", color: "bg-green-500" },
  { value: "lost", label: "Perdido", color: "bg-red-500" },
];

const Leads = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { leads, isLoading, updateLeadStatus, deleteLead, stats } = useCourseLeads();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const filteredLeads = statusFilter === "all"
    ? leads
    : leads?.filter(lead => lead.status === statusFilter);

  const getStatusBadge = (status: string | null) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <Badge className={`${statusOption?.color} text-white`}>
        {statusOption?.label || status || "Pendente"}
      </Badge>
    );
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    updateLeadStatus.mutate({ 
      leadId, 
      status: newStatus as 'pending' | 'contacted' | 'converted' | 'lost' 
    });
  };

  const handleDeleteLead = (leadId: string) => {
    setDeleteLeadId(leadId);
  };

  const confirmDelete = () => {
    if (deleteLeadId) {
      deleteLead.mutate(deleteLeadId);
      setDeleteLeadId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads de Pré-Matrícula</h1>
          <p className="text-muted-foreground">
            Gerencie os interessados nos cursos
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Leads</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-3xl text-yellow-500">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contatados</CardDescription>
            <CardTitle className="text-3xl text-blue-500">{stats.contacted}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Convertidos</CardDescription>
            <CardTitle className="text-3xl text-green-500">{stats.converted}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Todos os Leads</CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Curso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads?.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.phone || "-"}</TableCell>
                    <TableCell>{lead.courses?.title || "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={lead.status || "pending"}
                        onValueChange={(value) => handleStatusChange(lead.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          {getStatusBadge(lead.status || "pending")}
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-medium text-foreground whitespace-nowrap" title={`Criado em: ${format(new Date(lead.created_at), "dd/MM/yyyy HH:mm")}`}>
                          Criado há {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className="w-fit font-bold text-[9px] rounded-lg border-muted text-muted-foreground bg-muted/20 uppercase" title="Tempo no status atual">
                          Status: {formatDistanceToNow(new Date(lead.updated_at || lead.created_at), { locale: ptBR })}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLead(lead.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteLeadId} onOpenChange={() => setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Leads;
