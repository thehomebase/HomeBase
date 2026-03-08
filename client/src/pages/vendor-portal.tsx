import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contractor, ContractorReview, BidRequest, Bid } from "@shared/schema";
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
} from "lucide-react";
import { SiGoogle, SiYelp } from "react-icons/si";

function DashboardTab({ profile, bidRequests, bids }: {
  profile: Contractor | null;
  bidRequests: BidRequest[];
  bids: Bid[];
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
            <div className="text-center space-y-2">
              <UserCircle className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-semibold">No Profile Found</h3>
              <p className="text-sm text-muted-foreground">
                An agent needs to add you as a contractor and link your vendor account to start receiving bid requests.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BidRequestsTab({ bidRequests, profile }: {
  bidRequests: BidRequest[];
  profile: Contractor | null;
}) {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<BidRequest | null>(null);
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
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Request #{br.id}</span>
                  {getStatusBadge(br.status)}
                </div>
                <p className="text-sm text-muted-foreground">
                  Transaction #{br.transactionId} · Item #{br.inspectionItemId}
                </p>
                {br.notes && <p className="text-sm">{br.notes}</p>}
                {br.expiresAt && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(br.expiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              {(br.status === 'pending' || br.status === 'viewed') && (
                <Button size="sm" onClick={() => setSelectedRequest(br)}>
                  <DollarSign className="h-4 w-4 mr-1" />
                  Submit Bid
                </Button>
              )}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UserCircle className="h-12 w-12 mx-auto mb-4" />
        <p>No vendor profile found. An agent needs to link your account to a contractor profile.</p>
      </div>
    );
  }

  const categories = [
    'home_inspector', 'roofer', 'plumber', 'electrician', 'hvac', 'painter',
    'landscaper', 'handyman', 'mover', 'cleaner', 'pest_control',
    'title_company', 'mortgage_lender', 'appraiser', 'photographer', 'stager', 'other'
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Business Profile</h2>
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

        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </form>
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
        <TabsList className="grid w-full grid-cols-5 max-w-xl">
          <TabsTrigger value="dashboard" className="flex items-center gap-1">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
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
          <DashboardTab profile={profile ?? null} bidRequests={bidRequests} bids={bids} />
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