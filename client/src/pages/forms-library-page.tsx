import { useState, useRef, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  FileText, Upload, Search, Trash2, PenLine, Send, FolderOpen, Loader2, MoreVertical, Clock, Share2, MapPin,
  FileSignature, Crosshair
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

const TemplateFieldEditor = lazy(() => import("@/components/template-field-editor"));

const CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "addendum", label: "Addendum" },
  { value: "disclosure", label: "Disclosure" },
  { value: "inspection", label: "Inspection" },
  { value: "amendment", label: "Amendment" },
  { value: "notice", label: "Notice" },
  { value: "agreement", label: "Agreement" },
  { value: "other", label: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY",
  "LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND",
  "OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

interface FormTemplate {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  category: string;
  formState: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fieldPositions: any;
  isShared: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  isOwner: boolean;
}

export default function FormsLibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showUpload, setShowUpload] = useState(false);
  const [showEdit, setShowEdit] = useState<FormTemplate | null>(null);
  const [editingFieldsTemplate, setEditingFieldsTemplate] = useState<FormTemplate | null>(null);
  const [showUseDialog, setShowUseDialog] = useState<FormTemplate | null>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [savingFields, setSavingFields] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterState, setFilterState] = useState<string>("all");

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    category: "other",
    formState: "",
    isShared: false,
    file: null as File | null,
  });

  const { data: templates = [], isLoading } = useQuery<FormTemplate[]>({
    queryKey: ["/api/form-templates"],
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: !!showUseDialog,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/form-templates", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template saved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setShowUpload(false);
      setUploadForm({ title: "", description: "", category: "other", formState: "", isShared: false, file: null });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/form-templates/${id}`, data);
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setShowEdit(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/form-templates/${id}`);
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Template deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
    },
  });

  const useMutation2 = useMutation({
    mutationFn: async ({ templateId, transactionId }: { templateId: number; transactionId?: number }) => {
      const res = await apiRequest("POST", `/api/form-templates/${templateId}/use`, { transactionId });
      if (!res.ok) throw new Error("Failed to load template");
      const data = await res.json();
      return { ...data, transactionId: transactionId || data.transactionId };
    },
    onSuccess: (data) => {
      sessionStorage.setItem("firma_template_data", JSON.stringify({
        ...data,
        transactionId: data.transactionId,
      }));
      toast({ title: "Template loaded", description: "Opening signature editor..." });
      if (data.transactionId) {
        setLocation(`/transactions/${data.transactionId}`);
      } else {
        setLocation("/transactions");
      }
      setShowUseDialog(null);
      setSelectedTransactionId("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveFields = async (fields: any[], pageDims: { width: number; height: number }[]) => {
    if (!editingFieldsTemplate) return;
    setSavingFields(true);
    try {
      const res = await apiRequest("PATCH", `/api/form-templates/${editingFieldsTemplate.id}`, {
        fieldPositions: { fields, pageDims },
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Signature fields saved!" });
      queryClient.invalidateQueries({ queryKey: ["/api/form-templates"] });
      setEditingFieldsTemplate(null);
    } catch (err: any) {
      toast({ title: "Failed to save fields", variant: "destructive" });
    } finally {
      setSavingFields(false);
    }
  };

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.title) return;
    const formData = new FormData();
    formData.append("file", uploadForm.file);
    formData.append("title", uploadForm.title);
    if (uploadForm.description) formData.append("description", uploadForm.description);
    formData.append("category", uploadForm.category);
    if (uploadForm.formState) formData.append("formState", uploadForm.formState);
    formData.append("isShared", String(uploadForm.isShared));
    uploadMutation.mutate(formData);
  };

  const handleUseTemplate = async (template: FormTemplate) => {
    setShowUseDialog(template);
    setSelectedTransactionId("");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filtered = templates.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !t.fileName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterCategory !== "all" && t.category !== filterCategory) return false;
    if (filterState !== "all" && t.formState !== filterState) return false;
    return true;
  });

  const isBroker = user?.role === "broker";

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            Forms Library
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload and manage reusable form templates for signing
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} className="shrink-0">
          <Upload className="h-4 w-4 mr-2" />
          Upload Form
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search forms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="flex-1 sm:w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterState} onValueChange={setFilterState}>
            <SelectTrigger className="flex-1 sm:w-[120px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {templates.length === 0 ? "No forms yet" : "No matching forms"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {templates.length === 0
                ? "Upload your first PDF form to start building your template library."
                : "Try adjusting your search or filters."}
            </p>
            {templates.length === 0 && (
              <Button onClick={() => setShowUpload(true)}>
                <Upload className="h-4 w-4 mr-2" /> Upload Your First Form
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <Card key={template.id} className="hover:border-primary/50 transition-colors group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.title}</CardTitle>
                    {template.description && (
                      <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
                    )}
                  </div>
                  {template.isOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingFieldsTemplate(template)}>
                          <Crosshair className="h-4 w-4 mr-2" /> Set Up Signature Fields
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowEdit(template)}>
                          <PenLine className="h-4 w-4 mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this template?")) deleteMutation.mutate(template.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-xs capitalize">{template.category}</Badge>
                  {template.formState && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />{template.formState}
                    </Badge>
                  )}
                  {template.isShared && !template.isOwner && (
                    <Badge variant="outline" className="text-xs text-blue-600">
                      <Share2 className="h-3 w-3 mr-1" />Shared
                    </Badge>
                  )}
                  {template.fieldPositions?.fields?.length > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                      <FileSignature className="h-3 w-3 mr-1" />{template.fieldPositions.fields.length} fields
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />{formatFileSize(template.fileSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{new Date(template.createdAt).toLocaleDateString()}
                  </span>
                  {template.usageCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Send className="h-3 w-3" />Used {template.usageCount}x
                    </span>
                  )}
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => handleUseTemplate(template)}
                  disabled={useMutation2.isPending}
                >
                  {useMutation2.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Use for Signing
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Form Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>PDF File *</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadForm((f) => ({
                      ...f,
                      file,
                      title: f.title || file.name.replace(/\.pdf$/i, ""),
                    }));
                  }
                }}
              />
              <Button
                variant="outline"
                className="w-full mt-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadForm.file ? uploadForm.file.name : "Choose PDF..."}
              </Button>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={uploadForm.title}
                onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. One to Four Family Residential Contract"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={uploadForm.description}
                onChange={(e) => setUploadForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional description..."
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(v) => setUploadForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>State</Label>
                <Select
                  value={uploadForm.formState || "none"}
                  onValueChange={(v) => setUploadForm((f) => ({ ...f, formState: v === "none" ? "" : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Any</SelectItem>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {isBroker && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>Share with my agents</Label>
                  <p className="text-xs text-muted-foreground">Agents on your team can use this template</p>
                </div>
                <Switch
                  checked={uploadForm.isShared}
                  onCheckedChange={(v) => setUploadForm((f) => ({ ...f, isShared: v }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadForm.file || !uploadForm.title || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showEdit} onOpenChange={() => setShowEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          {showEdit && (
            <div className="space-y-4 py-2">
              <div>
                <Label>Title</Label>
                <Input
                  defaultValue={showEdit.title}
                  onChange={(e) => setShowEdit((prev) => prev ? { ...prev, title: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  defaultValue={showEdit.description || ""}
                  onChange={(e) => setShowEdit((prev) => prev ? { ...prev, description: e.target.value } : null)}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select
                    defaultValue={showEdit.category}
                    onValueChange={(v) => setShowEdit((prev) => prev ? { ...prev, category: v } : null)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Select
                    defaultValue={showEdit.formState || "none"}
                    onValueChange={(v) => setShowEdit((prev) => prev ? { ...prev, formState: v === "none" ? null : v } : null)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any</SelectItem>
                      {US_STATES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isBroker && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Share with my agents</Label>
                    <p className="text-xs text-muted-foreground">Agents on your team can use this template</p>
                  </div>
                  <Switch
                    checked={showEdit.isShared}
                    onCheckedChange={(v) => setShowEdit((prev) => prev ? { ...prev, isShared: v } : null)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!showEdit) return;
                updateMutation.mutate({
                  id: showEdit.id,
                  title: showEdit.title,
                  description: showEdit.description,
                  category: showEdit.category,
                  formState: showEdit.formState,
                  isShared: showEdit.isShared,
                });
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showUseDialog} onOpenChange={() => { setShowUseDialog(null); setSelectedTransactionId(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Use Template for Signing</DialogTitle>
          </DialogHeader>
          {showUseDialog && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium text-sm">{showUseDialog.title}</p>
                {showUseDialog.fieldPositions?.fields?.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    <FileSignature className="h-3 w-3 inline mr-1" />
                    {showUseDialog.fieldPositions.fields.length} pre-configured signature fields
                  </p>
                )}
                {!showUseDialog.fieldPositions?.fields?.length && (
                  <p className="text-xs text-muted-foreground mt-1">
                    No signature fields configured. You can add them in the Firma editor.
                  </p>
                )}
              </div>
              <div>
                <Label>Link to Transaction (optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select a transaction to auto-fill recipient names from the deal
                </p>
                <Select value={selectedTransactionId} onValueChange={setSelectedTransactionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No transaction — standalone signing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No transaction — standalone</SelectItem>
                    {transactions.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.propertyAddress || t.address || `Transaction #${t.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTransactionId && selectedTransactionId !== "none" && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Transaction participants will be auto-filled as signing recipients based on their roles (Buyer, Seller, Agent).
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUseDialog(null); setSelectedTransactionId(""); }}>Cancel</Button>
            <Button
              onClick={() => {
                if (!showUseDialog) return;
                const txId = selectedTransactionId && selectedTransactionId !== "none" ? parseInt(selectedTransactionId) : undefined;
                useMutation2.mutate({ templateId: showUseDialog.id, transactionId: txId });
              }}
              disabled={useMutation2.isPending}
            >
              {useMutation2.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Open in Signing Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingFieldsTemplate && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }>
          <TemplateFieldEditor
            pdfUrl={`/api/form-templates/${editingFieldsTemplate.id}/file`}
            initialFields={editingFieldsTemplate.fieldPositions?.fields || []}
            onSave={handleSaveFields}
            onClose={() => setEditingFieldsTemplate(null)}
            saving={savingFields}
          />
        </Suspense>
      )}
    </div>
  );
}
