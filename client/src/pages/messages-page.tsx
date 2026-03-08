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
import { Lock, Send, Plus, Search, ArrowLeft, ShieldCheck, MessageSquare, Circle } from "lucide-react";

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

export default function MessagesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100%-48px)]">
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
                  <div className="font-medium text-sm">
                    {activeUser?.name || chatMessages[0]?.recipientName || chatMessages[0]?.senderName || "Chat"}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3 w-3 text-green-600" />
                    <span className="text-[11px] text-green-600 font-medium">Encrypted</span>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                {msgsLoading ? (
                  <div className="text-center text-sm text-muted-foreground py-8">Loading messages...</div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <Lock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Messages are encrypted for your privacy</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-center mb-4">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                        <Lock className="h-3 w-3 text-amber-600" />
                        <span className="text-[11px] text-amber-700">Messages are encrypted and stored securely</span>
                      </div>
                    </div>
                    {chatMessages.map(msg => {
                      const isMine = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] ${isMine ? "order-2" : ""}`}>
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
                              {msg.encrypted && <Lock className="h-2.5 w-2.5 text-muted-foreground/50" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
    </main>
  );
}
