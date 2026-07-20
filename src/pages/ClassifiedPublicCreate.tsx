import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploadField } from "@/components/course/ImageUploadField";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

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
});

type FormValues = z.infer<typeof formSchema>;

export default function ClassifiedPublicCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      category: "outros",
      description: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      price: "",
      location: "",
      photo_1_url: "",
      photo_2_url: "",
      photo_3_url: "",
    },
  });

  const handleSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const response = await supabase.functions.invoke('create-public-classified', {
        body: {
          ...data,
          price: data.price ? parseFloat(data.price) : null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Erro ao criar classificado');
      }

      setIsSuccess(true);
      toast({
        title: "Anúncio enviado!",
        description: "Seu anúncio foi enviado para aprovação e será publicado em breve.",
      });
    } catch (error: any) {
      console.error('Error creating classified:', error);
      toast({
        title: "Erro ao enviar anúncio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Anúncio Enviado!</CardTitle>
            <CardDescription>
              Seu anúncio foi enviado para aprovação. Você receberá uma notificação quando ele for publicado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O processo de aprovação pode levar até 48 horas úteis.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Criar Anúncio</h1>
          <p className="text-muted-foreground">
            Preencha o formulário abaixo para criar um novo anúncio. Após o envio, ele será revisado e publicado.
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Todos os anúncios passam por aprovação antes de serem publicados. 
            Certifique-se de preencher todas as informações corretamente.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Anúncio</CardTitle>
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
                        <Input placeholder="Ex: Vaga para Dentista, Equipamento à venda..." {...field} />
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
                          <SelectItem value="vaga">Vaga de Emprego</SelectItem>
                          <SelectItem value="produto">Produto / Equipamento</SelectItem>
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
                      <FormDescription>Mínimo de 20 caracteres</FormDescription>
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
                  label="Foto Principal"
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

            <div className="flex gap-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Enviando..." : "Enviar para Aprovação"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
