import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contractor, ContractorReview, BidRequest, Bid, InspectionItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  LayoutDashboard,
  FileText,
  Gavel,
  UserCircle,
  Star,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  BookOpen,
  Eye,
  MapPin,
  Zap,
  TrendingUp,
  Trash2,
  Plus,
  Users,
  Search,
  Send,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { SiGoogle, SiYelp } from "react-icons/si";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { VendorLead, VendorZipCode, VendorTeamRequest } from "@shared/schema";

function DashboardTab({ profile, bidRequests, bids, onSwitchToProfile }: {
  profile: Contractor | null;
  bidRequests: BidRequest[];
  bids: Bid[];
  onSwitchToProfile?: () => void;
}) {
  const pendingRequests = bidRequests.filter(br => br.status === 'pending' || br.status === 'viewed');
  const activeBids = bids.filter(b => b.status === 'submitted');
  const wonBids = bids.filter(b => b.status === 'accepted');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Welcome{profile ? `, ${profile.name}` : ''}
        </h2>
        <p className="text-muted-foreground">
          {profile ? 'Here\'s an overview of your activity.' : 'Set up your profile to start receiving bid requests.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Incoming Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
            <p className="text-xs text-muted-foreground">Awaiting your response</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Bids</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBids.length}</div>
            <p className="text-xs text-muted-foreground">Submitted & pending review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won Bids</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wonBids.length}</div>
            <p className="text-xs text-muted-foreground">Accepted by agents</p>
          </CardContent>
        </Card>
      </div>

      {!profile && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <UserCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-semibold">Create Your Profile to Get Started</h3>
              <p className="text-sm text-muted-foreground">
                Set up your vendor profile to start receiving bid requests and connecting with agents.
              </p>
              {onSwitchToProfile && (
                <Button onClick={onSwitchToProfile} className="mt-2">
                  <Plus className="h-4 w-4 mr-1" />
                  Create Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type EnrichedBidRequest = BidRequest & {
  inspectionItem?: InspectionItem;
  hasPdf?: boolean;
};

function BidRequestsTab({ bidRequests, profile }: {
  bidRequests: EnrichedBidRequest[];
  profile: Contractor | null;
}) {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<EnrichedBidRequest | null>(null);
  const [pdfViewerTxId, setPdfViewerTxId] = useState<number | null>(null);
  const [pdfViewerPage, setPdfViewerPage] = useState<number | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidDays, setBidDays] = useState("");
  const [bidDescription, setBidDescription] = useState("");
  const [bidWarranty, setBidWarranty] = useState("");

  const submitBidMutation = useMutation({
    mutationFn: async (data: { bidRequestId: number; contractorId: number; amount: number; estimatedDays?: number; description?: string; warranty?: string }) => {
      const res = await apiRequest("POST", "/api/bids", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bid submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/bid-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/bids"] });
      setSelectedRequest(null);
      setBidAmount("");
      setBidDays("");
      setBidDescription("");
      setBidWarranty("");
    },
    onError: () => {
      toast({ title: "Failed to submit bid", variant: "destructive" });
    },
  });

  const handleSubmitBid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !profile) return;
    const amount = Math.round(parseFloat(bidAmount) * 100);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    submitBidMutation.mutate({
      bidRequestId: selectedRequest.id,
      contractorId: profile.id,
      amount,
      estimatedDays: bidDays ? parseInt(bidDays) : undefined,
      description: bidDescription || undefined,
      warranty: bidWarranty || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'viewed': return <Badge variant="secondary">Viewed</Badge>;
      case 'bid_submitted': return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Bid Submitted</Badge>;
      case 'declined': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      case 'expired': return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4" />
        <p>No vendor profile linked. Contact an agent to get started.</p>
      </div>
    );
  }

  if (bidRequests.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4" />
        <p>No bid requests yet. They will appear here when agents send you repair items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Incoming Bid Requests</h2>
      {bidRequests.map((br) => (
        <Card key={br.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Request #{br.id}</span>
                  {getStatusBadge(br.status)}
                </div>
                {br.inspectionItem ? (
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                    <p className="font-medium text-sm">{br.inspectionItem.description}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {br.inspectionItem.category}
                      </Badge>
                      <Badge variant={
                        br.inspectionItem.severity === 'safety' ? 'destructive' :
                        br.inspectionItem.severity === 'major' ? 'default' : 'outline'
                      } className="text-xs">
                        {br.inspectionItem.severity}
                      </Badge>
                      {br.inspectionItem.location && (
                        <span className="text-xs text-muted-foreground">{br.inspectionItem.location}</span>
                      )}
                      {(br.inspectionItem as any).hasPhoto && (
                        <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Photo in Report
                        </Badge>
                      )}
                      {br.inspectionItem.pageNumber && br.hasPdf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setPdfViewerTxId(br.transactionId);
                            setPdfViewerPage(br.inspectionItem!.pageNumber!);
                          }}
                        >
                          <BookOpen className="h-3 w-3 mr-1" />
                          Page {br.inspectionItem.pageNumber}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Transaction #{br.transactionId} · Item #{br.inspectionItemId}
                  </p>
                )}
                {br.notes && <p className="text-sm">{br.notes}</p>}
                {br.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(br.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                {br.hasPdf && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setPdfViewerTxId(br.transactionId);
                    setPdfViewerPage(br.inspectionItem?.pageNumber || null);
                  }}>
                    <Eye className="h-4 w-4 mr-1" />
                    View Report
                  </Button>
                )}
                {(br.status === 'pending' || br.status === 'viewed') && (
                  <Button size="sm" onClick={() => setSelectedRequest(br)}>
                    <DollarSign className="h-4 w-4 mr-1" />
                    Submit Bid
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Bid for Request #{selectedRequest?.id}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitBid} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bid-amount">Amount ($)</Label>
              <Input
                id="bid-amount"
                type="number"
                step="0.01"
                min="0"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="e.g. 1500.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-days">Estimated Days to Complete</Label>
              <Input
                id="bid-days"
                type="number"
                min="1"
                value={bidDays}
                onChange={(e) => setBidDays(e.target.value)}
                placeholder="e.g. 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-description">Description of Work</Label>
              <Textarea
                id="bid-description"
                value={bidDescription}
                onChange={(e) => setBidDescription(e.target.value)}
                placeholder="Describe the scope of work..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bid-warranty">Warranty Information</Label>
              <Input
                id="bid-warranty"
                value={bidWarranty}
                onChange={(e) => setBidWarranty(e.target.value)}
                placeholder="e.g. 1 year parts and labor"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitBidMutation.isPending}>
              {submitBidMutation.isPending ? "Submitting..." : "Submit Bid"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={pdfViewerTxId !== null} onOpenChange={() => { setPdfViewerTxId(null); setPdfViewerPage(null); }}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Inspection Report {pdfViewerPage ? `- Page ${pdfViewerPage}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {pdfViewerTxId && (
              <iframe
                src={`/api/vendor/inspection-pdf/${pdfViewerTxId}${pdfViewerPage ? `#page=${pdfViewerPage}` : ""}`}
                className="w-full h-full border rounded-lg"
                style={{ minHeight: "60vh" }}
                title="Inspection Report PDF"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyBidsTab({ bids }: { bids: Bid[] }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Submitted</Badge>;
      case 'accepted': return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'rejected': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'withdrawn': return <Badge variant="secondary">Withdrawn</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (bids.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Gavel className="h-12 w-12 mx-auto mb-4" />
        <p>No bids submitted yet. Submit bids from your incoming requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Submitted Bids</h2>
      {bids.map((bid) => (
        <Card key={bid.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Bid #{bid.id}</span>
                  {getStatusBadge(bid.status)}
                </div>
                <p className="text-lg font-semibold text-primary">
                  ${(bid.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                {bid.estimatedDays && (
                  <p className="text-sm text-muted-foreground">
                    Estimated: {bid.estimatedDays} day{bid.estimatedDays !== 1 ? 's' : ''}
                  </p>
                )}
                {bid.description && <p className="text-sm">{bid.description}</p>}
                {bid.warranty && (
                  <p className="text-sm text-muted-foreground">Warranty: {bid.warranty}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted: {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProfileTab({ profile }: { profile: Contractor | null }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: profile?.name || "",
    category: profile?.category || "",
    phone: profile?.phone || "",
    email: profile?.email || "",
    website: profile?.website || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zipCode: profile?.zipCode || "",
    description: profile?.description || "",
    googleMapsUrl: profile?.googleMapsUrl || "",
    yelpUrl: profile?.yelpUrl || "",
    bbbUrl: profile?.bbbUrl || "",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("PATCH", "/api/vendor/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/profile"] });
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/vendor/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/profile"] });
    },
    onError: () => {
      toast({ title: "Failed to create profile", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (profile) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isSubmitting = updateMutation.isPending || createMutation.isPending;

  const categories = [
    'home_inspector', 'roofer', 'plumber', 'electrician', 'hvac', 'painter',
    'landscaper', 'handyman', 'mover', 'cleaner', 'pest_control',
    'title_company', 'mortgage_lender', 'appraiser', 'photographer', 'stager', 'other'
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{profile ? 'Business Profile' : 'Create Your Business Profile'}</h2>
      {!profile && (
        <p className="text-muted-foreground">Fill out the form below to create your vendor profile and start receiving bid requests.</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Business Name</Label>
            <Input
              id="profile-name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-category">Category</Label>
            <Select value={formData.category} onValueChange={(v) => handleChange("category", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input
              id="profile-phone"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-website">Website</Label>
            <Input
              id="profile-website"
              value={formData.website}
              onChange={(e) => handleChange("website", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-address">Address</Label>
            <Input
              id="profile-address"
              value={formData.address}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-city">City</Label>
            <Input
              id="profile-city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-state">State</Label>
            <Input
              id="profile-state"
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-zip">Zip Code</Label>
            <Input
              id="profile-zip"
              value={formData.zipCode}
              onChange={(e) => handleChange("zipCode", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-description">Description</Label>
          <Textarea
            id="profile-description"
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Describe your services..."
            rows={4}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">External Profiles</h3>
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-google" className="flex items-center gap-2">
                <SiGoogle className="h-4 w-4" /> Google Maps URL
              </Label>
              <Input
                id="profile-google"
                value={formData.googleMapsUrl}
                onChange={(e) => handleChange("googleMapsUrl", e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-yelp" className="flex items-center gap-2">
                <SiYelp className="h-4 w-4" /> Yelp URL
              </Label>
              <Input
                id="profile-yelp"
                value={formData.yelpUrl}
                onChange={(e) => handleChange("yelpUrl", e.target.value)}
                placeholder="https://yelp.com/biz/..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-bbb" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> BBB URL
              </Label>
              <Input
                id="profile-bbb"
                value={formData.bbbUrl}
                onChange={(e) => handleChange("bbbUrl", e.target.value)}
                placeholder="https://bbb.org/..."
              />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : profile ? "Save Profile" : "Create Profile"}
        </Button>
      </form>
    </div>
  );
}

type AgentOpportunity = {
  id: number;
  username: string;
  fullName: string;
  teamSize: number;
};

type TeamRequestWithAgent = VendorTeamRequest & { agentName?: string };

function FindAgentsTab({ profile }: { profile: Contractor | null }) {
  const { toast } = useToast();
  const [requestMessage, setRequestMessage] = useState<Record<number, string>>({});
  const [sendingTo, setSendingTo] = useState<number | null>(null);

  const { data: agents = [], isLoading: agentsLoading } = useQuery<AgentOpportunity[]>({
    queryKey: ["/api/vendor/agent-opportunities"],
    enabled: !!profile,
  });

  const { data: sentRequests = [], isLoading: requestsLoading } = useQuery<TeamRequestWithAgent[]>({
    queryKey: ["/api/vendor/team-requests"],
    enabled: !!profile,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (data: { agentId: number; message?: string }) => {
      const res = await apiRequest("POST", "/api/vendor/team-requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Request sent successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/team-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/agent-opportunities"] });
      setSendingTo(null);
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Search className="h-12 w-12 mx-auto mb-4" />
        <p>Create your profile first to browse agent opportunities.</p>
      </div>
    );
  }

  const requestedAgentIds = new Set(sentRequests.map(r => r.agentId));

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'accepted': return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
      case 'declined': return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Find Agents</h2>
        <p className="text-sm text-muted-foreground">
          Agents below don't have a <span className="font-medium">{profile.category.replace(/_/g, ' ')}</span> vendor on their team yet. Send a request to join!
        </p>
      </div>

      {sentRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Send className="h-4 w-4" /> Your Sent Requests ({sentRequests.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sentRequests.map((req) => (
              <Card key={req.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{(req as any).agentName || `Agent #${req.agentId}`}</p>
                      <p className="text-xs text-muted-foreground">{req.category.replace(/_/g, ' ')}</p>
                      {req.message && <p className="text-xs text-muted-foreground italic">"{req.message}"</p>}
                    </div>
                    {getStatusBadge(req.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sent: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" /> Available Agents
        </h3>
        {agentsLoading || requestsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : agents.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No agents currently looking for a {profile.category.replace(/_/g, ' ')} vendor.</p>
              <p className="text-xs mt-1">Check back later or update your category in your profile.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.filter(a => !requestedAgentIds.has(a.id)).map((agent) => (
              <Card key={agent.id}>
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{agent.fullName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {agent.teamSize} team member{agent.teamSize !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <UserCircle className="h-8 w-8 text-muted-foreground" />
                  </div>

                  {sendingTo === agent.id ? (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Add an optional message..."
                        value={requestMessage[agent.id] || ""}
                        onChange={(e) => setRequestMessage(prev => ({ ...prev, [agent.id]: e.target.value }))}
                        rows={2}
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={sendRequestMutation.isPending}
                          onClick={() => sendRequestMutation.mutate({
                            agentId: agent.id,
                            message: requestMessage[agent.id] || undefined,
                          })}
                        >
                          {sendRequestMutation.isPending ? "Sending..." : "Send Request"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSendingTo(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setSendingTo(agent.id)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" /> Request to Join
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewsTab({ profile }: { profile: Contractor | null }) {
  const { data: reviews, isLoading } = useQuery<ContractorReview[]>({
    queryKey: ["/api/contractors", profile?.id, "reviews"],
    enabled: !!profile,
    queryFn: async () => {
      if (!profile) return [];
      const res = await fetch(`/api/contractors/${profile.id}/reviews`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
  });

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-4" />
        <p>No profile linked. Reviews will appear here once your profile is set up.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-4" />
        <p>No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Reviews</h2>
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{review.reviewerName}</span>
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const SERVICE_CATEGORIES = [
  { value: "home_inspector", label: "Home Inspector" },
  { value: "roofer", label: "Roofer" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "hvac", label: "HVAC" },
  { value: "painter", label: "Painter" },
  { value: "landscaper", label: "Landscaper" },
  { value: "handyman", label: "Handyman" },
  { value: "mover", label: "Mover" },
  { value: "cleaner", label: "Cleaner" },
  { value: "pest_control", label: "Pest Control" },
  { value: "pool_maintenance", label: "Pool Maintenance" },
  { value: "windows", label: "Windows" },
  { value: "title_company", label: "Title Company" },
  { value: "mortgage_lender", label: "Mortgage Lender" },
  { value: "appraiser", label: "Appraiser" },
  { value: "photographer", label: "Photographer" },
  { value: "stager", label: "Stager" },
  { value: "other", label: "Other" },
];

function formatResponseTime(ms: number): string {
  if (ms <= 0) return "N/A";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function LeadsTab() {
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useQuery<VendorLead[]>({
    queryKey: ["/api/vendor/leads"],
  });

  const { data: stats } = useQuery<{ total: number; new: number; accepted: number; rejected: number; converted: number }>({
    queryKey: ["/api/vendor/leads/stats"],
  });

  const { data: metrics } = useQuery<{ avgResponseMs: number; fastestMs: number; slowestMs: number; totalResponded: number; responseRate: number }>({
    queryKey: ["/api/vendor/leads/response-metrics"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/vendor/leads/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/leads/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/leads/response-metrics"] });
      toast({ title: "Lead updated" });
    },
    onError: () => {
      toast({ title: "Failed to update lead", variant: "destructive" });
    },
  });

  const urgencyColors: Record<string, string> = {
    low: "bg-gray-100 text-gray-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    emergency: "bg-red-100 text-red-700",
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold">{stats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats?.new ?? 0}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats?.accepted ?? 0}</p>
            <p className="text-xs text-muted-foreground">Accepted</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats?.rejected ?? 0}</p>
            <p className="text-xs text-muted-foreground">Declined</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-4 pb-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats?.converted ?? 0}</p>
            <p className="text-xs text-muted-foreground">Converted</p>
          </CardContent>
        </Card>
      </div>

      {metrics && metrics.totalResponded > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Response Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold">{formatResponseTime(metrics.avgResponseMs)}</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{formatResponseTime(metrics.fastestMs)}</p>
                <p className="text-xs text-muted-foreground">Fastest</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{formatResponseTime(metrics.slowestMs)}</p>
                <p className="text-xs text-muted-foreground">Slowest</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{Math.round(metrics.responseRate)}%</p>
                <p className="text-xs text-muted-foreground">Response Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {leads.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No leads yet</p>
            <p className="text-sm">Claim zip codes to start receiving service requests from homeowners.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const categoryLabel = SERVICE_CATEGORIES.find(c => c.value === lead.category)?.label || lead.category;
            const timeSinceAssigned = lead.assignedAt ? Math.floor((Date.now() - new Date(lead.assignedAt).getTime()) / 60000) : null;

            return (
              <Card key={lead.id} className={lead.status === 'assigned' ? 'border-primary/30' : ''}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{lead.firstName} {lead.lastName}</span>
                        <Badge variant="outline" className="text-xs">{categoryLabel}</Badge>
                        <Badge className={`text-xs ${urgencyColors[lead.urgency] || ''}`}>{lead.urgency}</Badge>
                        {lead.status === 'assigned' && timeSinceAssigned !== null && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeSinceAssigned < 60 ? `${timeSinceAssigned}m ago` : `${Math.floor(timeSinceAssigned / 60)}h ago`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {lead.zipCode} &bull; {lead.email}{lead.phone ? ` &bull; ${lead.phone}` : ''}
                      </p>
                      {lead.description && (
                        <p className="text-sm mt-1">{lead.description}</p>
                      )}
                      {lead.respondedAt && (
                        <p className="text-xs text-muted-foreground">
                          Responded in {formatResponseTime(new Date(lead.respondedAt).getTime() - new Date(lead.assignedAt!).getTime())}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {lead.status === 'assigned' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => statusMutation.mutate({ id: lead.id, status: 'accepted' })}
                            disabled={statusMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" /> Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => statusMutation.mutate({ id: lead.id, status: 'rejected' })}
                            disabled={statusMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" /> Decline
                          </Button>
                        </>
                      )}
                      {lead.status === 'accepted' && (
                        <Badge className="bg-green-100 text-green-700">Accepted</Badge>
                      )}
                      {lead.status === 'rejected' && (
                        <Badge className="bg-red-100 text-red-700">Declined</Badge>
                      )}
                      {lead.status === 'converted' && (
                        <Badge className="bg-purple-100 text-purple-700">Converted</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const claimZipSchema = z.object({
  zipCode: z.string().min(5, "Enter a 5-digit zip code").max(5),
  category: z.string().min(1, "Select a category"),
});

function ZipCodesTab() {
  const { toast } = useToast();
  const [showPricing, setShowPricing] = useState(false);

  const { data: zipCodes = [], isLoading } = useQuery<VendorZipCode[]>({
    queryKey: ["/api/vendor/zip-codes"],
  });

  const form = useForm<z.infer<typeof claimZipSchema>>({
    resolver: zodResolver(claimZipSchema),
    defaultValues: { zipCode: "", category: "" },
  });

  const watchZip = form.watch("zipCode");
  const watchCat = form.watch("category");

  const { data: pricing } = useQuery<{
    currentVendors: number; maxVendors: number; isFull: boolean; alreadyClaimed: boolean;
    monthlyRate: number; freeSlots: number; totalClaimed: number; freeEligible: boolean;
    leadActivity?: { last30: number; last60: number; last90: number };
    noLeadsNoCharge?: boolean;
  }>({
    queryKey: ["/api/vendor/zip-codes/pricing", watchZip, watchCat],
    queryFn: async () => {
      const res = await fetch(`/api/vendor/zip-codes/pricing?zipCode=${encodeURIComponent(watchZip)}&category=${encodeURIComponent(watchCat)}`);
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
    enabled: watchZip.length === 5 && watchCat.length > 0,
  });

  const claimMutation = useMutation({
    mutationFn: async (data: z.infer<typeof claimZipSchema>) => {
      const res = await apiRequest("POST", "/api/vendor/zip-codes/claim", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/zip-codes"] });
      form.reset();
      toast({ title: "Zip code claimed!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to claim", description: error.message, variant: "destructive" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/vendor/zip-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/zip-codes"] });
      toast({ title: "Zip code released" });
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> Claim a Zip Code
          </CardTitle>
          <CardDescription>
            Claim zip codes in your service area to receive leads from homeowners. First 3 zip codes are free (in areas with low competition).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => claimMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="zipCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 75201" maxLength={5} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SERVICE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {pricing && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vendors in this zip+category:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {pricing.currentVendors} / {pricing.maxVendors}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Monthly cost:</span>
                    <span className="font-semibold text-base">
                      {pricing.monthlyRate === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        `$${(pricing.monthlyRate / 100).toFixed(2)}/mo`
                      )}
                    </span>
                  </div>
                  {pricing.freeSlots > 0 && pricing.freeEligible && (
                    <p className="text-xs text-green-600">You have {pricing.freeSlots} free slot{pricing.freeSlots !== 1 ? 's' : ''} remaining.</p>
                  )}
                  {!pricing.freeEligible && pricing.freeSlots > 0 && (
                    <p className="text-xs text-amber-600">This zip is too competitive for a free slot. Paid tier applies.</p>
                  )}
                  {pricing.isFull && (
                    <p className="text-xs text-red-600">This zip code is full for this category.</p>
                  )}
                  {pricing.alreadyClaimed && (
                    <p className="text-xs text-red-600">You already claimed this zip code for this category.</p>
                  )}
                  {pricing.leadActivity && (
                    <div className="border rounded-md p-3 mt-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Lead Activity</p>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold">{pricing.leadActivity.last30}</p>
                          <p className="text-[10px] text-muted-foreground">30 Days</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{pricing.leadActivity.last60}</p>
                          <p className="text-[10px] text-muted-foreground">60 Days</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{pricing.leadActivity.last90}</p>
                          <p className="text-[10px] text-muted-foreground">90 Days</p>
                        </div>
                      </div>
                      {pricing.leadActivity.last90 === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">No leads recorded yet for this area & category</p>
                      )}
                    </div>
                  )}
                  {pricing.noLeadsNoCharge && (
                    <div className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2.5 mt-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-green-700 dark:text-green-300">
                        <span className="font-semibold">No Leads, No Charge:</span> Zero leads in a billing cycle = no charge that month.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={claimMutation.isPending || pricing?.isFull || pricing?.alreadyClaimed}
                className="w-full md:w-auto"
              >
                {claimMutation.isPending ? "Claiming..." : "Claim Zip Code"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-3">Your Claimed Zip Codes ({zipCodes.length})</h3>
        {zipCodes.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No zip codes claimed yet. Claim one above to start receiving leads!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {zipCodes.map((zc) => {
              const catLabel = SERVICE_CATEGORIES.find(c => c.value === zc.category)?.label || zc.category;
              return (
                <Card key={zc.id}>
                  <CardContent className="pt-4 pb-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{zc.zipCode}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{catLabel}</p>
                      <p className="text-xs mt-1">
                        {zc.monthlyRate === 0 ? (
                          <span className="text-green-600 font-medium">Free</span>
                        ) : (
                          <span>${(zc.monthlyRate! / 100).toFixed(2)}/mo</span>
                        )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => releaseMutation.mutate(zc.id)}
                      disabled={releaseMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function VendorPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: profile, isLoading: profileLoading } = useQuery<Contractor | null>({
    queryKey: ["/api/vendor/profile"],
  });

  const { data: bidRequests = [], isLoading: requestsLoading } = useQuery<BidRequest[]>({
    queryKey: ["/api/vendor/bid-requests"],
  });

  const { data: bids = [], isLoading: bidsLoading } = useQuery<Bid[]>({
    queryKey: ["/api/vendor/bids"],
  });

  if (profileLoading || requestsLoading || bidsLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full max-w-3xl overflow-x-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="flex items-center gap-1">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="zip-codes" className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Zip Codes</span>
          </TabsTrigger>
          <TabsTrigger value="find-agents" className="flex items-center gap-1">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Find Agents</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Requests</span>
          </TabsTrigger>
          <TabsTrigger value="bids" className="flex items-center gap-1">
            <Gavel className="h-4 w-4" />
            <span className="hidden sm:inline">My Bids</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-1">
            <UserCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-1">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Reviews</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardTab profile={profile ?? null} bidRequests={bidRequests} bids={bids} onSwitchToProfile={() => setActiveTab("profile")} />
        </TabsContent>
        <TabsContent value="leads">
          <LeadsTab />
        </TabsContent>
        <TabsContent value="zip-codes">
          <ZipCodesTab />
        </TabsContent>
        <TabsContent value="find-agents">
          <FindAgentsTab profile={profile ?? null} />
        </TabsContent>
        <TabsContent value="requests">
          <BidRequestsTab bidRequests={bidRequests} profile={profile ?? null} />
        </TabsContent>
        <TabsContent value="bids">
          <MyBidsTab bids={bids} />
        </TabsContent>
        <TabsContent value="profile">
          <ProfileTab profile={profile ?? null} />
        </TabsContent>
        <TabsContent value="reviews">
          <ReviewsTab profile={profile ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}