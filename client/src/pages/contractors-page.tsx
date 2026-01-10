import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Contractor, type ContractorReview } from "@shared/schema";

type ContractorWithRating = Contractor & {
  averageRating?: number | null;
  reviewCount?: number;
};
import { 
  Plus, Search, Star, Phone, Mail, Globe, MapPin, 
  Pencil, Trash2, ExternalLink, Building2, Award, ThumbsUp, Users,
  LayoutGrid, List
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SiYelp, SiGoogle } from "react-icons/si";

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

function StarRating({ rating, onChange, readonly = false }: { rating: number; onChange?: (r: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star 
            className={`h-5 w-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
          />
        </button>
      ))}
    </div>
  );
}

function ContractorCard({ 
  contractor, 
  onEdit, 
  onDelete,
  onViewDetails,
  isOwner,
  recommendationCount,
  isPreferredVendor
}: { 
  contractor: ContractorWithRating; 
  onEdit: () => void; 
  onDelete: () => void;
  onViewDetails: () => void;
  isOwner: boolean;
  recommendationCount: number;
  isPreferredVendor: boolean;
}) {
  const categoryLabel = CATEGORIES.find(c => c.value === contractor.category)?.label || contractor.category;
  const displayRating = contractor.averageRating ?? contractor.agentRating;
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onViewDetails} data-testid={`card-contractor-${contractor.id}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{contractor.name}</CardTitle>
              {isPreferredVendor && (
                <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                  <Award className="h-3 w-3 mr-1" />
                  Preferred Vendor
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{categoryLabel}</Badge>
              {recommendationCount > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Users className="h-3 w-3 mr-1" />
                  {recommendationCount} agent{recommendationCount !== 1 ? 's' : ''} recommend
                </Badge>
              )}
            </div>
          </div>
          {isOwner && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" onClick={onEdit} data-testid={`button-edit-contractor-${contractor.id}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-contractor-${contractor.id}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayRating && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
              <span className="font-medium">{displayRating.toFixed(1)}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {contractor.reviewCount ? `(${contractor.reviewCount} review${contractor.reviewCount !== 1 ? 's' : ''})` : 'Rating'}
            </span>
          </div>
        )}
        {contractor.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{contractor.description}</p>
        )}
        <div className="space-y-1 text-sm">
          {contractor.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{contractor.phone}</span>
            </div>
          )}
          {contractor.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contractor.email}</span>
            </div>
          )}
          {(contractor.city || contractor.state) && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{[contractor.city, contractor.state].filter(Boolean).join(', ')}</span>
            </div>
          )}
        </div>
        {(contractor.googleMapsUrl || contractor.yelpUrl) && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            {contractor.googleMapsUrl && (
              <a 
                href={contractor.googleMapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <SiGoogle className="h-3 w-3" />
                Google
              </a>
            )}
            {contractor.yelpUrl && (
              <a 
                href={contractor.yelpUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <SiYelp className="h-3 w-3" />
                Yelp
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContractorForm({ 
  contractor, 
  onClose, 
  onSave 
}: { 
  contractor?: ContractorWithRating; 
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
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            data-testid="input-contractor-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
            <SelectTrigger data-testid="select-contractor-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.filter(c => c.value !== 'all').map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            data-testid="input-contractor-phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            data-testid="input-contractor-email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            data-testid="input-contractor-website"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
          <Input
            id="googleMapsUrl"
            value={form.googleMapsUrl}
            onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
            placeholder="Link to view reviews on Google"
            data-testid="input-contractor-google-url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="yelpUrl">Yelp Link</Label>
          <Input
            id="yelpUrl"
            value={form.yelpUrl}
            onChange={(e) => setForm({ ...form, yelpUrl: e.target.value })}
            placeholder="Link to view reviews on Yelp"
            data-testid="input-contractor-yelp-url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            data-testid="input-contractor-city"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            data-testid="input-contractor-state"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          data-testid="input-contractor-description"
        />
      </div>
      <div className="space-y-2">
        <Label>Your Rating</Label>
        <StarRating rating={form.agentRating} onChange={(r) => setForm({ ...form, agentRating: r })} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="agentNotes">Your Notes (Private)</Label>
        <Textarea
          id="agentNotes"
          value={form.agentNotes}
          onChange={(e) => setForm({ ...form, agentNotes: e.target.value })}
          rows={2}
          placeholder="Private notes about this contractor..."
          data-testid="input-contractor-notes"
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={!form.name || !form.category} data-testid="button-save-contractor">
          {contractor ? "Update" : "Add"} Contractor
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
  contractor: ContractorWithRating; 
  onClose: () => void;
  isOwner: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewForm, setReviewForm] = useState({ reviewerName: "", rating: 5, comment: "" });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery<ContractorReview[]>({
    queryKey: ["/api/contractors", contractor.id, "reviews"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/contractors/${contractor.id}/reviews`);
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
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({ title: "You've recommended this contractor!" });
    }
  });

  const unrecommendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/contractors/${contractor.id}/recommend`);
    },
    onSuccess: () => {
      refetchRecommendations();
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({ title: "Recommendation removed" });
    }
  });

  const addReviewMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/contractors/${contractor.id}/reviews`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractor.id, "reviews"] });
      setReviewForm({ reviewerName: "", rating: 5, comment: "" });
      toast({ title: "Review added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add review", variant: "destructive" });
    }
  });

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.reviewerName) return;
    addReviewMutation.mutate(reviewForm);
  };

  const categoryLabel = CATEGORIES.find(c => c.value === contractor.category)?.label || contractor.category;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold">{contractor.name}</h2>
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                <Award className="h-3 w-3 mr-1" />
                Preferred Vendor
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary">{categoryLabel}</Badge>
              {(recommendationData?.count || 0) > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Users className="h-3 w-3 mr-1" />
                  {recommendationData?.count} agent{recommendationData?.count !== 1 ? 's' : ''} recommend
                </Badge>
              )}
            </div>
          </div>
          {(contractor.averageRating || contractor.agentRating) && (
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="font-medium text-lg">
                  {((contractor as ContractorWithRating).averageRating ?? contractor.agentRating)?.toFixed(1)}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {(contractor as ContractorWithRating).reviewCount 
                  ? `${(contractor as ContractorWithRating).reviewCount} review${(contractor as ContractorWithRating).reviewCount !== 1 ? 's' : ''}`
                  : 'Rating'}
              </span>
            </div>
          )}
        </div>
        {contractor.description && (
          <p className="text-muted-foreground mt-3">{contractor.description}</p>
        )}
        
        {user?.role === "agent" && (
          <div className="mt-4">
            {recommendationData?.hasRecommended ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => unrecommendMutation.mutate()}
                disabled={unrecommendMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4 mr-2 fill-current" />
                You Recommend This Contractor
              </Button>
            ) : (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => recommendMutation.mutate()}
                disabled={recommendMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Recommend This Contractor
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
        {(contractor.city || contractor.state) && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{[contractor.address, contractor.city, contractor.state, contractor.zipCode].filter(Boolean).join(', ')}</span>
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
        <h3 className="text-lg font-semibold mb-4">Client Reviews ({reviews.length})</h3>
        
        {loadingReviews ? (
          <p className="text-muted-foreground">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet. Be the first to add one!</p>
        ) : (
          <div className="space-y-4 mb-6">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium">{review.reviewerName}</span>
                    <StarRating rating={review.rating} readonly />
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a Review</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddReview} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reviewerName">Name *</Label>
                <Input
                  id="reviewerName"
                  value={reviewForm.reviewerName}
                  onChange={(e) => setReviewForm({ ...reviewForm, reviewerName: e.target.value })}
                  placeholder="Your name or client name"
                  required
                  data-testid="input-review-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Rating</Label>
                <StarRating rating={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share your experience..."
                  data-testid="input-review-comment"
                />
              </div>
              <Button type="submit" disabled={!reviewForm.reviewerName || addReviewMutation.isPending} data-testid="button-submit-review">
                {addReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </div>
  );
}

export default function ContractorsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ContractorWithRating | null>(null);
  const [viewingContractor, setViewingContractor] = useState<ContractorWithRating | null>(null);
  const [recommendationCounts, setRecommendationCounts] = useState<Record<number, number>>({});

  const { data: contractors = [], isLoading } = useQuery<ContractorWithRating[]>({
    queryKey: ["/api/contractors"],
    enabled: !!user
  });

  // Fetch recommendation counts for all contractors
  const fetchRecommendationCounts = async (contractorsList: Contractor[]) => {
    const counts: Record<number, number> = {};
    for (const c of contractorsList) {
      try {
        const res = await fetch(`/api/contractors/${c.id}/recommendations`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          counts[c.id] = data.count || 0;
        }
      } catch {
        counts[c.id] = 0;
      }
    }
    setRecommendationCounts(counts);
  };

  // Fetch recommendation counts when contractors load
  useEffect(() => {
    if (contractors.length > 0) {
      fetchRecommendationCounts(contractors);
    }
  }, [contractors]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/contractors", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      setShowAddDialog(false);
      toast({ title: "Contractor added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add contractor", variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/contractors/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      setEditingContractor(null);
      toast({ title: "Contractor updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update contractor", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/contractors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contractors"] });
      toast({ title: "Contractor deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete contractor", variant: "destructive" });
    }
  });

  const filteredContractors = contractors.filter((c) => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (c.city?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesCategory = selectedCategory === "all" || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = (contractor: Contractor) => {
    if (confirm(`Are you sure you want to delete ${contractor.name}?`)) {
      deleteMutation.mutate(contractor.id);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center">Please log in to view contractors.</p>
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Trusted Contractors</h1>
          <p className="text-muted-foreground">Find and recommend trusted home service professionals</p>
        </div>
        {user.role === "agent" && (
          <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-contractor">
            <Plus className="h-4 w-4 mr-2" />
            Add Contractor
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contractors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-contractors"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[200px]" data-testid="select-category-filter">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filteredContractors.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No contractors found</h3>
          <p className="text-muted-foreground mb-4">
            {contractors.length === 0 
              ? "Start building your trusted contractor network by adding your first contractor."
              : "Try adjusting your search or filter criteria."}
          </p>
          {user.role === "agent" && contractors.length === 0 && (
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Contractor
            </Button>
          )}
        </div>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContractors.map((contractor) => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              onEdit={() => setEditingContractor(contractor)}
              onDelete={() => handleDelete(contractor)}
              onViewDetails={() => setViewingContractor(contractor)}
              isOwner={contractor.agentId === user.id}
              recommendationCount={recommendationCounts[contractor.id] || 0}
              isPreferredVendor={true}
            />
          ))}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContractors.map((contractor) => {
                const categoryLabel = CATEGORIES.find(c => c.value === contractor.category)?.label || contractor.category;
                const recCount = recommendationCounts[contractor.id] || 0;
                return (
                  <TableRow key={contractor.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewingContractor(contractor)}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{contractor.name}</span>
                        <div className="flex gap-1 flex-wrap">
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-1.5 py-0">
                            <Award className="h-2.5 w-2.5 mr-0.5" />
                            Preferred
                          </Badge>
                          {recCount > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-600 text-xs px-1.5 py-0">
                              <Users className="h-2.5 w-2.5 mr-0.5" />
                              {recCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      {contractor.phone ? (
                        <a href={`tel:${contractor.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          {contractor.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contractor.city || contractor.state ? (
                        <span>{[contractor.city, contractor.state].filter(Boolean).join(', ')}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(contractor.averageRating || contractor.agentRating) ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span>{(contractor.averageRating ?? contractor.agentRating)?.toFixed(1)}</span>
                          {contractor.reviewCount && contractor.reviewCount > 0 && (
                            <span className="text-muted-foreground text-xs">({contractor.reviewCount})</span>
                          )}
                        </div>
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
                        {contractor.agentId === user.id && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingContractor(contractor)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(contractor)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Contractor</DialogTitle>
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
            <DialogTitle>Edit Contractor</DialogTitle>
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

      <Dialog open={!!viewingContractor} onOpenChange={() => setViewingContractor(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contractor Details</DialogTitle>
          </DialogHeader>
          {viewingContractor && (
            <ContractorDetail
              contractor={viewingContractor}
              onClose={() => setViewingContractor(null)}
              isOwner={viewingContractor.agentId === user.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
