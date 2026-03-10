import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Phone, MessageSquare, Send, Clock, PhoneCall, PhoneOff, Voicemail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { Client } from "@shared/schema";

export default function PhonePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [callClientId, setCallClientId] = useState<string>("");
  const [callDuration, setCallDuration] = useState("");
  const [callOutcome, setCallOutcome] = useState("connected");
  const [callNotes, setCallNotes] = useState("");

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  const { data: twilioStatus } = useQuery<{ twilio: boolean; twilioPhone?: string; hasOwnNumber: boolean }>({
    queryKey: ["/api/communications/status"],
    enabled: !!user,
  });

  const { data: smsLimits } = useQuery<{ dailyUsed: number; dailyLimit: number; uniqueContacts: number; uniqueLimit: number }>({
    queryKey: ["/api/sms/limits"],
    enabled: !!user,
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { clientId: number; message: string }) => {
      const res = await apiRequest("POST", "/api/communications/sms", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SMS sent successfully" });
      setSmsMessage("");
      setSmsPhone("");
      setSelectedClientId("");
      queryClient.invalidateQueries({ queryKey: ["/api/sms/limits"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send SMS", description: error.message, variant: "destructive" });
    },
  });

  const logCallMutation = useMutation({
    mutationFn: async (data: { clientId: number; duration: number; outcome: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/communications/call", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Call logged successfully" });
      setCallClientId("");
      setCallDuration("");
      setCallOutcome("connected");
      setCallNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to log call", description: error.message, variant: "destructive" });
    },
  });

  const handleSendSms = () => {
    if (!selectedClientId || !smsMessage.trim()) return;
    sendSmsMutation.mutate({ clientId: parseInt(selectedClientId), message: smsMessage.trim() });
  };

  const handleLogCall = () => {
    if (!callClientId || !callDuration) return;
    const durationSeconds = parseInt(callDuration) * 60;
    logCallMutation.mutate({
      clientId: parseInt(callClientId),
      duration: durationSeconds,
      outcome: callOutcome,
      notes: callNotes.trim() || undefined,
    });
  };

  const selectedClient = clients.find(c => c.id.toString() === selectedClientId);
  const callClient = clients.find(c => c.id.toString() === callClientId);

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Phone className="h-6 w-6" />
          Phone & SMS
        </h1>
        <p className="text-muted-foreground mt-1">Send text messages and log phone calls with clients</p>
      </div>

      {twilioStatus && !twilioStatus.twilio && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <CardContent className="pt-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Twilio is not configured. Contact your administrator to set up SMS capabilities.
            </p>
          </CardContent>
        </Card>
      )}

      {smsLimits && (
        <div className="flex gap-4 flex-wrap">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            {smsLimits.dailyUsed} / {smsLimits.dailyLimit} SMS today
          </Badge>
          <Badge variant="outline" className="text-sm py-1 px-3">
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            {smsLimits.uniqueContacts} / {smsLimits.uniqueLimit} unique contacts
          </Badge>
          {twilioStatus?.twilioPhone && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              From: {twilioStatus.twilioPhone}
            </Badge>
          )}
        </div>
      )}

      <Tabs defaultValue="sms" className="w-full">
        <TabsList>
          <TabsTrigger value="sms" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            Send SMS
          </TabsTrigger>
          <TabsTrigger value="call" className="gap-1.5">
            <PhoneCall className="h-4 w-4" />
            Log Call
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Send Text Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select value={selectedClientId} onValueChange={(val) => {
                  setSelectedClientId(val);
                  const client = clients.find(c => c.id.toString() === val);
                  if (client?.phone) setSmsPhone(client.phone);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.phone).map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.firstName} {client.lastName} — {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedClient && (
                <div className="text-sm text-muted-foreground">
                  Sending to: {selectedClient.firstName} {selectedClient.lastName} at {selectedClient.phone}
                </div>
              )}
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  placeholder="Type your message..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={4}
                  maxLength={1600}
                />
                <p className="text-xs text-muted-foreground text-right">{smsMessage.length} / 1600</p>
              </div>
              <Button
                onClick={handleSendSms}
                disabled={!selectedClientId || !smsMessage.trim() || sendSmsMutation.isPending}
                className="w-full sm:w-auto"
              >
                {sendSmsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send SMS
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="call" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Log a Phone Call</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Client</Label>
                <Select value={callClientId} onValueChange={setCallClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 15"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Outcome</Label>
                  <Select value={callOutcome} onValueChange={setCallOutcome}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="connected">
                        <span className="flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Connected</span>
                      </SelectItem>
                      <SelectItem value="voicemail">
                        <span className="flex items-center gap-1.5"><Voicemail className="h-3.5 w-3.5" /> Voicemail</span>
                      </SelectItem>
                      <SelectItem value="no_answer">
                        <span className="flex items-center gap-1.5"><PhoneOff className="h-3.5 w-3.5" /> No Answer</span>
                      </SelectItem>
                      <SelectItem value="busy">
                        <span className="flex items-center gap-1.5"><PhoneOff className="h-3.5 w-3.5" /> Busy</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="What was discussed..."
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <Button
                onClick={handleLogCall}
                disabled={!callClientId || !callDuration || logCallMutation.isPending}
                className="w-full sm:w-auto"
              >
                {logCallMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-2" />
                )}
                Log Call
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
