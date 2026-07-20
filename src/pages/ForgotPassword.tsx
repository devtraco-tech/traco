import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, ArrowLeft, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ABO Goiás</h1>
          <p className="text-muted-foreground">Recuperação de Senha</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Esqueceu sua senha?</CardTitle>
            <CardDescription>
              {emailSent 
                ? "Enviamos um link de recuperação para seu email"
                : "Digite seu email para receber um link de recuperação"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emailSent ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg">
                  <Mail className="h-12 w-12 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Enviamos um email para <strong>{email}</strong> com instruções para redefinir sua senha.
                </p>
                <p className="text-xs text-muted-foreground text-center">
                  Não recebeu? Verifique a pasta de spam ou tente novamente.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setEmailSent(false)}
                >
                  Enviar novamente
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar link de recuperação"}
                </Button>
              </form>
            )}

            <div className="mt-4 pt-4 border-t">
              <Link to="/auth">
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar para login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Associação Brasileira de Odontologia de Goiás
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
