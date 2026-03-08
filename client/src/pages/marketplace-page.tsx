import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Contractor, type ContractorReview } from "@shared/schema";
import {
  Search, Star, Phone, Mail, Globe, MapPin, UserPlus, CheckCircle2,
  Wrench, Zap, Thermometer, Home, Paintbrush, Trees, Sparkles, Hammer,
  Bug, Waves, Square, DoorOpen, Key, TreePine, Droplets, SprayCan,
  Layers, Shield, Camera, Sofa, Truck, MoreHorizontal, Construction,
  ClipboardList, Map, Settings, X
} from "lucide-react";

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
};

type MarketplaceResponse = {
  contractors: ContractorWithDetails[];
  total: number;
  limit: number;
  offset: number;
};

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
  const IconComponent = iconMap[iconName] || MoreHorizontal;
  return IconComponent;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<ContractorWithDetails | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useQuery<MarketplaceCategory[]>({
    queryKey: ["/api/marketplace/categories"],
  });

  const { data: marketplaceData, isLoading: contractorsLoading } = useQuery<MarketplaceResponse>({
    queryKey: ["/api/marketplace/contractors", selectedCategory, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set("category", selectedCategory);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "50");
      const res = await fetch(`/api/marketplace/contractors?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch contractors");
      return res.json();
    },
  });

  const { data: myTeam } = useQuery<any[]>({
    queryKey: ["/api/my-team"],
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
      toast({ title: "Added to My Team", description: "Contractor has been added to your team." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add contractor to team.", variant: "destructive" });
    },
  });

  const fetchContractorDetail = async (id: number) => {
    const res = await fetch(`/api/marketplace/contractors/${id}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch contractor details");
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

  const isOnTeam = (contractorId: number) => {
    return myTeam?.some((m: any) => m.contractorId === contractorId);
  };

  const contractors = marketplaceData?.contractors || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HomeBase Pros</h1>
        <p className="text-muted-foreground">Find trusted home service professionals</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contractors by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
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

      {contractorsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contractors.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-medium">No contractors found</h3>
          <p className="text-muted-foreground">
            {searchQuery || selectedCategory
              ? "Try adjusting your search or category filter"
              : "No contractors are available yet"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {contractors.map((contractor) => {
            const categoryLabel = categories?.find((c) => c.id === contractor.category)?.name || contractor.category;
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
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {categoryLabel}
                      </Badge>
                    </div>
                    {contractor.vendorUserId && (
                      <Badge variant="outline" className="shrink-0 gap-1 text-xs text-green-600 border-green-200 bg-green-50">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <StarRating rating={rating} />
                    {(contractor.reviewCount ?? 0) > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({contractor.reviewCount})
                      </span>
                    )}
                  </div>

                  {contractor.city && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {contractor.city}{contractor.state ? `, ${contractor.state}` : ""}
                      </span>
                    </div>
                  )}

                  {contractor.phone && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{contractor.phone}</span>
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
      )}

      {marketplaceData && marketplaceData.total > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {contractors.length} of {marketplaceData.total} contractors
        </p>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedContractor && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <DialogTitle className="text-xl">{selectedContractor.name}</DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {categories?.find((c) => c.id === selectedContractor.category)?.name || selectedContractor.category}
                      </Badge>
                      {selectedContractor.vendorUserId && (
                        <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200 bg-green-50">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <StarRating rating={selectedContractor.averageRating ?? selectedContractor.agentRating ?? 0} />
                  {(selectedContractor.recommendationCount ?? 0) > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedContractor.recommendationCount} recommendation{selectedContractor.recommendationCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>

                {selectedContractor.description && (
                  <p className="text-sm text-muted-foreground">{selectedContractor.description}</p>
                )}

                <div className="space-y-2">
                  {selectedContractor.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${selectedContractor.phone}`} className="hover:underline">
                        {selectedContractor.phone}
                      </a>
                    </div>
                  )}
                  {selectedContractor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${selectedContractor.email}`} className="hover:underline">
                        {selectedContractor.email}
                      </a>
                    </div>
                  )}
                  {selectedContractor.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a href={selectedContractor.website} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                        {selectedContractor.website}
                      </a>
                    </div>
                  )}
                  {(selectedContractor.address || selectedContractor.city) && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {[selectedContractor.address, selectedContractor.city, selectedContractor.state, selectedContractor.zipCode]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full gap-1.5"
                  disabled={isOnTeam(selectedContractor.id) || addToTeamMutation.isPending}
                  variant={isOnTeam(selectedContractor.id) ? "secondary" : "default"}
                  onClick={() => {
                    if (!isOnTeam(selectedContractor.id)) addToTeamMutation.mutate(selectedContractor);
                  }}
                >
                  {isOnTeam(selectedContractor.id) ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Already on My Team
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add to My Team
                    </>
                  )}
                </Button>

                {selectedContractor.reviews && selectedContractor.reviews.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">Reviews ({selectedContractor.reviews.length})</h3>
                    {selectedContractor.reviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{review.reviewerName}</span>
                          <StarRating rating={review.rating} />
                        </div>
                        {review.comment && (
                          <p className="text-sm text-muted-foreground">{review.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}