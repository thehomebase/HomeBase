import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Loader2, Mail, Inbox, Send, AlertCircle, RefreshCw,
  Link2, ArrowLeft, Search, X
} from "lucide-react";
import { format } from "date-fns";
import DOMPurify from "dompurify";

interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  labelIds: string[];
  isUnread?: boolean;
}

interface GmailMessageDetail extends GmailMessage {
  cc: string;
  body: string;
  isHtml: boolean;
}

interface InboxResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
  error?: string;
}

export default function MailPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [pages, setPages] = useState<{ token: string | undefined; label: string }[]>([
    { token: undefined, label: "1" },
  ]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const { data: commStatus } = useQuery<{
    twilio: boolean;
    gmail: { connected: boolean; email?: string };
  }>({
    queryKey: ["/api/communications/status"],
  });

  const gmailEmail = commStatus?.gmail?.email || "";
  const gmailConnected = commStatus?.gmail?.connected;

  const labelMap: Record<string, string> = {
    all: "",
    sent: "SENT",
    received: "INBOX",
  };

  const currentPageToken = pages[currentPageIndex]?.token;
  const label = labelMap[filter];

  const inboxQuery = useQuery<InboxResponse>({
    queryKey: ["/api/gmail/inbox", filter, activeSearch, currentPageToken],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentPageToken) params.set("pageToken", currentPageToken);
      if (activeSearch) params.set("q", activeSearch);
      if (label) params.set("label", label);
      params.set("maxResults", "25");
      const res = await fetch(`/api/gmail/inbox?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch inbox");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      return data;
    },
    enabled: !!gmailConnected,
    staleTime: 60 * 1000,
  });

  const messageQuery = useQuery<{ message: GmailMessageDetail }>({
    queryKey: ["/api/gmail/message", selectedMessageId],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/message/${selectedMessageId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch message");
      return res.json();
    },
    enabled: !!selectedMessageId,
  });

  const messages = inboxQuery.data?.messages || [];
  const nextPageToken = inboxQuery.data?.nextPageToken;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setPages([{ token: undefined, label: "1" }]);
    setCurrentPageIndex(0);
    setSelectedMessageId(null);
  }

  function clearSearch() {
    setSearchQuery("");
    setActiveSearch("");
    setPages([{ token: undefined, label: "1" }]);
    setCurrentPageIndex(0);
  }

  function handleFilterChange(f: "all" | "sent" | "received") {
    setFilter(f);
    setPages([{ token: undefined, label: "1" }]);
    setCurrentPageIndex(0);
    setSelectedMessageId(null);
  }

  function goNextPage() {
    if (!nextPageToken) return;
    const nextIndex = currentPageIndex + 1;
    if (nextIndex >= pages.length) {
      setPages((prev) => [...prev, { token: nextPageToken, label: String(nextIndex + 1) }]);
    }
    setCurrentPageIndex(nextIndex);
  }

  function goPrevPage() {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }

  function extractName(header: string): string {
    const nameMatch = header?.match(/^([^<]+)</);
    if (nameMatch) return nameMatch[1].trim().replace(/"/g, "");
    const emailMatch = header?.match(/<([^>]+)>/);
    if (emailMatch) return emailMatch[1];
    return header || "";
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
              Connect your Gmail account to view your emails here.
              You can connect it from any client's contact dialog.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedMessageId) {
    const msg = messageQuery.data?.message;
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => setSelectedMessageId(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to inbox
        </Button>

        {messageQuery.isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messageQuery.isError || !msg ? (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load email.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {msg.subject || "(no subject)"}
              </h2>
              <div className="space-y-1 mb-4 text-sm text-muted-foreground border-b pb-4">
                <p>
                  <span className="font-medium text-foreground">From:</span>{" "}
                  {msg.from}
                </p>
                <p>
                  <span className="font-medium text-foreground">To:</span>{" "}
                  {msg.to}
                </p>
                {msg.cc && (
                  <p>
                    <span className="font-medium text-foreground">Cc:</span>{" "}
                    {msg.cc}
                  </p>
                )}
                <p>
                  <span className="font-medium text-foreground">Date:</span>{" "}
                  {msg.date
                    ? format(new Date(msg.date), "EEEE, MMMM d, yyyy 'at' h:mm a")
                    : ""}
                </p>
              </div>
              <div
                className="prose prose-sm dark:prose-invert max-w-none overflow-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.body, { USE_PROFILES: { html: true } }) }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
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
          onClick={() => inboxQuery.refetch()}
          disabled={inboxQuery.isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${inboxQuery.isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {(searchQuery || activeSearch) && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" size="sm" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex gap-2 mb-4">
        {(["all", "sent", "received"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange(f)}
          >
            {f === "all" && <Inbox className="h-4 w-4 mr-1" />}
            {f === "sent" && <Send className="h-4 w-4 mr-1" />}
            {f === "received" && <Mail className="h-4 w-4 mr-1" />}
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {activeSearch && (
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Search className="h-3 w-3" />
          Results for "{activeSearch}"
          <button onClick={clearSearch} className="underline hover:text-foreground">
            Clear
          </button>
        </div>
      )}

      {inboxQuery.isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading inbox...</span>
        </div>
      ) : inboxQuery.isError ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to load inbox. Try refreshing.</p>
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">
              {activeSearch ? "No emails match your search." : "No emails found."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            {messages.map((msg) => {
              const isFromAgent = msg.from?.toLowerCase().includes(gmailEmail.toLowerCase());
              const displayName = isFromAgent
                ? `To: ${extractName(msg.to)}`
                : extractName(msg.from);
              const msgDate = msg.date ? new Date(msg.date) : new Date();
              const isToday = new Date().toDateString() === msgDate.toDateString();
              const isThisYear = new Date().getFullYear() === msgDate.getFullYear();

              return (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessageId(msg.id)}
                  className={`flex items-start gap-3 p-3 hover:bg-muted/50 border-b last:border-b-0 cursor-pointer transition-colors ${
                    msg.isUnread ? "bg-primary/5" : ""
                  }`}
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
                      <span className={`text-sm truncate ${msg.isUnread ? "font-bold" : "font-medium"}`}>
                        {displayName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
                        {isToday
                          ? format(msgDate, "h:mm a")
                          : isThisYear
                          ? format(msgDate, "MMM d")
                          : format(msgDate, "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${msg.isUnread ? "font-semibold" : ""}`}>
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

          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={goPrevPage}
              disabled={currentPageIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPageIndex + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={goNextPage}
              disabled={!nextPageToken}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
