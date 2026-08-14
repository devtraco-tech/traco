import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { NavLink } from "@/components/NavLink";
import { Bot, GraduationCap, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="z-40">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-0.5 overflow-hidden leading-none group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-bold">ABO Goiás</span>
            <span className="truncate text-xs text-muted-foreground">Gestão Educacional</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Inteligência Artificial</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Configuração SDR">
                    <NavLink
                      to="/sdr/configuracao"
                      className="transition-colors hover:bg-accent"
                      activeClassName="bg-accent font-medium text-primary"
                    >
                      <Bot className="h-4 w-4" />
                      <span>Configuração SDR</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair"
              onClick={handleLogout}
              className="transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
