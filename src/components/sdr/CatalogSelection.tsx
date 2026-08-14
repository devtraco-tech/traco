import { useEffect, useMemo, useState } from "react";
import { AlertCircle, BookOpen, Loader2, RefreshCw, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSdrCatalog, type CatalogItem } from "@/hooks/useSdrCatalog";

const ALL = "__all__";
function money(value: number | null, currency: string | null) {
  if (value === null) return "Preço sob consulta";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency === "dolar" ? "USD" : "BRL" }).format(value);
}
function commercialTerms(course: CatalogItem): string {
  return course.effective_installment
    ?? course.installment_suggestion
    ?? course.investment_details
    ?? money(course.investment, course.currency);
}
function date(value: string | null): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}
function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n");
  return value && typeof value === "object" ? JSON.stringify(value) : "";
}

export function CatalogSelection({ enabled, onBindingChange }: { enabled:boolean; onBindingChange:(bound:boolean)=>void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ area:"", modality:"", audience:"" });
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  const api = useSdrCatalog(enabled, filters);
  const binding = api.binding.data?.binding ?? null;
  useEffect(() => onBindingChange(Boolean(binding)), [binding, onBindingChange]);
  const courses = useMemo(() => (api.items.data?.items ?? []).filter(course =>
    `${course.title} ${course.area ?? ""}`.toLowerCase().includes(search.toLowerCase())), [api.items.data, search]);
  const unavailable = Boolean(binding && api.items.isSuccess && !api.items.data.items.some(c => c.id === binding.itemId));
  const bind = async (course:CatalogItem) => {
    try {
      await api.bind.mutateAsync(course.id); setDetail(null); onBindingChange(true);
      toast({ title: "Curso vinculado", description: `${course.title} será o contexto oficial deste SDR.` });
    } catch (error) {
      toast({ title: "Não foi possível vincular", description: error instanceof Error ? error.message : "Erro inesperado", variant:"destructive" });
    }
  };
  return <>
    <Card id="catalog" className="scroll-mt-6 border-primary/20">
      <CardHeader><div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</span><div>
        <CardTitle>Catálogo de cursos</CardTitle><CardDescription>Escolha o item que fornecerá o contexto de atendimento do robô.</CardDescription>
      </div></div></CardHeader>
      <CardContent className="space-y-4">
        {binding && <Alert className={unavailable ? "border-amber-500/40" : "border-emerald-500/30"}>
          <BookOpen className="h-4 w-4"/><AlertTitle>Curso vinculado: {binding.snapshot.title}</AlertTitle>
          <AlertDescription>{unavailable ? "Item indisponível no catálogo. O snapshot continua ativo; selecione outro para revincular." : `Snapshot sincronizado em ${new Date(binding.syncedAt).toLocaleString("pt-BR")}.`}</AlertDescription>
        </Alert>}
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder="Buscar título ou área" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          {([['area','Área',api.items.data?.filters?.areas?.map(v=>({value:v,label:v}))],['modality','Modalidade',api.items.data?.filters?.modalities],['audience','Público-alvo',api.items.data?.filters?.targetAudiences]] as const).map(([key,label,options])=><Select key={key} value={filters[key] || ALL} onValueChange={value=>setFilters(current=>({...current,[key]:value===ALL?'':value}))}><SelectTrigger><SelectValue placeholder={label}/></SelectTrigger><SelectContent><SelectItem value={ALL}>Todos</SelectItem>{options?.map(option=><SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>)}
        </div>
        {api.items.isError ? <Alert variant="destructive"><AlertCircle className="h-4 w-4"/><AlertTitle>Não foi possível consultar o catálogo</AlertTitle><AlertDescription className="flex items-center justify-between gap-3"><span>{api.items.error.message}</span><Button size="sm" variant="outline" onClick={()=>api.items.refetch()}><RefreshCw className="mr-2 h-4 w-4"/>Tentar novamente</Button></AlertDescription></Alert>
        : api.items.isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-7 w-7 animate-spin text-primary"/></div>
        : courses.length===0 ? <div className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">Nenhum curso disponível para estes filtros.</div>
        : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{courses.map(course=><button type="button" key={course.id} onClick={()=>setDetail(course)} className={`rounded-xl border p-4 text-left transition hover:border-primary ${binding?.itemId===course.id?'border-primary bg-primary/5':''}`}><div className="flex justify-between gap-2"><p className="font-semibold">{course.title}</p>{binding?.itemId===course.id&&<Badge>Vinculado</Badge>}</div><p className="mt-2 text-sm text-muted-foreground">{course.area||'Área não informada'} · {course.modality||'Modalidade não informada'}</p><div className="mt-3 flex justify-between gap-3 text-sm"><span>{course.available_vacancies ?? '—'} vagas</span><strong className="text-right">{commercialTerms(course)}</strong></div></button>)}</div>}
      </CardContent>
    </Card>
    <Dialog open={Boolean(detail)} onOpenChange={open=>!open&&setDetail(null)}><DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">{detail&&<><DialogHeader><DialogTitle>{detail.title}</DialogTitle><DialogDescription>{detail.area} · {detail.modality}</DialogDescription></DialogHeader><div className="space-y-4 text-sm"><div><h4 className="font-semibold">Ementa</h4><p className="whitespace-pre-wrap text-muted-foreground">{text(detail.program)||detail.description||'Não informada'}</p></div>{detail.prerequisites&&<div><h4 className="font-semibold">Pré-requisitos</h4><p className="text-muted-foreground">{detail.prerequisites}</p></div>}<div><h4 className="font-semibold">Profissionais</h4><p className="text-muted-foreground">{(Array.isArray(detail.teachers)?detail.teachers:[detail.teachers]).filter(Boolean).map(t=>t?.name).filter(Boolean).join(', ')||'Não informados'}{detail.other_professors?` · ${detail.other_professors}`:''}</p></div><div><h4 className="font-semibold">Condições comerciais</h4><p className="text-muted-foreground">{commercialTerms(detail)}</p></div>{detail.registration_deadline&&<p className="text-muted-foreground">Matrículas até {date(detail.registration_deadline)}.</p>}<p className="text-muted-foreground">Carga horária: {detail.workload??'—'} · Vagas disponíveis: {detail.available_vacancies??'—'}</p></div><DialogFooter><Button onClick={()=>bind(detail)} disabled={api.bind.isPending}>{api.bind.isPending&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{binding?.itemId===detail.id?'Atualizar vínculo':'Vincular item a este SDR'}</Button></DialogFooter></>}</DialogContent></Dialog>
  </>;
}
