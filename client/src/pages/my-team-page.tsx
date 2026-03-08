import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Users,
  Phone,
  Mail,
  Globe,
  Trash2,
  ShoppingBag,
  Star,
  Shield,
  MapPin,
  Wrench,
  Zap,
  Thermometer,
  Home,
  Paintbrush,
  TreePine,
  Sparkles,
  Hammer,
  Bug,
  Waves,
  Key,
  Droplets,
  Layers,
  Settings,
  Search,
} from "lucide-react";
import type { Contractor, HomeTeamMember } from "@shared/schema";

type TeamMemberWithContractor = HomeTeamMember & {
  contractor: Contractor | null;
};

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Wrench,
  electrical: Zap,
  hvac: Thermometer,
  roofing: Home,
  painting: Paintbrush,
  landscaping: TreePine,
  cleaning: Sparkles,
  handyman: Hammer,
  pest_control: Bug,
  pool_maintenance: Waves,
  window_specialist: Home,
  locksmith: Key,
  tree_service: TreePine,
  gutter_cleaning: Droplets,
  flooring: Layers,
  appliance_repair: Settings,
  security_system: Shield,
  inspector: Search,
  other: Wrench,
};

function getCategoryIcon(category: string) {
  const Icon = CATEGORY_ICONS[category] || Wrench;
  return <Icon className="h-4 w-4" />;
}

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function MyTeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: teamMembers, isLoading } = useQuery<TeamMemberWithContractor[]>({
    queryKey: ["/api/my-team"],
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/my-team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
      toast({ title: "Removed from team", description: "Contractor removed from your team." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove contractor.", variant: "destructive" });
    },
  });

  const grouped = (teamMembers || []).reduce<Record<string, TeamMemberWithContractor[]>>(
    (acc, member) => {
      const cat = member.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(member);
      return acc;
    },
    {}
  );

  const sortedCategories = Object.keys(grouped).sort();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            My Home Team
          </h1>
          <p className="text-muted-foreground mt-1">
            Your preferred service providers for all home-related needs
          </p>
        </div>
        <Link href="/marketplace">
          <Button>
            <ShoppingBag className="h-4 w-4 mr-2" />
            Browse Pros
          </Button>
        </Link>
      </div>

      {sortedCategories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Build your home team by browsing our marketplace and adding your preferred contractors for each service category.
            </p>
            <Link href="/marketplace">
              <Button>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Pros
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        sortedCategories.map((category) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2">
              {getCategoryIcon(category)}
              <h2 className="text-lg font-semibold">{formatCategoryName(category)}</h2>
              <Badge variant="secondary" className="ml-1">
                {grouped[category].length}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[category].map((member) => {
                const c = member.contractor;
                return (
                  <Card key={member.id} className="relative group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">
                          {c?.name || "Unknown Contractor"}
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => removeMutation.mutate(member.id)}
                          disabled={removeMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {c?.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`tel:${c.phone}`} className="hover:underline">
                            {c.phone}
                          </a>
                        </div>
                      )}
                      {c?.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <a href={`mailto:${c.email}`} className="hover:underline truncate">
                            {c.email}
                          </a>
                        </div>
                      )}
                      {c?.website && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-3.5 w-3.5" />
                          <a
                            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate"
                          >
                            {c.website}
                          </a>
                        </div>
                      )}
                      {(c?.city || c?.state) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>
                            {[c?.city, c?.state].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        {c?.agentRating && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                            {c.agentRating}/5
                          </Badge>
                        )}
                        {c?.vendorUserId && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {member.notes && (
                        <p className="text-xs text-muted-foreground italic pt-1 border-t">
                          {member.notes}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}