import { useEffect, useState } from "react";
import { Bot, Eye, EyeOff, LockKeyhole, MessageCircleMore } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_DESTINATION = "/sdr";

function getDestination(locationState: unknown) {
  const savedDestination = sessionStorage.getItem("redirectAfterLogin");
  const stateDestination = (locationState as { from?: { pathname?: string } } | null)?.from?.pathname;
  const destination = savedDestination || stateDestination;

  return destination?.startsWith("/sdr") ? destination : DEFAULT_DESTINATION;
}

const SdrLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, isLoading } = useAuth();
  const { toast } = useToast();
  const destination = getDestination(location.state);

  useEffect(() => {
    document.title = "Login | Central SDR";
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      sessionStorage.removeItem("redirectAfterLogin");
      navigate(destination, { replace: true });
    }
  }, [destination, isLoading, navigate, user]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(email.trim(), password);

    if (error) {
      toast({
        title: "Não foi possível entrar",
        description:
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message,
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    sessionStorage.removeItem("redirectAfterLogin");
    navigate(destination, { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_hsl(var(--primary)/0.28),_transparent_38%),radial-gradient(circle_at_bottom_right,_hsl(var(--primary)/0.14),_transparent_32%)]" />
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl dark:bg-slate-900 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Bot className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold">Central SDR</p>
                <p className="text-sm text-primary-foreground/70">Atendimento inteligente</p>
              </div>
            </div>
            <h1 className="max-w-md text-4xl font-bold leading-tight">
              Configure seu SDR em um ambiente simples e seguro.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-primary-foreground/75">
              Gerencie treinamento, WhatsApp e regras comerciais em um único lugar.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm text-primary-foreground/80">
            <MessageCircleMore className="h-5 w-5" />
            <span>Operação centralizada do atendimento SDR</span>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 lg:hidden">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Bot className="h-6 w-6" />
            </span>
            <p className="font-semibold">Central SDR</p>
          </div>

          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <CardHeader className="space-y-2 px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <CardTitle className="text-2xl leading-tight">Acesse sua conta</CardTitle>
              <CardDescription className="leading-relaxed">
                Entre com suas credenciais para acessar a configuração do SDR.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2 sm:px-7 sm:pb-7">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="sdr-email">E-mail</Label>
                  <Input
                    id="sdr-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className="h-11 bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="sdr-password">Senha</Label>
                    <Link to="/sdr/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="sdr-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="h-11 bg-background pr-11"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-11 w-full font-semibold shadow-sm"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? "Entrando..." : "Entrar na Central SDR"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default SdrLogin;
