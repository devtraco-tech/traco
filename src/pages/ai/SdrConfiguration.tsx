import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertCircle,
  Bot,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Loader2,
  MessageSquareText,
  PauseCircle,
  PlugZap,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Unplug,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useSdrWhatsapp, type SdrWhatsappStatusName } from "@/hooks/useSdrWhatsapp";
import { useSdrTraining } from "@/hooks/useSdrTraining";
import { useUserRole } from "@/hooks/useUserRole";
import { CatalogSelection } from "@/components/sdr/CatalogSelection";
import { useSdrClint } from "@/hooks/useSdrClint";

const INITIAL_SCRIPT = `Você é o assistente comercial da organização configurada.

1. Cumprimente o lead e pergunte qual curso despertou interesse.
2. Responda somente com informações disponíveis no catálogo.
3. Identifique modalidade, disponibilidade e intenção de matrícula.
4. Colete os dados de matrícula; dúvidas de pagamento ou coleta concluída devem ser encaminhadas para uma pessoa.
5. Nunca invente preços, datas, vagas ou condições comerciais.`;

const WIZARD_STEPS = [
  { id: 1, title: "Curso", description: "Curso e identificação" },
  { id: 2, title: "WhatsApp", description: "Conexão WAHA" },
  { id: 3, title: "Comercial", description: "Roteiro do robô" },
  { id: 4, title: "Clint", description: "CRM comercial" },
  { id: 5, title: "Finalização", description: "Handoff e revisão" },
] as const;

const WAHA_STATUS_LABELS: Record<SdrWhatsappStatusName, string> = {
  MISSING: "Sessão não iniciada",
  STOPPED: "Sessão parada",
  STARTING: "Iniciando sessão",
  SCAN_QR_CODE: "Aguardando leitura do QR",
  PASSKEY_REQUIRED: "Confirmação adicional necessária",
  PASSKEY_CONFIRMATION_REQUIRED: "Confirme o código no WhatsApp",
  WORKING: "Conectado",
  FAILED: "Falha na sessão",
  UNKNOWN: "Estado desconhecido",
};

function formatWhatsappPhone(phone: string | null | undefined): string {
  if (!phone) return "Número não informado";
  if (phone.startsWith("55") && phone.length >= 12) {
    const areaCode = phone.slice(2, 4);
    const local = phone.slice(4);
    return `+55 (${areaCode}) ${local.slice(0, -4)}-${local.slice(-4)}`;
  }
  return `+${phone}`;
}

function SectionNumber({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
      {children}
    </span>
  );
}

