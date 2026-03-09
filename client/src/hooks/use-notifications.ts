import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "./use-websocket";
import { useEffect, useCallback } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useNotifications() {
  const { connected, on } = useWebSocket();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/notifications/list', { limit: 30 }],
    refetchInterval: 60000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.count ?? 0;

  useEffect(() => {
    const unsub = on('notification', (event) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/list'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });

      const n = event.payload;
      if (n?.title) {
        toast({
          title: n.title,
          description: n.message,
        });
      }
    });
    return unsub;
  }, [on, toast]);

  const markRead = useCallback(async (id: number) => {
    await apiRequest('PATCH', `/api/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/list'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
  }, []);

  const markAllRead = useCallback(async () => {
    await apiRequest('PATCH', '/api/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/list'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    connected,
    markRead,
    markAllRead,
  };
}
