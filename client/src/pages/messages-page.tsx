import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Lock, Send, Plus, Search, ArrowLeft, ShieldCheck, MessageSquare, Check, CheckCheck, Mail, Phone, BarChart3, Users, TrendingUp, ChevronDown, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Conversation {
  userId: number;
  name: string;
  role: string;
  email: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
}

interface PrivateMessage {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  timestamp: string;
  read: boolean;
  encrypted: boolean;
  iv: string | null;
  senderName: string;
  senderRole: string;
  recipientName: string;
  recipientRole: string;
}

interface UserOption {
  id: number;
  name: string;
  role: string;
  email: string;
}

interface MetricsData {
  sms: { today: number; thisWeek: number; thisMonth: number; total: number; uniqueContacts: number };
  email: { today: number; thisWeek: number; thisMonth: number; total: number };
  privateMessages: { today: number; thisWeek: number; thisMonth: number; total: number; uniqueRecipients: number };
  hourlyActivity?: { hour: number; messages: number; sms: number; emails: number }[];
}

const roleColors: Record<string, string> = {
  agent: "bg-blue-100 text-blue-800",
  client: "bg-green-100 text-green-800",
  vendor: "bg-purple-100 text-purple-800",
  lender: "bg-amber-100 text-amber-800",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getDateLabel(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function formatHour(h: number) {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function ContactActivityChart({ metrics }: { metrics: MetricsData }) {
  const hourly = metrics.hourlyActivity || [];
  const total = hourly.reduce((s, h) => s + h.messages + h.sms + h.emails, 0);
  const chartData = hourly.map(h => ({ name: formatHour(h.hour), messages: h.messages, sms: h.sms, emails: h.emails }));

  return (
    <Card className="p-3 mb-3">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-sm font-semibold">Activity</div>
          <div className="text-[11px] text-muted-foreground">Messages & communications today</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{total}</div>
          <div className="text-[10px] text-muted-foreground uppercase font-medium">Total</div>
        </div>
      </div>
      <div className="h-[100px] mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={3} />
            <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
            <Bar dataKey="messages" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} name="Messages" />
            <Bar dataKey="sms" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="SMS" />
            <Bar dataKey="emails" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} name="Emails" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t">
        <div className="text-center">
          <div className="text-xs font-semibold">{metrics.privateMessages.total}</div>
          <div className="text-[10px] text-muted-foreground">Messages</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold">{metrics.sms.total}</div>
          <div className="text-[10px] text-muted-foreground">SMS</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-semibold">{metrics.email.total}</div>
          <div className="text-[10px] text-muted-foreground">Emails</div>
        </div>
      </div>
    </Card>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const [metricsContactId, setMetricsContactId] = useState<number | null>(null);
  const [showContactFilter, setShowContactFilter] = useState(false);
  const [showChatStats, setShowChatStats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/private-messages/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/private-messages/conversations");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: chatMessages = [], isLoading: msgsLoading } = useQuery<PrivateMessage[]>({
    queryKey: ["/api/private-messages", activeConversation],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/private-messages/${activeConversation}`);
      return res.json();
    },
    enabled: !!user && !!activeConversation,
    refetchInterval: 3000,
  });

  const { data: allUsers = [] } = useQuery<UserOption[]>({
    queryKey: ["/api/private-messages/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/private-messages/users");
      return res.json();
    },
    enabled: !!user && newChatOpen,
  });

  const canSeeMetrics = !!user && (user.role === "agent" || user.role === "vendor" || user.role === "lender");

  const metricsUrl = metricsContactId
    ? `/api/communications/metrics?contactId=${metricsContactId}`
    : "/api/communications/metrics";

  const { data: metrics } = useQuery<MetricsData>({
    queryKey: ["/api/communications/metrics", metricsContactId],
    queryFn: async () => {
      const res = await apiRequest("GET", metricsUrl);
      return res.json();
    },
    enabled: canSeeMetrics,
  });

  const { data: chatContactMetrics } = useQuery<MetricsData>({
    queryKey: ["/api/communications/metrics", "chat", activeConversation],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/communications/metrics?contactId=${activeConversation}`);
      return res.json();
    },
    enabled: canSeeMetrics && !!activeConversation && showChatStats,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/private-messages", {
        recipientId: activeConversation,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/private-messages", activeConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/private-messages/conversations"] });
      setMessageText("");
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (activeConversation) {
      queryClient.invalidateQueries({ queryKey: ["/api/private-messages/conversations"] });
    }
  }, [activeConversation]);

  const activeUser = conversations.find(c => c.userId === activeConversation);
  const filteredConvos = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredUsers = allUsers.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && activeConversation) {
      sendMutation.mutate(messageText.trim());
    }
  };

  const startNewChat = (userId: number) => {
    setActiveConversation(userId);
    setNewChatOpen(false);
    setUserSearch("");
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const groupedMessages: { label: string; messages: PrivateMessage[] }[] = [];
  let lastDateLabel = "";
  for (const msg of chatMessages) {
    const label = getDateLabel(msg.timestamp);
    if (label !== lastDateLabel) {
      groupedMessages.push({ label, messages: [msg] });
      lastDateLabel = label;
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  const selectedContact = metricsContactId
    ? conversations.find(c => c.userId === metricsContactId)
    : null;

  return (
    <main className="container mx-auto px-4 py-4 md:py-8 h-[calc(100vh-120px)] md:h-[calc(100vh-80px)]">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Messages</h2>
        <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
          <Lock className="h-3 w-3 text-green-600" />
          <span className="text-xs font-medium text-green-700">Encrypted</span>
        </div>
        {totalUnread > 0 && (
          <Badge variant="destructive" className="ml-auto">{totalUnread} unread</Badge>
        )}
        {canSeeMetrics && (
          <Button
            variant="outline"
            size="sm"
            className={`${totalUnread > 0 ? "" : "ml-auto"} gap-1.5`}
            onClick={() => setShowMetrics(!showMetrics)}
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </Button>
        )}
      </div>

      {showMetrics && metrics && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Filter by</span>
            <div className="relative">
              <button
                onClick={() => setShowContactFilter(!showContactFilter)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                <span className="font-medium">
                  {selectedContact ? selectedContact.name : "All Contacts (Total)"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {showContactFilter && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-background border rounded-xl shadow-lg z-50 overflow-hidden">
                  <div className="max-h-[250px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setMetricsContactId(null);
                        setShowContactFilter(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                        !metricsContactId ? "bg-primary/10 text-primary font-medium" : ""
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      All Contacts (Total)
                    </button>
                    {conversations.map(conv => (
                      <button
                        key={conv.userId}
                        onClick={() => {
                          setMetricsContactId(conv.userId);
                          setShowContactFilter(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 ${
                          metricsContactId === conv.userId ? "bg-primary/10 text-primary font-medium" : ""
                        }`}
                      >
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px]">{getInitials(conv.name)}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{conv.name}</span>
                        <Badge variant="outline" className={`text-[9px] px-1 py-0 ${roleColors[conv.role] || ""}`}>
                          {conv.role}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className={`grid grid-cols-2 ${metricsContactId ? "md:grid-cols-3" : "md:grid-cols-4"} gap-3`}>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Messages</span>
              </div>
              <div className="text-2xl font-bold">{metrics.privateMessages.thisMonth}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">Today: {metrics.privateMessages.today}</span>
                <span className="text-[11px] text-muted-foreground">Week: {metrics.privateMessages.thisWeek}</span>
              </div>
              {!metricsContactId && (
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{metrics.privateMessages.uniqueRecipients} contacts</span>
                </div>
              )}
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground">SMS Sent</span>
              </div>
              <div className="text-2xl font-bold">{metrics.sms.thisMonth}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">Today: {metrics.sms.today}</span>
                <span className="text-[11px] text-muted-foreground">Week: {metrics.sms.thisWeek}</span>
              </div>
              {!metricsContactId && (
                <div className="flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{metrics.sms.uniqueContacts} contacts</span>
                </div>
              )}
            </Card>
            {!metricsContactId && (
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-muted-foreground">Emails</span>
                </div>
                <div className="text-2xl font-bold">{metrics.email.thisMonth}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted-foreground">Today: {metrics.email.today}</span>
                  <span className="text-[11px] text-muted-foreground">Week: {metrics.email.thisWeek}</span>
                </div>
              </Card>
            )}
            <Card className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-muted-foreground">All-Time</span>
              </div>
              <div className="text-2xl font-bold">{metrics.privateMessages.total + metrics.sms.total + metrics.email.total}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">Msgs: {metrics.privateMessages.total}</span>
                <span className="text-[11px] text-muted-foreground">SMS: {metrics.sms.total}</span>
              </div>
              {!metricsContactId && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[11px] text-muted-foreground">Emails: {metrics.email.total}</span>
                </div>
              )}
            </Card>
          </div>

          {metrics.hourlyActivity && (
            <Card className="p-3 mt-3">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-sm font-semibold">Activity</div>
                  <div className="text-[11px] text-muted-foreground">
                    {selectedContact ? `${selectedContact.name} — ` : ""}Messages & communications today
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {metrics.hourlyActivity.reduce((s, h) => s + h.messages + h.sms + h.emails, 0)}
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase font-medium">Today</div>
                </div>
              </div>
              <div className="h-[100px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.hourlyActivity.map(h => ({ name: formatHour(h.hour), messages: h.messages, sms: h.sms, emails: h.emails }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={3} />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="messages" stackId="a" fill="#6366f1" name="Messages" />
                    <Bar dataKey="sms" stackId="a" fill="#3b82f6" name="SMS" />
                    <Bar dataKey="emails" stackId="a" fill="#10b981" name="Emails" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-3 mt-2 pt-2 border-t justify-center">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#6366f1" }} /><span className="text-[10px] text-muted-foreground">Messages</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#3b82f6" }} /><span className="text-[10px] text-muted-foreground">SMS</span></div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#10b981" }} /><span className="text-[10px] text-muted-foreground">Emails</span></div>
              </div>
            </Card>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 ${showMetrics ? "h-[calc(100%-160px)]" : "h-[calc(100%-48px)]"}`}>
        <Card className={`flex flex-col overflow-hidden ${activeConversation ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search people..."
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1">
                        {filteredUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => startNewChat(u.id)}
                            className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors text-left"
                          >
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs">{getInitials(u.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{u.name}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                            <Badge variant="secondary" className={`text-xs ${roleColors[u.role] || ""}`}>
                              {u.role}
                            </Badge>
                          </button>
                        ))}
                        {filteredUsers.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-8">No users found</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {convLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading conversations...</div>
            ) : filteredConvos.length === 0 ? (
              <div className="p-6 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No conversations yet</p>
                <p className="text-xs text-muted-foreground mt-1">Start a new chat with the + button</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredConvos.map(conv => (
                  <button
                    key={conv.userId}
                    onClick={() => setActiveConversation(conv.userId)}
                    className={`w-full flex items-center gap-3 p-3 transition-colors text-left ${
                      activeConversation === conv.userId
                        ? "bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">{getInitials(conv.name)}</AvatarFallback>
                      </Avatar>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>
                          {conv.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatTime(conv.lastTimestamp)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1 py-0 ${roleColors[conv.role] || ""}`}>
                          {conv.role}
                        </Badge>
                        <span className={`text-xs truncate ${conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                          {conv.lastMessage}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className={`flex flex-col overflow-hidden ${!activeConversation ? "hidden md:flex" : "flex"}`}>
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 p-3 border-b bg-muted/30">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden h-8 w-8"
                  onClick={() => setActiveConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-sm">
                    {activeUser ? getInitials(activeUser.name) : getInitials(chatMessages[0]?.recipientName || chatMessages[0]?.senderName || "?")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {activeUser?.name || chatMessages[0]?.recipientName || chatMessages[0]?.senderName || "Chat"}
                    </span>
                    {activeUser && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleColors[activeUser.role] || ""}`}>
                        {activeUser.role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    <span className="text-[11px] text-green-600 font-medium">Encrypted</span>
                  </div>
                </div>
                {canSeeMetrics && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowChatStats(!showChatStats)}
                    title="Contact activity"
                  >
                    <Activity className={`h-4 w-4 ${showChatStats ? "text-primary" : "text-muted-foreground"}`} />
                  </Button>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {showChatStats && chatContactMetrics && (
                  <ContactActivityChart metrics={chatContactMetrics} />
                )}
                {msgsLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Loading messages...</div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Messages are encrypted for your privacy</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex justify-center mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                        <Lock className="h-3 w-3 text-amber-600" />
                        <span className="text-[11px] text-amber-700">Messages are encrypted and stored securely</span>
                      </div>
                    </div>
                    {groupedMessages.map((group) => (
                      <div key={group.label}>
                        <div className="flex justify-center my-3">
                          <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                            {group.label}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {group.messages.map(msg => {
                            const isMine = msg.senderId === user?.id;
                            const senderRole = isMine ? msg.senderRole : msg.senderRole;
                            return (
                              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[75%] ${isMine ? "order-2" : ""}`}>
                                  {!isMine && (
                                    <div className="flex items-center gap-1.5 mb-0.5 ml-1">
                                      <span className="text-[11px] font-medium text-muted-foreground">{msg.senderName}</span>
                                      <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${roleColors[senderRole] || ""}`}>
                                        {senderRole}
                                      </Badge>
                                    </div>
                                  )}
                                  <div
                                    className={`px-3 py-2 rounded-2xl text-sm ${
                                      isMine
                                        ? "bg-primary text-primary-foreground rounded-br-md"
                                        : "bg-muted rounded-bl-md"
                                    }`}
                                  >
                                    {msg.content}
                                  </div>
                                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                    </span>
                                    {isMine && (
                                      msg.read
                                        ? <CheckCheck className="h-3 w-3 text-blue-500" />
                                        : <Check className="h-3 w-3 text-muted-foreground" />
                                    )}
                                    {msg.encrypted && <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <form onSubmit={handleSend} className="p-3 border-t bg-muted/20">
                <div className="flex gap-2">
                  <Input
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder="Type a message..."
                    disabled={sendMutation.isPending}
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!messageText.trim() || sendMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">Encrypted Messaging</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Select a conversation or start a new one. All messages are encrypted for your privacy.
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {showContactFilter && (
        <div className="fixed inset-0 z-40" onClick={() => setShowContactFilter(false)} />
      )}
    </main>
  );
}
