
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Message {
  id: number;
  content: string;
  userId: number;
  username: string;
  role: string;
  timestamp: string;
  isRead: boolean;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messages");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: recipients = [] } = useQuery({
    queryKey: ["/api/messages/recipients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messages/recipients");
      return response.json();
    },
    enabled: !!user,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/messages", {
        recipientId: selectedRecipient,
        content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setMessage("");
      setSelectedMessage(null);
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("PATCH", `/api/messages/${messageId}`, {
        isRead: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && selectedRecipient) {
      sendMessageMutation.mutate(message);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Messages</h2>
      <div className="grid grid-cols-[300px_1fr] gap-4">
        <Card className="p-4">
          <Button 
            className="w-full mb-4 gap-2" 
            onClick={() => setSelectedMessage(null)}
          >
            <Mail className="h-4 w-4" />
            Compose
          </Button>
          <div className="space-y-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded cursor-pointer transition-colors ${
                  selectedMessage?.id === msg.id
                    ? "bg-primary text-primary-foreground"
                    : msg.isRead
                    ? "hover:bg-muted"
                    : "bg-muted/50 hover:bg-muted font-medium"
                }`}
                onClick={() => {
                  setSelectedMessage(msg);
                  if (!msg.isRead) {
                    markAsReadMutation.mutate(msg.id);
                  }
                }}
              >
                <div className="flex items-center gap-2">
                  {!msg.isRead && (
                    <Circle className="h-2 w-2 fill-primary text-primary" />
                  )}
                  <span className="truncate">{msg.username}</span>
                </div>
                <div className="text-sm truncate">{msg.content}</div>
                <div className="text-xs opacity-70">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-medium">{selectedMessage.username}</h3>
                  <div className="text-sm text-muted-foreground">
                    {new Date(selectedMessage.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="min-h-[200px]">{selectedMessage.content}</div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="space-y-4">
              <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {recipients.map((recipient) => (
                    <SelectItem key={recipient.id} value={recipient.id.toString()}>
                      {recipient.name} ({recipient.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full min-h-[200px] p-2 rounded border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={!selectedRecipient || sendMessageMutation.isPending}
              />
              <Button
                type="submit"
                disabled={!selectedRecipient || sendMessageMutation.isPending || !message.trim()}
                className="w-full"
              >
                Send
              </Button>
            </form>
          )}
        </Card>
      </div>
    </main>
  );
}
