import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, FileText, ExternalLink, Link2, Upload, Send, Loader2, PenLine, RefreshCw, Trash2, CloudUpload, Folder, ArrowLeft, Search, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

const statusColumns = [
  { key: 'not_applicable', label: 'Not Applicable', color: 'gray' },
  { key: 'waiting_signatures', label: 'Waiting Signatures', color: 'orange' },
  { key: 'signed', label: 'Signed', color: 'blue' },
  { key: 'waiting_others', label: 'Waiting Others', color: 'yellow' },
  { key: 'complete', label: 'Complete', color: 'green' }
] as const;

const signingPlatforms = [
  { key: 'signnow', label: 'SignNow' },
  { key: 'docusign', label: 'DocuSign' },
  { key: 'zipforms', label: 'zipForms' },
  { key: 'dotloop', label: 'Dotloop' },
  { key: 'other', label: 'Other' },
] as const;

const defaultDocuments = [
  { id: "iabs", name: "IABS", status: "not_applicable", notes: "" },
  { id: "buyer_rep", name: "Buyer Rep Agreement", status: "not_applicable", notes: "" },
  { id: "listing_agreement", name: "Listing Agreement", status: "not_applicable", notes: "" },
  { id: "seller_disclosure", name: "Seller's Disclosure", status: "not_applicable", notes: "" },
  { id: "property_survey", name: "Property Survey", status: "not_applicable", notes: "" },
  { id: "lead_paint", name: "Lead-Based Paint Disclosure", status: "not_applicable", notes: "" },
  { id: "purchase_agreement", name: "Purchase Agreement", status: "not_applicable", notes: "" },
  { id: "hoa_addendum", name: "HOA Addendum", status: "not_applicable", notes: "" },
  { id: "inspection", name: "Home Inspection Report", status: "not_applicable", notes: "" }
] as const;

interface Document {
  id: string;
  name: string;
  status: typeof statusColumns[number]['key'];
  transactionId: number;
  notes?: string;
  signingUrl?: string | null;
  signingPlatform?: string | null;
  docusignEnvelopeId?: string | null;
}

