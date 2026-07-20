import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ModeToggle } from "./ModeToggle";
import { FontSizeControl } from "./FontSizeControl";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-hidden">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-background flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger className="mr-4">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1">
              <h1 className="text-sm font-medium text-muted-foreground">
                {user?.email}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <FontSizeControl />
              <ModeToggle />
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
