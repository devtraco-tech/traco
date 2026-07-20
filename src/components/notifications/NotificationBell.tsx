import { useState } from "react";
import { Bell, Check, CheckCheck, Trash2, BookOpen, FileText, ClipboardCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  course: BookOpen,
  classified: FileText,
  validation: ClipboardCheck,
  info: Bell,
  success: Check,
  warning: Bell,
};

const typeColors: Record<string, string> = {
  course: "text-blue-500",
  classified: "text-purple-500",
  validation: "text-orange-500",
  info: "text-muted-foreground",
  success: "text-green-500",
  warning: "text-yellow-500",
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }

    // Navigate based on reference type
    if (notification.reference_id && notification.reference_type) {
      switch (notification.reference_type) {
        case "course":
          navigate(`/courses/${notification.reference_id}`);
          break;
        case "classified":
          navigate(`/classifieds/${notification.reference_id}`);
          break;
        default:
          break;
      }
    }

    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center text-[10px] bg-red-500 hover:bg-red-500"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        align="end" 
        className="w-80 p-0 bg-popover border shadow-lg z-50"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <h4 className="font-semibold text-sm">Notificações</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllAsRead.mutate()}
                disabled={markAllAsRead.isPending}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Ler todas
              </Button>
            )}
            {notifications && notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={() => clearAll.mutate()}
                disabled={clearAll.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        <ScrollArea className="max-h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                const iconColor = typeColors[notification.type] || "text-muted-foreground";

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-3 hover:bg-muted/50 cursor-pointer transition-colors group",
                      !notification.is_read && "bg-primary/5"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className={cn("mt-0.5 shrink-0", iconColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm leading-tight",
                          !notification.is_read && "font-medium"
                        )}>
                          {notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
