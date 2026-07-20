import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUploadField } from "@/components/course/ImageUploadField";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Classified } from "@/hooks/useClassifieds";

const formSchema = z.object({
  title: z.string().min(5, "O título deve ter no mínimo 5 caracteres"),
  category: z.enum(["vaga", "produto", "servico", "outros"]),
  description: z.string().min(20, "A descrição deve ter no mínimo 20 caracteres"),
  contact_name: z.string().min(3, "Nome obrigatório"),
  contact_email: z.string().email("E-mail inválido"),
  contact_phone: z.string().optional(),
  price: z.string().optional(),
  location: z.string().optional(),
  photo_1_url: z.string().optional(),
  photo_2_url: z.string().optional(),
  photo_3_url: z.string().optional(),
  expires_at: z.string().optional(),
  status: z.enum(["draft", "pending_approval"]),
});

type FormValues = z.infer<typeof formSchema>;

interface ClassifiedFormProps {
  classified?: Classified;
  onSubmit: (data: FormValues) => void;
  isLoading?: boolean;
}

export function ClassifiedForm({ classified, onSubmit, isLoading }: ClassifiedFormProps) {
  const { uploadFile, isUploading } = useFileUpload();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: classified?.title || "",
      category: classified?.category as any || "outros",
      description: classified?.description || "",
      contact_name: classified?.contact_name || "",
      contact_email: classified?.contact_email || "",
      contact_phone: classified?.contact_phone || "",
      price: classified?.price?.toString() || "",
      location: classified?.location || "",
      photo_1_url: classified?.photo_1_url || "",
      photo_2_url: classified?.photo_2_url || "",
      photo_3_url: classified?.photo_3_url || "",
      expires_at: classified?.expires_at || "",
      status: classified?.status as any || "pending_approval",
    },
  });

  const handleSubmit = (data: FormValues) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>Dados principais do classificado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título do Anúncio *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Vaga para Dentista" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="vaga">Vaga</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                      <SelectItem value="servico">Serviço</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva detalhadamente o anúncio..."
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormDescription>Deixe em branco se não aplicável</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Localização (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: São Paulo - SP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Expiração (opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormDescription>Quando o anúncio deve expirar</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações de Contato</CardTitle>
            <CardDescription>Dados para interessados entrarem em contato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome para Contato *</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome ou nome da empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail para Contato *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contato@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fotos do Anúncio</CardTitle>
            <CardDescription>Adicione até 3 fotos (opcional)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadField
              label="Foto 1"
              value={form.watch("photo_1_url")}
              onChange={(url) => form.setValue("photo_1_url", url)}
            />
            <ImageUploadField
              label="Foto 2 (opcional)"
              value={form.watch("photo_2_url")}
              onChange={(url) => form.setValue("photo_2_url", url)}
            />
            <ImageUploadField
              label="Foto 3 (opcional)"
              value={form.watch("photo_3_url")}
              onChange={(url) => form.setValue("photo_3_url", url)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status do Anúncio</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Salvar como Rascunho</SelectItem>
                      <SelectItem value="pending_approval">Enviar para Aprovação</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Rascunhos não são visíveis. Anúncios enviados para aprovação serão revisados por um administrador.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={isLoading || isUploading}>
            {isLoading ? "Salvando..." : classified ? "Atualizar" : "Criar Classificado"}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancelar
          </Button>
        </div>
      </form>
    </Form>
  );
}
