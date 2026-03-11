import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Webhook,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";
import type { ApiKey, Webhook as WebhookType } from "@shared/schema";

const WEBHOOK_EVENTS = [
  { value: "new_lead", label: "New Lead" },
  { value: "lead_updated", label: "Lead Updated" },
  { value: "transaction_created", label: "Transaction Created" },
  { value: "transaction_updated", label: "Transaction Updated" },
  { value: "transaction_closed", label: "Transaction Closed" },
  { value: "client_created", label: "Client Created" },
  { value: "client_updated", label: "Client Updated" },
  { value: "document_uploaded", label: "Document Uploaded" },
  { value: "message_received", label: "Message Received" },
] as const;

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvent, setWebhookEvent] = useState("");

  const { data: apiKeys, isLoading: keysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
  });

  const { data: webhooks, isLoading: webhooksLoading } = useQuery<WebhookType[]>({
    queryKey: ["/api/webhooks"],
  });

  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/api-keys", { name });
      return await res.json();
    },
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setShowKeyDialog(true);
      setNewKeyName("");
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API Key Created", description: "Your new API key has been generated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({ title: "API Key Revoked", description: "The API key has been revoked." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (data: { url: string; event: string }) => {
      const res = await apiRequest("POST", "/api/webhooks", data);
      return await res.json();
    },
    onSuccess: () => {
      setWebhookUrl("");
      setWebhookEvent("");
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook Registered", description: "Your webhook has been registered." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/webhooks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook Removed", description: "The webhook has been removed." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getEventLabel = (event: string) => {
    return WEBHOOK_EVENTS.find((e) => e.value === event)?.label ?? event;
  };

  return (
    <div className={`px-4 sm:px-8 ${isMobile ? "pt-4 pb-24" : "py-6"}`}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Key className="h-8 w-8 text-primary" />
          API Keys & Webhooks
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your API keys for external integrations and configure webhooks to receive real-time event notifications.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Generate API keys to authenticate requests to the HomeBase API.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`flex ${isMobile ? "flex-col" : ""} gap-3 mb-6`}>
              <Input
                placeholder="Key name (e.g., Zapier Integration)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={() => createKeyMutation.mutate(newKeyName)}
                disabled={!newKeyName.trim() || createKeyMutation.isPending}
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {createKeyMutation.isPending ? "Generating..." : "Generate Key"}
              </Button>
            </div>

            {keysLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !apiKeys?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No API keys yet. Generate one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{key.name}</span>
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive ? "Active" : "Revoked"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">
                          {key.prefix}...
                        </code>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDate(key.createdAt)}
                        </span>
                        {key.lastUsedAt && (
                          <span>Last used {formatDate(key.lastUsedAt)}</span>
                        )}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                          disabled={!key.isActive}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke "{key.name}"? Any integrations using this key will stop working immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteKeyMutation.mutate(key.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Register webhook URLs to receive real-time notifications when events occur.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`flex ${isMobile ? "flex-col" : ""} gap-3 mb-6`}>
              <Input
                placeholder="https://your-app.com/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="flex-1"
              />
              <Select value={webhookEvent} onValueChange={setWebhookEvent}>
                <SelectTrigger className={isMobile ? "w-full" : "w-[220px]"}>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {WEBHOOK_EVENTS.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() =>
                  createWebhookMutation.mutate({ url: webhookUrl, event: webhookEvent })
                }
                disabled={
                  !webhookUrl.trim() || !webhookEvent || createWebhookMutation.isPending
                }
                className="gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                {createWebhookMutation.isPending ? "Registering..." : "Add Webhook"}
              </Button>
            </div>

            {webhooksLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !webhooks?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Webhook className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No webhooks registered yet. Add one to start receiving events.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline">{getEventLabel(webhook.event)}</Badge>
                        <Badge variant={webhook.isActive ? "default" : "secondary"}>
                          {webhook.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {webhook.url}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Created {formatDate(webhook.createdAt)}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Webhook</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this webhook? You will stop receiving
                            notifications for "{getEventLabel(webhook.event)}" events at this URL.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteWebhookMutation.mutate(webhook.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Webhook
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Security Notice</h3>
                <p className="text-sm text-muted-foreground">
                  API keys grant access to your account data. Keep them secret and never expose them
                  in client-side code or public repositories. Webhook secrets are used to verify
                  that incoming requests are from HomeBase — validate the HMAC signature on every
                  request.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showKeyDialog} onOpenChange={(open) => {
        if (!open) {
          setShowKeyDialog(false);
          setCreatedKey(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              API Key Created
            </DialogTitle>
            <DialogDescription>
              Copy your API key now. You won't be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all select-all">
                {createdKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => createdKey && copyToClipboard(createdKey)}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This is the only time you'll see this key. Store it securely.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
