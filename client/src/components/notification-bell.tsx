import { Bell, MessageSquare, Target, FileText, Gavel, ArrowRightLeft, UserPlus, Clock, CheckCheck, Info, Link2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";
import { useLocation } from "wouter";

const typeConfig: Record<string, { icon: any; color: string; route?: (n: any) => string }> = {
  lead_new: { icon: Target, color: 'text-emerald-500', route: () => '/lead-gen' },
  message_new: { icon: MessageSquare, color: 'text-blue-500', route: () => '/messages' },
  document_updated: { icon: FileText, color: 'text-amber-500', route: (n: any) => n.relatedId ? `/transactions/${n.relatedId}` : '/transactions' },
  bid_received: { icon: Gavel, color: 'text-purple-500', route: (n: any) => n.relatedId ? `/transactions/${n.relatedId}` : '/transactions' },
  transaction_update: { icon: ArrowRightLeft, color: 'text-primary', route: (n: any) => n.relatedId ? `/transactions/${n.relatedId}` : '/transactions' },
  client_invited: { icon: UserPlus, color: 'text-teal-500', route: () => '/clients' },
  vendor_match: { icon: Link2, color: 'text-violet-500', route: (n: any) => n.relatedId ? `/vendor-sync/${n.relatedId}` : '/homebase-pros' },
  review_request: { icon: Star, color: 'text-amber-500', route: (n: any) => n.relatedId ? `/transactions/${n.relatedId}` : '/dashboard' },
  reminder: { icon: Clock, color: 'text-orange-500' },
  general: { icon: Info, color: 'text-muted-foreground' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [, setLocation] = useLocation();

  const handleClick = (notification: any) => {
    if (!notification.read) {
      markRead(notification.id);
    }
    const config = typeConfig[notification.type] || typeConfig.general;
    if (config.route) {
      setLocation(config.route(notification));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 flex items-center justify-center text-[11px] font-bold bg-red-500 text-white rounded-full leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                markAllRead();
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            <div>
              {notifications.map((n: any) => {
                const config = typeConfig[n.type] || typeConfig.general;
                const Icon = config.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                      !n.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className={`mt-0.5 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      !n.read ? 'bg-primary/10' : 'bg-muted'
                    }`}>
                      <Icon className={`h-4 w-4 ${!n.read ? config.color : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!n.read ? 'font-semibold' : 'font-medium'}`}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
