import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
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

  const { data: commStatus } = useQuery<{ twilio: boolean; sendgrid: boolean }>({
    queryKey: ["/api/communications/status"],
    enabled: open,
  });

  const { data: history = [] } = useQuery<Communication[]>({
    queryKey: ["/api/communications", client?.id],
    enabled: open && !!client?.id,
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
      setEmailSubject("");
      setEmailContent("");
      toast({ title: "Email Sent", description: `Email sent to ${client?.firstName} ${client?.lastName}` });
    },
    onError: (error: any) => {
      toast({
        title: "Email Failed",
        description: error.message || "Failed to send email. Make sure SendGrid is configured.",
        variant: "destructive",
      });
    },
  });

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
            {!commStatus?.twilio && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Twilio not connected</p>
                  <p className="text-amber-600 dark:text-amber-400 mt-1">
                    SMS messaging requires Twilio integration. Connect your Twilio account to send text messages.
                  </p>
                </div>
              </div>
            )}

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
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            {!commStatus?.sendgrid && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">SendGrid not connected</p>
                  <p className="text-amber-600 dark:text-amber-400 mt-1">
                    Email messaging requires SendGrid integration. Connect your SendGrid account to send emails.
                  </p>
                </div>
              </div>
            )}

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
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No communication history yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
