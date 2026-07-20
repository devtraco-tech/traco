import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Mail, Bell, Save, X, Plus, Loader2, ArrowRight, Database, Play, AlertTriangle, FileCode, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSiteConfiguration } from "@/hooks/useSiteConfiguration";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Settings = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { configurations, isLoading, updateConfiguration } = useSiteConfiguration();
  const { toast } = useToast();
  
  const [notificationEmails, setNotificationEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
  // SQL Executor state
  const [sqlQuery, setSqlQuery] = useState("");
  const [sqlResult, setSqlResult] = useState<string | null>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);
  
  // Migration executor state
  const [migrationQuery, setMigrationQuery] = useState("");
  const [migrationResult, setMigrationResult] = useState<string | null>(null);
  const [isExecutingMigration, setIsExecutingMigration] = useState(false);
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);

  const [isMigratingLeads, setIsMigratingLeads] = useState(false);
  const handleMigrateLeads = async () => {
    setIsMigratingLeads(true);
    try {
      const sql = `
        INSERT INTO public.patients (
            full_name,
            birth_date,
            cpf,
            mobile_phone,
            state,
            city,
            treatment_needed,
            current_stage,
            reception_status,
            no_show_count,
            created_at
        )
        SELECT 
            UPPER(TRIM(pl.full_name)),
            pl.birth_date,
            pl.cpf,
            pl.mobile_phone,
            UPPER(TRIM(pl.state)),
            UPPER(TRIM(pl.city)),
            UPPER(TRIM(pl.treatment_needed)),
            'step1_atendimento',
            'entrada',
            0,
            COALESCE(pl.created_at, NOW())
        FROM public.patient_leads pl
        WHERE pl.cpf IS NOT NULL 
          AND pl.cpf <> ''
          AND NOT EXISTS (
            SELECT 1 FROM public.patients p WHERE p.cpf = pl.cpf
          );
      `;
      const { data, error } = await supabase.rpc('exec_sql' as any, { query: sql });
      if (error) throw error;
      
      toast({
        title: "Migração Concluída",
        description: "Os leads do site foram migrados com sucesso para a Fila 1 em MAIÚSCULAS.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao migrar leads",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsMigratingLeads(false);
    }
  };

  // Load saved emails from configuration
  useEffect(() => {
    if (configurations) {
      const emailConfig = configurations.find(c => c.key === "notification_emails");
      if (emailConfig?.value) {
        try {
          const emails = JSON.parse(emailConfig.value);
          setNotificationEmails(Array.isArray(emails) ? emails : []);
        } catch {
          setNotificationEmails([]);
        }
      }
    }
  }, [configurations]);

  // Protect: admin only
  if (!roleLoading && !isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const handleAddEmail = () => {
    const email = newEmail.trim().toLowerCase();
    
    if (!email) return;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    if (notificationEmails.includes(email)) {
      toast({
        title: "Email já existe",
        description: "Este email já está na lista de notificações.",
        variant: "destructive",
      });
      return;
    }

    setNotificationEmails([...notificationEmails, email]);
    setNewEmail("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setNotificationEmails(notificationEmails.filter(e => e !== emailToRemove));
  };

  const handleSaveEmails = async () => {
    setIsSaving(true);
    try {
      await updateConfiguration.mutateAsync({
        key: "notification_emails",
        value: JSON.stringify(notificationEmails),
        description: "Lista de emails para receber notificações de novos cursos",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) {
      toast({
        title: "SQL vazio",
        description: "Digite uma query SQL para executar.",
        variant: "destructive",
      });
      return;
    }

    setIsExecutingSql(true);
    setSqlResult(null);

    try {
      // Use rpc to execute raw SQL (requires a database function)
      const { data, error } = await supabase.rpc('exec_sql' as any, { query: sqlQuery });
      
      if (error) {
        setSqlResult(`Erro: ${error.message}`);
        toast({
          title: "Erro ao executar SQL",
          description: error.message,
          variant: "destructive",
        });
      } else {
        const resultStr = JSON.stringify(data, null, 2);
        setSqlResult(resultStr || "Query executada com sucesso (sem resultados)");
        toast({
          title: "SQL executado com sucesso",
          description: "A query foi executada.",
        });
      }
    } catch (err: any) {
      setSqlResult(`Erro: ${err.message}`);
      toast({
        title: "Erro ao executar SQL",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsExecutingSql(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!migrationQuery.trim()) {
      toast({
        title: "Migration vazia",
        description: "Cole o conteúdo da migration SQL para executar.",
        variant: "destructive",
      });
      return;
    }

    setShowMigrationConfirm(false);
    setIsExecutingMigration(true);
    setMigrationResult(null);

    try {
      // Split the migration into individual statements
      const statements = migrationQuery
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      const results: string[] = [];
      
      for (const statement of statements) {
        const { data, error } = await supabase.rpc('exec_sql' as any, { query: statement });
        
        if (error) {
          results.push(`❌ Erro: ${error.message}\n   Statement: ${statement.substring(0, 100)}...`);
          throw new Error(`Erro na migration: ${error.message}`);
        } else {
          results.push(`✅ Executado: ${statement.substring(0, 60)}...`);
        }
      }

      setMigrationResult(results.join('\n\n'));
      toast({
        title: "Migration executada com sucesso",
        description: `${statements.length} statement(s) executado(s).`,
      });
    } catch (err: any) {
      setMigrationResult(`❌ Erro durante a migration:\n${err.message}`);
      toast({
        title: "Erro ao executar migration",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsExecutingMigration(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setMigrationQuery(content);
      toast({
        title: "Arquivo carregado",
        description: `${file.name} carregado com sucesso.`,
      });
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Email Templates and Groups Card */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Templates e Grupos de E-mail</CardTitle>
                    <CardDescription>
                      Configure templates de e-mail e grupos de destinatários por tipo de evento
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/settings/email-notifications")}
                variant="outline"
                className="w-full justify-between"
              >
                <span>Configurar Templates e Grupos</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Migration Executor Card - Admin Only */}
        {isAdmin && (
          <Card className="border-blue-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCode className="h-5 w-5 text-blue-500" />
                <div>
                  <CardTitle>Executor de Migrations</CardTitle>
                  <CardDescription>
                    Execute arquivos de migration SQL diretamente no banco de dados
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Migrations:</strong> Cole o conteúdo de um arquivo .sql ou faça upload do arquivo.
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('migration-file-input')?.click()}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Arquivo .sql
                </Button>
                <input
                  id="migration-file-input"
                  type="file"
                  accept=".sql"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Conteúdo da Migration</Label>
                <Textarea
                  placeholder="-- Cole aqui o conteúdo do arquivo .sql&#10;CREATE TABLE example (...);"
                  value={migrationQuery}
                  onChange={(e) => setMigrationQuery(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>

              <Button 
                onClick={() => setShowMigrationConfirm(true)} 
                disabled={isExecutingMigration || !migrationQuery.trim()}
                className="w-full"
                variant="default"
              >
                {isExecutingMigration ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Executar Migration
              </Button>

              {migrationResult && (
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[300px] text-xs font-mono whitespace-pre-wrap">
                    {migrationResult}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* SQL Executor Card - Admin Only */}
        {isAdmin && (
          <Card className="border-amber-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-amber-500" />
                <div>
                  <CardTitle>Executor SQL</CardTitle>
                  <CardDescription>
                    Execute queries SQL diretamente no banco de dados (apenas admin)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Atenção:</strong> Use com cuidado. Queries incorretas podem danificar os dados.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Query SQL</Label>
                <Textarea
                  placeholder="SELECT * FROM teachers LIMIT 10;"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="font-mono text-sm min-h-[150px]"
                />
              </div>

              <Button 
                onClick={handleExecuteSql} 
                disabled={isExecutingSql || !sqlQuery.trim()}
                className="w-full"
              >
                {isExecutingSql ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Executar SQL
              </Button>

              {sqlResult && (
                <div className="space-y-2">
                  <Label>Resultado</Label>
                  <pre className="p-4 bg-muted rounded-lg overflow-auto max-h-[300px] text-xs font-mono">
                    {sqlResult}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Leads Migration Card - Admin Only */}
        {isAdmin && (
          <Card className="border-emerald-500/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-500" />
                <div>
                  <CardTitle>Migração de Prontuários (Leads)</CardTitle>
                  <CardDescription>
                    Migrar leads cadastrados no site para a Fila 1 da Recepção (convertendo para MAIÚSCULAS e sem duplicar CPF)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  <strong>Atenção:</strong> Esta ferramenta irá importar todos os registros de <code>patient_leads</code> para a tabela de <code>patients</code> na <strong>Fila 1 (Agendamento Triagem 3)</strong>, garantindo dados padronizados em caixa alta e verificando CPFs existentes para evitar duplicidade.
                </p>
              </div>

              <Button 
                onClick={handleMigrateLeads} 
                disabled={isMigratingLeads}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isMigratingLeads ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isMigratingLeads ? "Migrando..." : "Migrar Leads do Site para a Fila 1"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Email Notifications Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Notificações por Email</CardTitle>
            </div>
            <CardDescription>
              Configure os emails que receberão notificações quando novos cursos forem cadastrados.
              Além dos administradores e staff do sistema, estes emails também receberão as notificações.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email List */}
            <div className="space-y-2">
              <Label>Emails de Notificação</Label>
              <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border rounded-md bg-muted/50">
                {notificationEmails.length === 0 ? (
                  <span className="text-muted-foreground text-sm">
                    Nenhum email adicional configurado. Os administradores e staff receberão as notificações automaticamente.
                  </span>
                ) : (
                  notificationEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Add Email Input */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="Digite um email para adicionar..."
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
              </div>
              <Button type="button" variant="outline" onClick={handleAddEmail}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSaveEmails} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Como funcionam as notificações</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Novos Cursos:</strong> Quando um novo curso é cadastrado no sistema, 
              um email é enviado automaticamente para todos os administradores e staff, 
              além dos emails configurados acima.
            </p>
            <p>
              <strong>Aprovação de Cursos:</strong> Quando um curso é aprovado por todos os 
              departamentos, um email de confirmação é enviado ao coordenador responsável.
            </p>
            <p className="text-xs mt-4 p-2 bg-muted rounded">
              💡 Dica: Certifique-se de que os emails estão corretos para garantir que 
              as notificações sejam recebidas.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Migration Confirmation Dialog */}
      <Dialog open={showMigrationConfirm} onOpenChange={setShowMigrationConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Execução da Migration</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja executar esta migration? Esta ação pode modificar a estrutura do banco de dados e não pode ser desfeita facilmente.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-lg max-h-[200px] overflow-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {migrationQuery.substring(0, 500)}
              {migrationQuery.length > 500 && '...'}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMigrationConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExecuteMigration} variant="destructive">
              <Play className="h-4 w-4 mr-2" />
              Executar Migration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
