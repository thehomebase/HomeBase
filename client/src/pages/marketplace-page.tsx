import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Contractor, type ContractorReview, type VendorRating, type VendorTeamRequest } from "@shared/schema";
import { PerformanceStatsDisplay, RateVendorDialog } from "@/pages/vendor-ratings-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Star, Phone, Mail, Globe, MapPin, UserPlus, CheckCircle2,
  Wrench, Zap, Thermometer, Home, Paintbrush, Trees, Sparkles, Hammer,
  Bug, Waves, Square, DoorOpen, Key, TreePine, Droplets, SprayCan,
  Layers, Shield, Camera, Sofa, Truck, MoreHorizontal, Construction,
  ClipboardList, Map, Settings, Users, Plus, Pencil, Trash2,
  ExternalLink, Building2, Award, ThumbsUp, LayoutGrid, List, Check, X, Bell,
  Send, Copy
} from "lucide-react";
import { SiYelp, SiGoogle } from "react-icons/si";
import { Megaphone } from "lucide-react";

function SponsoredAdBanner() {
  const { data: ads } = useQuery<any[]>({
    queryKey: ['/api/ads/active', 'marketplace'],
    queryFn: async () => {
      const res = await fetch('/api/ads/active', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (!ads || ads.length === 0) return null;

  const handleAdClick = async (ad: any) => {
    try {
      await fetch(`/api/ads/${ad.id}/click`, { method: 'POST', credentials: 'include' });
    } catch {}
    const url = ad.target_url || ad.targetUrl;
    if (url) window.open(url, '_blank', 'noopener');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ads.map((ad: any) => (
        <Card
          key={ad.id}
          className="cursor-pointer hover:shadow-md transition-shadow border-primary/20 bg-primary/5"
          onClick={() => handleAdClick(ad)}
        >
          <CardContent className="p-4 flex items-center gap-4">
            {(ad.image_url || ad.imageUrl) && (
              <img src={ad.image_url || ad.imageUrl} alt={ad.title} className="h-16 w-16 rounded-lg object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone className="h-3 w-3 text-primary" />
                <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Sponsored</span>
              </div>
              <h4 className="font-semibold text-sm truncate">{ad.title}</h4>
              {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type MarketplaceCategory = {
  id: string;
  name: string;
  icon: string;
};

type ContractorWithDetails = Contractor & {
  reviews?: ContractorReview[];
  recommendationCount?: number;
  averageRating?: number | null;
  reviewCount?: number;
  teamCount?: number;
  trustedByCount?: number;
  distance?: number | null;
};

type MarketplaceResponse = {
  contractors: ContractorWithDetails[];
  total: number;
  limit: number;
  offset: number;
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
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
  { value: "title_company", label: "Title Company" },
  { value: "mortgage_lender", label: "Mortgage Lender" },
  { value: "appraiser", label: "Appraiser" },
  { value: "photographer", label: "Photographer" },
  { value: "stager", label: "Stager" },
  { value: "other", label: "Other" }
];

const iconMap: Record<string, typeof Wrench> = {
  wrench: Wrench,
  zap: Zap,
  thermometer: Thermometer,
  home: Home,
  paintbrush: Paintbrush,
  trees: Trees,
  sparkles: Sparkles,
  hammer: Hammer,
  bug: Bug,
  waves: Waves,
  square: Square,
  "door-open": DoorOpen,
  key: Key,
  "tree-pine": TreePine,
  droplets: Droplets,
  "spray-can": SprayCan,
  fence: Construction,
  construction: Construction,
  layers: Layers,
  cabinet: Square,
  settings: Settings,
  shield: Shield,
  search: Search,
  clipboard: ClipboardList,
  map: Map,
  camera: Camera,
  sofa: Sofa,
  truck: Truck,
  "more-horizontal": MoreHorizontal,
  vacuum: Sparkles,
};

function getCategoryIcon(iconName: string) {
  return iconMap[iconName] || MoreHorizontal;
}

function StarRating({ rating, onChange, readonly = true }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ContractorForm({
  contractor,
  onClose,
  onSave
}: {
  contractor?: ContractorWithDetails;
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name: contractor?.name || "",
    category: contractor?.category || "",
    phone: contractor?.phone || "",
    email: contractor?.email || "",
    website: contractor?.website || "",
    address: contractor?.address || "",
    city: contractor?.city || "",
    state: contractor?.state || "",
    zipCode: contractor?.zipCode || "",
    description: contractor?.description || "",
    googleMapsUrl: contractor?.googleMapsUrl || "",
    yelpUrl: contractor?.yelpUrl || "",
    bbbUrl: contractor?.bbbUrl || "",
    agentRating: contractor?.agentRating || 0,
    agentNotes: contractor?.agentNotes || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Business Name *</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input id="website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
          <Input id="googleMapsUrl" value={form.googleMapsUrl} onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })} placeholder="Link to view reviews on Google" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yelpUrl">Yelp Link</Label>
          <Input id="yelpUrl" value={form.yelpUrl} onChange={(e) => setForm({ ...form, yelpUrl: e.target.value })} placeholder="Link to view reviews on Yelp" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bbbUrl">BBB Link</Label>
          <Input id="bbbUrl" value={form.bbbUrl} onChange={(e) => setForm({ ...form, bbbUrl: e.target.value })} placeholder="Link to BBB profile" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zipCode">Zip Code</Label>
          <Input id="zipCode" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Your Rating</Label>
        <StarRating rating={form.agentRating} onChange={(r) => setForm({ ...form, agentRating: r })} readonly={false} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agentNotes">Your Notes (Private)</Label>
        <Textarea id="agentNotes" value={form.agentNotes} onChange={(e) => setForm({ ...form, agentNotes: e.target.value })} rows={2} placeholder="Private notes about this pro..." />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!form.name || !form.category}>
          {contractor ? "Update" : "Add"} Pro
        </Button>
      </DialogFooter>
    </form>
  );
}

function ContractorDetail({
  contractor,
  onClose,
  isOwner
}: {
  contractor: ContractorWithDetails;
  onClose: () => void;
  isOwner: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showRateDialog, setShowRateDialog] = useState(false);

  const { data: reviews = [] } = useQuery<ContractorReview[]>({
    queryKey: ["/api/contractors", contractor.id, "reviews"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/contractors/${contractor.id}/reviews`);
      return res.json();
    }
  });

  const { data: vendorRatings = [] } = useQuery<VendorRating[]>({
    queryKey: ["/api/contractors", contractor.id, "ratings"],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/${contractor.id}/ratings`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: recommendationData, refetch: refetchRecommendations } = useQuery<{ count: number; hasRecommended: boolean; recommendations: any[] }>({
    queryKey: ["/api/contractors", contractor.id, "recommendations"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/contractors/${contractor.id}/recommendations`);
      return res.json();
    }
  });

  const recommendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/contractors/${contractor.id}/recommend`);
    },
    onSuccess: () => {
      refetchRecommendations();
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      toast({ title: "You've recommended this pro!" });
    }
  });

  const unrecommendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contractors/${contractor.id}/recommend`);
    },
    onSuccess: () => {
      refetchRecommendations();
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      toast({ title: "Recommendation removed" });
    }
  });

  const categoryLabel = CATEGORIES.find(c => c.value === contractor.category)?.label || contractor.category;
  const displayRating = contractor.averageRating ?? contractor.agentRating ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{contractor.name}</h2>
              {contractor.vendorUserId && (
                <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200 bg-green-50">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{categoryLabel}</Badge>
              {(contractor.trustedByCount ?? 0) > 0 && (
                <Badge variant="secondary" className="gap-1.5 text-sm font-normal py-1 px-3">
                  <Shield className="h-3.5 w-3.5 text-blue-500" />
                  Trusted by {contractor.trustedByCount} agent{contractor.trustedByCount === 1 ? '' : 's'}
                </Badge>
              )}
              {(contractor.teamCount ?? 0) > 0 && (
                <Badge variant="secondary" className="gap-1.5 text-sm font-normal py-1 px-3">
                  <Users className="h-3.5 w-3.5 text-purple-500" />
                  On {contractor.teamCount} team{contractor.teamCount === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
          </div>
          {displayRating > 0 && (
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-lg">{displayRating.toFixed(1)}</span>
              </div>
              {(contractor.reviewCount ?? 0) > 0 && (
                <span className="text-sm text-muted-foreground">
                  {contractor.reviewCount} review{contractor.reviewCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        {contractor.description && (
          <p className="text-muted-foreground mt-3">{contractor.description}</p>
        )}

        {(user?.role === "agent" || user?.role === "broker") && (
          <div className="mt-4">
            {recommendationData?.hasRecommended ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => unrecommendMutation.mutate()}
                disabled={unrecommendMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4 mr-2 fill-current" />
                You Recommend This Pro
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => recommendMutation.mutate()}
                disabled={recommendMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Recommend This Pro
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contractor.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${contractor.phone}`} className="text-primary hover:underline">{contractor.phone}</a>
          </div>
        )}
        {contractor.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a href={`mailto:${contractor.email}`} className="text-primary hover:underline">{contractor.email}</a>
          </div>
        )}
        {contractor.website && (
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <a href={contractor.website.startsWith('http') ? contractor.website : `https://${contractor.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              Website <ExternalLink className="h-3 w-3 inline" />
            </a>
          </div>
        )}
        {contractor.googleMapsUrl && (
          <div className="flex items-center gap-2">
            <SiGoogle className="h-4 w-4 text-muted-foreground" />
            <a href={contractor.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View on Google <ExternalLink className="h-3 w-3 inline" />
            </a>
          </div>
        )}
        {contractor.yelpUrl && (
          <div className="flex items-center gap-2">
            <SiYelp className="h-4 w-4 text-red-500" />
            <a href={contractor.yelpUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View on Yelp <ExternalLink className="h-3 w-3 inline" />
            </a>
          </div>
        )}
        {contractor.bbbUrl && (
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-green-700" />
            <a href={contractor.bbbUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              View on BBB <ExternalLink className="h-3 w-3 inline" />
            </a>
          </div>
        )}
        {(contractor.city || contractor.state) && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>
              {[contractor.address, contractor.city, contractor.state, contractor.zipCode].filter(Boolean).join(', ')}
              {contractor.distance != null && ` (${contractor.distance} mi away)`}
            </span>
          </div>
        )}
      </div>

      {isOwner && contractor.agentNotes && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Your Private Notes</h4>
          <p className="text-sm text-muted-foreground">{contractor.agentNotes}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance & Reviews</h3>
          {(user?.role === "agent" || user?.role === "broker") && (
            <Button size="sm" onClick={() => setShowRateDialog(true)}>
              <Star className="h-4 w-4 mr-1" />
              Rate
            </Button>
          )}
        </div>

        <PerformanceStatsDisplay contractorId={contractor.id} />

        {vendorRatings.length > 0 && (
          <div className="space-y-3 mt-4">
            <h4 className="font-medium text-sm text-muted-foreground">Agent Reviews ({vendorRatings.length})</h4>
            {vendorRatings.map((rating) => (
              <Card key={rating.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-1">
                    {rating.title && <span className="font-medium text-sm">{rating.title}</span>}
                    <div className="flex items-center gap-1">
                      <StarRating rating={rating.overallRating} />
                      {rating.wouldRecommend && (
                        <Badge variant="outline" className="ml-2 text-xs text-green-600 border-green-200 bg-green-50">
                          <ThumbsUp className="h-3 w-3 mr-0.5" /> Recommends
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{rating.comment}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                    {rating.qualityRating && <span>Quality: {rating.qualityRating}/5</span>}
                    {rating.communicationRating && <span>Communication: {rating.communicationRating}/5</span>}
                    {rating.timelinessRating && <span>Timeliness: {rating.timelinessRating}/5</span>}
                    {rating.valueRating && <span>Value: {rating.valueRating}/5</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <div className="space-y-3 mt-4">
            <h4 className="font-medium text-sm text-muted-foreground">Client Reviews ({reviews.length})</h4>
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{review.reviewerName}</span>
                    <StarRating rating={review.rating} />
                  </div>
                  {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-2">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {vendorRatings.length === 0 && reviews.length === 0 && (
          <p className="text-muted-foreground text-sm mt-4">No reviews yet.</p>
        )}
      </div>

      <RateVendorDialog
        contractorId={contractor.id}
        open={showRateDialog}
        onOpenChange={setShowRateDialog}
      />

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAgentOrBroker = user?.role === "agent" || user?.role === "broker";
  const [activeTab, setActiveTab] = useState<string>("marketplace");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedContractor, setSelectedContractor] = useState<ContractorWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [ratingContractorId, setRatingContractorId] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorWithDetails | null>(null);
  const [zipSearch, setZipSearch] = useState("");
  const [searchRadius, setSearchRadius] = useState("20");
  const [proximityEnabled, setProximityEnabled] = useState(false);
  const [inviteContractor, setInviteContractor] = useState<ContractorWithDetails | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useQuery<MarketplaceCategory[]>({
    queryKey: ["/api/marketplace/categories"],
  });

  const { data: marketplaceData, isLoading: contractorsLoading } = useQuery<MarketplaceResponse>({
    queryKey: ["/api/marketplace/contractors", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "100");
      const res = await fetch(`/api/marketplace/contractors?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pros");
      return res.json();
    },
    enabled: !proximityEnabled,
  });

  const { data: proximityData, isLoading: proximityLoading, refetch: refetchProximity } = useQuery<{
    searchLocation: { lat: number; lon: number; zip: string };
    radius: number;
    contractors: ContractorWithDetails[];
  }>({
    queryKey: ["/api/contractors/proximity", zipSearch, searchRadius],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/proximity?zip=${encodeURIComponent(zipSearch)}&radius=${searchRadius}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Search failed");
      }
      return res.json();
    },
    enabled: !!user && proximityEnabled && zipSearch.length === 5
  });

  const { data: myTeam } = useQuery<any[]>({
    queryKey: ["/api/my-team"],
  });

  const { data: myPrivateContractors = [], isLoading: myContractorsLoading } = useQuery<Contractor[]>({
    queryKey: ["/api/contractors/my"],
    enabled: isAgentOrBroker,
  });

  const { data: referralCode } = useQuery<{ id: number; code: string } | null>({
    queryKey: ["/api/referral/my-code"],
    queryFn: async () => {
      const res = await fetch("/api/referral/my-code", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAgentOrBroker,
  });

  const generateReferralMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/referral/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/my-code"] });
    },
  });

  const addToTeamMutation = useMutation({
    mutationFn: async (contractor: ContractorWithDetails) => {
      await apiRequest("POST", "/api/my-team", {
        contractorId: contractor.id,
        category: contractor.category,
        userId: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      toast({ title: "Added to My Team", description: "Pro has been added to your team." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add pro to team.", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/contractors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      setShowAddDialog(false);
      toast({ title: "Pro added to your team" });
    },
    onError: () => {
      toast({ title: "Failed to add pro", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/contractors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      setEditingContractor(null);
      toast({ title: "Pro updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update pro", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contractors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({ title: "Pro deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete pro", variant: "destructive" });
    }
  });

  type TeamRequestWithContractor = VendorTeamRequest & { contractor?: Contractor };

  const { data: teamRequests = [] } = useQuery<TeamRequestWithContractor[]>({
    queryKey: ["/api/agent/team-requests"],
    queryFn: async () => {
      const res = await fetch("/api/agent/team-requests", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: user?.role === "agent" || user?.role === "broker",
  });

  const pendingTeamRequests = teamRequests.filter((r) => r.status === "pending");

  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/agent/team-requests/${requestId}`, { status: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/team-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/contractors"] });
      toast({ title: "Request accepted", description: "Vendor has been added to your team." });
    },
    onError: () => {
      toast({ title: "Failed to accept request", variant: "destructive" });
    },
  });

  const declineRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/agent/team-requests/${requestId}`, { status: "declined" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/team-requests"] });
      toast({ title: "Request declined" });
    },
    onError: () => {
      toast({ title: "Failed to decline request", variant: "destructive" });
    },
  });

  const handleProximitySearch = () => {
    if (zipSearch.length !== 5) {
      toast({ title: "Please enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    setProximityEnabled(true);
    refetchProximity();
  };

  const clearProximitySearch = () => {
    setZipSearch("");
    setProximityEnabled(false);
  };

  const fetchContractorDetail = async (id: number) => {
    const res = await fetch(`/api/marketplace/contractors/${id}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch pro details");
    return res.json();
  };

  const handleViewDetails = async (contractor: ContractorWithDetails) => {
    try {
      const details = await fetchContractorDetail(contractor.id);
      setSelectedContractor(details);
      setDetailDialogOpen(true);
    } catch {
      setSelectedContractor(contractor);
      setDetailDialogOpen(true);
    }
  };

  const handleDelete = (contractor: ContractorWithDetails) => {
    if (confirm(`Are you sure you want to delete ${contractor.name}?`)) {
      deleteMutation.mutate(contractor.id);
    }
  };

  const isOnTeam = (contractorId: number) => {
    return myTeam?.some((m: any) => m.contractorId === contractorId);
  };

  const allContractors: ContractorWithDetails[] = proximityEnabled
    ? (proximityData?.contractors || [])
    : (marketplaceData?.contractors || []);

  const contractors = allContractors.filter((c) => {
    if (selectedCategory && c.category !== selectedCategory) return false;
    if (searchQuery && proximityEnabled) {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) || false) ||
        (c.city?.toLowerCase().includes(q) || false);
      if (!matchesSearch) return false;
    }
    return true;
  });

  const isLoading = proximityEnabled ? proximityLoading : contractorsLoading;

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">HomeBase Pros</h1>
          <p className="text-muted-foreground">Find trusted home service professionals</p>
        </div>
        {isAgentOrBroker && activeTab === "my-team" && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add to My Team
          </Button>
        )}
      </div>

      {isAgentOrBroker && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="marketplace">
              <Building2 className="h-4 w-4 mr-2" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="my-team">
              <Users className="h-4 w-4 mr-2" />
              My Team ({myPrivateContractors.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {activeTab === "marketplace" && <SponsoredAdBanner />}

      {activeTab === "my-team" && isAgentOrBroker ? (
        <div className="space-y-4">
          {myContractorsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : myPrivateContractors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-medium">No private team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Add vendors you work with to keep their info handy. These won't appear in the public marketplace.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Pro
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {myPrivateContractors.map((contractor) => {
                const categoryLabel = categories?.find((c) => c.id === contractor.category)?.name
                  || CATEGORIES.find(c => c.value === contractor.category)?.label
                  || contractor.category;
                const rating = contractor.agentRating ?? 0;
                const isLinked = !!contractor.vendorUserId;

                return (
                  <Card key={contractor.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <CardTitle className="text-base truncate">{contractor.name}</CardTitle>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{categoryLabel}</Badge>
                            {isLinked ? (
                              <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200 bg-green-50">
                                <CheckCircle2 className="h-3 w-3" />
                                Linked
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-xs text-orange-600 border-orange-200 bg-orange-50">
                                Private
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingContractor(contractor as ContractorWithDetails)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(contractor as ContractorWithDetails)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {rating > 0 && (
                        <div className="flex items-center gap-2">
                          <StarRating rating={rating} />
                          <span className="text-xs text-muted-foreground">Your rating</span>
                        </div>
                      )}
                      {contractor.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{contractor.description}</p>
                      )}
                      <div className="flex flex-col gap-1 text-sm">
                        {contractor.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{contractor.phone}</span>
                          </div>
                        )}
                        {contractor.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate">{contractor.email}</span>
                          </div>
                        )}
                      </div>
                      {contractor.agentNotes && (
                        <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                          {contractor.agentNotes}
                        </div>
                      )}
                      {!isLinked && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          onClick={() => setInviteContractor(contractor as ContractorWithDetails)}
                        >
                          <Send className="h-3.5 w-3.5" />
                          Invite to HomeBase
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
      {isAgentOrBroker && pendingTeamRequests.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-blue-600" />
              Vendor Team Requests ({pendingTeamRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingTeamRequests.map((request) => {
              const categoryLabel = CATEGORIES.find(c => c.value === request.category)?.label || request.category;
              return (
                <div key={request.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-background rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {(request as any).vendorName || `Vendor #${request.vendorContractorId}`}
                      </span>
                      <Badge variant="secondary">{categoryLabel}</Badge>
                    </div>
                    {request.message && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{request.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => acceptRequestMutation.mutate(request.id)}
                      disabled={acceptRequestMutation.isPending || declineRequestMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineRequestMutation.mutate(request.id)}
                      disabled={acceptRequestMutation.isPending || declineRequestMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Find by Location:</span>
        </div>
        <Input
          placeholder="Enter zip code"
          value={zipSearch}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
            setZipSearch(val);
            if (val.length < 5) setProximityEnabled(false);
          }}
          className="w-full md:w-[140px]"
          maxLength={5}
        />
        <Select value={searchRadius} onValueChange={setSearchRadius}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder="Radius" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 miles</SelectItem>
            <SelectItem value="20">20 miles</SelectItem>
            <SelectItem value="30">30 miles</SelectItem>
            <SelectItem value="50">50 miles</SelectItem>
            <SelectItem value="100">100 miles</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleProximitySearch} disabled={zipSearch.length !== 5 || proximityLoading}>
          {proximityLoading ? "Searching..." : "Search Area"}
        </Button>
        {proximityEnabled && (
          <Button variant="outline" onClick={clearProximitySearch}>
            Clear
          </Button>
        )}
        {proximityEnabled && proximityData && (
          <span className="text-sm text-muted-foreground self-center">
            {proximityData.contractors.length} pro{proximityData.contractors.length !== 1 ? 's' : ''} within {proximityData.radius} miles
          </span>
        )}
      </div>

      {categoriesLoading ? (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories?.map((cat) => {
            const Icon = getCategoryIcon(cat.icon);
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? "default" : "outline"}
                size="sm"
                className="rounded-full gap-1.5"
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.name}
              </Button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : contractors.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">No pros found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory || proximityEnabled
              ? "Try adjusting your search, category, or location filter"
              : "No verified professionals are available yet"}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {contractors.map((contractor) => {
            const categoryLabel = categories?.find((c) => c.id === contractor.category)?.name
              || CATEGORIES.find(c => c.value === contractor.category)?.label
              || contractor.category;
            const rating = contractor.averageRating ?? contractor.agentRating ?? 0;
            const onTeam = isOnTeam(contractor.id);

            return (
              <Card
                key={contractor.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleViewDetails(contractor)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate">{contractor.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {categoryLabel}
                        </Badge>
                        <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200 bg-green-50">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rating > 0 && (
                    <div className="flex items-center gap-2">
                      <StarRating rating={rating} />
                      {(contractor.reviewCount ?? 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({contractor.reviewCount})
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5">
                    {(contractor.trustedByCount ?? 0) > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs font-normal py-0.5">
                        <Shield className="h-3 w-3 text-blue-500" />
                        Trusted by {contractor.trustedByCount} agent{contractor.trustedByCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                    {(contractor.teamCount ?? 0) > 0 && (
                      <Badge variant="secondary" className="gap-1 text-xs font-normal py-0.5">
                        <Users className="h-3 w-3 text-purple-500" />
                        On {contractor.teamCount} team{contractor.teamCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>

                  {contractor.city && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {contractor.city}{contractor.state ? `, ${contractor.state}` : ""}
                        {contractor.distance != null && ` (${contractor.distance} mi)`}
                      </span>
                    </div>
                  )}

                  {contractor.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{contractor.phone}</span>
                    </div>
                  )}

                  {(contractor.googleMapsUrl || contractor.yelpUrl || contractor.bbbUrl) && (
                    <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      {contractor.googleMapsUrl && (
                        <a href={contractor.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <SiGoogle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contractor.yelpUrl && (
                        <a href={contractor.yelpUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600">
                          <SiYelp className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {contractor.bbbUrl && (
                        <a href={contractor.bbbUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:text-green-800">
                          <Award className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  <Button
                    variant={onTeam ? "secondary" : "outline"}
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={onTeam || addToTeamMutation.isPending}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!onTeam) addToTeamMutation.mutate(contractor);
                    }}
                  >
                    {onTeam ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        On My Team
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Add to My Team
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Trusted By</TableHead>
                <TableHead>On Teams</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors.map((contractor) => {
                const categoryLabel = categories?.find((c) => c.id === contractor.category)?.name
                  || CATEGORIES.find(c => c.value === contractor.category)?.label
                  || contractor.category;
                const rating = contractor.averageRating ?? contractor.agentRating ?? 0;
                const onTeam = isOnTeam(contractor.id);

                return (
                  <TableRow key={contractor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewDetails(contractor)}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{contractor.name}</span>
                        <div className="flex gap-1 flex-wrap">
                          {contractor.vendorUserId && (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs px-1.5 py-0">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                              Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      {rating > 0 ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span>{rating.toFixed(1)}</span>
                          {(contractor.reviewCount ?? 0) > 0 && (
                            <span className="text-muted-foreground text-xs">({contractor.reviewCount})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(contractor.trustedByCount ?? 0) > 0 ? (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-sm">{contractor.trustedByCount} agent{contractor.trustedByCount === 1 ? '' : 's'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(contractor.teamCount ?? 0) > 0 ? (
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-purple-500" />
                          <span className="text-sm">{contractor.teamCount}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contractor.phone ? (
                        <a href={`tel:${contractor.phone}`} className="text-primary hover:underline text-sm" onClick={(e) => e.stopPropagation()}>
                          {contractor.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contractor.city || contractor.state ? (
                        <span className="text-sm">
                          {[contractor.city, contractor.state].filter(Boolean).join(', ')}
                          {contractor.distance != null && (
                            <span className="text-muted-foreground ml-1">({contractor.distance} mi)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        {contractor.googleMapsUrl && (
                          <a href={contractor.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <SiGoogle className="h-4 w-4" />
                          </a>
                        )}
                        {contractor.yelpUrl && (
                          <a href={contractor.yelpUrl} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-600">
                            <SiYelp className="h-4 w-4" />
                          </a>
                        )}
                        {contractor.website && (
                          <a href={contractor.website.startsWith('http') ? contractor.website : `https://${contractor.website}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {!onTeam && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled={addToTeamMutation.isPending}
                            onClick={() => addToTeamMutation.mutate(contractor)}
                            title="Add to My Team"
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
                        {onTeam && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" />
                            Team
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {!proximityEnabled && marketplaceData && marketplaceData.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {contractors.length} of {marketplaceData.total} pros
        </p>
      )}
        </div>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedContractor && (
            <>
              <DialogHeader>
                <DialogTitle>Pro Details</DialogTitle>
              </DialogHeader>
              <ContractorDetail
                contractor={selectedContractor}
                onClose={() => setDetailDialogOpen(false)}
                isOwner={false}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add to My Team</DialogTitle>
          </DialogHeader>
          <ContractorForm
            onClose={() => setShowAddDialog(false)}
            onSave={(data) => createMutation.mutate(data)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingContractor} onOpenChange={() => setEditingContractor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Pro</DialogTitle>
          </DialogHeader>
          {editingContractor && (
            <ContractorForm
              contractor={editingContractor}
              onClose={() => setEditingContractor(null)}
              onSave={(data) => updateMutation.mutate({ id: editingContractor.id, data })}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!inviteContractor} onOpenChange={() => setInviteContractor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite {inviteContractor?.name} to HomeBase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share your referral link with this vendor so they can create a HomeBase account and appear in the public marketplace.
              When they sign up, their profile will automatically link to your team entry.
            </p>
            {referralCode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${window.location.origin}/register?ref=${referralCode.code}&role=vendor`}
                    className="text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${referralCode.code}&role=vendor`);
                      toast({ title: "Link copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {inviteContractor?.email && (
                  <Button
                    className="w-full gap-2"
                    onClick={() => {
                      const subject = encodeURIComponent("Join HomeBase Pros - Invitation");
                      const body = encodeURIComponent(
                        `Hi ${inviteContractor.name},\n\nI'd like to invite you to join HomeBase Pros, our vendor marketplace for home service professionals.\n\nSign up here: ${window.location.origin}/register?ref=${referralCode.code}&role=vendor\n\nOnce registered, your profile will be visible to agents and clients in our marketplace.\n\nBest regards`
                      );
                      window.open(`mailto:${inviteContractor.email}?subject=${subject}&body=${body}`);
                      setInviteContractor(null);
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Send Email Invite to {inviteContractor.email}
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">You need a referral code first.</p>
                <Button
                  onClick={() => generateReferralMutation.mutate()}
                  disabled={generateReferralMutation.isPending}
                >
                  Generate Referral Code
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {ratingContractorId && (
        <RateVendorDialog
          contractorId={ratingContractorId}
          open={!!ratingContractorId}
          onOpenChange={(open) => { if (!open) setRatingContractorId(null); }}
        />
      )}
    </div>
  );
}
