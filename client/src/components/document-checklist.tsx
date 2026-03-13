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
import { Plus, FileText, ExternalLink, Link2, Upload, Send, Loader2 } from "lucide-react";
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

function DocuSignActions({ documentName, onSigningUrlSet }: { documentName: string; onSigningUrlSet: (url: string) => void }) {
  const { toast } = useToast();
  const [signerEmail, setSignerEmail] = useState('');
  const [signerName, setSignerName] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  const { data: dsStatus } = useQuery<{ configured: boolean; connected: boolean }>({
    queryKey: ["/api/docusign/status"],
  });

  const sendMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("signerEmail", signerEmail);
      formData.append("signerName", signerName);
      formData.append("emailSubject", `Please sign: ${documentName}`);
      formData.append("consentAcknowledged", consentChecked ? "true" : "false");
      const res = await fetch("/api/docusign/send", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `DocuSign envelope sent to ${signerEmail}` });
      if (data.envelopeId) {
        onSigningUrlSet(`https://app.docusign.com/documents/details/${data.envelopeId}`);
      }
    },
    onError: (err: any) => toast({ title: err.message || "Failed to send", variant: "destructive" }),
  });

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
        <div className="flex gap-1">
          <Input
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            className="text-xs h-7 flex-1"
            placeholder="Signer's email..."
            type="email"
          />
        </div>
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
        <div>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            id={`ds-upload-${documentName}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) sendMutation.mutate(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="default"
            className="w-full h-8 text-xs"
            disabled={!signerEmail || !signerName || !consentChecked || sendMutation.isPending}
            onClick={() => document.getElementById(`ds-upload-${documentName}`)?.click()}
          >
            {sendMutation.isPending ? (
              <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sending...</>
            ) : (
              <><Send className="h-3 w-3 mr-1" /> Upload & Send via DocuSign</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocumentCard({ 
  document, 
  isDragging,
  onUpdateNotes,
  onUpdateSigning
}: { 
  document: Document; 
  isDragging?: boolean;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateSigning: (id: string, signingUrl: string, signingPlatform: string) => void;
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
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">{document.name}</div>
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
            <DocuSignActions documentName={document.name} onSigningUrlSet={(url: string) => {
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
  onUpdateSigning
}: { 
  status: typeof statusColumns[number]['key'];
  documents: Document[];
  title: string;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateSigning: (id: string, signingUrl: string, signingPlatform: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusColor = getStatusColor(status);

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
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function DocumentChecklist({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState("");

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

  const addDocumentMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", `/api/documents/${transactionId}`, {
        name,
        status: 'not_applicable' as const
      });
      if (!response.ok) {
        throw new Error("Failed to add document");
      }
      return response.json();
    },
    onSuccess: (newDoc) => {
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) => 
        [...oldData, newDoc]
      );
      setNewDocument("");
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
      <CardHeader>
        <CardTitle className="text-lg">Documents</CardTitle>
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
        {user?.role === 'agent' && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newDocument.trim()) {
              addDocumentMutation.mutate(newDocument.trim());
            }
          }} className="flex flex-col sm:flex-row gap-2 pt-6 mt-6 border-t">
            <Input
              placeholder="New document name..."
              value={newDocument}
              onChange={(e) => setNewDocument(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!newDocument.trim() || addDocumentMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
