import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, CheckCircle2, Home, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FeedbackPage() {
  const [, params] = useRoute("/feedback/:token");
  const token = params?.token || "";
  const { toast } = useToast();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: feedbackRequest, isLoading, error } = useQuery<any>({
    queryKey: ["/api/feedback", token],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/${token}`);
      if (!res.ok) {
        const data = await res.json();
        if (data.completed) throw new Error("COMPLETED");
        throw new Error(data.error || "Not found");
      }
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/feedback/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title || undefined, comment }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error?.message === "COMPLETED" || submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your feedback has been submitted successfully. We really appreciate you taking the time to share your experience.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !feedbackRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Link Not Found</h2>
            <p className="text-muted-foreground">
              This feedback link may have expired or is no longer valid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const address = [feedbackRequest.street_name, feedbackRequest.city, feedbackRequest.state].filter(Boolean).join(", ");
  const agentName = `${feedbackRequest.agent_first_name || ''} ${feedbackRequest.agent_last_name || ''}`.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">How was your experience?</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {agentName && <>Your agent <span className="font-medium text-foreground">{agentName}</span> would love to hear your feedback</>}
            {address && <> about the transaction at <span className="font-medium text-foreground">{address}</span></>}
            .
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-2">
          <div>
            <Label className="text-sm font-medium mb-2 block">Rating</Label>
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-muted-foreground mt-1">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="title" className="text-sm font-medium">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Summarize your experience"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="comment" className="text-sm font-medium">Your Review</Label>
            <Textarea
              id="comment"
              placeholder="Tell us about your experience working with your agent..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              className="mt-1"
            />
          </div>

          <Button
            className="w-full"
            size="lg"
            disabled={rating === 0 || !comment.trim() || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Submitting..." : "Submit Feedback"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Your review will be publicly visible and helps other clients make informed decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
