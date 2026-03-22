import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, CheckCircle2, Home, AlertCircle, MapPin, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type VisitorRole = "unrepresented_buyer" | "represented_buyer" | "agent";

export default function OpenHouseSignInPage() {
  const [, params] = useRoute("/open-house/:slug");
  const slug = params?.slug || "";
  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interestLevel, setInterestLevel] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [preApproved, setPreApproved] = useState(false);
  const [visitorRole, setVisitorRole] = useState<VisitorRole>("unrepresented_buyer");
  const [brokerageName, setBrokerageName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: openHouse, isLoading, error } = useQuery<{
    id: number;
    address: string;
    city: string;
    state: string;
    date: string;
    startTime: string;
    endTime: string;
    start_time?: string;
    end_time?: string;
    agentName: string;
    status: string;
  }>({
    queryKey: ["/api/open-house", slug],
    queryFn: async () => {
      const res = await fetch(`/api/open-house/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/open-house/${slug}/sign-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName: lastName || undefined,
          email: email || undefined,
          phone: phone || undefined,
          interestedLevel: interestLevel || undefined,
          preApproved,
          workingWithAgent: visitorRole === "represented_buyer",
          visitorRole,
          brokerageName: visitorRole === "agent" ? brokerageName || undefined : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to sign in");
      return res.json();
    },
    onSuccess: () => setSubmitted(true),
    onError: () => toast({ title: "Error", description: "Failed to submit. Please try again.", variant: "destructive" }),
  });

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !openHouse) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Open House Not Found</h2>
            <p className="text-muted-foreground">This open house link may no longer be available.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome!</h2>
            <p className="text-muted-foreground">
              Thank you for signing in, {firstName}! Enjoy the open house.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullAddress = [openHouse.address, openHouse.city, openHouse.state].filter(Boolean).join(", ");

  const roleOptions: { value: VisitorRole; label: string; description: string }[] = [
    { value: "unrepresented_buyer", label: "Buyer (not working with an agent)", description: "I'm looking on my own" },
    { value: "represented_buyer", label: "Buyer (working with an agent)", description: "I have an agent already" },
    { value: "agent", label: "Real Estate Agent", description: "I'm an agent visiting" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Home className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold mb-1">Welcome to the Open House!</h1>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p className="flex items-center justify-center gap-1.5">
                <MapPin className="h-4 w-4" />
                <span className="font-medium text-foreground">{fullAddress}</span>
              </p>
              {openHouse.agentName && (
                <p>Hosted by <span className="font-medium text-foreground">{openHouse.agentName}</span></p>
              )}
              <p className="flex items-center justify-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(openHouse.date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(openHouse.startTime || openHouse.start_time || "")} – {formatTime(openHouse.endTime || openHouse.end_time || "")}
                </span>
              </p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <p className="text-sm font-medium text-center">Please sign in below</p>

            <div>
              <Label className="mb-2 block">I am a... *</Label>
              <div className="space-y-2">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisitorRole(opt.value)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      visitorRole === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" />
            </div>

            <div>
              <Label>Phone</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>

            {visitorRole === "agent" && (
              <div>
                <Label>Brokerage / Company</Label>
                <Input value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} placeholder="Your brokerage name" />
              </div>
            )}

            {visitorRole !== "agent" && (
              <>
                <div>
                  <Label className="mb-2 block">Interest Level</Label>
                  <div className="flex gap-1 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => setInterestLevel(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoveredStar || interestLevel)
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {interestLevel > 0 && (
                    <p className="text-center text-xs text-muted-foreground mt-1">
                      {interestLevel === 1 && "Just browsing"}
                      {interestLevel === 2 && "Somewhat interested"}
                      {interestLevel === 3 && "Interested"}
                      {interestLevel === 4 && "Very interested"}
                      {interestLevel === 5 && "Love it!"}
                    </p>
                  )}
                </div>

                {visitorRole === "unrepresented_buyer" && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="preApproved"
                      checked={preApproved}
                      onCheckedChange={(checked) => setPreApproved(!!checked)}
                    />
                    <Label htmlFor="preApproved" className="text-sm font-normal cursor-pointer">
                      Are you pre-approved for a mortgage?
                    </Label>
                  </div>
                )}
              </>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any questions or comments?"
                rows={2}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!firstName.trim() || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
