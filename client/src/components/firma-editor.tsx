import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileSignature, Plus, Send, X, Eye, Loader2, Clock, CheckCircle, XCircle, RefreshCw, Upload } from "lucide-react";

declare global {
  interface Window {
    FirmaSigningRequestEditor: any;
  }
}

interface FirmaEditorProps {
  transactionId?: number;
}

function loadFirmaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FirmaSigningRequestEditor) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-firma-editor]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://api.firma.dev/functions/v1/embed-proxy/signing-request-editor.js";
    script.setAttribute("data-firma-editor", "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Firma editor"));
    document.head.appendChild(script);
  });
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
    case "sent":
      return <Badge className="bg-blue-600"><Send className="h-3 w-3 mr-1" />Sent</Badge>;
    case "completed":
    case "signed":
      return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Signed</Badge>;
    case "cancelled":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function FirmaEditor({ transactionId }: FirmaEditorProps) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [activeSigningRequestId, setActiveSigningRequestId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  const { data: status } = useQuery<{ configured: boolean }>({
    queryKey: ["/api/firma/status"],
  });

  const queryKey = transactionId
    ? ["/api/firma/signing-requests", { transactionId }]
    : ["/api/firma/signing-requests"];

  const { data: signingRequests, isLoading } = useQuery<any[]>({
    queryKey,
    queryFn: async () => {
      const url = transactionId
        ? `/api/firma/signing-requests?transactionId=${transactionId}`
        : "/api/firma/signing-requests";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!status?.configured,
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Please select a PDF file", variant: "destructive" });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: "File too large (max 25MB)", variant: "destructive" });
      return;
    }
    setDocumentFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      setDocumentBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/firma/signing-requests", {
        title: newTitle,
        message: newMessage,
        transactionId,
        document: documentBase64,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      setShowCreateDialog(false);
      setNewTitle("");
      setNewMessage("");
      setDocumentFile(null);
      setDocumentBase64("");
      toast({ title: "Signing request created" });
      const srId = data.id || data.signing_request_id || data.data?.id;
      if (srId) {
        openEditor(srId);
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to create signing request", description: error.message, variant: "destructive" });
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/firma/signing-requests/${id}/send`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Signing request sent" });
    },
    onError: () => {
      toast({ title: "Failed to send", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/firma/signing-requests/${id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Signing request cancelled" });
    },
    onError: () => {
      toast({ title: "Failed to cancel", variant: "destructive" });
    },
  });

  const openEditor = useCallback(async (signingRequestId: string) => {
    setActiveSigningRequestId(signingRequestId);
    setShowEditorDialog(true);
  }, []);

  useEffect(() => {
    if (!showEditorDialog || !activeSigningRequestId || !editorContainerRef.current) return;

    let destroyed = false;

    async function initEditor() {
      try {
        await loadFirmaScript();
        const res = await apiRequest("POST", `/api/firma/signing-requests/${activeSigningRequestId}/jwt`);
        const { token } = await res.json();

        if (destroyed || !editorContainerRef.current) return;

        editorRef.current = new window.FirmaSigningRequestEditor({
          container: editorContainerRef.current,
          jwt: token,
          signingRequestId: activeSigningRequestId,
          theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
          showCloseButton: true,
          onSave: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({ title: "Changes saved" });
          },
          onSend: () => {
            queryClient.invalidateQueries({ queryKey });
            toast({ title: "Signing request sent!" });
            setShowEditorDialog(false);
          },
          onClose: () => {
            setShowEditorDialog(false);
          },
          onError: (error: any) => {
            console.error("Firma editor error:", error);
            toast({ title: "Editor error", description: String(error), variant: "destructive" });
          },
          onLoad: () => {
            console.log("Firma editor loaded");
          },
        });
      } catch (err: any) {
        console.error("Failed to init Firma editor:", err);
        toast({ title: "Failed to load editor", description: err.message, variant: "destructive" });
      }
    }

    const timer = setTimeout(initEditor, 100);

    return () => {
      destroyed = true;
      clearTimeout(timer);
      if (editorRef.current?.destroy) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, [showEditorDialog, activeSigningRequestId, toast, queryKey]);

  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.data?.type === "editor.event") {
        const { event, payload } = ev.data;
        if (event === "signing_request.sent" && payload?.signing_request_id) {
          queryClient.invalidateQueries({ queryKey });
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [queryKey]);

  if (!status?.configured) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSignature className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">E-Signatures</h3>
          <Badge variant="outline" className="text-green-600 border-green-200">Firma</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Signing Request
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : signingRequests && signingRequests.length > 0 ? (
        <div className="space-y-2">
          {signingRequests.map((sr: any) => (
            <Card key={sr.id || sr.firma_signing_request_id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sr.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {sr.created_at ? new Date(sr.created_at).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={sr.status} />
                    {sr.status === "draft" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditor(sr.firma_signing_request_id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => sendMutation.mutate(sr.firma_signing_request_id)}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                      </>
                    )}
                    {sr.status === "sent" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditor(sr.firma_signing_request_id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => cancelMutation.mutate(sr.firma_signing_request_id)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </>
                    )}
                    {(sr.status === "completed" || sr.status === "signed") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditor(sr.firma_signing_request_id)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileSignature className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No signing requests yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create a signing request to send documents for e-signature
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Signing Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                placeholder="e.g. Purchase Agreement - 123 Main St"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">PDF Document</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {documentFile ? documentFile.name : "Choose PDF file..."}
              </Button>
              {documentFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(documentFile.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Message (optional)</label>
              <Textarea
                placeholder="Add a message for the signers..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setDocumentFile(null); setDocumentBase64(""); }}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle.trim() || !documentBase64 || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Create & Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditorDialog} onOpenChange={(open) => {
        if (!open) {
          if (editorRef.current?.triggerClose) {
            editorRef.current.triggerClose();
          } else {
            setShowEditorDialog(false);
          }
        }
      }}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
          <div ref={editorContainerRef} className="w-full h-full" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
