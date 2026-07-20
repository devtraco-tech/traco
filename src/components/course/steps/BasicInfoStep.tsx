import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, ShieldCheck } from "lucide-react";
import { format, addMonths, addDays, startOfToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBillingCompanies } from "@/hooks/useBillingCompanies";
import { usePromotionalTeams } from "@/hooks/usePromotionalTeams";
import { BillingCompanyFormModal } from "@/components/billing/BillingCompanyFormModal";
import { PromotionalTeamFormModal } from "@/components/team/PromotionalTeamFormModal";

interface StepProps {
  data: any;
  onNext: (data: any) => void;
  onPrevious: () => void;
  isAdmin?: boolean;
  canEditCourses?: boolean;
}

export const BasicInfoStep = ({ data, onNext, isAdmin }: StepProps) => {
  const { billingCompanies, isLoading: isLoadingCompanies, createBillingCompany } = useBillingCompanies();
  const { promotionalTeams, isLoading: isLoadingTeams, createPromotionalTeam } = usePromotionalTeams();
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  
  // Check for date bypass permission
  const { data: bypassProfile } = useQuery({
    queryKey: ["my-profile-bypass", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("date_bypass_until")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });
  
  const hasBypass = bypassProfile?.date_bypass_until && new Date(bypassProfile.date_bypass_until + "T23:59:59") > new Date();

  const [formData, setFormData] = useState({
    name: data.name || "",
    language: data.language || "",
    modality: data.modality || "",
    courseType: data.courseType || "",
    area: data.area || "",
    targetAudience: data.targetAudience || "",
    accepts_students: data.accepts_students ?? null,
    promotional_team_id: data.promotional_team_id || "",
    billing_company_id: data.billing_company_id || "",
    suggestedStartDate: data.suggestedStartDate || [],
    selectionDate: data.selectionDate || null,
    totalValue: data.totalValue || "",
    installmentSuggestion: data.installmentSuggestion || "",
    installmentPreview: data.installmentPreview || "",
    effectiveValue: data.effectiveValue || "",
    effectiveInstallment: data.effectiveInstallment || "",
    suggestedRepaymentType: data.suggestedRepaymentType || "",
    suggestedRepaymentValue: data.suggestedRepaymentValue || "",
    effectiveRepaymentType: data.effectiveRepaymentType || "",
    effectiveRepaymentValue: data.effectiveRepaymentValue || "",
    currency: data.currency || "real",
  });

  // Get currency symbol
  const getCurrencySymbol = () => formData.currency === "dolar" ? "$" : "R$";

  // Calculate installment preview
  const calculateInstallmentPreview = () => {
    const value = parseFloat(formData.totalValue) || 0;
    const installments = parseInt(formData.installmentSuggestion) || 1;
    
    if (value > 0 && installments > 0) {
      const installmentValue = value / installments;
      return `${installments}x de ${getCurrencySymbol()} ${installmentValue.toFixed(2).replace(".", ",")}`;
    }
    return "Informe o valor e parcelamento";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.suggestedStartDate || formData.suggestedStartDate.length === 0) {
      toast({
        title: "Data de início obrigatória",
        description: "Selecione ao menos uma sugestão de data de início para continuar.",
        variant: "destructive",
      });
      return;
    }
    onNext(formData);
  };

  const handleCreateCompany = (companyData: any) => {
    createBillingCompany.mutate(companyData, {
      onSuccess: (newCompany) => {
        setCompanyModalOpen(false);
        setFormData({ ...formData, billing_company_id: newCompany.id });
      },
    });
  };

  const handleCreateTeam = (teamData: any) => {
    createPromotionalTeam.mutate(teamData, {
      onSuccess: (newTeam) => {
        setTeamModalOpen(false);
        setFormData({ ...formData, promotional_team_id: newTeam.id });
      },
    });
  };
  
  // Logic for suggested date constraints
  const today = startOfToday();
  const isInternational = formData.language && formData.language !== "Português";
  const minMonths = isInternational ? 9 : 6;
  const standardMinDate = addMonths(today, minMonths);
  const minDate = hasBypass ? addDays(today, 1) : standardMinDate;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Nome*</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nome do curso"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="language">Idioma*</Label>
          <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Português">Português</SelectItem>
              <SelectItem value="Inglês">Inglês</SelectItem>
              <SelectItem value="Espanhol">Espanhol</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="modality">Modalidade*</Label>
          <Select value={formData.modality} onValueChange={(value) => setFormData({ ...formData, modality: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a modalidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="hibrido">Hibrida</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="courseType">Tipo de curso*</Label>
          <Select value={formData.courseType} onValueChange={(value) => setFormData({ ...formData, courseType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Especialização">Especialização</SelectItem>
              <SelectItem value="Aperfeiçoamento">Aperfeiçoamento</SelectItem>
              <SelectItem value="Imersão">Imersão</SelectItem>
              <SelectItem value="Workshop">Workshop</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area">Área do curso*</Label>
          <Select value={formData.area} onValueChange={(value) => setFormData({ ...formData, area: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ASB e TSB">ASB e TSB</SelectItem>
              <SelectItem value="Cirurgia">Cirurgia</SelectItem>
              <SelectItem value="Complementares">Complementares</SelectItem>
              <SelectItem value="Dentística">Dentística</SelectItem>
              <SelectItem value="Endodontia">Endodontia</SelectItem>
              <SelectItem value="Gestão / Administração">Gestão / Administração</SelectItem>
              <SelectItem value="Harmonização Orofacil">Harmonização Orofacil</SelectItem>
              <SelectItem value="Implantodontia">Implantodontia</SelectItem>
              <SelectItem value="Odontologia Hospitalar">Odontologia Hospitalar</SelectItem>
              <SelectItem value="Odontologia Legal">Odontologia Legal</SelectItem>
              <SelectItem value="Odontopediatria">Odontopediatria</SelectItem>
              <SelectItem value="Ortodontia">Ortodontia</SelectItem>
              <SelectItem value="Pacientes Especiais">Pacientes Especiais</SelectItem>
              <SelectItem value="Patologia Bucal">Patologia Bucal</SelectItem>
              <SelectItem value="Periodontia">Periodontia</SelectItem>
              <SelectItem value="Prótese Dentária">Prótese Dentária</SelectItem>
              <SelectItem value="Radiologia">Radiologia</SelectItem>
              <SelectItem value="Saúde Coletiva">Saúde Coletiva</SelectItem>
              <SelectItem value="Técnicos em Próteses">Técnicos em Próteses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetAudience">Público Alvo*</Label>
          <Input
            id="targetAudience"
            value={formData.targetAudience}
            onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            placeholder="Ex: Cirurgiões-dentistas, Estudantes de odontologia"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="accepts_students">Aceita Acadêmicos?*</Label>
          <Select value={formData.accepts_students === true ? "Sim" : formData.accepts_students === false ? "Não" : ""} onValueChange={(value) => setFormData({ ...formData, accepts_students: value === "Sim" })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Sim">Sim</SelectItem>
              <SelectItem value="Não">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="promotional_team">Equipe Promotora</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setTeamModalOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Nova Equipe
            </Button>
          </div>
          <Select value={formData.promotional_team_id} onValueChange={(value) => setFormData({ ...formData, promotional_team_id: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingTeams ? "Carregando equipes..." : "Selecione a equipe promotora"} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {promotionalTeams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoadingTeams && (
            <p className="text-xs text-muted-foreground">Carregando equipes promotoras...</p>
          )}
          {!isLoadingTeams && promotionalTeams && promotionalTeams.length === 0 && (
            <p className="text-xs text-warning">⚠️ Nenhuma equipe cadastrada. Clique em "Nova Equipe" para adicionar.</p>
          )}
          {!isLoadingTeams && promotionalTeams && promotionalTeams.length > 0 && (
            <p className="text-xs text-muted-foreground">{promotionalTeams.length} equipe(s) disponível(is)</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="billing_company">Empresa de Faturamento</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setCompanyModalOpen(true)}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Nova Empresa
            </Button>
          </div>
          <Select value={formData.billing_company_id} onValueChange={(value) => setFormData({ ...formData, billing_company_id: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoadingCompanies ? "Carregando empresas..." : "Selecione a empresa de faturamento"} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {billingCompanies?.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLoadingCompanies && (
            <p className="text-xs text-muted-foreground">Carregando empresas de faturamento...</p>
          )}
          {!isLoadingCompanies && billingCompanies && billingCompanies.length === 0 && (
            <p className="text-xs text-warning">⚠️ Nenhuma empresa cadastrada. Clique em "Nova Empresa" para adicionar.</p>
          )}
          {!isLoadingCompanies && billingCompanies && billingCompanies.length > 0 && (
            <p className="text-xs text-muted-foreground">{billingCompanies.length} empresa(s) disponível(is)</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Sugestão de data de início*</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.suggestedStartDate && formData.suggestedStartDate.length > 0 
                  ? `${formData.suggestedStartDate.length} data(s) sugerida(s)`
                  : "Selecione as datas possíveis"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="multiple"
                selected={formData.suggestedStartDate}
                onSelect={(dates) => setFormData({ ...formData, suggestedStartDate: dates })}
                disabled={(date) => date < minDate}
                defaultMonth={minDate}
                fromMonth={minDate}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          {hasBypass ? (
            <p className="text-[10px] text-muted-foreground mt-1 bg-green-50 p-2 rounded border border-green-200 italic flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-green-600" />
              <strong className="text-green-700">Permissão temporária ativa:</strong> Trava de antecedência desabilitada até {format(new Date(bypassProfile.date_bypass_until + "T12:00:00"), "dd/MM/yyyy")}.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground mt-1 bg-blue-50 p-2 rounded border border-blue-100 italic">
              <strong>Critério de Antecedência:</strong> Cursos {isInternational ? "Internacionais (9 meses)" : "Nacionais (6 meses)"} devem iniciar a partir de {format(standardMinDate, "dd/MM/yyyy")}.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Data de Seleção</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-start text-left"
                disabled={!formData.suggestedStartDate || formData.suggestedStartDate.length === 0}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.selectionDate 
                  ? format(formData.selectionDate, "dd/MM/yyyy", { locale: ptBR })
                  : formData.suggestedStartDate && formData.suggestedStartDate.length > 0
                    ? "Selecione uma das datas sugeridas"
                    : "Primeiro selecione as datas sugeridas"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.selectionDate}
                onSelect={(date) => setFormData({ ...formData, selectionDate: date })}
                disabled={(date) => {
                  // Disable all dates that are not in the suggested dates
                  if (!formData.suggestedStartDate || formData.suggestedStartDate.length === 0) {
                    return true;
                  }
                  const dateStr = date.toISOString().split('T')[0];
                  return !formData.suggestedStartDate.some((suggestedDate: Date) => {
                    const suggestedStr = new Date(suggestedDate).toISOString().split('T')[0];
                    return dateStr === suggestedStr;
                  });
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>


        <div className="space-y-2">
          <Label htmlFor="currency">Moeda*</Label>
          <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a moeda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="real">Real (R$)</SelectItem>
              <SelectItem value="dolar">Dólar ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        


        <div className="space-y-2">
          <Label htmlFor="totalValue">Sugestão de valor total do curso*</Label>
          <Input
            id="totalValue"
            type="number"
            value={formData.totalValue}
            onChange={(e) => setFormData({ ...formData, totalValue: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installmentSuggestion">Sugestão de parcelamento</Label>
          <Input
            id="installmentSuggestion"
            type="number"
            value={formData.installmentSuggestion}
            onChange={(e) => setFormData({ ...formData, installmentSuggestion: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installmentPreview">Previsão de parcelamento</Label>
          <div className="text-sm text-primary font-medium h-10 flex items-center">
            {calculateInstallmentPreview()}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="effectiveValue">Valor total efetivo</Label>
          <Input
            id="effectiveValue"
            type="number"
            value={formData.effectiveValue}
            onChange={(e) => setFormData({ ...formData, effectiveValue: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="effectiveInstallment">Parcelamento efetivo</Label>
          <Input
            id="effectiveInstallment"
            type="number"
            placeholder="Ex: 3 (padrão: 1)"
            value={formData.effectiveInstallment}
            onChange={(e) => setFormData({ ...formData, effectiveInstallment: e.target.value })}
            min="1"
          />
          <p className="text-xs text-muted-foreground">Quantas vezes é possível dividir este curso. Deixe em branco ou 1 para sem parcelamento.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="effectiveRepaymentType">Tipo de repasse efetivo</Label>
          <Select value={formData.effectiveRepaymentType} onValueChange={(value) => setFormData({ ...formData, effectiveRepaymentType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de repasse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Percentual">Percentual</SelectItem>
              <SelectItem value="Valor Fixo">Valor Fixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="effectiveRepaymentValue">Valor do repasse efetivo</Label>
          <Input
            id="effectiveRepaymentValue"
            type="number"
            value={formData.effectiveRepaymentValue}
            onChange={(e) => setFormData({ ...formData, effectiveRepaymentValue: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="suggestedRepaymentType">Tipo de repasse sugerido*</Label>
          <Select value={formData.suggestedRepaymentType} onValueChange={(value) => setFormData({ ...formData, suggestedRepaymentType: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo de repasse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Percentual">Percentual</SelectItem>
              <SelectItem value="Valor Fixo">Valor Fixo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="suggestedRepaymentValue">Valor do repasse sugerido*</Label>
          <Input
            id="suggestedRepaymentValue"
            type="number"
            value={formData.suggestedRepaymentValue}
            onChange={(e) => setFormData({ ...formData, suggestedRepaymentValue: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={() => window.history.back()}>
          Cancelar
        </Button>
        <Button type="submit">Próximo</Button>
      </div>

      <PromotionalTeamFormModal
        team={null}
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        onSubmit={handleCreateTeam}
        isSubmitting={createPromotionalTeam.isPending}
      />

      <BillingCompanyFormModal
        company={null}
        open={companyModalOpen}
        onClose={() => setCompanyModalOpen(false)}
        onSubmit={handleCreateCompany}
        isSubmitting={createBillingCompany.isPending}
      />
    </form>
  );
};
