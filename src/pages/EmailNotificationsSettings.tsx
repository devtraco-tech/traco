import { useState } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, ArrowLeft, Mail, Eye, Send, Users, FileText, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEmailNotifications, triggerTypeConfig, EmailTemplate, NotificationGroup } from "@/hooks/useEmailNotifications";
import { useUserRole } from "@/hooks/useUserRole";

const EmailNotificationsSettings = () => {
  const navigate = useNavigate();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const {
    templates,
    groups,
    templatesLoading,
    groupsLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    createGroup,
    updateGroup,
    deleteGroup,
    toggleGroup,
  } = useEmailNotifications();

  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null);
  const [editingGroup, setEditingGroup] = useState<Partial<NotificationGroup> | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [emailInput, setEmailInput] = useState("");

  if (roleLoading || templatesLoading || groupsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Você não tem permissão para acessar esta página.</p>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </div>
      </div>
    );
  }

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;
    
    if (editingTemplate.id) {
      updateTemplate.mutate(editingTemplate as EmailTemplate);
    } else {
      createTemplate.mutate(editingTemplate as Omit<EmailTemplate, "id" | "created_at" | "updated_at">);
    }
    setEditingTemplate(null);
  };

  const handleSaveGroup = () => {
    if (!editingGroup) return;
    
    if (editingGroup.id) {
      updateGroup.mutate(editingGroup as NotificationGroup);
    } else {
      createGroup.mutate(editingGroup as Omit<NotificationGroup, "id" | "created_at" | "updated_at" | "email_templates">);
    }
    setEditingGroup(null);
    setEmailInput("");
  };

  const handleAddEmail = () => {
    if (!emailInput.trim() || !editingGroup) return;
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    
    const currentEmails = editingGroup.emails || [];
    if (!currentEmails.includes(email)) {
      setEditingGroup({ ...editingGroup, emails: [...currentEmails, email] });
    }
    setEmailInput("");
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    if (!editingGroup) return;
    setEditingGroup({
      ...editingGroup,
      emails: (editingGroup.emails || []).filter(e => e !== emailToRemove)
    });
  };

  const getTemplatesByType = (type: string) => {
    return templates?.filter(t => t.type === type) || [];
  };

  const getGroupsByType = (type: string) => {
    return groups?.filter(g => g.trigger_type === type) || [];
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Mail className="h-6 w-6" />
                Notificações por E-mail
              </h1>
              <p className="text-muted-foreground">Configure templates e grupos de notificação para cada tipo de evento</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="groups">Grupos</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Cards by Trigger Type */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(triggerTypeConfig).map(([type, config]) => {
                const typeTemplates = getTemplatesByType(type);
                const typeGroups = getGroupsByType(type);
                const activeGroups = typeGroups.filter(g => g.is_enabled);

                return (
                  <Card key={type} className="relative overflow-hidden">
                    <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{config.icon}</span>
                          <CardTitle className="text-lg">{config.label}</CardTitle>
                        </div>
                        {activeGroups.length > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-sm">{config.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          <span>{typeTemplates.length} template(s)</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{typeGroups.length} grupo(s)</span>
                        </div>
                      </div>

                      {type === "lead_confirmation" && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          📧 Enviado automaticamente para o interessado
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setEditingTemplate({
                              name: "",
                              type: type as EmailTemplate["type"],
                              subject: "",
                              html_template: "",
                              text_template: "",
                              variables: config.variables,
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Template
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setEditingGroup({
                              name: "",
                              description: "",
                              trigger_type: type as NotificationGroup["trigger_type"],
                              emails: [],
                              template_id: typeTemplates[0]?.id || "",
                              is_enabled: true,
                            });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Grupo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Templates de E-mail</h2>
              <Button onClick={() => setEditingTemplate({
                name: "",
                type: "course_created",
                subject: "",
                html_template: "",
                text_template: "",
                variables: triggerTypeConfig.course_created.variables,
              })}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Template
              </Button>
            </div>

            <div className="grid gap-4">
              {templates?.map((template) => {
                const config = triggerTypeConfig[template.type as keyof typeof triggerTypeConfig];
                return (
                  <Card key={template.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{config?.icon}</span>
                            <h3 className="font-semibold truncate">{template.name}</h3>
                            <Badge variant="outline" className="shrink-0">
                              {config?.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            Assunto: {template.subject}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.variables?.slice(0, 4).map((v) => (
                              <Badge key={v} variant="secondary" className="text-xs font-mono">
                                {`{{${v}}}`}
                              </Badge>
                            ))}
                            {(template.variables?.length || 0) > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.variables!.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(template)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                              <DialogHeader>
                                <DialogTitle>Preview: {template.name}</DialogTitle>
                              </DialogHeader>
                              <div className="border rounded-lg p-4 bg-card">
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(template.html_template, {
                                  ALLOWED_TAGS: ['p','br','strong','b','em','i','u','h1','h2','h3','h4','a','ul','ol','li','div','span','img','table','thead','tbody','tr','td','th','hr','blockquote','code','pre'],
                                  ALLOWED_ATTR: ['href','src','alt','title','style','target','rel','class','width','height','align','colspan','rowspan'],
                                }) }} />
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="icon" onClick={() => setEditingTemplate(template)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteTemplate.mutate(template.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {(!templates || templates.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum template criado ainda</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Grupos de Notificação</h2>
              <Button onClick={() => setEditingGroup({
                name: "",
                description: "",
                trigger_type: "course_created",
                emails: [],
                template_id: templates?.[0]?.id || "",
                is_enabled: true,
              })}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Grupo
              </Button>
            </div>

            <div className="grid gap-4">
              {groups?.map((group) => {
                const config = triggerTypeConfig[group.trigger_type as keyof typeof triggerTypeConfig];
                return (
                  <Card key={group.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{config?.icon}</span>
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            <Badge variant={group.is_enabled ? "default" : "secondary"}>
                              {group.is_enabled ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>📧 {group.emails?.length || 0} destinatário(s)</span>
                            <span>📄 {group.email_templates?.name || "Template não definido"}</span>
                          </div>
                          {group.emails && group.emails.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {group.emails.slice(0, 3).map((email) => (
                                <Badge key={email} variant="outline" className="text-xs">
                                  {email}
                                </Badge>
                              ))}
                              {group.emails.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{group.emails.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Switch
                            checked={group.is_enabled}
                            onCheckedChange={(checked) => toggleGroup.mutate({ id: group.id, is_enabled: checked })}
                          />
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingGroup(group);
                            setEmailInput("");
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteGroup.mutate(group.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {(!groups || groups.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum grupo criado ainda</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Template Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>
          
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Template</label>
                <Input
                  value={editingTemplate.name || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Ex: Notificação de Novo Curso"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Tipo de Gatilho</label>
                <Select
                  value={editingTemplate.type}
                  onValueChange={(value) => setEditingTemplate({
                    ...editingTemplate,
                    type: value as EmailTemplate["type"],
                    variables: triggerTypeConfig[value as keyof typeof triggerTypeConfig]?.variables || []
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Variáveis disponíveis:</p>
                <div className="flex flex-wrap gap-2">
                  {editingTemplate.variables?.map((variable) => (
                    <Badge key={variable} variant="outline" className="font-mono text-xs cursor-pointer hover:bg-accent">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Assunto do E-mail</label>
                <Input
                  value={editingTemplate.subject || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Ex: 📚 Novo curso cadastrado: {{course_title}}"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Template HTML</label>
                <Textarea
                  value={editingTemplate.html_template || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, html_template: e.target.value })}
                  placeholder="Cole o HTML do template aqui..."
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Template Texto (opcional)</label>
                <Textarea
                  value={editingTemplate.text_template || ""}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, text_template: e.target.value })}
                  placeholder="Versão em texto simples..."
                  rows={4}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTemplate} className="flex-1">
                  Salvar Template
                </Button>
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => { if (!open) { setEditingGroup(null); setEmailInput(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingGroup?.id ? "Editar Grupo" : "Novo Grupo de Notificação"}
            </DialogTitle>
          </DialogHeader>
          
          {editingGroup && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nome do Grupo</label>
                <Input
                  value={editingGroup.name || ""}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  placeholder="Ex: Equipe de Marketing"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  value={editingGroup.description || ""}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  placeholder="Descrição do grupo"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Gatilho</label>
                <Select
                  value={editingGroup.trigger_type}
                  onValueChange={(value) => setEditingGroup({
                    ...editingGroup,
                    trigger_type: value as NotificationGroup["trigger_type"]
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggerTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.icon} {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Template de E-mail</label>
                <Select
                  value={editingGroup.template_id}
                  onValueChange={(value) => setEditingGroup({ ...editingGroup, template_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.filter(t => t.type === editingGroup.trigger_type).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingGroup.trigger_type !== "lead_confirmation" && (
                <div>
                  <label className="text-sm font-medium">E-mails dos Destinatários</label>
                  <div className="flex gap-2">
                    <Input
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="email@exemplo.com"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddEmail())}
                    />
                    <Button type="button" onClick={handleAddEmail} variant="secondary">
                      Adicionar
                    </Button>
                  </div>
                  {editingGroup.emails && editingGroup.emails.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {editingGroup.emails.map((email) => (
                        <Badge key={email} variant="secondary" className="flex items-center gap-1">
                          {email}
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(email)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {editingGroup.trigger_type === "lead_confirmation" && (
                <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    📧 Este tipo de notificação é enviado automaticamente para o e-mail da pessoa que fez o pré-cadastro.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingGroup.is_enabled}
                  onCheckedChange={(checked) => setEditingGroup({ ...editingGroup, is_enabled: checked })}
                />
                <label className="text-sm">Grupo ativo</label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveGroup} className="flex-1">
                  Salvar Grupo
                </Button>
                <Button variant="outline" onClick={() => { setEditingGroup(null); setEmailInput(""); }}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailNotificationsSettings;
