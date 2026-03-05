import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Loader2, CheckCircle, XCircle, Clock, AlertTriangle, Link2, Unlink, ShieldAlert, Phone } from "lucide-react";
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
  const [twilioAccountSid, setTwilioAccountSid] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState("");
  const [showTwilioSetup, setShowTwilioSetup] = useState(false);

  const { data: commStatus } = useQuery<{ twilio: boolean; twilioPhone?: string; gmail: { connected: boolean; email?: string } }>({
    queryKey: ["/api/communications/status"],
    enabled: open,
  });

  const { data: history = [] } = useQuery<Communication[]>({
    queryKey: ["/api/communications", client?.id],
    enabled: open && !!client?.id,
  });

  const { data: gmailMessages } = useQuery<{ messages: any[] }>({
    queryKey: ["/api/gmail/messages", client?.id],
    enabled: open && !!client?.id && !!commStatus?.gmail?.connected && activeTab === "history",
  });

  const { data: smsLimits } = useQuery<{ dailySent: number; dailyLimit: number; uniqueRecipients: number; uniqueRecipientsLimit: number }>({
    queryKey: ["/api/sms/limits"],
    enabled: open && activeTab === "sms",
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
        description: error.message || "Failed to send SMS. Make sure Twilio is configured.",
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

  const connectTwilioMutation = useMutation({
    mutationFn: async (data: { accountSid: string; authToken: string; phoneNumber: string }) => {
      const res = await apiRequest("POST", "/api/twilio/connect", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to connect Twilio");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
      setTwilioAccountSid("");
      setTwilioAuthToken("");
      setTwilioPhoneNumber("");
      setShowTwilioSetup(false);
      toast({ title: "Twilio Connected", description: "Your Twilio account has been linked. You can now send SMS." });
    },
    onError: (error: any) => {
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect Twilio account.",
        variant: "destructive",
      });
    },
  });

  const disconnectTwilioMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/twilio/disconnect");
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/status"] });
      toast({ title: "Twilio Disconnected", description: "Your Twilio account has been unlinked." });
    },
    onError: (error: any) => {
      toast({
        title: "Disconnect Failed",
        description: error.message || "Failed to disconnect Twilio.",
        variant: "destructive",
      });
    },
  });

  const handleConnectTwilio = () => {
    if (!twilioAccountSid.trim() || !twilioAuthToken.trim() || !twilioPhoneNumber.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all Twilio fields.", variant: "destructive" });
      return;
    }
    connectTwilioMutation.mutate({
      accountSid: twilioAccountSid.trim(),
      authToken: twilioAuthToken.trim(),
      phoneNumber: twilioPhoneNumber.trim(),
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

  if (!client) return null;

  const phone = client.mobilePhone || client.phone;
  const gmailConnected = commStatus?.gmail?.connected;
  const gmailEmail = commStatus?.gmail?.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
            <TabsTrigger value="history" className="flex-1 gap-1">
              <Clock className="h-3 w-3" /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sms" className="space-y-4 mt-4">
            {!commStatus?.twilio ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <Phone className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Connect your Twilio account</p>
                    <p className="text-blue-600 dark:text-blue-400 mt-1">
                      Link your own Twilio account to send SMS to clients. Messages will be sent from your phone number.
                    </p>
                  </div>
                </div>

                {!showTwilioSetup ? (
                  <Button onClick={() => setShowTwilioSetup(true)} className="w-full" variant="outline">
                    <Link2 className="h-4 w-4 mr-2" /> Connect Twilio Account
                  </Button>
                ) : (
                  <div className="space-y-3 border rounded-lg p-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Account SID</Label>
                      <Input
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Auth Token</Label>
                      <Input
                        type="password"
                        value={twilioAuthToken}
                        onChange={(e) => setTwilioAuthToken(e.target.value)}
                        placeholder="Your auth token"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone Number</Label>
                      <Input
                        value={twilioPhoneNumber}
                        onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                        placeholder="(817) 518-3845"
                        className="text-sm"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Find these in your <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Twilio Console</a> dashboard.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleConnectTwilio} disabled={connectTwilioMutation.isPending} className="flex-1">
                        {connectTwilioMutation.isPending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
                        ) : (
                          "Connect"
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => setShowTwilioSetup(false)} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4" />
                    <span>Sending from {commStatus.twilioPhone}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnectTwilioMutation.mutate()}
                    disabled={disconnectTwilioMutation.isPending}
                    className="text-xs text-muted-foreground h-7"
                  >
                    <Unlink className="h-3 w-3 mr-1" /> Disconnect
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>To</Label>
                  <Input value={phone || "No phone number"} disabled className="bg-muted" />
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

          <TabsContent value="history" className="mt-4">
            {gmailConnected && gmailMessages?.messages && gmailMessages.messages.length > 0 && (
              <div className="space-y-3 mb-4">
                <h4 className="text-sm font-medium text-muted-foreground">Gmail Conversations</h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {gmailMessages.messages.map((msg: any) => {
                    const isFromAgent = msg.from?.includes(gmailEmail || "");
                    return (
                      <div key={msg.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="mt-0.5">
                          <Mail className={`h-4 w-4 ${isFromAgent ? "text-blue-600" : "text-purple-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {isFromAgent ? "SENT" : "RECEIVED"}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {msg.date ? format(new Date(msg.date), "MMM d, h:mm a") : ""}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-sm font-medium truncate">{msg.subject}</p>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-2">{msg.snippet}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h4 className="text-sm font-medium text-muted-foreground mb-3">Platform Activity</h4>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No communication history yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {history.map((comm) => (
                  <div key={comm.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-0.5">
                      {comm.type === "sms" ? (
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Mail className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {comm.type.toUpperCase()}
                        </Badge>
                        <Badge
                          variant={comm.status === "sent" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {comm.status === "sent" ? (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Sent</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                          )}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {comm.createdAt ? format(new Date(comm.createdAt), "MMM d, h:mm a") : ""}
                        </span>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium truncate">{comm.subject}</p>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2">{comm.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
