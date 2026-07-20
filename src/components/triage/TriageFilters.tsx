import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, ArrowUpDown, Stethoscope, AlertTriangle, FileCheck, User } from "lucide-react";

export type SortKey = "newest" | "oldest" | "longest_in_status";

export type TriageFilterValue = {
  search: string;
  specialtyIds: string[];
  procedureIds: string[];
  urgency: "all" | "baixa" | "media" | "alta";
  hasExams: "all" | "yes" | "no";
  sort: SortKey;
  triagedByName: string;
};

export const DEFAULT_FILTERS: TriageFilterValue = {
  search: "",
  specialtyIds: [],
  procedureIds: [],
  urgency: "all",
  hasExams: "all",
  sort: "newest",
  triagedByName: "all",
};

type Procedure = { id: string; name: string; specialty_id?: string };

type Props = {
  value: TriageFilterValue;
  onChange: (v: TriageFilterValue) => void;
  specialties: { id: string; name: string }[];
  procedures?: Procedure[];
  showUrgency?: boolean;
  showExams?: boolean;
  triagedByUsers?: string[];
};

export function TriageFilters({ value, onChange, specialties, procedures = [], showUrgency = false, showExams = false, triagedByUsers = [] }: Props) {
  const [openSpec, setOpenSpec] = useState(false);
  const [openProc, setOpenProc] = useState(false);

  const toggle = (key: "specialtyIds" | "procedureIds", id: string) => {
    const arr = value[key];
    const has = arr.includes(id);
    onChange({
      ...value,
      [key]: has ? arr.filter((s) => s !== id) : [...arr, id],
    });
  };

  const clear = () => onChange(DEFAULT_FILTERS);
  const activeCount =
    (value.search ? 1 : 0) +
    value.specialtyIds.length +
    value.procedureIds.length +
    (value.urgency !== "all" ? 1 : 0) +
    (value.hasExams !== "all" ? 1 : 0) +
    (value.sort !== "newest" ? 1 : 0) +
    (value.triagedByName !== "all" ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Buscar por nome..."
          className="pl-9"
        />
      </div>

      <Select value={value.sort} onValueChange={(v: SortKey) => onChange({ ...value, sort: v })}>
        <SelectTrigger className="w-[180px]">
          <ArrowUpDown className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Mais recentes</SelectItem>
          <SelectItem value="oldest">Mais antigos</SelectItem>
          <SelectItem value="longest_in_status">Mais tempo na fila</SelectItem>
        </SelectContent>
      </Select>

      <Popover open={openSpec} onOpenChange={setOpenSpec}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="default">
            <Filter className="h-4 w-4 mr-2" />
            Especialidades
            {value.specialtyIds.length > 0 && (
              <Badge variant="secondary" className="ml-2">{value.specialtyIds.length}</Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="text-sm font-bold mb-2">Filtrar por especialidade</div>
          <div className="max-h-64 overflow-auto space-y-1">
            {specialties.length === 0 && (
              <p className="text-xs text-muted-foreground">Nenhuma especialidade cadastrada.</p>
            )}
            {specialties.map((s) => {
              const active = value.specialtyIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle("specialtyIds", s.id)}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${
                    active ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {procedures.length > 0 && (
        <Popover open={openProc} onOpenChange={setOpenProc}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="default">
              <Stethoscope className="h-4 w-4 mr-2" />
              Procedimentos
              {value.procedureIds.length > 0 && (
                <Badge variant="secondary" className="ml-2">{value.procedureIds.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="text-sm font-bold mb-2">Filtrar por procedimento</div>
            <div className="max-h-64 overflow-auto space-y-1">
              {procedures.map((p) => {
                const active = value.procedureIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle("procedureIds", p.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${
                      active ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {showUrgency && (
        <Select value={value.urgency} onValueChange={(v: any) => onChange({ ...value, urgency: v })}>
          <SelectTrigger className="w-[160px]">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda urgência</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showExams && (
        <Select value={value.hasExams} onValueChange={(v: any) => onChange({ ...value, hasExams: v })}>
          <SelectTrigger className="w-[160px]">
            <FileCheck className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Exames (todos)</SelectItem>
            <SelectItem value="yes">Possui exames</SelectItem>
            <SelectItem value="no">Sem exames</SelectItem>
          </SelectContent>
        </Select>
      )}

      {triagedByUsers.length > 0 && (
        <Select value={value.triagedByName} onValueChange={(v: string) => onChange({ ...value, triagedByName: v })}>
          <SelectTrigger className="w-[180px]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Quem triou" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Quem triou (Todos)</SelectItem>
            {triagedByUsers.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clear}>
          <X className="h-4 w-4 mr-1" /> Limpar ({activeCount})
        </Button>
      )}
    </div>
  );
}

/** Apply filters + sort to a list of patients */
export function applyTriageFilters<T extends Record<string, any>>(
  list: T[],
  f: TriageFilterValue,
): T[] {
  let out: T[] = list as T[];
  if (f.search) {
    const q = f.search.toLowerCase();
    out = out.filter((p) =>
      (p.full_name || "").toLowerCase().includes(q)
      || (p.email || "").toLowerCase().includes(q)
      || (p.mobile_phone || "").toLowerCase().includes(q)
      || (p.cpf || "").toLowerCase().includes(q)
    );
  }
  if (f.specialtyIds.length) {
    out = out.filter((p) => {
      const arr: string[] = p.specialties || [];
      const assigned = p.assigned_specialty_id;
      return f.specialtyIds.some((id) => arr.includes(id) || assigned === id);
    });
  }
  if (f.procedureIds.length) {
    out = out.filter((p) => {
      const arr: string[] = p.treatment_types || [];
      return f.procedureIds.some((id) => arr.includes(id));
    });
  }
  if (f.urgency !== "all") {
    out = out.filter((p) => (p.urgency || "baixa") === f.urgency);
  }
  if (f.hasExams !== "all") {
    out = out.filter((p) => Boolean(p.has_exams) === (f.hasExams === "yes"));
  }
  if (f.triagedByName && f.triagedByName !== "all") {
    out = out.filter((p) => p.triaged_by_name === f.triagedByName);
  }
  const sorted = [...out];
  if (f.sort === "newest") {
    sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (f.sort === "oldest") {
    sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (f.sort === "longest_in_status") {
    sorted.sort((a, b) => {
      const ta = new Date(a.updated_at || a.created_at).getTime();
      const tb = new Date(b.updated_at || b.created_at).getTime();
      return ta - tb;
    });
  }
  return sorted;
}
