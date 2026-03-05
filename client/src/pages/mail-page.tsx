import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Inbox, Send, Clock, AlertCircle, RefreshCw, Link2 } from "lucide-react";
import { format } from "date-fns";

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
}

export default function MailPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");

  const { data: commStatus } = useQuery<{
    twilio: boolean;
    gmail: { connected: boolean; email?: string };
  }>({
    queryKey: ["/api/communications/status"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const clientEmails = clients
    .filter((c) => c.email)
    .map((c) => c.email!.toLowerCase());

  const clientsByEmail = new Map<string, Client>();
  clients.forEach((c) => {
    if (c.email) clientsByEmail.set(c.email.toLowerCase(), c);
  });

  const gmailQueries = useQuery<{ messages: GmailMessage[] }>({
    queryKey: ["/api/gmail/messages/all"],
    queryFn: async () => {
      if (!clients.length) return { messages: [] };

      const allMessages: GmailMessage[] = [];
      const seen = new Set<string>();

      const clientsWithEmail = clients.filter((c) => c.email);
      for (const client of clientsWithEmail) {
        try {
          const res = await fetch(`/api/gmail/messages/${client.id}`, {
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            (data.messages || []).forEach((msg: GmailMessage) => {
              if (!seen.has(msg.id)) {
                seen.add(msg.id);
                allMessages.push(msg);
              }
            });
          }
        } catch {
        }
      }

      allMessages.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      return { messages: allMessages };
    },
    enabled: !!commStatus?.gmail?.connected && clients.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const gmailEmail = commStatus?.gmail?.email || "";
  const gmailConnected = commStatus?.gmail?.connected;

  const messages = gmailQueries.data?.messages || [];

  const filteredMessages = messages.filter((msg) => {
    if (filter === "all") return true;
    const isFromAgent = msg.from?.toLowerCase().includes(gmailEmail.toLowerCase());
    if (filter === "sent") return isFromAgent;
    if (filter === "received") return !isFromAgent;
    return true;
  });

  function getContactName(msg: GmailMessage): string {
    const isFromAgent = msg.from?.toLowerCase().includes(gmailEmail.toLowerCase());
    const otherEmail = isFromAgent ? msg.to : msg.from;

    const emailMatch = otherEmail?.match(/<([^>]+)>/) || [null, otherEmail];
    const email = (emailMatch[1] || otherEmail || "").toLowerCase().trim();

    const client = clientsByEmail.get(email);
    if (client) return `${client.firstName} ${client.lastName}`;

    const nameMatch = otherEmail?.match(/^([^<]+)</);
    if (nameMatch) return nameMatch[1].trim();

    return email;
  }

  if (!gmailConnected) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-6">
          <Mail className="h-6 w-6" /> Mail
        </h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h3 className="text-lg font-medium mb-2">Gmail Not Connected</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Gmail account to view your email conversations here.
              You can connect it from any client's contact dialog.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" /> Mail
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <Link2 className="h-3 w-3" /> {gmailEmail}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => gmailQueries.refetch()}
          disabled={gmailQueries.isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${gmailQueries.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          <Inbox className="h-4 w-4 mr-1" /> All
        </Button>
        <Button
          variant={filter === "sent" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("sent")}
        >
          <Send className="h-4 w-4 mr-1" /> Sent
        </Button>
        <Button
          variant={filter === "received" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("received")}
        >
          <Mail className="h-4 w-4 mr-1" /> Received
        </Button>
      </div>

      {gmailQueries.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading emails from your clients...</span>
        </div>
      ) : gmailQueries.isError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load emails. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : filteredMessages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              {filter === "all"
                ? "No email conversations with your clients yet."
                : filter === "sent"
                ? "No sent emails found."
                : "No received emails found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1 border rounded-lg overflow-hidden">
          {filteredMessages.map((msg) => {
            const isFromAgent = msg.from?.toLowerCase().includes(gmailEmail.toLowerCase());
            const contactName = getContactName(msg);
            const msgDate = msg.date ? new Date(msg.date) : new Date();
            const isToday = new Date().toDateString() === msgDate.toDateString();

            return (
              <div
                key={msg.id}
                className="flex items-start gap-3 p-3 hover:bg-muted/50 border-b last:border-b-0 cursor-default"
              >
                <div className="mt-1">
                  {isFromAgent ? (
                    <Send className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Inbox className="h-4 w-4 text-purple-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {contactName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                      {isToday
                        ? format(msgDate, "h:mm a")
                        : format(msgDate, "MMM d")}
                    </span>
                  </div>
                  <p className="text-sm truncate">
                    {msg.subject || "(no subject)"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {msg.snippet}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredMessages.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Showing {filteredMessages.length} email{filteredMessages.length !== 1 ? "s" : ""} with your clients
        </p>
      )}
    </div>
  );
}
