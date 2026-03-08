import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VendorRating } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Star,
  BarChart3,
  MessageSquare,
  Clock,
  DollarSign,
  ThumbsUp,
  TrendingUp,
  Award,
} from "lucide-react";

type PerformanceStats = {
  avgOverall: number;
  avgQuality: number;
  avgCommunication: number;
  avgTimeliness: number;
  avgValue: number;
  totalRatings: number;
  recommendRate: number;
};

function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sizeClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

function InteractiveStarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 cursor-pointer transition-colors ${
                star <= (hover || value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const percentage = (value / 5) * 100;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </div>
        <span className="text-sm font-semibold">{value.toFixed(1)}/5</span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );
}

export function PerformanceStatsDisplay({ contractorId }: { contractorId: number }) {
  const { data: stats, isLoading } = useQuery<PerformanceStats>({
    queryKey: ["/api/contractors", contractorId, "performance"],
    queryFn: async () => {
      const res = await fetch(`/api/contractors/${contractorId}/performance`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch performance stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (!stats || stats.totalRatings === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">No performance ratings yet</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <CategoryBar label="Quality" value={stats.avgQuality} icon={<Award className="h-4 w-4 text-blue-500" />} />
        <CategoryBar label="Communication" value={stats.avgCommunication} icon={<MessageSquare className="h-4 w-4 text-green-500" />} />
        <CategoryBar label="Timeliness" value={stats.avgTimeliness} icon={<Clock className="h-4 w-4 text-orange-500" />} />
        <CategoryBar label="Value" value={stats.avgValue} icon={<DollarSign className="h-4 w-4 text-purple-500" />} />
      </div>
      {stats.recommendRate > 0 && (
        <Badge variant="outline" className="gap-1">
          <ThumbsUp className="h-3 w-3" />
          {Math.round(stats.recommendRate)}% would recommend
        </Badge>
      )}
    </div>
  );
}

export function RateVendorDialog({
  contractorId,
  open,
  onOpenChange,
}: {
  contractorId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [overallRating, setOverallRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [valueRating, setValueRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/contractors/${contractorId}/ratings`, {
        overallRating,
        qualityRating: qualityRating || undefined,
        communicationRating: communicationRating || undefined,
        timelinessRating: timelinessRating || undefined,
        valueRating: valueRating || undefined,
        title: title || undefined,
        comment,
        wouldRecommend,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rating submitted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "ratings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contractors", contractorId, "performance"] });
      onOpenChange(false);
      setOverallRating(0);
      setQualityRating(0);
      setCommunicationRating(0);
      setTimelinessRating(0);
      setValueRating(0);
      setTitle("");
      setComment("");
      setWouldRecommend(true);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit rating", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (overallRating === 0) {
      toast({ title: "Please select an overall rating", variant: "destructive" });
      return;
    }
    if (!comment.trim()) {
      toast({ title: "Please add a comment", variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate This Vendor</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <InteractiveStarRating value={overallRating} onChange={setOverallRating} label="Overall Rating *" />

          <div className="border rounded-lg p-3 space-y-3">
            <p className="text-xs text-muted-foreground">Category ratings (optional)</p>
            <InteractiveStarRating value={qualityRating} onChange={setQualityRating} label="Quality" />
            <InteractiveStarRating value={communicationRating} onChange={setCommunicationRating} label="Communication" />
            <InteractiveStarRating value={timelinessRating} onChange={setTimelinessRating} label="Timeliness" />
            <InteractiveStarRating value={valueRating} onChange={setValueRating} label="Value" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating-title">Title (optional)</Label>
            <Input
              id="rating-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rating-comment">Comment *</Label>
            <Textarea
              id="rating-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={3}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="would-recommend" className="text-sm">Would you recommend this vendor?</Label>
            <Switch
              id="would-recommend"
              checked={wouldRecommend}
              onCheckedChange={setWouldRecommend}
            />
          </div>

          <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
            {submitMutation.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorRatingsPage() {
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading } = useQuery<PerformanceStats>({
    queryKey: ["/api/vendor/my-performance"],
  });

  const { data: ratings, isLoading: ratingsLoading } = useQuery<VendorRating[]>({
    queryKey: ["/api/vendor/my-ratings"],
  });

  if (statsLoading || ratingsLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const hasStats = stats && stats.totalRatings > 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          My Ratings
        </h1>
        <p className="text-muted-foreground">View your performance metrics and feedback from agents</p>
      </div>

      {!hasStats ? (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-2 py-8">
              <Star className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="font-semibold text-lg">No Ratings Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Once agents rate your work, your performance metrics and feedback will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                <Star className="h-4 w-4 text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats!.avgOverall.toFixed(1)}</span>
                  <StarDisplay rating={stats!.avgOverall} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Quality</CardTitle>
                <Award className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats!.avgQuality.toFixed(1)}</span>
                  <StarDisplay rating={stats!.avgQuality} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Communication</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats!.avgCommunication.toFixed(1)}</span>
                  <StarDisplay rating={stats!.avgCommunication} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Timeliness</CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats!.avgTimeliness.toFixed(1)}</span>
                  <StarDisplay rating={stats!.avgTimeliness} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Value</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{stats!.avgValue.toFixed(1)}</span>
                  <StarDisplay rating={stats!.avgValue} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats!.totalRatings}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recommendation Rate</CardTitle>
                <ThumbsUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats!.recommendRate)}%</div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Individual Reviews</h2>
            {ratings && ratings.length > 0 ? (
              ratings.map((rating) => (
                <Card key={rating.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          {rating.title && <h3 className="font-medium">{rating.title}</h3>}
                          <div className="flex items-center gap-2">
                            <StarDisplay rating={rating.overallRating} />
                            <span className="text-sm text-muted-foreground">
                              {rating.overallRating}/5
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {rating.wouldRecommend && (
                            <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
                              <ThumbsUp className="h-3 w-3" />
                              Recommends
                            </Badge>
                          )}
                        </div>
                      </div>

                      <p className="text-sm">{rating.comment}</p>

                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {rating.qualityRating && (
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" /> Quality: {rating.qualityRating}/5
                          </span>
                        )}
                        {rating.communicationRating && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" /> Comm: {rating.communicationRating}/5
                          </span>
                        )}
                        {rating.timelinessRating && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Time: {rating.timelinessRating}/5
                          </span>
                        )}
                        {rating.valueRating && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" /> Value: {rating.valueRating}/5
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No individual reviews to display.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}