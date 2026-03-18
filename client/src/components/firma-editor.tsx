import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
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

const FirmaMobileEditor = lazy(() => import("./firma-mobile-editor"));

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

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
  const isMobile = useIsMobile();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [activeSigningRequestId, setActiveSigningRequestId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);
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

  const queryKey = useMemo(() => transactionId
    ? ["/api/firma/signing-requests", { transactionId }]
    : ["/api/firma/signing-requests"], [transactionId]);

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
    setEditorKey(k => k + 1);
    if (isMobile) {
      setShowMobileEditor(true);
    } else {
      setShowEditorDialog(true);
    }
  }, [isMobile]);

  const [editorLoading, setEditorLoading] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const queryKeyRef = useRef(queryKey);
  queryKeyRef.current = queryKey;
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const activeFirmaJwtRef = useRef<string | null>(null);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const FIRMA_HOSTS = ["ielmshcswdhuacyjlpiy.supabase.co", "api.firma.dev"];

    window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = (init?.method || "GET").toUpperCase();
      const isFirmaHost = FIRMA_HOSTS.some(h => url.includes(h));

      if (isFirmaHost && activeFirmaJwtRef.current) {
        if (method === "POST") {
          try {
            let body = {};
            if (init?.body) {
              try { body = JSON.parse(init.body as string); } catch { body = {}; }
            }
            const proxyRes = await originalFetch("/api/firma/proxy/supabase", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                targetUrl: url,
                jwt: activeFirmaJwtRef.current,
                payload: body,
              }),
            });
            return proxyRes;
          } catch (err) {
            console.error("Firma proxy fetch failed, falling back to direct:", err);
            return originalFetch(input, init);
          }
        }

        if (method === "GET") {
          try {
            const proxyRes = await originalFetch("/api/firma/proxy/storage?" + new URLSearchParams({ url, jwt: activeFirmaJwtRef.current }), {
              credentials: "include",
            });
            return proxyRes;
          } catch (err) {
            console.error("Firma storage proxy failed, falling back to direct:", err);
            return originalFetch(input, init);
          }
        }
      }

      return originalFetch(input, init);
    } as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (!showEditorDialog || !activeSigningRequestId) return;

    let destroyed = false;
    setEditorLoading(true);
    setEditorError(null);

    async function initEditor() {
      try {
        await loadFirmaScript();
        const res = await apiRequest("POST", `/api/firma/signing-requests/${activeSigningRequestId}/jwt`);
        const { token } = await res.json();

        if (destroyed) return;

        if (!token) {
          throw new Error("No JWT token received from server");
        }

        activeFirmaJwtRef.current = token;

        const container = editorContainerRef.current;
        if (!container) return;

        container.innerHTML = "";

        const freshDiv = document.createElement("div");
        freshDiv.style.width = "100%";
        freshDiv.style.height = "100%";
        container.appendChild(freshDiv);

        editorRef.current = new window.FirmaSigningRequestEditor({
          container: freshDiv,
          jwt: token,
          signingRequestId: activeSigningRequestId,
          theme: "light",
          onSave: () => {
            queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
            toastRef.current({ title: "Changes saved" });
          },
          onSend: async () => {
            try {
              await apiRequest("POST", `/api/firma/signing-requests/${activeSigningRequestId}/mark-sent`);
            } catch (err: any) {
              console.error("Failed to update signing request status:", err);
            }
            queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
            toastRef.current({ title: "Signing request sent!" });
            setShowEditorDialog(false);
          },
          onClose: () => {
            setShowEditorDialog(false);
          },
          onError: (error: any) => {
            if (error && typeof error === "object" && !error.message && Object.keys(error).length === 0) {
              return;
            }
            console.error("Firma editor error:", error);
            if (!destroyed) {
              const msg = error?.message || (typeof error === "string" ? error : "");
              if (msg) {
                setEditorError(msg);
                setEditorLoading(false);
              }
            }
          },
          onLoad: () => {
            if (!destroyed) {
              setEditorLoading(false);
              const injectMobileStyles = () => {
                const shadowRoot = freshDiv.querySelector("*")?.shadowRoot || freshDiv.shadowRoot;
                if (shadowRoot) {
                  const fixStyle = document.createElement("style");
                  fixStyle.textContent = `
                    :host, *, *::before, *::after {
                      color-scheme: light !important;
                    }
                    label, h1, h2, h3, h4, h5, h6, p, span, div {
                      color: inherit;
                    }
                    @media (max-width: 768px) {
                      :host {
                        touch-action: pan-x pan-y !important;
                        overflow: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                      }
                    }
                  `;
                  shadowRoot.appendChild(fixStyle);
                }
              };
              setTimeout(injectMobileStyles, 500);
              setTimeout(injectMobileStyles, 2000);
            }
          },
        });
      } catch (err: any) {
        console.error("Failed to init Firma editor:", err);
        if (!destroyed) {
          setEditorError(err.message);
          setEditorLoading(false);
        }
      }
    }

    const timer = setTimeout(initEditor, 200);

    return () => {
      destroyed = true;
      clearTimeout(timer);
      activeFirmaJwtRef.current = null;
      if (editorRef.current?.destroy) {
        try { editorRef.current.destroy(); } catch (_e) {}
        editorRef.current = null;
      }
      if (editorContainerRef.current) {
        editorContainerRef.current.innerHTML = "";
      }
    };
  }, [showEditorDialog, activeSigningRequestId, editorKey]);

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
        <DialogContent className="max-w-[100vw] md:max-w-[95vw] w-[100vw] md:w-full h-[100dvh] md:h-[90vh] p-0 bg-white text-black rounded-none md:rounded-lg border-0 md:border translate-x-[-50%] translate-y-[-50%]" style={{ colorScheme: "light", maxHeight: "100dvh" }} data-theme="light">
          {editorLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <p className="text-sm text-gray-500">Loading signature editor...</p>
              </div>
            </div>
          )}
          {editorError && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="flex flex-col items-center gap-3 max-w-md text-center">
                <XCircle className="h-10 w-10 text-destructive" />
                <p className="font-semibold">Failed to load editor</p>
                <p className="text-sm text-muted-foreground">{editorError}</p>
                <Button size="sm" variant="outline" onClick={() => {
                  setEditorError(null);
                  setEditorKey(k => k + 1);
                }}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Try Again
                </Button>
              </div>
            </div>
          )}
          <div ref={editorContainerRef} className="w-full h-full overflow-auto touch-pan-x touch-pan-y" style={{ colorScheme: "light", backgroundColor: "white", WebkitOverflowScrolling: "touch" }} />
        </DialogContent>
      </Dialog>

      {showMobileEditor && activeSigningRequestId && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-white flex items-center justify-center" style={{ colorScheme: "light" }}>
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        }>
          <FirmaMobileEditor
            signingRequestId={activeSigningRequestId}
            onClose={() => {
              setShowMobileEditor(false);
              setActiveSigningRequestId(null);
            }}
            onSent={() => {
              setShowMobileEditor(false);
              setActiveSigningRequestId(null);
              queryClient.invalidateQueries({ queryKey: queryKeyRef.current });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
