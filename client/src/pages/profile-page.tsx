import { useState, useRef, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Shield, ShieldCheck, CheckCircle2, MapPin, Phone, Mail, Pencil,
  Building2, FileText, User as UserIcon, Star, ChevronLeft, ChevronRight,
  Home, X, Eraser, CreditCard, ExternalLink, Loader2, Send, Globe
} from "lucide-react";
import { SiFacebook, SiInstagram, SiX, SiLinkedin } from "react-icons/si";
import { PhotoTouchup } from "@/components/photo-touchup";
import { PhotoPositionEditor } from "@/components/photo-position-editor";
import { Move } from "lucide-react";
import type { User } from "@shared/schema";

type PublicProfile = Omit<User, "password" | "emailVerificationToken" | "emailVerificationExpires" | "registrationIp">;

type VerifiedListingData = {
  id: number;
  agent_id: number;
  mls_number: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  property_type: string | null;
  listing_agent_name: string | null;
  photo_url: string | null;
  listing_status: string | null;
  marketing: {
    youtube_url: string | null;
    matterport_url: string | null;
    description: string | null;
  } | null;
  marketingPhotos: Array<{ id: number; photo_url: string; caption: string | null; sort_order: number }>;
};

type ProfileReviewData = {
  reviews: Array<{
    id: number;
    rating: number;
    title: string | null;
    comment: string;
    createdAt: string | null;
    reviewerName?: string;
  }>;
  avgRating: number;
  reviewCount: number;
};

function VerificationBadge({ status }: { status: string | null | undefined }) {
  if (status === "admin_verified") {
    return (
      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700">
        <ShieldCheck className="h-3 w-3" /> Platform Verified
      </Badge>
    );
  }
  if (status === "broker_verified") {
    return (
      <Badge className="gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700">
        <Shield className="h-3 w-3" /> Broker Verified
      </Badge>
    );
  }
  if (status === "payment_verified") {
    return (
      <Badge className="gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700">
        <CreditCard className="h-3 w-3" /> Payment Verified
      </Badge>
    );
  }
  if (status === "licensed") {
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700">
        <FileText className="h-3 w-3" /> Licensed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <UserIcon className="h-3 w-3" /> Unverified
    </Badge>
  );
}

