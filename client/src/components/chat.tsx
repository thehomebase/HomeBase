import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { format } from "date-fns";

interface Message {
  id: number;
  content: string;
  timestamp: string;
  userId: number;
  username: string;
  role: string;
  transactionId: number;
}

interface ChatProps {
  transactionId: number;
}

export function Chat({ transactionId }: ChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: messages = [], isLoading, error } = useQuery<Message[]>({
    queryKey: ["/api/messages", transactionId],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/messages?transactionId=${transactionId}`
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch messages");
      }
      return response.json();
    },
    enabled: !!transactionId && !!user,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (newMessage: string) => {
      const response = await apiRequest("POST", "/api/messages", {
        content: newMessage.trim(),
        transactionId: Number(transactionId),
        userId: user?.id,
        username: user?.username,
        role: user?.role,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", transactionId] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id || !user?.username || !user?.role) {
      toast({
        title: "Error",
        description: "User information is incomplete. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(message);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load messages</p>
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/messages", transactionId] });
            }}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] rounded-lg border">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.userId === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.userId === user?.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{msg.username}</span>
                  <span className="text-xs opacity-70">({msg.role})</span>
                </div>
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-70 block mt-1">
                  {format(new Date(msg.timestamp), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1"
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          size="icon"
          disabled={sendMessageMutation.isPending || !message.trim()}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}