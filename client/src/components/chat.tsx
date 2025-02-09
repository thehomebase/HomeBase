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
  transactionId: number;
  userId: number;
  username: string;
  role: string;
  content: string;
  timestamp: string;
}

interface ChatProps {
  transactionId: number | string;
}

export function Chat({ transactionId }: ChatProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Ensure transactionId is a valid number
  const numericTransactionId = typeof transactionId === 'string' ? parseInt(transactionId, 10) : transactionId;

  // Validate transaction ID
  if (isNaN(numericTransactionId)) {
    return (
      <div className="p-4 border rounded-lg bg-destructive/10 text-destructive">
        Invalid transaction ID provided
      </div>
    );
  }

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages", numericTransactionId],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", `/api/messages?transactionId=${numericTransactionId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }
    },
    enabled: !!user && !!numericTransactionId,
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user) {
        throw new Error("Must be logged in to send messages");
      }

      const messageData = {
        content,
        transactionId: numericTransactionId,
        userId: user.id,
        username: user.username,
        role: user.role,
      };

      const response = await apiRequest("POST", "/api/messages", messageData);
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", numericTransactionId] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    sendMessageMutation.mutate(trimmedMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] rounded-lg border bg-background">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={`flex ${msg.userId === user?.id ? "justify-end" : "justify-start"}`}
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
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <span className="text-xs opacity-70 block mt-1">
                  {format(new Date(msg.timestamp), "MMM d, h:mm a")}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex gap-2">
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
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

export default Chat;