function ConfirmedCheckItem({ label, confirmed }: { label: string; confirmed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
        confirmed ? "bg-green-100 dark:bg-green-900" : "bg-muted"
      }`}>
        {confirmed ? (
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`transition-colors`}
          style={{ width: size, height: size }}
          fill={star <= rating ? "#facc15" : "none"}
          stroke={star <= rating ? "#facc15" : "currentColor"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function VerifyIdentitySection({ profile }: { profile: PublicProfile }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{
    profileName: string;
    cardholderName: string;
    score: number;
    matched: boolean;
    lookupUrl: string | null;
    stateName: string | null;
  } | null>(null);
  const { toast } = useToast();

  const alreadyVerified = profile.verificationStatus === "payment_verified" ||
    profile.verificationStatus === "broker_verified" ||
    profile.verificationStatus === "admin_verified";

  const { data: stateLookup } = useQuery<{ url: string; name: string; notes: string } | null>({
    queryKey: [`/api/verification/state-lookup/${profile.licenseState}`],
    enabled: !!profile.licenseState,
  });

  async function handleStripeVerify() {
    setVerifying(true);
    try {
      const res = await fetch("/api/verification/check-stripe-name", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Verification failed", variant: "destructive" });
        setVerifying(false);
        return;
      }
      setResult(data);
      if (data.matched) {
        toast({ title: "Identity verified! Your credit card name matches your profile." });
        queryClient.invalidateQueries({ queryKey: ["/api/profile", profile.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      } else {
        toast({
          title: "Name mismatch detected",
          description: `Card: "${data.cardholderName}" vs Profile: "${data.profileName}"`,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Verification failed", variant: "destructive" });
    }
    setVerifying(false);
  }

  return (
    <div className="mt-4 pt-3 border-t">
      <h4 className="text-xs font-semibold text-muted-foreground mb-3">VERIFY YOUR IDENTITY</h4>

      {!alreadyVerified && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-2 text-xs"
          onClick={handleStripeVerify}
          disabled={verifying}
        >
          {verifying ? (
            <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> Checking...</>
          ) : (
            <><CreditCard className="h-3 w-3 mr-1.5" /> Verify with Payment Name</>
          )}
        </Button>
      )}

      {alreadyVerified && !result && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
          Your identity has been verified.
        </p>
      )}

      {result && (
        <div className={`rounded-lg p-2.5 text-xs mb-2 ${result.matched ? "bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"}`}>
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Profile:</span>
            <span className="font-medium">{result.profileName}</span>
          </div>
          <div className="flex justify-between mb-1">
            <span className="text-muted-foreground">Credit Card:</span>
            <span className="font-medium">{result.cardholderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Match:</span>
            <span className={`font-medium ${result.matched ? "text-emerald-600" : "text-amber-600"}`}>
              {result.matched ? "Verified" : "Mismatch"} ({Math.round(result.score * 100)}%)
            </span>
          </div>
        </div>
      )}

      {stateLookup && profile.licenseState && (
        <a
          href={stateLookup.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          Look up license on {stateLookup.name}
        </a>
      )}
    </div>
  );
}

function ProfilePhotoCard({ profile, isOwn }: { profile: PublicProfile; isOwn: boolean }) {
  const photoRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showTouchup, setShowTouchup] = useState(false);
  const [showPositionEditor, setShowPositionEditor] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const { toast } = useToast();

  async function handleUpload(file: File) {
    setPendingFile(file);
    setShowPositionEditor(true);
  }

  async function doUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/profile/photo", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      queryClient.invalidateQueries({ queryKey: ["/api/profile", profile.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile photo updated" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    }
    setUploading(false);
  }

  const handleTouchupSave = useCallback(async (blob: Blob) => {
    const fd = new FormData();
    fd.append("photo", blob, "touchup.png");
    const res = await fetch("/api/profile/photo/touchup", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) throw new Error("Save failed");
    queryClient.invalidateQueries({ queryKey: ["/api/profile", profile.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    toast({ title: "Photo touch-up saved" });
  }, [profile.id, toast]);

  return (
    <div className="relative">
      <div className="relative rounded-2xl overflow-hidden bg-[#ebebeb] dark:bg-neutral-800 aspect-[4/5] shadow-lg">
        {profile.brokerageName && (
          <div className="absolute top-3 left-3 z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 bg-white/70 dark:bg-black/40 px-2 py-0.5 rounded">
              {profile.brokerageName}
            </span>
          </div>
        )}

        {profile.profilePhotoUrl ? (
          <img
            src={profile.profilePhotoUrl}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UserIcon className="h-24 w-24 text-neutral-400 dark:text-neutral-600" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pt-12 pb-4 px-4">
          <p className="text-white text-sm font-medium">
            {profile.role === "broker" ? "Managing Broker" : profile.role === "agent" ? "Agent" : profile.role}
          </p>
          <p className="text-white text-lg font-bold">{profile.firstName} {profile.lastName}</p>
        </div>

        {isOwn && (
          <div className="absolute top-3 right-3 z-10 flex gap-1.5">
            {profile.profilePhotoUrl && (
              <>
                <button
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  onClick={() => setShowTouchup(true)}
                  title="Touch up photo"
                >
                  <Eraser className="h-4 w-4" />
                </button>
                <button
                  className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                  onClick={() => {
                    fetch(profile.profilePhotoUrl)
                      .then(r => r.blob())
                      .then(b => {
                        setPendingFile(new File([b], "current.png", { type: "image/png" }));
                        setShowPositionEditor(true);
                      });
                  }}
                  title="Reposition photo"
                >
                  <Move className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              onClick={() => photoRef.current?.click()}
              disabled={uploading}
              title="Upload new photo"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = "";
      }} />

      {profile.profilePhotoUrl && (
        <PhotoTouchup
          open={showTouchup}
          onClose={() => setShowTouchup(false)}
          photoUrl={profile.profilePhotoUrl}
          onSave={handleTouchupSave}
        />
      )}

      {pendingFile && (
        <PhotoPositionEditor
          open={showPositionEditor}
          onClose={() => { setShowPositionEditor(false); setPendingFile(null); }}
          imageFile={pendingFile}
          onSave={async (blob) => {
            const file = new File([blob], "positioned.png", { type: "image/png" });
            await doUpload(file);
          }}
        />
      )}
    </div>
  );
}

function ReviewsSection({ profileId, profileName }: { profileId: number; profileName: string }) {
  const [scrollIdx, setScrollIdx] = useState(0);
  const { data } = useQuery<ProfileReviewData>({
    queryKey: ["/api/profile", profileId, "reviews"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profileId}/reviews`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
  });

  if (!data || data.reviewCount === 0) return null;

  const reviews = data.reviews;
  const maxIdx = Math.max(0, reviews.length - 2);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{profileName} Reviews</h2>
          <p className="text-sm text-muted-foreground">
            {data.reviewCount} {data.reviewCount === 1 ? "review" : "reviews"} · {data.avgRating.toFixed(1)} avg
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-1">
            {String(scrollIdx + 1).padStart(2, "0")}/{String(Math.min(reviews.length, 5)).padStart(2, "0")}
          </span>
          <button
            onClick={() => setScrollIdx(Math.max(0, scrollIdx - 1))}
            disabled={scrollIdx === 0}
            className="p-1.5 rounded-full border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setScrollIdx(Math.min(maxIdx, scrollIdx + 1))}
            disabled={scrollIdx >= maxIdx}
            className="p-1.5 rounded-full border bg-background hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden">
        <div
          className="flex gap-3 transition-transform duration-300"
          style={{ transform: `translateX(-${scrollIdx * 50}%)` }}
        >
          {reviews.map((review) => (
            <Card key={review.id} className="min-w-[48%] md:min-w-[48%] flex-shrink-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{review.reviewerName || "Anonymous"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarDisplay rating={review.rating} size={12} />
                    <span className="text-xs font-medium ml-0.5">{review.rating.toFixed(1)}</span>
                  </div>
                </div>
                {review.title && <p className="text-sm font-medium mb-1">{review.title}</p>}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                  "{review.comment}"
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Link href={`/agents/${profileId}/reviews`}>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
          View all reviews →
        </Button>
      </Link>
    </div>
  );
}

function VerifiedListingsSection({ profileId, profileName, isOwn }: { profileId: number; profileName: string; isOwn: boolean }) {
  const { data, isLoading } = useQuery<{ listings: VerifiedListingData[]; fromCache?: boolean; message?: string }>({
    queryKey: ["/api/profile", profileId, "verified-listings"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profileId}/verified-listings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch verified listings");
      return res.json();
    },
  });

  const listings = data?.listings || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Active Listings</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => <div key={i} className="h-48 w-40 rounded-xl bg-muted animate-pulse flex-shrink-0" />)}
        </div>
      </div>
    );
  }

  if (listings.length === 0) {
    if (!isOwn) return null;
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Active Listings</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <Home className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">
              {data?.message || "No active MLS listings found. Listings are auto-discovered from MLS data once your identity is verified."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{profileName} Listings</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            MLS Verified
          </Badge>
          <Badge variant="outline" className="text-xs">{listings.length} active</Badge>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
        {listings.map((listing) => {
          const displayPhoto = listing.marketingPhotos?.[0]?.photo_url || listing.photo_url;
          const hasMarketing = listing.marketing?.youtube_url || listing.marketing?.matterport_url || listing.marketing?.description;

          return (
            <Link key={listing.id} href={`/listing/${listing.id}`}>
              <div className="min-w-[160px] max-w-[180px] flex-shrink-0 snap-start cursor-pointer">
                <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/5] group">
                  {displayPhoto ? (
                    <img
                      src={displayPhoto}
                      alt={listing.address}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
                      <Home className="h-10 w-10 text-emerald-300 dark:text-emerald-700" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge className="text-[9px] px-1.5 py-0 bg-emerald-600 text-white border-0">
                      <ShieldCheck className="h-2.5 w-2.5 mr-0.5" />
                      Verified
                    </Badge>
                  </div>

                  {listing.marketingPhotos && listing.marketingPhotos.length > 1 && (
                    <div className="absolute top-2 right-2">
                      <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                        {listing.marketingPhotos.length}
                      </Badge>
                    </div>
                  )}

                  {hasMarketing && (
                    <div className="absolute top-8 left-2">
                      <Badge className="text-[9px] px-1.5 py-0 bg-blue-600 text-white border-0">
                        Tour
                      </Badge>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-2 px-2">
                    <p className="text-white text-xs font-medium truncate">{listing.address}</p>
                    {listing.city && (
                      <p className="text-white/70 text-[10px] truncate">{listing.city}, {listing.state}</p>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 px-0.5">
                  {listing.price && (
                    <p className="text-xs font-semibold">${listing.price.toLocaleString()}</p>
                  )}
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {listing.bedrooms && <span>{listing.bedrooms} bd</span>}
                    {listing.bathrooms && <span>· {listing.bathrooms} ba</span>}
                    {listing.square_feet && <span>· {listing.square_feet.toLocaleString()} sqft</span>}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type ServiceAreaData = {
  cities: Array<{ city: string; state: string; transactionCount: number }>;
  licenseState: string | null;
  totalTransactions: number;
  closedTransactions: number;
};

function ServiceAreasSection({ profileId, profileName }: { profileId: number; profileName: string }) {
  const { data } = useQuery<ServiceAreaData>({
    queryKey: ["/api/profile", profileId, "service-areas"],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profileId}/service-areas`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  if (!data || (data.cities.length === 0 && !data.licenseState)) return null;

  return (
    <div>
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-primary" />
        Service Areas
      </h3>
      <Card>
        <CardContent className="p-5">
          {data.totalTransactions > 0 && (
            <div className="flex items-center gap-6 mb-4 pb-4 border-b">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{data.totalTransactions}</div>
                <div className="text-xs text-muted-foreground">Transactions</div>
              </div>
              {data.closedTransactions > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.closedTransactions}</div>
                  <div className="text-xs text-muted-foreground">Closed</div>
                </div>
              )}
              {data.cities.length > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.cities.length}</div>
                  <div className="text-xs text-muted-foreground">{data.cities.length === 1 ? "City" : "Cities"}</div>
                </div>
              )}
            </div>
          )}
          {data.licenseState && (
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Licensed in <span className="font-semibold">{data.licenseState}</span></span>
            </div>
          )}
          {data.cities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.cities.map((c, i) => (
                <Badge key={i} variant="secondary" className="gap-1 text-xs py-1 px-2.5">
                  <MapPin className="h-3 w-3" />
                  {c.city}{c.state ? `, ${c.state}` : ""}
                  {c.transactionCount > 1 && (
                    <span className="text-muted-foreground ml-0.5">({c.transactionCount})</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ContactFormSection({ profileId, profileName }: { profileId: number; profileName: string }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [sent, setSent] = useState(false);

  const contactMut = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch(`/api/profile/${profileId}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send");
      }
      return res.json();
    },
    onSuccess: () => {
      setSent(true);
      toast({ title: "Message sent!" });
    },
    onError: (e: Error) => {
      toast({ title: e.message, variant: "destructive" });
    },
  });

  if (sent) {
    return (
      <div>
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Contact {profileName.split(" ")[0]}
        </h3>
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
            <h4 className="font-semibold text-lg mb-1">Message Sent!</h4>
            <p className="text-sm text-muted-foreground">
              {profileName.split(" ")[0]} will receive your message and get back to you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Send className="h-5 w-5 text-primary" />
        Contact {profileName.split(" ")[0]}
      </h3>
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Interested in working with {profileName.split(" ")[0]}? Send a message to get started.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              contactMut.mutate(formData);
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Your Name *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Email *</Label>
                <Input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  placeholder="john@example.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Phone (optional)</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Message *</Label>
              <Textarea
                required
                value={formData.message}
                onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
                placeholder="I'm interested in buying/selling a home..."
                className="mt-1"
                rows={3}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={contactMut.isPending}>
              {contactMut.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Message</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [showEdit, setShowEdit] = useState(false);

  const profileId = params?.id ? parseInt(params.id, 10) : user?.id;
  const isOwn = profileId === user?.id;

  const { data: profile, isLoading } = useQuery<PublicProfile>({
    queryKey: ["/api/profile", profileId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${profileId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!profileId,
  });

  const [editData, setEditData] = useState({
    profileBio: "",
    profilePhone: "",
    brokerageName: "",
    licenseNumber: "",
    licenseState: "",
    facebookUrl: "",
    instagramUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile", profileId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowEdit(false);
      toast({ title: "Profile updated" });
    },
    onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
  });

  function openEdit() {
    if (!profile) return;
    setEditData({
      profileBio: profile.profileBio || "",
      profilePhone: profile.profilePhone || "",
      brokerageName: profile.brokerageName || "",
      licenseNumber: profile.licenseNumber || "",
      licenseState: profile.licenseState || "",
      facebookUrl: profile.facebookUrl || "",
      instagramUrl: profile.instagramUrl || "",
      twitterUrl: profile.twitterUrl || "",
      linkedinUrl: profile.linkedinUrl || "",
    });
    setShowEdit(true);
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 text-center">
        <h1 className="text-xl font-bold">Profile Not Found</h1>
        <p className="text-muted-foreground mt-2">This user doesn't exist or their profile is not available.</p>
      </div>
    );
  }

  const isAgentOrBroker = profile.role === "agent" || profile.role === "broker";
  const isLicensedRole = profile.role === "agent" || profile.role === "broker" || profile.role === "lender";
  const profileName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="w-full px-4 sm:px-8 py-6 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_1fr] gap-5 mb-8">
        <ProfilePhotoCard profile={profile} isOwn={isOwn} />

        <Card className="h-fit">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">Confirmed Information</h3>
              {isOwn && (
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={openEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-around">
              <ConfirmedCheckItem label="Identity" confirmed={!!profile.profilePhotoUrl} />
              <ConfirmedCheckItem label="Email" confirmed={!!profile.emailVerified || !!profile.email} />
              <ConfirmedCheckItem label="Phone" confirmed={!!profile.profilePhone} />
              {isLicensedRole && (
                <ConfirmedCheckItem label="License" confirmed={!!profile.licenseNumber} />
              )}
            </div>
            {isLicensedRole && (profile.licenseNumber || profile.nmlsNumber) && (
              <div className="mt-4 pt-3 border-t space-y-2">
                <span className="text-xs font-medium text-muted-foreground">License Details</span>
                {profile.licenseNumber && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{profile.licenseNumber}</span>
                      {profile.licenseState && (
                        <span className="text-xs text-muted-foreground ml-1.5">({profile.licenseState})</span>
                      )}
                    </div>
                  </div>
                )}
                {profile.nmlsNumber && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground">NMLS# </span>
                      <span className="text-sm font-medium">{profile.nmlsNumber}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isLicensedRole && (
              <div className="mt-4 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Verification</span>
                  <VerificationBadge status={profile.verificationStatus} />
                </div>
                {profile.stripeNameVerified && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <CreditCard className="h-3 w-3 text-emerald-600" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">Payment name verified</span>
                  </div>
                )}
              </div>
            )}
            {isOwn && isLicensedRole && <VerifyIdentitySection profile={profile} />}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="p-5">
            <h3 className="font-bold text-sm mb-3">About {profile.firstName}</h3>
            {isAgentOrBroker && profile.brokerageName && (
              <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span>{profile.brokerageName}</span>
              </div>
            )}
            {profile.licenseState && (
              <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{profile.licenseState}</span>
              </div>
            )}
            {profile.profileBio ? (
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.profileBio}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isOwn ? "Add a bio to tell clients about yourself." : "No bio provided yet."}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              {profile.profilePhone && (
                <a href={`tel:${profile.profilePhone}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <Phone className="h-3 w-3" /> Call
                  </Button>
                </a>
              )}
              <a href={`mailto:${profile.email}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Mail className="h-3 w-3" /> Email
                </Button>
              </a>
            </div>
            {(profile.facebookUrl || profile.instagramUrl || profile.twitterUrl || profile.linkedinUrl) && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                {profile.facebookUrl && (
                  <a href={profile.facebookUrl} target="_blank" rel="noopener noreferrer" title="Facebook">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#1877F2]">
                      <SiFacebook className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {profile.instagramUrl && (
                  <a href={profile.instagramUrl} target="_blank" rel="noopener noreferrer" title="Instagram">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#E4405F]">
                      <SiInstagram className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {profile.twitterUrl && (
                  <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" title="X / Twitter">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <SiX className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                {profile.linkedinUrl && (
                  <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[#0A66C2]">
                      <SiLinkedin className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {isAgentOrBroker && (
        <div className="space-y-8">
          <ServiceAreasSection profileId={profile.id} profileName={profileName} />
          <ReviewsSection profileId={profile.id} profileName={profileName} />
          <VerifiedListingsSection profileId={profile.id} profileName={profileName} isOwn={isOwn} />
          {!isOwn && <ContactFormSection profileId={profile.id} profileName={profileName} />}
        </div>
      )}

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Bio</Label>
              <Textarea
                value={editData.profileBio}
                onChange={e => setEditData(p => ({ ...p, profileBio: e.target.value }))}
                placeholder="Tell people about yourself and your experience..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                value={editData.profilePhone}
                onChange={e => setEditData(p => ({ ...p, profilePhone: e.target.value }))}
                placeholder="(555) 123-4567"
                className="mt-1"
              />
            </div>
            {isAgentOrBroker && (
              <>
                <div>
                  <Label className="text-xs">Brokerage Name</Label>
                  <Input
                    value={editData.brokerageName}
                    onChange={e => setEditData(p => ({ ...p, brokerageName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">License Number</Label>
                    <Input
                      value={editData.licenseNumber}
                      onChange={e => setEditData(p => ({ ...p, licenseNumber: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">License State</Label>
                    <Input
                      value={editData.licenseState}
                      onChange={e => setEditData(p => ({ ...p, licenseState: e.target.value }))}
                      maxLength={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
            {isLicensedRole && (
              <>
                <div className="pt-2 border-t">
                  <Label className="text-xs font-medium text-muted-foreground">Social Media Links</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1.5"><SiFacebook className="h-3 w-3" /> Facebook</Label>
                    <Input
                      value={editData.facebookUrl}
                      onChange={e => setEditData(p => ({ ...p, facebookUrl: e.target.value }))}
                      placeholder="https://facebook.com/..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1.5"><SiInstagram className="h-3 w-3" /> Instagram</Label>
                    <Input
                      value={editData.instagramUrl}
                      onChange={e => setEditData(p => ({ ...p, instagramUrl: e.target.value }))}
                      placeholder="https://instagram.com/..."
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs flex items-center gap-1.5"><SiX className="h-3 w-3" /> X / Twitter</Label>
                    <Input
                      value={editData.twitterUrl}
                      onChange={e => setEditData(p => ({ ...p, twitterUrl: e.target.value }))}
                      placeholder="https://x.com/..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1.5"><SiLinkedin className="h-3 w-3" /> LinkedIn</Label>
                    <Input
                      value={editData.linkedinUrl}
                      onChange={e => setEditData(p => ({ ...p, linkedinUrl: e.target.value }))}
                      placeholder="https://linkedin.com/in/..."
                      className="mt-1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={() => updateMut.mutate(editData)} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
