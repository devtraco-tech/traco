import { Fragment, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Download, Filter, X, ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import { useUserRole } from "@/hooks/useUserRole";
import { useSystemLogs, type SystemLog, type LogCategory } from "@/hooks/useSystemLogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const CATEGORY_LABEL: Record<LogCategory, string> = {
  course: "Curso",
  classified: "Classificado",
  validation: "Validação",
  notification: "Notificação",
};

const CATEGORY_COLOR: Record<LogCategory, string> = {
  course: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
  classified: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  validation: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
  notification: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30",
};

const ACTION_LABEL: Record<string, string> = {
  created: "Criou",
  updated: "Editou",
  status_changed: "Mudou status",
  approved: "Aprovou",
  rejected: "Rejeitou",
  pending_correction: "Pediu correção",
  pending_review: "Enviou p/ revisão",
  notification: "Notificou",
  course: "Notificou",
  classified: "Notificou",
  validation: "Notificou",
};

const PAGE_SIZE = 50;

export default function Logs() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  // Default: last 30 days
  const [fromDate, setFromDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [toDate, setToDate] = useState<Date | undefined>(new Date());
  const [categories, setCategories] = useState<LogCategory[]>([]);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userQuery, setUserQuery] = useState("");
  const [textQuery, setTextQuery] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: logs, isLoading } = useSystemLogs({
    fromDate: fromDate?.toISOString(),
    toDate: toDate ? new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString() : undefined,
    enabled: isAdmin,
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l) => {
      if (categories.length > 0 && !categories.includes(l.category)) return false;
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (userQuery) {
        const q = userQuery.toLowerCase();
        const u = l.user;
        if (!u) return false;
        if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
      }
      if (textQuery) {
        const q = textQuery.toLowerCase();
        const blob = [l.description, l.field, l.oldValue, l.newValue, l.resource?.title, l.action]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [logs, categories, actionFilter, userQuery, textQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const availableActions = useMemo(() => {
    const set = new Set<string>();
    (logs || []).forEach((l) => set.add(l.action));
    return Array.from(set).sort();
  }, [logs]);

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const toggleCategory = (cat: LogCategory) => {
    setPage(1);
    setCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const clearFilters = () => {
    setCategories([]);
    setActionFilter("all");
    setUserQuery("");
    setTextQuery("");
    setFromDate(subDays(new Date(), 30));
    setToDate(new Date());
    setPage(1);
  };

  const exportCsv = () => {
    const headers = ["Data", "Usuário", "Email", "Categoria", "Ação", "Recurso", "Campo", "Valor Antigo", "Valor Novo", "Descrição"];
    const rows = filtered.map((l) => [
      format(new Date(l.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }),
      l.user?.name ?? "",
      l.user?.email ?? "",
      CATEGORY_LABEL[l.category],
      ACTION_LABEL[l.action] ?? l.action,
      l.resource?.title ?? "",
      l.field ?? "",
      l.oldValue ?? "",
      l.newValue ?? "",
      l.description ?? "",
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resourceLink = (l: SystemLog) => {
    if (!l.resource) return null;
    if (l.resource.type === "course") return `/courses/${l.resource.id}`;
    if (l.resource.type === "classified") return `/classifieds/${l.resource.id}`;
    return null;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Logs do Sistema</h1>
          <p className="text-muted-foreground">Auditoria completa de ações em cursos, classificados, validações e notificações.</p>
        </div>
        <Button onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Exportar CSV ({filtered.length})
        </Button>
      </div>

      <Card className="p-4 space-y-4 sticky top-2 z-10 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" /> Filtros
        </div>

        {/* Categoria */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CATEGORY_LABEL) as LogCategory[]).map((cat) => (
            <Badge
              key={cat}
              variant={categories.includes(cat) ? "default" : "outline"}
              className={cn("cursor-pointer", categories.includes(cat) ? "" : CATEGORY_COLOR[cat])}
              onClick={() => toggleCategory(cat)}
            >
              {CATEGORY_LABEL[cat]}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Period - from */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {fromDate ? format(fromDate, "dd/MM/yyyy") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={fromDate} onSelect={(d) => { setFromDate(d); setPage(1); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {toDate ? format(toDate, "dd/MM/yyyy") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={toDate} onSelect={(d) => { setToDate(d); setPage(1); }} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          {/* Action */}
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {availableActions.map((a) => (
                <SelectItem key={a} value={a}>{ACTION_LABEL[a] ?? a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User */}
          <Input placeholder="Usuário (nome ou email)" value={userQuery} onChange={(e) => { setUserQuery(e.target.value); setPage(1); }} />

          {/* Text */}
          <Input placeholder="Buscar em descrição/recurso" value={textQuery} onChange={(e) => { setTextQuery(e.target.value); setPage(1); }} />
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" /> Limpar filtros
          </Button>
        </div>
      </Card>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Data/Hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Nenhum log encontrado para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((l) => {
                const isExpanded = expanded.has(l.id);
                const link = resourceLink(l);
                return (
                  <Fragment key={l.id}>
                    <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(l.id)}>
                      <TableCell>
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(l.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {l.user ? (
                          <div>
                            <div className="font-medium text-sm">{l.user.name}</div>
                            <div className="text-xs text-muted-foreground">{l.user.email}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={CATEGORY_COLOR[l.category]}>
                          {CATEGORY_LABEL[l.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ACTION_LABEL[l.action] ?? l.action}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {l.resource ? (
                          link ? (
                            <Link to={link} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                              {l.resource.title}
                            </Link>
                          ) : (
                            <span>{l.resource.title}</span>
                          )
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-sm">
                        {l.field && (l.oldValue || l.newValue) ? (
                          <span><strong>{l.field}:</strong> {l.oldValue ?? "∅"} → {l.newValue ?? "∅"}</span>
                        ) : (
                          <span className="text-muted-foreground">{l.description ?? "—"}</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={l.id + "-x"} className="bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={6} className="text-xs space-y-1 py-3">
                          <div><strong>ID:</strong> {l.id}</div>
                          {l.field && <div><strong>Campo:</strong> {l.field}</div>}
                          {l.oldValue && <div><strong>Valor anterior:</strong> <code className="bg-background px-1 rounded">{l.oldValue}</code></div>}
                          {l.newValue && <div><strong>Novo valor:</strong> <code className="bg-background px-1 rounded">{l.newValue}</code></div>}
                          {l.description && <div><strong>Descrição:</strong> {l.description}</div>}
                          {l.resource && <div><strong>Recurso ID:</strong> {l.resource.id}</div>}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({filtered.length} registros)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}
