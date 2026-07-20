import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  CheckSquare,
  GraduationCap,
  Users,
  Building2,
  UsersRound,
  UserCog,
  LogOut,
  Megaphone,
  UserPlus,
  Settings,
  ChevronDown,
  Phone,
  Share2,
  Calendar as CalendarIcon,
  ScrollText,
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

const mainItems: { title: string; url: string; icon: any; adminOnly?: boolean }[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Cursos", url: "/courses", icon: BookOpen },
  { title: "Criar Curso", url: "/courses/new", icon: Plus },
  { title: "Classificados", url: "/classifieds", icon: Megaphone, adminOnly: true },
  { title: "Validações", url: "/validations", icon: CheckSquare, adminOnly: true },
  { title: "Leads", url: "/leads", icon: UserPlus, adminOnly: true },
];


const managementItems: { title: string; url: string; icon: any; adminOnly?: boolean }[] = [
  { title: "Professores", url: "/teachers", icon: GraduationCap, adminOnly: true },
  { title: "Matrículas", url: "/registrations", icon: Users, adminOnly: true },
  { title: "Usuários", url: "/users", icon: UserCog, adminOnly: true },
  { title: "Equipes Promotoras", url: "/promotional-teams", icon: UsersRound, adminOnly: true },
  { title: "Empresas", url: "/billing-companies", icon: Building2, adminOnly: true },
  { title: "Logs", url: "/logs", icon: ScrollText, adminOnly: true },
  { title: "Configurações", url: "/settings", icon: Settings, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin, isTriageCoordenador, isTriageAtendente, isTriageDentista } = useUserRole();
  const currentPath = location.pathname;
  
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/courses/new") {
      return currentPath === path;
    }
    if (path === "/courses") {
      return currentPath === path || (currentPath.startsWith("/courses/") && currentPath !== "/courses/new");
    }
    return currentPath === path;
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="z-40">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="group cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-bold group-hover:bg-primary/90 transition-colors shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-sm font-bold">ABO Goiás</span>
                    <span className="text-xs text-muted-foreground">Gestão Educacional</span>
                  </div>
                  <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="bottom" sideOffset={4}>
                <DropdownMenuLabel>Alternar Módulo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="bg-primary/5 cursor-pointer" onClick={() => navigate("/dashboard")}>
                  <GraduationCap className="mr-2 h-4 w-4" />
                  <span className="font-medium">Gestão Educacional</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-muted-foreground" onClick={() => navigate("/dashboard-triagem")}>
                  <Tooth className="mr-2 h-4 w-4" />
                  Gestão Clínica (Triagem)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.filter(i => !i.adminOnly || isAdmin).map((item) => {
                const isCreateCourse = item.url === "/courses/new";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        className={
                          isCreateCourse
                            ? "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium rounded-md"
                            : "hover:bg-accent transition-colors"
                        }
                        activeClassName={
                          isCreateCourse
                            ? "bg-primary text-primary-foreground font-semibold ring-2 ring-primary/30"
                            : "bg-accent text-primary font-medium"
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            Gerenciamento
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.filter(i => !i.adminOnly || isAdmin).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className="hover:bg-accent transition-colors"
                      activeClassName="bg-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
