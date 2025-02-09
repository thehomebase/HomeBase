import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  userId: number;
  userName: string;
  timestamp: string;
}

interface ChatProps {
  transactionId: number | null;
}

export function Chat({ transactionId }: ChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];
      const response = await apiRequest("GET", `/api/messages/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      return response.json();
    },
    enabled: !!transactionId && !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!transactionId || !user) return;
      const response = await apiRequest("POST", `/api/messages/${transactionId}`, {
        text,
        userId: user.id,
        userName: user.username, // Changed from name to username
      });
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", transactionId] });
      setMessage("");
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.userId === (user?.id ?? -1) ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.userId === (user?.id ?? -1)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm font-medium mb-1">{msg.userName}</div>
                <div>{msg.text}</div>
                <div className="text-xs opacity-70 mt-1">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t flex gap-2"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={sendMessageMutation.isPending}
        />
        <Button
          type="submit"
          disabled={sendMessageMutation.isPending || !message.trim()}
        >
          Send
        </Button>
      </form>
    </Card>
  );
}