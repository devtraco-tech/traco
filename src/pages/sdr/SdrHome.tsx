import { ArrowRight, Bot, MessageSquareText, Settings2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const SdrHome = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
        <div className="absolute right-0 top-0 h-72 w-72 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/30 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Ambiente SDR
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bem-vindo à Central SDR
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Prepare o atendimento automatizado, conecte os canais e mantenha as informações comerciais sempre atualizadas.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/sdr/configuracao">
              Acessar configuração
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Settings2,
            title: "Configuração centralizada",
            description: "Ajuste treinamento, curso, regras comerciais e comportamento do SDR.",
          },
          {
            icon: MessageSquareText,
            title: "Atendimento preparado",
            description: "Organize o conteúdo usado nas conversas com os seus leads.",
          },
          {
            icon: ShieldCheck,
            title: "Acesso protegido",
            description: `Sessão autenticada como ${user?.email ?? "usuário autorizado"}.`,
          },
        ].map((item) => (
          <Card key={item.title} className="border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-slate-950 dark:text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {item.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Bot className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-slate-950 dark:text-white">Pronto para configurar?</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Siga as etapas da configuração para colocar o SDR em operação.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/sdr/configuracao">Configuração SDR</Link>
        </Button>
      </section>
    </div>
  );
};

export default SdrHome;