const SdrConfiguration = () => {
  const { isAdmin, isLoading } = useUserRole();
  const { toast } = useToast();
  const whatsapp = useSdrWhatsapp(isAdmin && !isLoading);
  const training = useSdrTraining(isAdmin && !isLoading);
  const clint = useSdrClint(isAdmin && !isLoading);
  const wasWhatsappConnected = useRef(false);
  const loadedTrainingVersion = useRef<string | null>(null);

  const [robotName, setRobotName] = useState("Assistente Comercial Traço");
  const [isActive, setIsActive] = useState(false);
  const [commercialScript, setCommercialScript] = useState(INITIAL_SCRIPT);
  const [pdfSourceUrl, setPdfSourceUrl] = useState("");
  const [pdfTitle, setPdfTitle] = useState("Material do curso.pdf");
  const [isSaving, setIsSaving] = useState(false);
  const [courseBound, setCourseBound] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const whatsappConnected = Boolean(whatsapp.status?.connected);
  const clintConnected = Boolean(clint.status?.connected);

  useEffect(() => {
    const configuration = training.configuration;
    if (!configuration?.script || loadedTrainingVersion.current === configuration.version) return;
    setCommercialScript(configuration.script);
    loadedTrainingVersion.current = configuration.version;
  }, [training.configuration]);

  useEffect(() => {
    const pdf = training.configuration?.documents.find(
      (document) => document.documentType === "pdf" && document.active,
    );
    if (!pdf) return;
    setPdfSourceUrl(pdf.sourceUrl ?? "");
    setPdfTitle(pdf.title);
  }, [training.configuration?.documents]);

  useEffect(() => {
    if (whatsappConnected && !wasWhatsappConnected.current) {
      toast({
        title: "WhatsApp conectado",
        description: "O WAHA confirmou que a sessão está pronta para uso.",
      });
    }
    wasWhatsappConnected.current = whatsappConnected;
  }, [toast, whatsappConnected]);

  const prerequisites = useMemo(
    () => [
      {
        id: "course",
        label: "Item do catálogo vinculado",
        ready: courseBound,
        section: "Catálogo",
      },
      {
        id: "whatsapp",
        label: "WhatsApp conectado pelo WAHA",
        ready: whatsappConnected,
        section: "Conexão",
      },
      {
        id: "clint",
        label: "Integração Clint validada",
        ready: clintConnected,
        section: "Clint",
      },
      {
        id: "script",
        label: "Script comercial configurado",
        ready: Boolean(training.configuration?.readiness.ready),
        section: "Comercial",
      },
    ],
    [courseBound, clintConnected, whatsappConnected, training.configuration?.readiness.ready],
  );

  const missingPrerequisites = prerequisites.filter((item) => !item.ready);
  const canActivate = missingPrerequisites.length === 0;
  const stepReady: Record<number, boolean> = {
    1: courseBound && robotName.trim().length > 0,
    2: whatsappConnected,
    3: Boolean(training.configuration?.readiness.ready) && commercialScript.trim().length >= 80,
    4: clintConnected,
    5: canActivate,
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRobotStatus = (nextStatus: boolean) => {
    if (nextStatus && !canActivate) {
      toast({
        title: "Não foi possível ativar o robô",
        description: `Conclua os itens pendentes: ${missingPrerequisites
          .map((item) => item.section)
          .join(", ")}.`,
        variant: "destructive",
      });
      return;
    }

    setIsActive(nextStatus);
    toast({
      title: nextStatus ? "Robô ativado" : "Robô pausado",
      description: nextStatus
        ? "O atendimento automático foi ativado nesta simulação."
        : "Novas mensagens não serão respondidas automaticamente.",
    });
  };

  const handleConnectWhatsapp = async () => {
    try {
      await whatsapp.start.mutateAsync();
      toast({
        title: "Sessão WAHA iniciada",
        description: "Aguarde o QR Code e leia-o com o celular de atendimento.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível iniciar o WhatsApp",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectWhatsapp = async () => {
    try {
      await whatsapp.disconnect.mutateAsync();
      setIsActive(false);
      toast({
        title: "WhatsApp desconectado",
        description: "O aparelho foi removido e o robô foi pausado automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível desconectar",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setIsActive(true);
    setIsSaving(false);
    toast({
      title: "Configuração concluída",
      description: "O SDR está pronto para usar exclusivamente o CRM Clint.",
    });
  };

  const handleInstallTraining = async () => {
    try {
      const installed = await training.install.mutateAsync();
      setCommercialScript(installed.script);
      loadedTrainingVersion.current = installed.version;
      toast({
        title: "Treinamento oficial instalado",
        description: "Script, FAQ e matriz de públicos já podem orientar o SDR.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível instalar o treinamento",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleSavePdf = async () => {
    try {
      await training.savePdf.mutateAsync({ sourceUrl: pdfSourceUrl, title: pdfTitle });
      toast({
        title: "PDF comercial salvo",
        description: "O SDR poderá enviar este documento quando o lead solicitar.",
      });
    } catch (error) {
      toast({
        title: "Não foi possível salvar o PDF",
        description: error instanceof Error ? error.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleNextStep = async () => {
    if (!stepReady[currentStep]) {
      const messages: Record<number, string> = {
        1: "Vincule um item do catálogo e informe o nome do robô.",
        2: "Conecte o WhatsApp pelo WAHA antes de continuar.",
        3: "Complete o roteiro comercial com pelo menos 80 caracteres.",
        4: "Configure as credenciais e os identificadores da Clint no backend.",
        5: "Conclua os itens pendentes antes de ativar o SDR.",
      };
      toast({ title: "Etapa incompleta", description: messages[currentStep], variant: "destructive" });
      return;
    }
    if (currentStep === 3) {
      try {
        const saved = await training.saveScript.mutateAsync(commercialScript);
        setCommercialScript(saved.script);
        toast({
          title: "Treinamento salvo",
          description: `Script ${saved.version} salvo no banco de desenvolvimento.`,
        });
      } catch (error) {
        toast({
          title: "Não foi possível salvar o treinamento",
          description: error instanceof Error ? error.message : "Erro inesperado.",
          variant: "destructive",
        });
        return;
      }
    }
    setCurrentStep((step) => Math.min(step + 1, WIZARD_STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Configuração do Robô SDR
              </h1>
              <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5">
                <Sparkles className="h-3 w-3" />
                Inteligência Artificial
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Siga as etapas abaixo para preparar o robô SDR com segurança.
            </p>
          </div>
        </div>

        <Card className="min-w-full border-primary/15 shadow-sm lg:min-w-[310px]">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {isActive ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <PauseCircle className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {isActive ? "Robô ativo" : "Robô pausado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {canActivate
                    ? "Pronto para atendimento"
                    : `${missingPrerequisites.length} requisito(s) pendente(s)`}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={handleRobotStatus}
              disabled={currentStep !== WIZARD_STEPS.length || !canActivate}
              aria-label="Ativar ou pausar robô SDR"
            />
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-primary/15">
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Configuração guiada</p>
              <p className="text-xs text-muted-foreground">
                Etapa {currentStep} de {WIZARD_STEPS.length} · {WIZARD_STEPS[currentStep - 1].description}
              </p>
            </div>
            <Badge variant="secondary">{Math.round((currentStep / WIZARD_STEPS.length) * 100)}%</Badge>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {WIZARD_STEPS.map((step) => {
              const completed = step.id < currentStep;
              const active = step.id === currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={step.id > currentStep}
                  onClick={() => setCurrentStep(step.id)}
                  aria-current={active ? "step" : undefined}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-lg p-2 text-center transition ${active ? "bg-primary/10 text-primary" : completed ? "text-emerald-600 hover:bg-muted" : "text-muted-foreground"}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold ${active ? "border-primary bg-primary text-primary-foreground" : completed ? "border-emerald-500 bg-emerald-500 text-white" : "bg-background"}`}>
                    {completed ? <Check className="h-4 w-4" /> : step.id}
                  </span>
                  <span className="hidden truncate text-xs font-medium sm:block">{step.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className={currentStep === 5 ? "order-2 overflow-hidden border-primary/15" : "hidden"}>
        <div className="h-1 bg-gradient-to-r from-primary via-violet-500 to-sky-500" />
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Prontidão para ativação
              </CardTitle>
              <CardDescription>
                Todos os requisitos abaixo são validados novamente pelo servidor.
              </CardDescription>
            </div>
            <Badge
              className={
                canActivate
                  ? "w-fit bg-emerald-600 hover:bg-emerald-600"
                  : "w-fit bg-amber-500 text-white hover:bg-amber-500"
              }
            >
              {prerequisites.filter((item) => item.ready).length}/{prerequisites.length} concluídos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {prerequisites.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border p-3 ${
                  item.ready
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-amber-500/20 bg-amber-500/5"
                }`}
              >
                {item.ready ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.ready ? "Configurado" : `Revisar ${item.section}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className={currentStep === 1 ? "order-2" : "hidden"}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Dados gerais</CardTitle>
              <CardDescription>
                Identificação interna e situação operacional do robô.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-2">
            <Label htmlFor="robot-name">Nome do robô</Label>
            <Input
              id="robot-name"
              value={robotName}
              onChange={(event) => setRobotName(event.target.value)}
              placeholder="Ex.: Assistente Comercial Traço"
            />
            <p className="text-xs text-muted-foreground">
              Este nome é usado nos registros e no painel, não é enviado ao lead.
            </p>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-semibold">Atendimento automático</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isActive ? "Respondendo novos leads" : "Novas conversas ficam em espera"}
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={handleRobotStatus} disabled />
          </div>
        </CardContent>
      </Card>

      <div className={currentStep === 1 ? "order-1" : "hidden"}>
        <CatalogSelection
          enabled={isAdmin && !isLoading}
          onBindingChange={setCourseBound}
        />
      </div>

      <Card id="connection" className={currentStep === 2 ? "scroll-mt-6" : "hidden"}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <SectionNumber>2</SectionNumber>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Conexão WhatsApp</CardTitle>
                <Badge variant="secondary">WAHA</Badge>
                <Badge
                  variant="outline"
                  className={
                    whatsappConnected
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-400/30 text-muted-foreground"
                  }
                >
                  {whatsappConnected ? (
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                  ) : (
                    <Unplug className="mr-1 h-3 w-3" />
                  )}
                  {whatsapp.isLoadingStatus
                    ? "Consultando WAHA"
                    : WAHA_STATUS_LABELS[whatsapp.status?.status ?? "UNKNOWN"]}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                Vincule o número de atendimento lendo o QR Code pelo WhatsApp.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!courseBound && (
            <Alert className="mb-5 border-amber-500/30 bg-amber-500/5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Selecione um curso primeiro</AlertTitle>
              <AlertDescription>
                A conexão do WhatsApp fica bloqueada até um item do catálogo ser vinculado.
              </AlertDescription>
            </Alert>
          )}
          {whatsappConnected ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                  <PlugZap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                    Sessão {whatsapp.status?.session ?? "default"} conectada
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Número: {formatWhatsappPhone(whatsapp.status?.phoneE164)}
                    {whatsapp.status?.displayName
                      ? ` · ${whatsapp.status.displayName}`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      Atualizado agora
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Webhook HMAC ativo
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleDisconnectWhatsapp}
                disabled={whatsapp.disconnect.isPending}
              >
                {whatsapp.disconnect.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Unplug className="mr-2 h-4 w-4" />
                )}
                Desconectar aparelho
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-center">
              <div className="flex flex-col items-center rounded-2xl border bg-muted/20 p-5">
                <div className="flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-xl border bg-white p-3 shadow-sm">
                  {whatsapp.qrDataUrl ? (
                    <img
                      src={whatsapp.qrDataUrl}
                      alt="QR Code real para conectar o WhatsApp ao WAHA"
                      className="h-full w-full object-contain"
                    />
                  ) : whatsapp.isLoadingQr ||
                    whatsapp.status?.status === "STARTING" ? (
                    <div className="flex flex-col items-center gap-3 text-slate-600">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <span className="text-center text-xs">Preparando QR Code...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3 px-4 text-slate-500">
                      <QrCode className="h-12 w-12" />
                      <span className="text-center text-xs">
                        Inicie a sessão para gerar o QR Code
                      </span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="mt-3">
                  <QrCode className="mr-1 h-3 w-3" />
                  {whatsapp.qrDataUrl ? "QR Code WAHA" : "Aguardando WAHA"}
                </Badge>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Conecte o WhatsApp em três passos</h3>
                  <ol className="mt-3 space-y-3 text-sm text-muted-foreground">
                    {[
                      "Abra o WhatsApp no celular que será usado no atendimento.",
                      "Acesse Aparelhos conectados e selecione Conectar aparelho.",
                      "Leia o QR Code exibido ao lado.",
                    ].map((step, index) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                {(whatsapp.statusError || whatsapp.qrError) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Não foi possível acessar o WAHA</AlertTitle>
                    <AlertDescription>
                      {whatsapp.statusError instanceof Error
                        ? whatsapp.statusError.message
                        : whatsapp.qrError instanceof Error
                          ? whatsapp.qrError.message
                          : "Verifique o backend e a infraestrutura local."}
                    </AlertDescription>
                  </Alert>
                )}
                {!whatsapp.statusError && whatsapp.status?.status === "FAILED" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>A sessão WAHA falhou</AlertTitle>
                    <AlertDescription>
                      Reinicie a sessão para receber um QR Code novo.
                    </AlertDescription>
                  </Alert>
                )}
                {!whatsapp.statusError &&
                  (whatsapp.status?.status === "PASSKEY_REQUIRED" ||
                    whatsapp.status?.status === "PASSKEY_CONFIRMATION_REQUIRED") && (
                    <Alert>
                      <ShieldCheck className="h-4 w-4" />
                      <AlertTitle>Confirmação adicional do WhatsApp</AlertTitle>
                      <AlertDescription>
                        Abra o painel local do WAHA para concluir a confirmação de segurança.
                      </AlertDescription>
                    </Alert>
                  )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleConnectWhatsapp}
                    disabled={
                      !courseBound ||
                      whatsapp.start.isPending ||
                      whatsapp.status?.status === "STARTING" ||
                      whatsapp.status?.status === "SCAN_QR_CODE"
                    }
                  >
                    {whatsapp.start.isPending ||
                    whatsapp.status?.status === "STARTING" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    {whatsapp.status?.status === "FAILED"
                      ? "Reiniciar sessão"
                      : "Iniciar conexão"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      void whatsapp.refreshStatus();
                      if (whatsapp.status?.status === "SCAN_QR_CODE") {
                        void whatsapp.refreshQr();
                      }
                    }}
                    disabled={whatsapp.isLoadingStatus || whatsapp.isLoadingQr}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${
                        whatsapp.isLoadingStatus || whatsapp.isLoadingQr
                          ? "animate-spin"
                          : ""
                      }`}
                    />
                    Atualizar estado
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="commercial" className={currentStep === 3 ? "scroll-mt-6" : "hidden"}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <SectionNumber>3</SectionNumber>
            <div>
              <CardTitle>Script comercial</CardTitle>
              <CardDescription>
                Instruções que orientam a abordagem comercial do assistente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {training.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Não foi possível consultar o treinamento</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>{training.error.message}</span>
                <Button variant="outline" size="sm" onClick={() => void training.refresh()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Script", detail: "Roteiro oficial", ready: training.configuration?.readiness.script },
              { label: "FAQ", detail: "28 respostas", ready: training.configuration?.readiness.faq },
              { label: "Personas", detail: "2 perfis", ready: training.configuration?.readiness.audienceMatrix },
              { label: "Follow-ups", detail: training.configuration?.readiness.followUpCadence ? "Cadência ativa" : "Cadência pendente", ready: training.configuration?.readiness.followUpCadence },
              { label: "PDF comercial", detail: training.configuration?.readiness.pdf ? "Pronto para envio" : "Documento pendente", ready: training.configuration?.readiness.pdf },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg border p-3 ${item.ready ? "border-emerald-500/25 bg-emerald-500/5" : "bg-muted/30"}`}>
                <div className="flex items-center gap-2">
                  {item.ready ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <CircleDashed className="h-4 w-4 text-amber-600" />}
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">Materiais oficiais da task US-03</p>
                <p className="text-xs text-muted-foreground">
                  A instalação grava uma versão auditável no Supabase de desenvolvimento.
                </p>
              </div>
            </div>
            <Button onClick={() => void handleInstallTraining()} disabled={training.install.isPending || training.isLoading}>
              {training.install.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookOpen className="mr-2 h-4 w-4" />}
              {training.configuration?.readiness.ready ? "Reinstalar versão oficial" : "Instalar treinamento oficial"}
            </Button>
          </div>
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold">PDF enviado pelo WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Use uma URL HTTPS pública e estável que o serviço WAHA consiga acessar.
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <div className="space-y-2">
                <Label htmlFor="course-pdf-title">Nome do arquivo</Label>
                <Input
                  id="course-pdf-title"
                  value={pdfTitle}
                  onChange={(event) => setPdfTitle(event.target.value)}
                  placeholder="Material do curso.pdf"
                  maxLength={180}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-pdf-url">URL do PDF</Label>
                <Input
                  id="course-pdf-url"
                  type="url"
                  value={pdfSourceUrl}
                  onChange={(event) => setPdfSourceUrl(event.target.value)}
                  placeholder="https://arquivos.exemplo.com/material.pdf"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSavePdf()}
                disabled={training.savePdf.isPending || !pdfSourceUrl.trim() || !pdfTitle.trim()}
              >
                {training.savePdf.isPending
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />}
                Salvar PDF
              </Button>
            </div>
          </div>
          <Alert className="border-violet-500/20 bg-violet-500/5">
            <MessageSquareText className="h-4 w-4 text-violet-600" />
            <AlertTitle>O que deve estar no script?</AlertTitle>
            <AlertDescription>
              Tom de voz, perguntas de qualificação, limites da automação e momento
              de encaminhar para uma pessoa. Personas continuam na base de conhecimento.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="commercial-script">Roteiro de atendimento</Label>
              <span
                className={`text-xs ${
                  commercialScript.trim().length >= 80
                    ? "text-emerald-600"
                    : "text-destructive"
                }`}
              >
                {commercialScript.length} caracteres
              </span>
            </div>
            <Textarea
              id="commercial-script"
              value={commercialScript}
              onChange={(event) => setCommercialScript(event.target.value)}
              className="min-h-[260px] resize-y font-mono text-sm leading-relaxed"
              placeholder="Descreva como o robô deve conduzir o atendimento..."
            />
            <p className="text-xs text-muted-foreground">
              Mínimo para ativação: 80 caracteres. Ao avançar, o texto é salvo no banco de desenvolvimento.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card id="clint" className={currentStep === 4 ? "scroll-mt-6" : "hidden"}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <SectionNumber>4</SectionNumber>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Integração Clint</CardTitle>
                <Badge
                  variant="outline"
                  className={clintConnected
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                    : ""}
                >
                  {clintConnected
                    ? <CheckCircle2 className="mr-1 h-3 w-3" />
                    : <XCircle className="mr-1 h-3 w-3" />}
                  {clintConnected ? "Conexão validada" : "Configuração pendente"}
                </Badge>
              </div>
              <CardDescription className="mt-1">
                O SDR usa exclusivamente a Clint para negócios de cursos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className={clintConnected
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"}
          >
            <PlugZap className="h-4 w-4" />
            <AlertTitle>
              {clintConnected ? "Clint conectada" : "Credenciais ainda não validadas"}
            </AlertTitle>
            <AlertDescription>
              {clintConnected
                ? "A API confirmou o acesso. Origem, etapas, responsável e campos são mantidos com segurança no backend."
                : "Preencha CLINT_API_TOKEN e os IDs da origem, etapas, responsável e campos no ambiente do backend."}
            </AlertDescription>
          </Alert>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">Origem comercial</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {clint.status?.originId ?? "Não configurada"}
              </p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">Responsável pelo handoff</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {clint.status?.responsibleUserId ?? "Não configurado"}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void clint.refresh()}
            disabled={clint.isLoading}
          >
            {clint.isLoading
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <RefreshCw className="mr-2 h-4 w-4" />}
            Validar novamente
          </Button>
        </CardContent>
      </Card>
      <Card id="payment" className={currentStep === 5 ? "order-1 scroll-mt-6" : "hidden"}>
        <CardHeader>
          <div className="flex items-start gap-3">
            <SectionNumber>5</SectionNumber>
            <div>
              <CardTitle>Finalização e atendimento humano</CardTitle>
              <CardDescription>
                Revise como o SDR encerra a automação e entrega o lead ao time.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Alert className="border-sky-500/20 bg-sky-500/5">
            <ShieldCheck className="h-4 w-4 text-sky-600" />
            <AlertTitle>Pagamento sempre com uma pessoa</AlertTitle>
            <AlertDescription>
              O SDR não informa condições nem envia link de pagamento. Ao receber
              uma pergunta financeira ou concluir a coleta, ele interrompe o robô,
              move o negócio para Aguardando Humano e atribui o responsável na Clint.
            </AlertDescription>
          </Alert>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">CRM comercial</p>
              <p className="mt-1 text-sm text-muted-foreground">Clint</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-sm font-semibold">Destino</p>
              <p className="mt-1 text-sm text-muted-foreground">Etapa Aguardando Humano</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {currentStep === 5 && !canActivate && (
        <Alert variant="destructive" className="order-3">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ativação bloqueada</AlertTitle>
          <AlertDescription>
            Conclua: {missingPrerequisites.map((item) => item.label).join("; ")}.
          </AlertDescription>
        </Alert>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:left-[var(--sidebar-width)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Etapa {currentStep} de {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1].title}
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            {currentStep > 1 && (
              <Button variant="outline" onClick={() => setCurrentStep((step) => step - 1)} className="flex-1 sm:flex-none">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
            {currentStep < WIZARD_STEPS.length ? (
              <Button onClick={handleNextStep} className="flex-1 sm:min-w-40 sm:flex-none">
                Continuar
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving || !canActivate} className="flex-1 sm:min-w-52 sm:flex-none">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Concluir configuração
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SdrConfiguration;
