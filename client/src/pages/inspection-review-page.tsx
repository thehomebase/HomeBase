import { useState } from "react";
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
import {
  ArrowLeft, Upload, FileText, Plus, Trash2, Save, Send,
  AlertTriangle, CheckCircle2, Circle, ShieldAlert, Loader2, Eye, BookOpen,
  Bot, Sparkles, Shield
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
  { value: "minor", label: "Minor", color: "bg-blue-100 text-blue-800" },
  { value: "moderate", label: "Moderate", color: "bg-yellow-100 text-yellow-800" },
  { value: "major", label: "Major", color: "bg-orange-100 text-orange-800" },
  { value: "safety", label: "Safety", color: "bg-red-100 text-red-800" },
];

const STATUS_LABELS: Record<string, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
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
  pageNumber?: number;
  selected: boolean;
};

function SeverityIcon({ severity }: { severity: string }) {
  switch (severity) {
    case "safety": return <ShieldAlert className="h-4 w-4 text-red-600" />;
    case "major": return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case "moderate": return <Circle className="h-4 w-4 text-yellow-600" />;
    default: return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITIES.find(sv => sv.value === severity);
  return <Badge className={s?.color || ""}>{s?.label || severity}</Badge>;
}

export default function InspectionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const transactionId = id ? parseInt(id, 10) : null;

  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [showParsed, setShowParsed] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedSavedItems, setSelectedSavedItems] = useState<Set<number>>(new Set());
  const [vendorDialogItem, setVendorDialogItem] = useState<InspectionItem | null>(null);
  const [selectedVendors, setSelectedVendors] = useState<Set<number>>(new Set());
  const [bulkSendMode, setBulkSendMode] = useState(false);
  const [addingManual, setAddingManual] = useState(false);
  const [pdfViewerPage, setPdfViewerPage] = useState<number | null>(null);
  const [manualItem, setManualItem] = useState({
    category: "other",
    description: "",
    severity: "moderate",
    location: "",
    notes: "",
  });

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !transactionId) return;

    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/transactions/${transactionId}/parse-inspection`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to parse inspection report");
      }

      const data = await response.json();
      const items = data.items || [];
      setParsedItems(items.map((item: any) => ({ ...item, selected: true })));
      setShowParsed(true);
      toast({ title: `Found ${items.length} repair items in the report` });
    } catch (error: any) {
      toast({ title: "Failed to parse report", description: error.message, variant: "destructive" });
    } finally {
      setIsParsing(false);
      e.target.value = "";
    }
  };

  const saveItemsMutation = useMutation({
    mutationFn: async (items: any[]) => {
      const res = await apiRequest("POST", `/api/transactions/${transactionId}/inspection-items`, { items });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
      setParsedItems([]);
      setShowParsed(false);
      toast({ title: `Saved ${data.length} inspection items` });
    },
    onError: () => {
      toast({ title: "Failed to save items", variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/inspection-items/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "inspection-items"] });
      toast({ title: "Item updated" });
    },
    onError: () => {
      toast({ title: "Failed to update item", variant: "destructive" });
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
    onError: () => {
      toast({ title: "Failed to remove item", variant: "destructive" });
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
      toast({ title: "Bid requests sent to vendors" });
    },
    onError: () => {
      toast({ title: "Failed to send bid requests", variant: "destructive" });
    },
  });

  const handleSaveApproved = () => {
    const selected = parsedItems.filter(item => item.selected);
    if (selected.length === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }
    const items = selected.map(item => ({
      transactionId,
      category: item.category,
      description: item.description,
      severity: item.severity,
      location: item.location || null,
      pageNumber: item.pageNumber || null,
      status: "approved",
      notes: null,
    }));
    saveItemsMutation.mutate(items);
  };

  const handleAddManual = () => {
    if (!manualItem.description) return;
    const items = [{
      transactionId,
      category: manualItem.category,
      description: manualItem.description,
      severity: manualItem.severity,
      location: manualItem.location || null,
      status: "approved",
      notes: manualItem.notes || null,
    }];
    saveItemsMutation.mutate(items, {
      onSuccess: () => {
        setAddingManual(false);
        setManualItem({ category: "other", description: "", severity: "moderate", location: "", notes: "" });
      },
    });
  };

  const handleSendBids = (item: InspectionItem) => {
    setVendorDialogItem(item);
    setSelectedVendors(new Set());
  };

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
    if (!vendorDialogItem || selectedVendors.size === 0) return;

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

  const relevantContractors = vendorDialogItem
    ? contractors.filter((c: Contractor) => {
        const catMap: Record<string, string[]> = {
          roof: ["roofer"],
          plumbing: ["plumber"],
          electrical: ["electrician"],
          hvac: ["hvac"],
          foundation: ["handyman", "other"],
          exterior: ["painter", "handyman", "landscaper"],
          interior: ["painter", "handyman"],
          appliances: ["handyman", "other"],
          other: ["handyman", "other"],
        };
        const matchingCategories = catMap[vendorDialogItem.category] || ["other"];
        return matchingCategories.includes(c.category) || c.category === "other";
      })
    : [];

  const toggleSavedItem = (itemId: number) => {
    setSelectedSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const address = transaction ? `${transaction.streetName}, ${transaction.city}` : "";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/transactions/${transactionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Inspection Review</h1>
          {address && <p className="text-sm text-muted-foreground">{address}</p>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Inspection Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isParsing}
              className="max-w-md"
            />
            {isParsing && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing report...
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Upload a PDF inspection report. AI will extract repair items for your review before anything is saved.
          </p>
          <div className="flex items-start gap-2 p-3 mt-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-300">
              <span className="font-medium">Privacy Protected:</span> Your report is processed in memory and never stored permanently. Sensitive data is automatically redacted before AI processing.{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-green-900 dark:hover:text-green-100">Learn more</a>
            </div>
          </div>
        </CardContent>
      </Card>

      {showParsed && parsedItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Parsed Items ({parsedItems.filter(i => i.selected).length} / {parsedItems.length} selected)
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedItems(parsedItems.map(i => ({ ...i, selected: true })))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedItems(parsedItems.map(i => ({ ...i, selected: false })))}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-700 dark:text-purple-300">
                <span className="font-medium">AI-Extracted Items</span>
                <span> — These items were automatically extracted using AI. Please review each item's category, severity, and description carefully before saving. AI may misclassify items or miss context.</span>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-700 dark:text-green-300">
                <span className="font-medium">Privacy Protected:</span> Sensitive data (SSNs, account numbers, emails) was automatically redacted before AI processing.{" "}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-green-900 dark:hover:text-green-100">Learn more</a>
              </div>
            </div>

            {parsedItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                <Checkbox
                  checked={item.selected}
                  onCheckedChange={(checked) => {
                    const updated = [...parsedItems];
                    updated[idx] = { ...updated[idx], selected: !!checked };
                    setParsedItems(updated);
                  }}
                  className="mt-1"
                />
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Category</Label>
                    <Select
                      value={item.category}
                      onValueChange={(val) => {
                        const updated = [...parsedItems];
                        updated[idx] = { ...updated[idx], category: val };
                        setParsedItems(updated);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Severity</Label>
                    <Select
                      value={item.severity}
                      onValueChange={(val) => {
                        const updated = [...parsedItems];
                        updated[idx] = { ...updated[idx], severity: val };
                        setParsedItems(updated);
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...parsedItems];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setParsedItems(updated);
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
                {item.pageNumber && (
                  <span className="text-xs text-muted-foreground shrink-0 mt-2">
                    p.{item.pageNumber}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setParsedItems(parsedItems.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowParsed(false); setParsedItems([]); }}>
                Cancel
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
            <div className="flex gap-2">
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
            <div className="space-y-3">
              {savedItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={selectedSavedItems.has(item.id)}
                    onCheckedChange={() => toggleSavedItem(item.id)}
                    className="mt-1"
                    disabled={item.status !== "approved"}
                  />
                  <SeverityIcon severity={item.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium">{item.description}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">
                        {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                      </Badge>
                      <SeverityBadge severity={item.severity} />
                      <Badge variant="outline">{STATUS_LABELS[item.status] || item.status}</Badge>
                      {item.location && (
                        <span className="text-xs text-muted-foreground">{item.location}</span>
                      )}
                      {item.pageNumber && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setPdfViewerPage(item.pageNumber!)}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Page {item.pageNumber}
                        </Button>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                    {(item as any).repairRequested && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded bg-muted/50 border">
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
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "approved" && (
                      <Button variant="outline" size="sm" onClick={() => handleSendBids(item)}>
                        <Send className="h-3 w-3 mr-1" />
                        Send for Bids
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
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
              <Label>Description *</Label>
              <Textarea
                value={manualItem.description}
                onChange={(e) => setManualItem({ ...manualItem, description: e.target.value })}
                placeholder="Describe the repair item..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={manualItem.location}
                onChange={(e) => setManualItem({ ...manualItem, location: e.target.value })}
                placeholder="e.g., Master bathroom, Kitchen"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={manualItem.notes}
                onChange={(e) => setManualItem({ ...manualItem, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingManual(false)}>Cancel</Button>
            <Button onClick={handleAddManual} disabled={!manualItem.description || saveItemsMutation.isPending}>
              {saveItemsMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vendorDialogItem} onOpenChange={(open) => { if (!open) { setVendorDialogItem(null); setBulkSendMode(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {bulkSendMode
                ? `Send ${savedItems.filter(i => selectedSavedItems.has(i.id) && i.status === "approved").length} Items for Bids`
                : "Select Vendors for Bid Request"}
            </DialogTitle>
          </DialogHeader>
          {vendorDialogItem && (
            <div className="space-y-4">
              {!bulkSendMode && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{vendorDialogItem.description}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary">
                      {CATEGORIES.find(c => c.value === vendorDialogItem.category)?.label}
                    </Badge>
                    <SeverityBadge severity={vendorDialogItem.severity} />
                  </div>
                </div>
              )}

              <div>
                <Label className="mb-2 block">
                  Select Vendors ({selectedVendors.size} selected)
                  {relevantContractors.length === 0 && (
                    <span className="text-muted-foreground ml-2">— showing all contractors</span>
                  )}
                </Label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(relevantContractors.length > 0 ? relevantContractors : contractors).map((c: Contractor) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedVendors(prev => {
                          const next = new Set(prev);
                          if (next.has(c.id)) next.delete(c.id);
                          else next.add(c.id);
                          return next;
                        });
                      }}
                    >
                      <Checkbox checked={selectedVendors.has(c.id)} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.category} {c.phone ? `· ${c.phone}` : ""}</p>
                      </div>
                    </div>
                  ))}
                  {contractors.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No contractors found. Add contractors first.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVendorDialogItem(null); setBulkSendMode(false); }}>Cancel</Button>
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

      <Dialog open={pdfViewerPage !== null} onOpenChange={() => setPdfViewerPage(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Inspection Report {pdfViewerPage ? `- Page ${pdfViewerPage}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={`/api/transactions/${transactionId}/inspection-pdf${pdfViewerPage ? `#page=${pdfViewerPage}` : ""}`}
              className="w-full h-full border rounded-lg"
              style={{ minHeight: "60vh" }}
              title="Inspection Report PDF"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}