function getStatusColor(status: Document['status']) {
  return {
    'not_applicable': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    'waiting_signatures': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'signed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'waiting_others': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'complete': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }[status] || 'bg-gray-100 text-gray-700';
}

function getPlatformLabel(platform: string | null | undefined): string {
  if (!platform) return '';
  const found = signingPlatforms.find(p => p.key === platform);
  return found ? found.label : 'Signing Link';
}

function SignNowActions({ documentName, onSigningUrlSet }: { documentName: string; onSigningUrlSet: (url: string) => void }) {
  const { toast } = useToast();
  const [signerEmail, setSignerEmail] = useState('');
  const [uploadedDocId, setUploadedDocId] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  const { data: snStatus } = useQuery<{ configured: boolean; connected: boolean }>({
    queryKey: ["/api/signnow/status"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/signnow/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setUploadedDocId(data.id);
      toast({ title: "Document uploaded to SignNow" });
    },
    onError: (err: any) => toast({ title: err.message || "Upload failed", variant: "destructive" }),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/signnow/invite", {
        documentId: uploadedDocId,
        signerEmail,
        consentAcknowledged: true,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `Signing invite sent to ${signerEmail}` });
      if (data.signingUrl) onSigningUrlSet(data.signingUrl);
    },
    onError: (err: any) => toast({ title: err.message || "Failed to send invite", variant: "destructive" }),
  });

  if (!snStatus?.connected) {
    return (
      <div className="p-2 rounded border border-dashed border-muted-foreground/30 text-center">
        <p className="text-xs text-muted-foreground">Connect SignNow in Settings to upload & send for signing</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 rounded border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <p className="text-xs font-medium text-blue-700 dark:text-blue-400">SignNow e-Signature</p>
      {!uploadedDocId ? (
        <div>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            id={`sn-upload-${documentName}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs"
            disabled={uploadMutation.isPending}
            onClick={() => document.getElementById(`sn-upload-${documentName}`)?.click()}
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-3 w-3 mr-1" /> Upload to SignNow</>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-1">
            <Input
              value={signerEmail}
              onChange={(e) => setSignerEmail(e.target.value)}
              className="text-xs h-7 flex-1"
              placeholder="Signer's email..."
              type="email"
            />
            <Button
              type="button"
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs"
              disabled={!signerEmail || !consentChecked || inviteMutation.isPending}
              onClick={() => inviteMutation.mutate()}
            >
              {inviteMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <><Send className="h-3 w-3 mr-1" /> Send</>
              )}
            </Button>
          </div>
          <label className="flex items-start gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-0.5 rounded border-gray-300"
            />
            <span className="text-[10px] leading-tight text-muted-foreground">
              I confirm this document is suitable for e-signature, I have authority to send it, and I accept responsibility for its content and compliance with applicable laws. HomeBase provides this tool as-is; I indemnify HomeBase against claims arising from my use.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function DropboxDocuSignPicker({ open, onOpenChange, onSelectFile, isPending }: { open: boolean; onOpenChange: (open: boolean) => void; onSelectFile: (path: string) => void; isPending: boolean }) {
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([""]);

  const { data: filesData, isLoading } = useQuery<{ entries: DropboxEntry[]; hasMore: boolean }>({
    queryKey: ["/api/dropbox/files", currentPath],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/dropbox/files", { path: currentPath });
      return res.json();
    },
    enabled: open,
  });

  const handleNavigate = (entry: DropboxEntry) => {
    if (entry.isFolder) {
      setPathHistory(prev => [...prev, entry.path]);
      setCurrentPath(entry.path);
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      setPathHistory(newHistory);
      setCurrentPath(newHistory[newHistory.length - 1]);
    }
  };

  const entries = filesData?.entries || [];
  const currentFolder = currentPath ? currentPath.split("/").pop() : "Dropbox";
  const docEntries = entries.filter(e => {
    if (e.isFolder) return true;
    const ext = e.name.split('.').pop()?.toLowerCase();
    return ext && ['pdf', 'doc', 'docx'].includes(ext);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <CloudUpload className="h-4 w-4 text-blue-600" />
            Pick file from Dropbox for DocuSign
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-1">
          {pathHistory.length > 1 && (
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span className="text-xs font-medium text-muted-foreground truncate">{currentFolder}</span>
          <span className="text-[10px] text-muted-foreground ml-auto">PDF, DOC, DOCX only</span>
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : docEntries.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No signable documents found</div>
          ) : (
            <div className="space-y-0.5">
              {docEntries
                .sort((a, b) => {
                  if (a.isFolder && !b.isFolder) return -1;
                  if (!a.isFolder && b.isFolder) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((entry, i) => (
                  <div
                    key={`${entry.path}-${i}`}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 group cursor-pointer"
                    onClick={() => entry.isFolder ? handleNavigate(entry) : onSelectFile(entry.path)}
                  >
                    {entry.isFolder ? (
                      <Folder className="h-4 w-4 text-blue-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs truncate flex-1">{entry.name}</span>
                    {entry.isFolder ? (
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">Select</span>
                    )}
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>

        {isPending && (
          <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
            <span className="text-xs text-yellow-700 dark:text-yellow-400">Sending to DocuSign...</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocuSignActions({ documentName, documentId, transactionId, onSigningUrlSet }: { documentName: string; documentId: number; transactionId: number; onSigningUrlSet: (url: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [signerEmail, setSignerEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [sendMode, setSendMode] = useState<'prepare' | 'quick'>('prepare');
  const [showDropboxPicker, setShowDropboxPicker] = useState(false);

  const { data: dsStatus } = useQuery<{ configured: boolean; connected: boolean }>({
    queryKey: ["/api/docusign/status"],
  });

  const { data: dropboxStatus } = useQuery<{ configured: boolean; connected: boolean }>({
    queryKey: ["/api/dropbox/status"],
  });

  const handleDocuSignSuccess = (data: any, mode: 'prepare' | 'quick') => {
    if (mode === 'prepare' && data.senderViewUrl) {
      window.open(data.senderViewUrl, '_blank');
      toast({ title: "DocuSign editor opened — place signature fields and send from there" });
    } else if (mode === 'quick') {
      toast({ title: `DocuSign envelope sent to ${signerEmail}` });
    }
    if (data.envelopeId) {
      onSigningUrlSet(`https://app.docusign.com/documents/details/${data.envelopeId}`);
    }
    queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
  };

  const prepareMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signerEmail", signerEmail);
      formData.append("signerName", signerName);
      formData.append("emailSubject", `Please sign: ${documentName}`);
      formData.append("consentAcknowledged", consentChecked ? "true" : "false");
      formData.append("documentId", String(documentId));
      formData.append("transactionId", String(transactionId));
      const res = await fetch("/api/docusign/prepare", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "Failed to prepare"); }
      return res.json();
    },
    onSuccess: (data: any) => handleDocuSignSuccess(data, 'prepare'),
    onError: (err: any) => toast({ title: err.message || "Failed to prepare", variant: "destructive" }),
  });

  const quickSendMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signerEmail", signerEmail);
      formData.append("signerName", signerName);
      formData.append("emailSubject", `Please sign: ${documentName}`);
      formData.append("consentAcknowledged", consentChecked ? "true" : "false");
      formData.append("documentId", String(documentId));
      formData.append("transactionId", String(transactionId));
      const res = await fetch("/api/docusign/send", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "Failed to send"); }
      return res.json();
    },
    onSuccess: (data: any) => handleDocuSignSuccess(data, 'quick'),
    onError: (err: any) => toast({ title: err.message || "Failed to send", variant: "destructive" }),
  });

  const dropboxToDocuSignMutation = useMutation({
    mutationFn: async (dropboxPath: string) => {
      const res = await apiRequest("POST", "/api/dropbox/send-to-docusign", {
        dropboxPath,
        signerEmail,
        signerName,
        emailSubject: `Please sign: ${documentName}`,
        mode: sendMode === 'quick' ? 'send' : 'prepare',
        documentId,
        transactionId,
      });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || "Failed to send"); }
      return res.json();
    },
    onSuccess: (data: any) => {
      handleDocuSignSuccess(data, sendMode);
      setShowDropboxPicker(false);
    },
    onError: (err: any) => toast({ title: err.message || "Failed to send from Dropbox to DocuSign", variant: "destructive" }),
  });

  const isPending = prepareMutation.isPending || quickSendMutation.isPending || dropboxToDocuSignMutation.isPending;
  const isFormReady = signerEmail && signerName && consentChecked && !isPending;

  if (!dsStatus?.connected) {
    return (
      <div className="p-2 rounded border border-dashed border-muted-foreground/30 text-center">
        <p className="text-xs text-muted-foreground">Connect DocuSign in Settings to send documents for signing</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2 rounded border border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
      <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400">DocuSign e-Signature</p>
      <div className="space-y-1.5">
        <Input
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          className="text-xs h-7"
          placeholder="Signer's full name..."
        />
        <Input
          value={signerEmail}
          onChange={(e) => setSignerEmail(e.target.value)}
          className="text-xs h-7"
          placeholder="Signer's email..."
          type="email"
        />
        <label className="flex items-start gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
          />
          <span className="text-[10px] leading-tight text-muted-foreground">
            I confirm this document is suitable for e-signature, I have authority to send it, and I accept responsibility for its content and compliance with applicable laws.
          </span>
        </label>

        <div className="flex gap-1 text-[10px]">
          <button
            type="button"
            className={`flex-1 py-1 px-2 rounded border text-center transition-colors ${sendMode === 'prepare' ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 font-medium' : 'border-muted hover:bg-muted/50'}`}
            onClick={() => setSendMode('prepare')}
          >
            Prepare & Edit
          </button>
          <button
            type="button"
            className={`flex-1 py-1 px-2 rounded border text-center transition-colors ${sendMode === 'quick' ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700 font-medium' : 'border-muted hover:bg-muted/50'}`}
            onClick={() => setSendMode('quick')}
          >
            Quick Send
          </button>
        </div>

        {sendMode === 'prepare' && (
          <p className="text-[10px] text-muted-foreground leading-tight">
            Opens DocuSign's editor where you can drag & drop signature, initial, and date fields onto your document before sending.
          </p>
        )}
        {sendMode === 'quick' && (
          <p className="text-[10px] text-muted-foreground leading-tight">
            Sends immediately with a signature field placed at the bottom of the first page — best for simple documents.
          </p>
        )}

        <div className="space-y-1.5">
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            id={`ds-upload-${documentId}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (sendMode === 'prepare') {
                  prepareMutation.mutate(file);
                } else {
                  quickSendMutation.mutate(file);
                }
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            className="w-full h-8 text-xs"
            disabled={!isFormReady}
            onClick={() => document.getElementById(`ds-upload-${documentId}`)?.click()}
          >
            {(prepareMutation.isPending || quickSendMutation.isPending) ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> {sendMode === 'prepare' ? 'Preparing...' : 'Sending...'}</>
            ) : (
              <><Upload className="h-3 w-3 mr-1" /> From Device</>
            )}
          </Button>

          {dropboxStatus?.connected && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs"
              disabled={!isFormReady}
              onClick={() => setShowDropboxPicker(true)}
            >
              {dropboxToDocuSignMutation.isPending ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending from Dropbox...</>
              ) : (
                <><CloudUpload className="h-3 w-3 mr-1 text-blue-600" /> From Dropbox</>
              )}
            </Button>
          )}
        </div>

        {showDropboxPicker && (
          <DropboxDocuSignPicker
            open={showDropboxPicker}
            onOpenChange={setShowDropboxPicker}
            onSelectFile={(path) => dropboxToDocuSignMutation.mutate(path)}
            isPending={dropboxToDocuSignMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function DocumentCard({ 
  document, 
  isDragging,
  onUpdateNotes,
  onUpdateSigning,
  onDelete
}: { 
  document: Document; 
  isDragging?: boolean;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateSigning: (id: string, signingUrl: string, signingPlatform: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: document.id,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(document.notes || '');
  const [signingUrl, setSigningUrl] = useState(document.signingUrl || '');
  const [signingPlatform, setSigningPlatform] = useState(document.signingPlatform || '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const statusColor = getStatusColor(document.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-background border rounded-md p-3 cursor-move hover:bg-accent/50 ${isDragging ? 'opacity-50' : ''} relative`}
      onClick={() => setIsEditing(!isEditing)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm mb-1 truncate" title={document.name}>{document.name}</div>
          <div className="flex items-center gap-1 flex-wrap">
            <Badge variant="secondary" className={`${statusColor} text-xs`}>
              {statusColumns.find(col => col.key === document.status)?.label}
            </Badge>
            {document.signingUrl && (
              <Badge variant="outline" className="text-xs gap-1">
                <Link2 className="h-3 w-3" />
                {getPlatformLabel(document.signingPlatform)}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {document.signingUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(document.signingUrl!, '_blank', 'noopener,noreferrer');
                    }}
                    className="p-1 rounded hover:bg-primary/10 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  Open in {getPlatformLabel(document.signingPlatform) || 'signing platform'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {document.notes && !document.signingUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  {document.notes}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{document.name}"? This action cannot be undone and any associated signing links or notes will be permanently removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(document.id, document.name)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Signing Platform</label>
            <Select 
              value={signingPlatform || "none"} 
              onValueChange={(val) => {
                const newPlatform = val === "none" ? "" : val;
                setSigningPlatform(newPlatform);
                onUpdateSigning(document.id, signingUrl, newPlatform);
              }}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select platform..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {signingPlatforms.map(p => (
                  <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Signing URL</label>
            <div className="flex gap-1">
              <Input
                value={signingUrl}
                onChange={(e) => setSigningUrl(e.target.value)}
                onBlur={() => onUpdateSigning(document.id, signingUrl, signingPlatform)}
                className="text-sm h-8 flex-1"
                placeholder="Paste signing link..."
              />
              {signingUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => window.open(signingUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/70 leading-tight mt-1">
              This link is visible to anyone with access to this transaction. Only the signing platform (DocuSign, ZipForms, etc.) controls who can view or sign the document.
            </p>
          </div>
          {signingPlatform === 'signnow' && (
            <SignNowActions documentName={document.name} onSigningUrlSet={(url: string) => {
              setSigningUrl(url);
              onUpdateSigning(document.id, url, 'signnow');
            }} />
          )}
          {signingPlatform === 'docusign' && (
            <DocuSignActions documentName={document.name} documentId={parseInt(document.id)} transactionId={document.transactionId} onSigningUrlSet={(url: string) => {
              setSigningUrl(url);
              onUpdateSigning(document.id, url, 'docusign');
            }} />
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                onUpdateNotes(document.id, e.target.value);
              }}
              className="text-sm min-h-[60px]"
              placeholder="Add notes..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DroppableColumn({ 
  status, 
  documents,
  title,
  onUpdateNotes,
  onUpdateSigning,
  onDelete,
  onAddDocument,
  isAgentOrBroker,
  docusignConnected,
}: { 
  status: typeof statusColumns[number]['key'];
  documents: Document[];
  title: string;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateSigning: (id: string, signingUrl: string, signingPlatform: string) => void;
  onDelete: (id: string, name: string) => void;
  onAddDocument?: (name: string, signingPlatform?: string) => void;
  isAgentOrBroker?: boolean;
  docusignConnected?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusColor = getStatusColor(status);
  const [expanded, setExpanded] = useState(false);
  const [docName, setDocName] = useState("");

  const defaultPlatform = docusignConnected ? 'docusign' : undefined;

  const handleAdd = () => {
    if (docName.trim() && onAddDocument) {
      onAddDocument(docName.trim(), defaultPlatform);
      setDocName("");
      setExpanded(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge variant="secondary" className={`${statusColor} text-xs`}>
          {documents.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        data-status={status}
        className="space-y-2 min-h-[100px] p-2 rounded-md bg-muted/50 transition-colors"
      >
        <SortableContext items={documents.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {documents.map((doc) => (
            <DocumentCard 
              key={doc.id} 
              document={doc} 
              onUpdateNotes={onUpdateNotes}
              onUpdateSigning={onUpdateSigning}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {status === "not_applicable" && isAgentOrBroker && onAddDocument && (
          <div className={`border-2 border-dashed rounded-md transition-colors ${expanded ? 'border-primary/50 bg-background p-3' : 'border-muted-foreground/30'}`}>
            <button
              onClick={() => setExpanded(!expanded)}
              className={`w-full text-sm transition-colors flex items-center justify-center gap-2 ${expanded ? 'text-primary font-medium pb-2' : 'text-muted-foreground hover:border-primary/50 hover:text-primary p-3'}`}
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
            {expanded && (
              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <Input
                  placeholder="Document name..."
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="text-sm h-8 flex-1"
                  autoFocus
                />
                <Button size="sm" className="h-8" onClick={handleAdd} disabled={!docName.trim()}>
                  Add
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface DropboxEntry {
  name: string;
  path: string;
  isFolder: boolean;
  size?: number;
  modified?: string;
}

function DropboxFileBrowser({ transactionId, open, onOpenChange }: { transactionId: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState("");
  const [pathHistory, setPathHistory] = useState<string[]>([""]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DropboxEntry[] | null>(null);

  const { data: filesData, isLoading: filesLoading } = useQuery<{ entries: DropboxEntry[]; hasMore: boolean }>({
    queryKey: ["/api/dropbox/files", currentPath],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/dropbox/files", { path: currentPath });
      return res.json();
    },
    enabled: open && !searchResults,
  });

  const addToChecklistMutation = useMutation({
    mutationFn: async (entry: DropboxEntry) => {
      const res = await apiRequest("POST", "/api/dropbox/add-to-checklist", {
        dropboxPath: entry.path,
        transactionId,
        documentName: entry.name,
      });
      if (!res.ok) throw new Error("Failed to add file");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
      toast({ title: "File added", description: `${data.fileName} added to document checklist` });
    },
    onError: () => toast({ title: "Failed to add file", variant: "destructive" }),
  });

  const handleNavigate = (entry: DropboxEntry) => {
    if (entry.isFolder) {
      setPathHistory(prev => [...prev, entry.path]);
      setCurrentPath(entry.path);
      setSearchResults(null);
      setSearchQuery("");
    }
  };

  const handleBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      setPathHistory(newHistory);
      setCurrentPath(newHistory[newHistory.length - 1]);
      setSearchResults(null);
      setSearchQuery("");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiRequest("POST", "/api/dropbox/search", { query: searchQuery.trim() });
      const results = await res.json();
      setSearchResults(results);
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchResults(null);
    setSearchQuery("");
  };

  const entries = searchResults || filesData?.entries || [];
  const currentFolder = currentPath ? currentPath.split("/").pop() : "Dropbox";

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5 text-blue-600" />
            Import from Dropbox
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-8"
            />
          </div>
          <Button size="sm" variant="outline" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searchResults ? (
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs">Search results for "{searchQuery}"</Badge>
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={clearSearch}>Clear</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-2">
            {pathHistory.length > 1 && (
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-sm font-medium text-muted-foreground truncate">{currentFolder}</span>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: "400px" }}>
          {filesLoading || isSearching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchResults ? "No files found" : "This folder is empty"}
            </div>
          ) : (
            <div className="space-y-1">
              {entries
                .sort((a, b) => {
                  if (a.isFolder && !b.isFolder) return -1;
                  if (!a.isFolder && b.isFolder) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((entry, i) => (
                  <div
                    key={`${entry.path}-${i}`}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 group cursor-pointer"
                    onClick={() => entry.isFolder ? handleNavigate(entry) : undefined}
                  >
                    {entry.isFolder ? (
                      <Folder className="h-5 w-5 text-blue-500 shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{entry.name}</p>
                      {!entry.isFolder && entry.size != null && (
                        <p className="text-xs text-muted-foreground">{formatSize(entry.size)}</p>
                      )}
                    </div>
                    {entry.isFolder ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToChecklistMutation.mutate(entry);
                        }}
                        disabled={addToChecklistMutation.isPending}
                      >
                        {addToChecklistMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                        Add
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentChecklist({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const { data: documents = [], isLoading, isError } = useQuery({
    queryKey: ["/api/documents", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/${transactionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          const initResponse = await apiRequest("POST", `/api/documents/${transactionId}/initialize`, {
            documents: defaultDocuments.map(doc => ({
              ...doc,
              transactionId
            }))
          });
          if (!initResponse.ok) {
            throw new Error("Failed to initialize documents");
          }
          return initResponse.json();
        }
        throw new Error("Failed to fetch documents");
      }
      const docs = await response.json();
      return docs.length ? docs : [];
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, status, notes, signingUrl, signingPlatform }: { 
      id: string; 
      status?: Document['status']; 
      notes?: string;
      signingUrl?: string;
      signingPlatform?: string;
    }) => {
      const body: Record<string, any> = {};
      if (status !== undefined) body.status = status;
      if (notes !== undefined) body.notes = notes || null;
      if (signingUrl !== undefined) body.signingUrl = signingUrl || null;
      if (signingPlatform !== undefined) body.signingPlatform = signingPlatform || null;

      const response = await apiRequest("PATCH", `/api/documents/${transactionId}/${id}`, body);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update document');
      }

      return response.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["/api/documents", transactionId] });
      const previousDocuments = queryClient.getQueryData(["/api/documents", transactionId]);
      queryClient.setQueryData(["/api/documents", transactionId], (old: Document[] = []) => 
        old.map(doc => 
          doc.id === variables.id 
            ? { ...doc, ...variables }
            : doc
        )
      );
      return { previousDocuments };
    },
    onError: (error, _variables, context) => {
      console.error('Document update error:', error);
      if (context?.previousDocuments) {
        queryClient.setQueryData(["/api/documents", transactionId], context.previousDocuments);
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update document",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
    }
  });

  const { data: docusignStatus } = useQuery<{ configured: boolean; connected: boolean }>({
    queryKey: ["/api/docusign/status"],
  });

  const addDocumentMutation = useMutation({
    mutationFn: async ({ name, signingPlatform }: { name: string; signingPlatform?: string }) => {
      const body: any = { name, status: 'not_applicable' as const };
      if (signingPlatform) body.signingPlatform = signingPlatform;
      const response = await apiRequest("POST", `/api/documents/${transactionId}`, body);
      if (!response.ok) {
        throw new Error("Failed to add document");
      }
      return response.json();
    },
    onSuccess: (newDoc) => {
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) => 
        [...oldData, newDoc]
      );
      toast({
        title: "Success",
        description: "Document added successfully",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const status = over.id as Document['status'];
    const documentId = active.id as string;

    if (!status || !documentId) return;

    const activeDocument = documents.find(doc => doc.id === documentId);
    if (!activeDocument || activeDocument.status === status) return;

    updateDocumentMutation.mutate({
      id: documentId,
      status
    });
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    updateDocumentMutation.mutate({
      id,
      notes: notes || undefined
    });
  };

  const handleUpdateSigning = (id: string, signingUrl: string, signingPlatform: string) => {
    updateDocumentMutation.mutate({
      id,
      signingUrl: signingUrl || undefined,
      signingPlatform: signingPlatform || undefined
    });
  };

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/documents/${transactionId}/${id}`);
      if (!res.ok) throw new Error("Failed to delete document");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
      toast({ title: "Document deleted" });
    },
    onError: () => toast({ title: "Failed to delete document", variant: "destructive" }),
  });

  const handleDeleteDocument = (id: string, name: string) => {
    deleteDocumentMutation.mutate(id);
  };

  const syncDocuSignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/docusign/sync-status", { transactionId });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to sync");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const advanced = data.results?.filter((r: any) => r.advanced).length || 0;
      if (advanced > 0) {
        toast({ title: `${advanced} document${advanced > 1 ? 's' : ''} moved to Signed` });
        queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
      } else if (data.synced > 0) {
        toast({ title: "All DocuSign envelopes checked — no status changes" });
      } else {
        toast({ title: "No DocuSign documents to sync" });
      }
    },
    onError: (err: any) => toast({ title: err.message || "Failed to sync DocuSign statuses", variant: "destructive" }),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Failed to load documents. Please try again.</div>
        </CardContent>
      </Card>
    );
  }

  const activeDocument = activeId ? documents.find(doc => doc.id === activeId) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Documents</CardTitle>
        {(user?.role === 'agent' || user?.role === 'broker') && documents.some(d => d.docusignEnvelopeId) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncDocuSignMutation.mutate()}
            disabled={syncDocuSignMutation.isPending}
          >
            {syncDocuSignMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Sync DocuSign
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusColumns.map(column => (
              <DroppableColumn
                key={column.key}
                status={column.key}
                title={column.label}
                documents={documents.filter(doc => doc.status === column.key)}
                onUpdateNotes={handleUpdateNotes}
                onUpdateSigning={handleUpdateSigning}
                onDelete={handleDeleteDocument}
                onAddDocument={(name: string, signingPlatform?: string) => addDocumentMutation.mutate({ name, signingPlatform })}
                isAgentOrBroker={user?.role === 'agent' || user?.role === 'broker'}
                docusignConnected={docusignStatus?.connected}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDocument && (
              <div className="bg-background border rounded-md p-2 shadow-lg">
                <div className="text-sm">{activeDocument.name}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </CardContent>
    </Card>
  );
}
