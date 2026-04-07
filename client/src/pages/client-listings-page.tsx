import { useState, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Home, Eye, FileText, MessageSquare, ExternalLink, Upload,
  Search, Filter, User, Download, Trash2, Loader2, Send,
  ChevronDown, ChevronUp, Paperclip, Clock, MapPin, X
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type ClientListing = {
  id: number;
  userId: number;
  url: string;
  source: string;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  notes: string | null;
  buyerNotes: string | null;
  agentNotes: string | null;
  agentDocuments: any[];
  showingRequested: boolean;
  createdAt: string | null;
  clientId: number;
  clientFirstName: string;
  clientLastName: string;
  clientEmail: string | null;
  clientPhone: string | null;
};

export default function ClientListingsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [clientFilter, setClientFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [agentNoteText, setAgentNoteText] = useState("");
  const [uploadDialogId, setUploadDialogId] = useState<number | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("general");

  const { data: listings = [], isLoading } = useQuery<ClientListing[]>({
    queryKey: ["/api/agent/client-listings"],
  });

  const agentNotesMutation = useMutation({
    mutationFn: async ({ id, agentNotes }: { id: number; agentNotes: string }) => {
      await apiRequest("PATCH", `/api/saved-properties/${id}/agent-notes`, { agentNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/client-listings"] });
      toast({ title: "Response saved", description: "Your client will be notified." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save response.", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ id, file, name, category }: { id: number; file: File; name: string; category: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", name || file.name);
      formData.append("category", category);
      const res = await fetch(`/api/saved-properties/${id}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/client-listings"] });
      toast({ title: "Document uploaded", description: "Your client will be notified." });
      setUploadDialogId(null);
      setUploadFile(null);
      setUploadName("");
      setUploadCategory("general");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async ({ id, docIndex }: { id: number; docIndex: number }) => {
      await apiRequest("DELETE", `/api/saved-properties/${id}/documents/${docIndex}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/client-listings"] });
      toast({ title: "Document removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove document.", variant: "destructive" });
    },
  });

  const uniqueClients = Array.from(
    new Map(listings.map(l => [l.clientId, { id: l.clientId, name: `${l.clientFirstName} ${l.clientLastName}` }])).values()
  );

  const filtered = listings.filter(l => {
    if (clientFilter !== "all" && l.clientId !== parseInt(clientFilter)) return false;
    if (statusFilter === "showing" && !l.showingRequested) return false;
    if (statusFilter === "notes" && !l.buyerNotes) return false;
    if (statusFilter === "needs-reply" && (!l.buyerNotes || l.agentNotes)) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const addr = [l.streetAddress, l.city, l.state, l.zipCode].filter(Boolean).join(" ").toLowerCase();
      const client = `${l.clientFirstName} ${l.clientLastName}`.toLowerCase();
      if (!addr.includes(term) && !client.includes(term)) return false;
    }
    return true;
  });

  const showingCount = listings.filter(l => l.showingRequested).length;
  const noteCount = listings.filter(l => l.buyerNotes).length;
  const needsReplyCount = listings.filter(l => l.buyerNotes && !l.agentNotes).length;

  const formatAddress = (l: ClientListing) => {
    return l.streetAddress || [l.city, l.state, l.zipCode].filter(Boolean).join(", ") || "Unknown Address";
  };

  const formatPrice = (notes: string | null) => {
    if (!notes) return null;
    const parts = notes.split(" · ");
    return parts.find(p => p.startsWith("$"));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="h-6 w-6" />
          Client Listings
        </h1>
        <p className="text-muted-foreground mt-1">
          View all properties your buyer clients have favorited, their notes and questions, and manage showings and documents.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-2xl font-bold">{listings.length}</div>
          <div className="text-xs text-muted-foreground">Total Saved</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-blue-600">{showingCount}</div>
          <div className="text-xs text-muted-foreground">Showing Requests</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-purple-600">{noteCount}</div>
          <div className="text-xs text-muted-foreground">With Notes</div>
        </Card>
        <Card className="p-3">
          <div className="text-2xl font-bold text-amber-600">{needsReplyCount}</div>
          <div className="text-xs text-muted-foreground">Needs Reply</div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or client name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {uniqueClients.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Listings</SelectItem>
            <SelectItem value="showing">Showing Requested</SelectItem>
            <SelectItem value="notes">Has Notes</SelectItem>
            <SelectItem value="needs-reply">Needs Reply</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Home className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg">No listings found</h3>
          <p className="text-muted-foreground mt-1">
            {listings.length === 0
              ? "None of your clients have saved any listings yet."
              : "No listings match your current filters."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((listing) => {
            const isExpanded = expandedId === listing.id;
            const price = formatPrice(listing.notes);
            const docs = listing.agentDocuments || [];

            return (
              <Card key={listing.id} className={`overflow-hidden transition-shadow ${listing.showingRequested ? 'border-blue-300 dark:border-blue-700' : ''} ${listing.buyerNotes && !listing.agentNotes ? 'border-amber-300 dark:border-amber-700' : ''}`}>
                <div
                  className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => {
                    if (isExpanded) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(listing.id);
                      setAgentNoteText(listing.agentNotes || "");
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{formatAddress(listing)}</h3>
                        {price && <span className="text-sm font-semibold text-primary">{price}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <User className="h-3.5 w-3.5" />
                        <span>{listing.clientFirstName} {listing.clientLastName}</span>
                        {listing.clientEmail && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="truncate">{listing.clientEmail}</span>
                          </>
                        )}
                      </div>
                      {listing.city && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[listing.city, listing.state, listing.zipCode].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {listing.showingRequested && (
                        <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Eye className="h-3 w-3 mr-1" /> Showing
                        </Badge>
                      )}
                      {listing.buyerNotes && !listing.agentNotes && (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          <MessageSquare className="h-3 w-3 mr-1" /> Needs Reply
                        </Badge>
                      )}
                      {listing.buyerNotes && listing.agentNotes && (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          <MessageSquare className="h-3 w-3 mr-1" /> Replied
                        </Badge>
                      )}
                      {docs.length > 0 && (
                        <Badge variant="outline">
                          <Paperclip className="h-3 w-3 mr-1" /> {docs.length}
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    <Tabs defaultValue={listing.buyerNotes ? "notes" : "details"} className="mt-3">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="notes" className="relative">
                          Notes
                          {listing.buyerNotes && !listing.agentNotes && (
                            <span className="absolute -top-1 -right-1 h-2 w-2 bg-amber-500 rounded-full" />
                          )}
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                          Documents {docs.length > 0 && `(${docs.length})`}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="details" className="mt-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Source:</span>{" "}
                            <span className="capitalize">{listing.source}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Saved:</span>{" "}
                            {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : "—"}
                          </div>
                          {listing.notes && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Listing Info:</span>{" "}
                              {listing.notes}
                            </div>
                          )}
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Showing:</span>{" "}
                            {listing.showingRequested ? (
                              <Badge className="bg-blue-600 text-white text-xs ml-1">Requested</Badge>
                            ) : (
                              <span className="text-muted-foreground">Not requested</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(listing.url, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            View Listing
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="notes" className="mt-3 space-y-3">
                        {listing.buyerNotes ? (
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <User className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                                {listing.clientFirstName}'s Note
                              </span>
                            </div>
                            <p className="text-sm">{listing.buyerNotes}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No notes from client yet.</p>
                        )}

                        <div className="space-y-2">
                          <Label className="text-sm font-medium flex items-center gap-1.5">
                            <Send className="h-3.5 w-3.5" />
                            Your Response
                          </Label>
                          <Textarea
                            placeholder="Reply to your client's question, add notes about this property, schedule info..."
                            value={agentNoteText}
                            onChange={(e) => setAgentNoteText(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => {
                                agentNotesMutation.mutate({ id: listing.id, agentNotes: agentNoteText });
                              }}
                              disabled={agentNotesMutation.isPending}
                            >
                              {agentNotesMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5 mr-1" />
                              )}
                              {listing.agentNotes ? "Update Response" : "Send Response"}
                            </Button>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="mt-3 space-y-3">
                        {docs.length > 0 ? (
                          <div className="space-y-2">
                            {docs.map((doc: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between border rounded-lg p-2.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium truncate">{doc.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {doc.category !== 'general' && <Badge variant="outline" className="text-[10px] mr-1">{doc.category}</Badge>}
                                      {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : ''}
                                      {doc.uploadedAt && ` · ${new Date(doc.uploadedAt).toLocaleDateString()}`}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => window.open(`/api/saved-properties/${listing.id}/documents/${idx}/download`, "_blank")}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => deleteDocMutation.mutate({ id: listing.id, docIndex: idx })}
                                    disabled={deleteDocMutation.isPending}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">No documents uploaded yet.</p>
                        )}

                        <Dialog open={uploadDialogId === listing.id} onOpenChange={(open) => {
                          if (!open) {
                            setUploadDialogId(null);
                            setUploadFile(null);
                            setUploadName("");
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setUploadDialogId(listing.id)}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" />
                              Upload Document
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Upload Document for {formatAddress(listing)}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-2">
                              <div>
                                <Label>File</Label>
                                <Input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setUploadFile(file);
                                      if (!uploadName) setUploadName(file.name);
                                    }
                                  }}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Document Name</Label>
                                <Input
                                  value={uploadName}
                                  onChange={(e) => setUploadName(e.target.value)}
                                  placeholder="e.g., Seller's Disclosure"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label>Category</Label>
                                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="general">General</SelectItem>
                                    <SelectItem value="disclosure">Disclosure</SelectItem>
                                    <SelectItem value="inspection">Inspection Report</SelectItem>
                                    <SelectItem value="hoa">HOA Documents</SelectItem>
                                    <SelectItem value="survey">Survey</SelectItem>
                                    <SelectItem value="floorplan">Floor Plan</SelectItem>
                                    <SelectItem value="photos">Photos</SelectItem>
                                    <SelectItem value="comps">Comparable Sales</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setUploadDialogId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => {
                                    if (uploadFile) {
                                      uploadMutation.mutate({
                                        id: listing.id,
                                        file: uploadFile,
                                        name: uploadName,
                                        category: uploadCategory,
                                      });
                                    }
                                  }}
                                  disabled={!uploadFile || uploadMutation.isPending}
                                >
                                  {uploadMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4 mr-1" />
                                  )}
                                  Upload
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
