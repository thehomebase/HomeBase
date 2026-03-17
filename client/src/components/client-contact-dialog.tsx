import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPhoneDisplay } from "@/lib/format-phone";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, MessageSquare, Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Link2, Unlink, Phone, MapPin, Search, PhoneCall, Timer } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Client, Communication } from "@shared/schema";
import { format } from "date-fns";

interface ClientContactDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ClientContactDialog({ client, open, onOpenChange }: ClientContactDialogProps) {
  const { toast } = useToast();
  const [smsContent, setSmsContent] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [activeTab, setActiveTab] = useState("sms");
  const [areaCodeSearch, setAreaCodeSearch] = useState("");
  const [showNumberPicker, setShowNumberPicker] = useState(false);
  const [callMinutes, setCallMinutes] = useState("");
  const [callSeconds, setCallSeconds] = useState("");
  const [callOutcome, setCallOutcome] = useState<string>("connected");
  const [callNotes, setCallNotes] = useState("");

  const { data: commStatus } = useQuery<{ twilio: boolean; twilioPhone?: string; hasOwnNumber?: boolean; gmail: { connected: boolean; email?: string } }>({
    queryKey: ["/api/communications/status"],
    enabled: open,
  });

  const { data: history = [] } = useQuery<Communication[]>({
    queryKey: ["/api/communications", client?.id],
    queryFn: async () => {
      const res = await fetch(`/api/communications/${client!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch communications");
      return res.json();
    },
    enabled: open && !!client?.id,
  });

  const { data: gmailMessages } = useQuery<{ messages: any[] }>({
    queryKey: ["/api/gmail/messages", client?.id],
    queryFn: async () => {
      const res = await fetch(`/api/gmail/messages/${client!.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch Gmail messages");
      return res.json();
    },
    enabled: open && !!client?.id && !!commStatus?.gmail?.connected && activeTab === "history",
  });

  const { data: smsLimits } = useQuery<{ dailySent: number; dailyLimit: number; uniqueRecipients: number; uniqueRecipientsLimit: number }>({
    queryKey: ["/api/sms/limits"],
    enabled: open && activeTab === "sms",
  });

  const searchUrl = areaCodeSearch ? `/api/phone-number/search?areaCode=${areaCodeSearch}` : "/api/phone-number/search";
  const { data: availableNumbers, isLoading: isSearching } = useQuery<{ numbers: Array<{ phoneNumber: string; friendlyName: string; locality: string; region: string }> }>({
    queryKey: ["/api/phone-number/search", areaCodeSearch],
    queryFn: async () => {
      const res = await fetch(searchUrl, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to search");
      }
      return res.json();
    },
    enabled: showNumberPicker,
  });

  const smsMutation = useMutation({
    mutationFn: async (data: { clientId: number; content: string }) => {
      const res = await apiRequest("POST", "/api/communications/sms", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send SMS");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", client?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/sms/limits"] });
      setSmsContent("");
      toast({ title: "SMS Sent", description: `Text message sent to ${client?.firstName} ${client?.lastName}` });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Failed",
        description: error.message || "Failed to send SMS.",
        variant: "destructive",
      });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async (data: { clientId: number; subject: string; content: string }) => {
      const res = await apiRequest("POST", "/api/communications/email", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send email");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", client?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/messages", client?.id] });
      setEmailSubject("");
      setEmailContent("");
      toast({ title: "Email Sent", description: `Email sent to ${client?.firstName} ${client?.lastName}` });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email.",
        variant: "destructive",
      });
    },
  });

  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/gmail/auth-url");
      if (!res.ok) throw new Error("Failed to get auth URL");
      const data = await res.json();
      return data.url;
    },
    onSuccess: (url: string) => {
      window.location.href = url;
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to start Gmail connection.",
        variant: "destructive",
      });
    },
  });

  const disconnectGmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/gmail/disconnect");
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
      toast({ title: "Gmail Disconnected", description: "Your Gmail account has been unlinked." });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect Gmail.",
        variant: "destructive",
      });
    },
  });

  const purchaseNumberMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; areaCode?: string }) => {
      const res = await apiRequest("POST", "/api/phone-number/purchase", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to purchase number");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-number"] });
      setShowNumberPicker(false);
      toast({ title: "Phone Number Assigned", description: "Your dedicated SMS number is now active." });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to get phone number.",
        variant: "destructive",
      });
    },
  });

  const releaseNumberMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/phone-number/release");
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to release number");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/phone-number"] });
      toast({ title: "Phone Number Released", description: "Your dedicated number has been released." });
    },
    onError: (error: any) => {
      toast({
        title: "Release Failed",
        description: error.message || "Failed to release phone number.",
        variant: "destructive",
      });
    },
  });

  const callMutation = useMutation({
    mutationFn: async (data: { clientId: number; duration: number; outcome: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/communications/call", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log call");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications", client?.id] });
      setCallMinutes("");
      setCallSeconds("");
      setCallOutcome("connected");
      setCallNotes("");
      toast({ title: "Call Logged", description: `Phone call with ${client?.firstName} ${client?.lastName} has been recorded.` });
    },
    onError: (error: any) => {
      toast({
        title: "Log Failed",
        description: error.message || "Failed to log the call.",
        variant: "destructive",
      });
    },
  });

  const handleLogCall = () => {
    if (!client) return;
    const mins = parseInt(callMinutes) || 0;
    const secs = parseInt(callSeconds) || 0;
    const totalSeconds = mins * 60 + secs;
    callMutation.mutate({
      clientId: client.id,
      duration: totalSeconds,
      outcome: callOutcome,
      notes: callNotes.trim() || undefined,
    });
  };

  const handleSendSMS = () => {
    if (!client || !smsContent.trim()) return;
    const phone = client.mobilePhone || client.phone;
    if (!phone) {
      toast({ title: "No phone number", description: "This client has no phone number on file.", variant: "destructive" });
      return;
    }
    smsMutation.mutate({ clientId: client.id, content: smsContent.trim() });
  };

  const handleSendEmail = () => {
    if (!client || !emailSubject.trim() || !emailContent.trim()) return;
    if (!client.email) {
      toast({ title: "No email address", description: "This client has no email address on file.", variant: "destructive" });
      return;
    }
    emailMutation.mutate({ clientId: client.id, subject: emailSubject.trim(), content: emailContent.trim() });
  };

  const handleSearchNumbers = () => {
    setShowNumberPicker(true);
    queryClient.invalidateQueries({ queryKey: ["/api/phone-number/search"] });
  };

  if (!client) return null;

  const phone = client.mobilePhone || client.phone;
  const gmailConnected = commStatus?.gmail?.connected;
  const gmailEmail = commStatus?.gmail?.email;
  const hasOwnNumber = commStatus?.hasOwnNumber;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Contact {client.firstName} {client.lastName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="sms" className="flex-1 gap-1">
              <MessageSquare className="h-3 w-3" /> SMS
            </TabsTrigger>
            <TabsTrigger value="email" className="flex-1 gap-1">
              <Mail className="h-3 w-3" /> Email
            </TabsTrigger>
            <TabsTrigger value="call" className="flex-1 gap-1">
              <PhoneCall className="h-3 w-3" /> Log Call
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-1">
              <Clock className="h-3 w-3" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-4 mt-4">
            {showNumberPicker ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={areaCodeSearch}
                      onChange={(e) => setAreaCodeSearch(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      placeholder="Area code (e.g. 817)"
                      className="text-sm"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/phone-number/search"] })}
                    disabled={isSearching}
                  >
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNumberPicker(false)}>
                    Cancel
                  </Button>
                </div>

                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Searching available numbers...</span>
                  </div>
                ) : availableNumbers?.numbers?.length ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <p className="text-xs text-muted-foreground">Select a number to assign to your account:</p>
                    {availableNumbers.numbers.map((num) => (
                      <button
                        key={num.phoneNumber}
                        onClick={() => purchaseNumberMutation.mutate({
                          phoneNumber: num.phoneNumber,
                          areaCode: areaCodeSearch || undefined,
                        })}
                        disabled={purchaseNumberMutation.isPending}
                        className="w-full flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors text-left disabled:opacity-50"
                      >
                        <div>
                          <p className="font-mono font-medium text-sm">{num.friendlyName || num.phoneNumber}</p>
                          {(num.locality || num.region) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {[num.locality, num.region].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>
                        {purchaseNumberMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="text-xs text-blue-600 font-medium">Select</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Phone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No numbers found{areaCodeSearch ? ` for area code ${areaCodeSearch}` : ''}. Try a different area code.</p>
                  </div>
                )}
              </div>
            ) : !commStatus?.twilio ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  SMS is not currently available. Please contact your platform administrator.
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span>Sending from {commStatus?.twilioPhone}</span>
                  </div>
                  {hasOwnNumber && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to release your phone number? This cannot be undone.")) {
                          releaseNumberMutation.mutate();
                        }
                      }}
                      disabled={releaseNumberMutation.isPending}
                      className="text-xs text-muted-foreground h-7"
                    >
                      <Unlink className="h-3 w-3 mr-1" /> Release
                    </Button>
                  )}
                </div>

                {!hasOwnNumber && (
                  <Button onClick={handleSearchNumbers} variant="outline" size="sm" className="w-full">
                    <Phone className="h-3 w-3 mr-2" /> Get Your Own Dedicated Number
                  </Button>
                )}

                <div className="space-y-2">
                  <Label>To</Label>
                  <Input value={formatPhoneDisplay(phone) || "No phone number"} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={smsContent}
                    onChange={(e) => setSmsContent(e.target.value)}
                    placeholder="Type your text message..."
                    rows={4}
                    maxLength={1600}
                  />
                  <p className="text-xs text-muted-foreground text-right">{smsContent.length}/1600</p>
                </div>

                {smsLimits && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>{smsLimits.dailySent}/{smsLimits.dailyLimit} messages today</span>
                    <span>{smsLimits.uniqueRecipients}/{smsLimits.uniqueRecipientsLimit} contacts today</span>
                  </div>
                )}

                <Button
                  onClick={handleSendSMS}
                  disabled={!smsContent.trim() || !phone || smsMutation.isPending}
                  className="w-full"
                >
                  {smsMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><MessageSquare className="h-4 w-4 mr-2" /> Send SMS</>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            {!gmailConnected ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Mail className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Connect your Gmail</p>
                    <p className="text-blue-600 dark:text-blue-400 mt-1">
                      Link your Google account to send and receive emails directly from this platform.
                      Emails will be sent from your personal Gmail address.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => connectGmailMutation.mutate()}
                  disabled={connectGmailMutation.isPending}
                  className="w-full"
                  variant="outline"
                >
                  {connectGmailMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
                  ) : (
                    <><Link2 className="h-4 w-4 mr-2" /> Connect Gmail Account</>
                  )}
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-green-800 dark:text-green-200">
                      Connected as <strong>{gmailEmail}</strong>
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectGmailMutation.mutate()}
                    disabled={disconnectGmailMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                  >
                    <Unlink className="h-3 w-3 mr-1" /> Disconnect
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>To</Label>
                  <Input value={client.email || "No email address"} disabled className="bg-muted" />
                </div>

                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Email subject..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    placeholder="Type your email message..."
                    rows={6}
                  />
                </div>

                <Button
                  onClick={handleSendEmail}
                  disabled={!emailSubject.trim() || !emailContent.trim() || !client.email || emailMutation.isPending}
                  className="w-full"
                >
                  {emailMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" /> Send Email</>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="call" className="space-y-4 mt-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <PhoneCall className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Log a phone call you just had with {client.firstName}. Record the outcome, duration, and any notes.
              </div>
            </div>

            <div className="space-y-2">
              <Label>Contact</Label>
              <Input value={`${client.firstName} ${client.lastName}${phone ? ` — ${formatPhoneDisplay(phone)}` : ""}`} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label>Call Outcome</Label>
              <Select value={callOutcome} onValueChange={setCallOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="connected">Connected</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="voicemail">Left Voicemail</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="wrong_number">Wrong Number</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Call Duration</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="999"
                      value={callMinutes}
                      onChange={(e) => setCallMinutes(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      placeholder="0"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">min</span>
                  </div>
                </div>
                <span className="text-muted-foreground font-medium">:</span>
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={callSeconds}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                        if (parseInt(val) > 59) return;
                        setCallSeconds(val);
                      }}
                      placeholder="0"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">sec</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Key topics discussed, follow-up items, etc."
                rows={3}
              />
            </div>

            <Button
              onClick={handleLogCall}
              disabled={callMutation.isPending || ((parseInt(callMinutes) || 0) === 0 && (parseInt(callSeconds) || 0) === 0 && !callNotes.trim())}
              className="w-full"
            >
              {callMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><PhoneCall className="h-4 w-4 mr-2" /> Log Call</>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {(() => {
              const items: Array<{
                id: string;
                type: "email" | "sms" | "call";
                direction: "sent" | "received" | "failed";
                subject?: string;
                preview?: string;
                date: Date;
              }> = [];

              (gmailMessages?.messages || []).forEach((msg: any) => {
                const isFromAgent = msg.from?.includes(gmailEmail || "");
                items.push({
                  id: `gmail-${msg.id}`,
                  type: "email",
                  direction: isFromAgent ? "sent" : "received",
                  subject: msg.subject || undefined,
                  preview: msg.snippet || undefined,
                  date: msg.date ? new Date(msg.date) : new Date(),
                });
              });

              history.forEach((comm) => {
                const isDuplicate = comm.type === "email" && comm.externalId &&
                  items.some((item) => item.id === `gmail-${comm.externalId}`);
                if (isDuplicate) return;

                items.push({
                  id: `platform-${comm.id}`,
                  type: comm.type as "email" | "sms" | "call",
                  direction: comm.status === "sent" ? "sent" : "failed",
                  subject: comm.subject || undefined,
                  preview: comm.content || undefined,
                  date: comm.createdAt ? new Date(comm.createdAt) : new Date(),
                });
              });

              items.sort((a, b) => b.date.getTime() - a.date.getTime());

              if (items.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No communication history yet</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2 max-h-[400px] overflow-y-auto overflow-x-hidden">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg overflow-hidden">
                      <div className="mt-0.5 shrink-0">
                        {item.type === "sms" ? (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        ) : item.type === "call" ? (
                          <PhoneCall className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Mail className={`h-4 w-4 ${item.direction === "received" ? "text-purple-600" : "text-blue-600"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="outline" className="text-xs shrink-0">
                            {item.type === "sms" ? "SMS" : item.type === "call" ? "CALL" : "EMAIL"}
                          </Badge>
                          {item.direction === "failed" ? (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              <XCircle className="h-3 w-3 mr-1" /> Failed
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {item.type === "call" ? "Logged" : item.direction === "sent" ? "Sent" : "Received"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            {format(item.date, "MMM d, h:mm a")}
                          </span>
                        </div>
                        {item.subject && (
                          <p className="text-sm font-medium truncate break-words">{item.subject}</p>
                        )}
                        {item.preview && (
                          <p className="text-sm text-muted-foreground line-clamp-2 break-words">{item.preview}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
