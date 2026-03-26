import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type InspectionItem, type Contractor, type Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Upload, FileText, Plus, Trash2, Save, Send,
  AlertTriangle, CheckCircle2, Circle, ShieldAlert, Loader2, Eye, BookOpen,
  Bot, Sparkles, Shield, RotateCcw, ChevronDown, ChevronRight, Image
} from "lucide-react";

const CATEGORIES = [
  { value: "roof", label: "Roof" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "foundation", label: "Foundation" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "appliances", label: "Appliances" },
  { value: "other", label: "Other" },
];

const SEVERITIES = [
  { value: "safety", label: "Safety Hazard", color: "text-red-700 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800" },
  { value: "major", label: "Major", color: "text-orange-700 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800" },
  { value: "moderate", label: "Moderate", color: "text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800" },
  { value: "minor", label: "Minor", color: "text-green-700 bg-green-50 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800" },
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  pending_review: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  repaired: "Repaired",
  sent_for_bids: "Sent for Bids",
  bids_received: "Bids Received",
  accepted: "Accepted",
  declined: "Declined",
};

type ParsedItem = {
  category: string;
  description: string;
  severity: string;
  location: string;
  selected: boolean;
  pageNumber?: number | null;
  hasPhoto?: boolean;
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "safety":
      return <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />;
    case "major":
      return <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />;
    case "moderate":
      return <Circle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />;
    case "minor":
      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const sev = SEVERITIES.find(s => s.value === severity);
  return (
    <Badge variant="outline" className={`text-xs ${sev?.color || ""}`}>
      {sev?.label || severity}
    </Badge>
  );
}

function getCategoryLabel(val: string) {
  return CATEGORIES.find(c => c.value === val)?.label || val;
}

