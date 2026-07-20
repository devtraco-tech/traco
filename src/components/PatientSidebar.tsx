import { useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useMyModulePermissions, ModuleKey } from "@/hooks/useModulePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  Users,
  Activity,
  UserPlus,
  LogOut,
  Stethoscope,
  Building2,
  Calendar as CalendarIcon,
  CalendarClock,
  ArrowLeft,
  Phone,
  Share2,
  Settings,
  ChevronDown,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { Tooth } from "@/components/icons/ToothIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from "@/components/ui/sidebar";

type TriageItem = { title: string; url: string; icon: any; module: ModuleKey };

const triageItems: TriageItem[] = [
  { title: "Painel Estratégico", url: "/dashboard-triagem", icon: LayoutDashboard, module: "fila1_recepcao" },
  { title: "FILA  1: AGENDAMENTO TRIAGEM 3", url: "/pre-triagem", icon: Phone, module: "fila1_recepcao" },
  { title: "Fila 2: Triagem Clínica 3", url: "/triagem-clinica", icon: Tooth, module: "fila2_clinica" },
  { title: "FILA 3: FILA DE ESPERA", url: "/cap-distribuicao", icon: Share2, module: "fila3_cap" },
  { title: "Agenda de Triagem Clínica 3", url: "/agenda-triagem", icon: CalendarClock, module: "agenda_recepcao" },
  { title: "Agenda Clínica Cursos", url: "/admin/agenda", icon: CalendarIcon, module: "agenda_clinica" },
];

const generalItems: TriageItem[] = [
  { title: "Todos os Pacientes", url: "/patients", icon: Users, module: "todos_pacientes" },
];

const configItems = [
  { title: "Especialidades", url: "/admin/especialidades", icon: Settings },
  { title: "Especialidades UNIFAN", url: "/admin/especialidades-unifan", icon: Settings },
  { title: "Usuários", url: "/users", icon: UserPlus },
];

export function PatientSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isTriageCoordenador } = useUserRole();
  const { can } = useMyModulePermissions();

  const isCollapsed = state === "collapsed";
  const isManager = isAdmin || isTriageCoordenador;

  const visibleTriageItems = triageItems.filter((item) => can(item.module, "view"));
  const visibleGeneralItems = generalItems.filter((item) => can(item.module, "view"));
  const visibleConfigItems = isManager ? configItems : [];

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="z-40 border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="border-b border-sidebar-border bg-sidebar">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="group cursor-pointer">
                  <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shrink-0">
                    <Tooth className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-sm font-black text-foreground tracking-tight">ABO Goiás</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gestão Clínica</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 rounded-2xl border-border shadow-xl" align="start" side="bottom" sideOffset={4}>
                <DropdownMenuLabel className="text-[10px] font-black uppercase text-muted-foreground p-4">Alternar Módulo</DropdownMenuLabel>
                <DropdownMenuSeparator className="opacity-50" />
                <DropdownMenuItem className="p-4 cursor-pointer hover:bg-sidebar-accent rounded-xl m-1" onClick={() => navigate("/dashboard")}>
                  <GraduationCap className="mr-3 h-5 w-5 text-muted-foreground" />
                  <span className="font-bold text-foreground">Gestão Educacional</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4 bg-blue-500/10 text-blue-500 cursor-pointer rounded-xl m-1" onClick={() => navigate("/dashboard-triagem")}>
                  <Tooth className="mr-3 h-5 w-5 text-blue-500" />
                  <span className="font-bold">Módulo de Triagem Clínica</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Esteira de Triagem
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleTriageItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="h-10 rounded-xl transition-all duration-200">
                    <NavLink
                      to={item.url}
                      className="flex items-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 dark:hover:bg-blue-900/20"
                      activeClassName="bg-blue-500/10 dark:bg-blue-900/30 text-blue-500 dark:text-blue-300 font-extrabold shadow-sm border border-blue-500/20 dark:border-blue-800"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-tight">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {visibleGeneralItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Gestão Geral
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleGeneralItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="h-10 rounded-xl transition-all duration-200">
                      <NavLink
                        to={item.url}
                        className="flex items-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10"
                        activeClassName="bg-blue-500/10 text-blue-500 font-extrabold shadow-sm border border-blue-500/20"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-tight">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {visibleConfigItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Configurações
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleConfigItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} className="h-10 rounded-xl transition-all duration-200">
                      <NavLink
                        to={item.url}
                        className="flex items-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-foreground font-extrabold"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-xs uppercase tracking-tight">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-sidebar-accent/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Painel Administrativo" onClick={() => navigate("/dashboard")} className="h-10 rounded-xl font-bold text-muted-foreground text-xs uppercase tracking-tighter hover:bg-sidebar-background hover:text-foreground shadow-none transition-all">
              <ArrowLeft className="h-4 w-4" />
              <span>Painel Administrativo</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={handleLogout} className="h-10 rounded-xl font-black text-rose-500 text-xs uppercase tracking-widest hover:bg-rose-500/10 transition-all">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
