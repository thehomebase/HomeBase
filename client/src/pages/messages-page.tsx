
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Recipient {
  id: number;
  name: string;
  role: string;
  email: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");

  const { data: recipients = [] } = useQuery<Recipient[]>({
    queryKey: ["/api/messages/recipients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messages/recipients");
      return response.json();
    },
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/messages");
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
      <div className="flex gap-4">
        <Select 
          value={selectedRecipient} 
          onValueChange={setSelectedRecipient}
        >
          <SelectTrigger className="w-[300px]">
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
      </div>
      <Card className="flex flex-col h-[600px] mt-4">
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4">
            {messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.senderId === user?.id ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="text-sm font-medium mb-1">
                    {msg.senderId === user?.id ? "You" : msg.senderName}
                  </div>
                  <div>{msg.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {new Date(msg.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!selectedRecipient || sendMessageMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!selectedRecipient || sendMessageMutation.isPending || !message.trim()}
          >
            Send
          </Button>
        </form>
      </Card>
    </main>
  );
}
