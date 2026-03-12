import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Trash2,
  User,
  ArrowLeft,
  Send,
  StarHalf,
  Shield,
  ShieldCheck,
  FileText,
  Building2,
  MapPin,
  Phone,
  Mail,
  Search,
} from "lucide-react";
import type { AgentReview } from "@shared/schema";

type AgentProfile = {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    role: string;
  };
  avgRating: number;
  reviewCount: number;
};

type TopAgent = {
  id: number;
  firstName: string;
  lastName: string;
  avgRating: number;
  reviewCount: number;
};

type DirectoryAgent = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  brokerage_name: string | null;
  license_state: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  profile_bio: string | null;
};

function VerificationBadge({ status }: { status: string | null | undefined }) {
  if (status === "admin_verified") {
    return (
      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 text-[10px] px-1.5 py-0">
        <ShieldCheck className="h-3 w-3" /> Verified
      </Badge>
    );
  }
  if (status === "broker_verified") {
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 text-[10px] px-1.5 py-0">
        <Shield className="h-3 w-3" /> Broker Verified
      </Badge>
    );
  }
  if (status === "licensed") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 text-[10px] px-1.5 py-0">
        <FileText className="h-3 w-3" /> Licensed
      </Badge>
    );
  }
  return null;
}

function StarRating({ rating, size = "md", interactive = false, onChange }: {
  rating: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <Star
            className={`${sizeClass} ${
              star <= (hovered || rating)
                ? "fill-yellow-400 text-yellow-400"
                : "text-gray-300"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

function AgentProfileView({ agentId }: { agentId: number }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: profile, isLoading: profileLoading } = useQuery<AgentProfile>({
    queryKey: ["/api/agents", agentId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<AgentReview[]>({
    queryKey: ["/api/agents", agentId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/reviews`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: { rating: number; title: string; comment: string }) => {
      const res = await apiRequest("POST", `/api/agents/${agentId}/reviews`, {
        rating: data.rating,
        title: data.title || null,
        comment: data.comment,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/top"] });
      setReviewRating(0);
      setReviewTitle("");
      setReviewComment("");
      toast({ title: "Review submitted!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiRequest("DELETE", `/api/agents/${agentId}/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId, "profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents/top"] });
      toast({ title: "Review deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const canWriteReview = user && user.id !== agentId;

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Agent not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/top-agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Agents
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {profile.user.firstName} {profile.user.lastName}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <StarRating rating={Math.round(profile.avgRating)} />
                <span className="text-lg font-semibold">{profile.avgRating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({profile.reviewCount} {profile.reviewCount === 1 ? "review" : "reviews"})
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {canWriteReview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Write a Review</CardTitle>
            <CardDescription>Share your experience with this agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <StarRating rating={reviewRating} interactive onChange={setReviewRating} size="lg" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Title (optional)</label>
                <Input
                  placeholder="Summarize your experience"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Review</label>
                <Textarea
                  placeholder="Tell others about your experience..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                />
              </div>
              <Button
                onClick={() =>
                  createReviewMutation.mutate({
                    rating: reviewRating,
                    title: reviewTitle,
                    comment: reviewComment,
                  })
                }
                disabled={reviewRating === 0 || !reviewComment.trim() || createReviewMutation.isPending}
              >
                <Send className="h-4 w-4 mr-2" />
                {createReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground">
              <Link href="/auth" className="text-primary underline">Log in</Link> to write a review.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-4">
          Reviews ({reviews?.length ?? 0})
        </h3>

        {reviewsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <StarRating rating={review.rating} size="sm" />
                        {review.title && (
                          <span className="font-medium">{review.title}</span>
                        )}
                      </div>
                      <p className="text-sm text-foreground mt-2">{review.comment}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : ""}
                      </p>
                    </div>
                    {user && user.id === review.reviewerId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteReviewMutation.mutate(review.id)}
                        disabled={deleteReviewMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Star className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground">No reviews yet. Be the first to review this agent!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function TopAgentsList() {
  const { data: agents, isLoading } = useQuery<TopAgent[]>({
    queryKey: ["/api/agents/top"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Star className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground">No agents with reviews yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {agents.map((agent, idx) => (
        <Card key={agent.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {idx < 3 ? (
                  <span className="text-lg font-bold text-primary">#{idx + 1}</span>
                ) : (
                  <User className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">
                  {agent.firstName} {agent.lastName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <StarRating rating={Math.round(agent.avgRating)} size="sm" />
                  <span className="text-sm font-medium">{agent.avgRating.toFixed(1)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {agent.reviewCount} {agent.reviewCount === 1 ? "review" : "reviews"}
                </p>
                <Link href={`/agents/${agent.id}/reviews`}>
                  <Button variant="outline" size="sm" className="mt-3 w-full">
                    View Profile
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AgentReviewsPage() {
  const [, params] = useRoute("/agents/:agentId/reviews");
  const agentId = params?.agentId ? Number(params.agentId) : null;

  if (!agentId) {
    return (
      <div className="p-4 md:p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Invalid agent ID.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <AgentProfileView agentId={agentId} />
    </div>
  );
}

function AgentDirectoryList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: agents, isLoading } = useQuery<DirectoryAgent[]>({
    queryKey: ["/api/agents"],
  });

  const filtered = agents?.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.first_name?.toLowerCase().includes(q) ||
      a.last_name?.toLowerCase().includes(q) ||
      a.brokerage_name?.toLowerCase().includes(q) ||
      a.license_state?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, brokerage, or state..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : !filtered || filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">
              {searchQuery ? "No agents match your search." : "No agents registered yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((agent) => (
            <Card key={agent.id} className="hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {agent.profile_photo_url ? (
                      <img
                        src={agent.profile_photo_url}
                        alt={`${agent.first_name} ${agent.last_name}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-7 w-7 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">
                        {agent.first_name} {agent.last_name}
                      </h3>
                      <VerificationBadge status={agent.verification_status} />
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 capitalize">
                      {agent.role}
                    </Badge>
                    {agent.brokerage_name && (
                      <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{agent.brokerage_name}</span>
                      </div>
                    )}
                    {agent.license_state && (
                      <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span>{agent.license_state}</span>
                      </div>
                    )}
                    {agent.profile_bio && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{agent.profile_bio}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <Link href={`/profile/${agent.id}`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          View Profile
                        </Button>
                      </Link>
                      <Link href={`/agents/${agent.id}/reviews`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          <Star className="h-3 w-3 mr-1" /> Reviews
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopAgentsPage() {
  const [tab, setTab] = useState<"directory" | "top-rated">("directory");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Agents</h1>
        <p className="text-muted-foreground mt-1">
          Browse agent profiles or discover top-rated agents by client reviews
        </p>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("directory")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "directory"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Agent Directory
        </button>
        <button
          onClick={() => setTab("top-rated")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "top-rated"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Top Rated
        </button>
      </div>

      {tab === "directory" ? <AgentDirectoryList /> : <TopAgentsList />}
    </div>
  );
}

export default TopAgentsPage;