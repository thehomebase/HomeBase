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

export function TopAgentsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Agents</h1>
        <p className="text-muted-foreground mt-1">
          Discover top-rated real estate agents based on client reviews
        </p>
      </div>
      <TopAgentsList />
    </div>
  );
}

export default TopAgentsPage;