function groupByCategory<T extends { category: string }>(items: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const cat = item.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

export default function InspectionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const transactionId = Number(id);
  const { user } = useAuth();
  const { toast } = useToast();

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [vendorDialogItem, setVendorDialogItem] = useState<InspectionItem | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set());
  const [selectedSavedItems, setSelectedSavedItems] = useState<Set<number>>(new Set());
  const [manualItem, setManualItem] = useState({ category: "other", description: "", severity: "moderate", location: "" });
  const [pdfViewerPage, setPdfViewerPage] = useState<number | null>(null);
  const [aiUsedForParse, setAiUsedForParse] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { data: transaction } = useQuery<Transaction>({
    queryKey: ["/api/transactions", transactionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions/${transactionId}`);
      return res.json();
    },
    enabled: !!transactionId,
  });

  const { data: savedItems = [], isLoading: loadingItems } = useQuery<InspectionItem[]>({
    queryKey: ["/api/transactions", transactionId, "inspection-items"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions/${transactionId}/inspection-items`);
      return res.json();
    },
    enabled: !!transactionId,
  });

  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ["/api/contractors"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/contractors");
      return res.json();
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await apiRequest("DELETE", `/api/inspection-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
      toast({ title: "Item removed" });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/transactions/${transactionId}/inspection-items`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
      setSelectedSavedItems(new Set());
      toast({ title: `Cleared ${data.deleted} inspection item${data.deleted !== 1 ? 's' : ''}` });
    },
  });

  const saveItemsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await apiRequest("POST", `/api/transactions/${transactionId}/inspection-items`, { items });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
      setParsedItems([]);
      toast({ title: "Items saved" });
    },
  });

  const sendBidsMutation = useMutation({
    mutationFn: async ({ itemId, contractorIds }: { itemId: number; contractorIds: number[] }) => {
      const res = await apiRequest("POST", `/api/inspection-items/${itemId}/send-bids`, {
        contractorIds,
        transactionId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
      setVendorDialogItem(null);
      setSelectedVendors(new Set());
      toast({ title: "Bid requests sent!" });
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/transactions/${transactionId}/parse-inspection`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      setAiUsedForParse(!!data.aiUsed);
      const items: ParsedItem[] = (data.items || []).map((item: any) => ({
        category: item.category || "other",
        description: item.description || "",
        severity: item.severity || "moderate",
        location: item.location || "",
        selected: true,
        pageNumber: item.pageNumber || null,
        hasPhoto: item.hasPhoto || false,
      }));
      setParsedItems(items);
      toast({ title: `Found ${items.length} items`, description: data.aiUsed ? "AI-powered extraction" : "Text pattern extraction" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveApproved = () => {
    const approved = parsedItems
      .filter(i => i.selected)
      .map(item => ({
        category: item.category,
        description: item.description,
        severity: item.severity,
        location: item.location,
        status: "approved",
        pageNumber: item.pageNumber,
        hasPhoto: item.hasPhoto || false,
      }));
    saveItemsMutation.mutate(approved);
  };

  const handleAddManual = () => {
    if (!manualItem.description.trim()) return;
    saveItemsMutation.mutate([{ ...manualItem, status: "approved" }]);
    setManualItem({ category: "other", description: "", severity: "moderate", location: "" });
    setAddingManual(false);
  };

  const handleSendBids = (item: InspectionItem) => {
    setVendorDialogItem(item);
    setSelectedVendors(new Set());
  };

  const [bulkSendMode, setBulkSendMode] = useState(false);

  const handleBulkSendBids = () => {
    const items = savedItems.filter(i => selectedSavedItems.has(i.id) && i.status === "approved");
    if (items.length === 0) {
      toast({ title: "Select approved items first", variant: "destructive" });
      return;
    }
    setBulkSendMode(true);
    setVendorDialogItem(items[0]);
    setSelectedVendors(new Set());
  };

  const confirmSendBids = async () => {
    if (!vendorDialogItem) return;
    if (bulkSendMode) {
      const items = savedItems.filter(i => selectedSavedItems.has(i.id) && i.status === "approved");
      for (const item of items) {
        await sendBidsMutation.mutateAsync({
          itemId: item.id,
          contractorIds: Array.from(selectedVendors),
        });
      }
      setBulkSendMode(false);
      setSelectedSavedItems(new Set());
    } else {
      sendBidsMutation.mutate({
        itemId: vendorDialogItem.id,
        contractorIds: Array.from(selectedVendors),
      });
    }
  };

  const toggleSavedItem = (id: number) => {
    setSelectedSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const openPageViewer = (page: number) => {
    setImageLoading(true);
    setImageError(false);
    setPdfViewerPage(page);
  };

  const parsedByCategory = useMemo(() => groupByCategory(parsedItems), [parsedItems]);
  const savedByCategory = useMemo(() => groupByCategory(savedItems), [savedItems]);

  const sortedParsedCategories = useMemo(() =>
    Object.keys(parsedByCategory).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b))),
    [parsedByCategory]
  );
  const sortedSavedCategories = useMemo(() =>
    Object.keys(savedByCategory).sort((a, b) => getCategoryLabel(a).localeCompare(getCategoryLabel(b))),
    [savedByCategory]
  );

  if (!user) return null;

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/transactions/${transactionId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transaction
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Inspection Review</h1>
          {transaction && (
            <p className="text-sm text-muted-foreground">{(transaction as any).propertyAddress || `Transaction #${transactionId}`}</p>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Inspection Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf,.txt"
              onChange={handleUpload}
              disabled={uploading}
              className="flex-1"
            />
            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing...
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
            <Bot className="h-5 w-5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">AI-Powered Parsing:</span> Reports are analyzed by AI for accurate extraction including photo detection. Your documents are processed securely and not retained.
            </p>
          </div>
        </CardContent>
      </Card>

      {parsedItems.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Parsed Items ({parsedItems.length})
                {aiUsedForParse && (
                  <Badge variant="secondary" className="gap-1 ml-2">
                    <Bot className="h-3 w-3" />
                    AI
                  </Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {sortedParsedCategories.map(cat => {
              const items = parsedByCategory[cat];
              const isCollapsed = collapsedCategories.has(`parsed-${cat}`);
              return (
                <div key={cat} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors touch-manipulation"
                    onClick={() => toggleCategory(`parsed-${cat}`)}
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      <span className="font-semibold text-sm">{getCategoryLabel(cat)}</span>
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </div>
                  </button>
                  {!isCollapsed && (
                    <div className="divide-y">
                      {items.map((item) => {
                        const idx = parsedItems.indexOf(item);
                        return (
                          <div key={idx} className="p-3 space-y-2">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={() => {
                                  const updated = [...parsedItems];
                                  updated[idx] = { ...updated[idx], selected: !updated[idx].selected };
                                  setParsedItems(updated);
                                }}
                                className="mt-0.5 shrink-0"
                              />
                              <SeverityIcon severity={item.severity} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm leading-relaxed">{item.description}</p>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                  <SeverityBadge severity={item.severity} />
                                  {item.location && (
                                    <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{item.location}</Badge>
                                  )}
                                  {item.hasPhoto && (
                                    <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                      <Eye className="h-3 w-3 mr-1" />
                                      Photo
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            {item.pageNumber && (
                              <div className="pl-10">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium bg-primary/5 hover:bg-primary/10 active:bg-primary/15 border-primary/20 text-primary transition-colors touch-manipulation"
                                  onClick={() => openPageViewer(item.pageNumber!)}
                                >
                                  {item.hasPhoto ? (
                                    <Image className="h-4 w-4" />
                                  ) : (
                                    <BookOpen className="h-4 w-4" />
                                  )}
                                  {item.hasPhoto ? `View Photo — Page ${item.pageNumber}` : `View Page ${item.pageNumber}`}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <Separator />
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setParsedItems([])}>
                Discard All
              </Button>
              <Button onClick={handleSaveApproved} disabled={saveItemsMutation.isPending}>
                {saveItemsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Save className="h-4 w-4 mr-2" />
                Save {parsedItems.filter(i => i.selected).length} Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle>Inspection Items ({savedItems.length})</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setAddingManual(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
              {selectedSavedItems.size > 0 && (
                <Button size="sm" onClick={handleBulkSendBids}>
                  <Send className="h-4 w-4 mr-1" />
                  Send for Bids ({selectedSavedItems.size})
                </Button>
              )}
              {savedItems.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all inspection items?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove all {savedItems.length} inspection item{savedItems.length !== 1 ? 's' : ''} and any associated bid requests. You can re-upload the inspection report afterward if needed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => clearAllMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {clearAllMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Clear All Items
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No inspection items yet.</p>
              <p className="text-sm">Upload an inspection report or add items manually.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSavedCategories.map(cat => {
                const items = savedByCategory[cat];
                const isCollapsed = collapsedCategories.has(`saved-${cat}`);
                return (
                  <div key={cat} className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors touch-manipulation"
                      onClick={() => toggleCategory(`saved-${cat}`)}
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="font-semibold text-sm">{getCategoryLabel(cat)}</span>
                        <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                      </div>
                    </button>
                    {!isCollapsed && (
                      <div className="divide-y">
                        {items.map((item) => (
                          <div key={item.id} className="hover:bg-muted/20 transition-colors">
                            <div className="p-4 space-y-2.5">
                              <div className="flex items-start gap-3">
                                <Checkbox
                                  checked={selectedSavedItems.has(item.id)}
                                  onCheckedChange={() => toggleSavedItem(item.id)}
                                  className="mt-0.5 shrink-0"
                                  disabled={item.status !== "approved"}
                                />
                                <SeverityIcon severity={item.severity} />
                                <p className="text-sm leading-relaxed flex-1">{item.description}</p>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap pl-10">
                                <SeverityBadge severity={item.severity} />
                                <Badge variant="outline" className="text-xs">{STATUS_LABELS[item.status] || item.status}</Badge>
                                {item.location && (
                                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{item.location}</Badge>
                                )}
                              </div>

                              {item.pageNumber && (
                                <div className="pl-10">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium bg-primary/5 hover:bg-primary/10 active:bg-primary/15 border-primary/20 text-primary transition-colors touch-manipulation"
                                    onClick={() => openPageViewer(item.pageNumber!)}
                                  >
                                    {(item as any).hasPhoto ? (
                                      <Image className="h-4 w-4" />
                                    ) : (
                                      <BookOpen className="h-4 w-4" />
                                    )}
                                    {(item as any).hasPhoto ? `View Photo — Page ${item.pageNumber}` : `View Page ${item.pageNumber}`}
                                  </button>
                                </div>
                              )}

                              {item.notes && (
                                <p className="text-sm text-muted-foreground pl-10">{item.notes}</p>
                              )}

                              {(item as any).repairRequested && (
                                <div className="flex items-center gap-2 ml-10 p-2 rounded bg-muted/50 border flex-wrap">
                                  <span className="text-xs text-muted-foreground">Repair Status:</span>
                                  <Select
                                    value={(item as any).repairStatus || 'requested'}
                                    onValueChange={async (val) => {
                                      try {
                                        await apiRequest("PATCH", `/api/inspection-items/${item.id}/repair-status`, {
                                          repairStatus: val,
                                        });
                                        queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
                                        toast({ title: "Repair status updated" });
                                      } catch {
                                        toast({ title: "Failed to update", variant: "destructive" });
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="h-7 w-[140px] text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="requested">Requested</SelectItem>
                                      <SelectItem value="agreed">Seller Agreed</SelectItem>
                                      <SelectItem value="denied">Seller Denied</SelectItem>
                                      <SelectItem value="credit_offered">Credit Offered</SelectItem>
                                      <SelectItem value="resolved">Resolved</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {(item as any).repairStatus === 'credit_offered' && (
                                    <Input
                                      type="number"
                                      placeholder="Credit $"
                                      className="h-7 w-24 text-xs"
                                      defaultValue={(item as any).creditAmount || ''}
                                      onBlur={async (e) => {
                                        if (e.target.value) {
                                          try {
                                            await apiRequest("PATCH", `/api/inspection-items/${item.id}/repair-status`, {
                                              creditAmount: Number(e.target.value),
                                            });
                                            queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
                                          } catch {}
                                        }
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-end gap-2 px-4 py-2 bg-muted/30 border-t">
                              {item.status === "approved" && (
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleSendBids(item)}>
                                  <Send className="h-3 w-3 mr-1" />
                                  Send for Bids
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => deleteItemMutation.mutate(item.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addingManual} onOpenChange={setAddingManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Inspection Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={manualItem.category} onValueChange={(val) => setManualItem({ ...manualItem, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={manualItem.severity} onValueChange={(val) => setManualItem({ ...manualItem, severity: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={manualItem.description}
                onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })}
                placeholder="Describe the issue..."
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={manualItem.location}
                onChange={(e) => setManualItem({ ...manualItem, location: e.target.value })}
                placeholder="e.g., Kitchen, Master Bathroom..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingManual(false)}>Cancel</Button>
            <Button onClick={handleAddManual} disabled={!manualItem.description.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={vendorDialogItem !== null} onOpenChange={() => setVendorDialogItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send for Bids</DialogTitle>
          </DialogHeader>
          {vendorDialogItem && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium text-sm">{vendorDialogItem.description}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {getCategoryLabel(vendorDialogItem.category)}
                  </Badge>
                  <SeverityBadge severity={vendorDialogItem.severity} />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Select vendors to request bids from:</Label>
                {contractors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vendors on your team. Add vendors in HomeBase Pros first.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {contractors.map(v => (
                      <div key={v.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                        <Checkbox
                          checked={selectedVendors.has(v.id)}
                          onCheckedChange={() => {
                            setSelectedVendors(prev => {
                              const next = new Set(prev);
                              if (next.has(v.id)) next.delete(v.id);
                              else next.add(v.id);
                              return next;
                            });
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getCategoryLabel(v.category)}
                            {v.phone ? ` · ${v.phone}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorDialogItem(null)}>Cancel</Button>
            <Button
              onClick={confirmSendBids}
              disabled={selectedVendors.size === 0 || sendBidsMutation.isPending}
            >
              {sendBidsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Send className="h-4 w-4 mr-2" />
              Send to {selectedVendors.size} Vendor{selectedVendors.size !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfViewerPage !== null} onOpenChange={() => { setPdfViewerPage(null); setImageLoading(false); setImageError(false); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5" />
              Page {pdfViewerPage}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {pdfViewerPage && (
              <div className="relative min-h-[200px]">
                {imageLoading && !imageError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-lg z-20">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Rendering page...</p>
                    </div>
                  </div>
                )}
                {imageError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-3 opacity-50" />
                    <p className="font-medium">Unable to load page image</p>
                    <p className="text-sm mt-1">The PDF page could not be rendered.</p>
                  </div>
                ) : (
                  <img
                    key={`page-img-${pdfViewerPage}`}
                    src={`/api/transactions/${transactionId}/inspection-pdf?page=${pdfViewerPage}&format=image&t=${Date.now()}`}
                    alt={`Inspection Report Page ${pdfViewerPage}`}
                    className="w-full h-auto rounded-lg border"
                    onLoad={() => setImageLoading(false)}
                    onError={() => { setImageLoading(false); setImageError(true); }}
                  />
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
