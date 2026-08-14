import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bot, LogOut, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface SdrLayoutProps {
  children: React.ReactNode;
}

export function SdrLayout({ children }: SdrLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  useEffect(() => {
    document.title = location.pathname.includes("configuracao")
      ? "Configuração SDR | Central SDR"
      : "Central SDR | Atendimento Inteligente";
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate("/sdr/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/sdr" className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bot className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">
                Central SDR
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                Atendimento inteligente
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
              <Link to="/sdr/configuracao">
                <Settings2 className="mr-2 h-4 w-4" />
                Configuração SDR
              </Link>
            </Button>
            <span className="hidden max-w-56 truncate text-xs text-muted-foreground md:block">
              {user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
