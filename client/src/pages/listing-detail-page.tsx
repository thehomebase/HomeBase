import { useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ShieldCheck, MapPin, Phone, Mail, Bed, Bath, Maximize,
  Home, Play, Box, FileText, ImagePlus, Trash2, Pencil, Flag, ChevronLeft,
  ChevronRight, Loader2, X, ExternalLink, User as UserIcon
} from "lucide-react";

type ListingDetail = {
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
  listing_agent_phone: string | null;
  listing_agent_email: string | null;
  photo_url: string | null;
  listing_status: string | null;
  rentcast_data: any;
  marketing: {
    id: number;
    youtube_url: string | null;
    matterport_url: string | null;
    description: string | null;
    floorplan_pdf: string | null;
  } | null;
  marketingPhotos: Array<{ id: number; photo_url: string; caption: string | null; sort_order: number }>;
  agent: {
    id: number;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    profilePhone: string | null;
    email: string;
    brokerageName: string | null;
    verificationStatus: string;
  } | null;
};

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    let videoId = '';
    if (parsed.hostname.includes('youtube.com')) {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1);
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

export default function ListingDetailPage() {
  const [, params] = useRoute("/listing/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const listingId = params?.id ? parseInt(params.id, 10) : 0;
  const [showEditMarketing, setShowEditMarketing] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFloorplan, setShowFloorplan] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    youtubeUrl: "",
    matterportUrl: "",
    description: "",
  });

  const { data: listing, isLoading, isError } = useQuery<ListingDetail>({
    queryKey: ["/api/verified-listings", listingId],
    queryFn: async () => {
      const res = await fetch(`/api/verified-listings/${listingId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch listing");
      return res.json();
    },
    enabled: listingId > 0,
  });

  const isOwner = user?.id === listing?.agent_id;

  const updateMarketingMut = useMutation({
    mutationFn: async (data: { youtubeUrl?: string | null; matterportUrl?: string | null; description?: string | null }) => {
      const res = await apiRequest("PUT", `/api/verified-listings/${listingId}/marketing`, data);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verified-listings", listingId] });
      setShowEditMarketing(false);
      toast({ title: "Marketing materials updated" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const uploadPhotoMut = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch(`/api/verified-listings/${listingId}/photos`, {
        method: "POST", body: fd, credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verified-listings", listingId] });
      toast({ title: "Photo added" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const deletePhotoMut = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await apiRequest("DELETE", `/api/verified-listings/photos/${photoId}`);
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verified-listings", listingId] });
      setCurrentPhotoIndex(0);
      toast({ title: "Photo removed" });
    },
    onError: () => toast({ title: "Failed to remove photo", variant: "destructive" }),
  });

  const uploadFloorplanMut = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) throw new Error("PDF too large. Maximum 5MB.");
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await apiRequest("PUT", `/api/verified-listings/${listingId}/marketing`, { floorplanPdf: base64 });
      if (!res.ok) throw new Error("Failed to upload");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verified-listings", listingId] });
      toast({ title: "Floorplan uploaded" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const reportMut = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", `/api/verified-listings/${listingId}/report`, { reason });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowReport(false);
      setReportReason("");
      toast({ title: "Report submitted for review" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Home className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Listing not found</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const allPhotos = listing.marketingPhotos?.length > 0
    ? listing.marketingPhotos.map(p => p.photo_url)
    : listing.photo_url ? [listing.photo_url] : [];

  const youtubeEmbed = listing.marketing?.youtube_url ? getYoutubeEmbedUrl(listing.marketing.youtube_url) : null;
  const rentcastDetails = listing.rentcast_data || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{listing.address}</p>
          {listing.city && <p className="text-xs text-muted-foreground">{listing.city}, {listing.state} {listing.zip_code}</p>}
        </div>
        <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
          <ShieldCheck className="h-3 w-3" /> MLS Verified
        </Badge>
      </div>

      <div className="max-w-4xl mx-auto pb-20">
        {allPhotos.length > 0 ? (
          <div className="relative bg-black">
            <img
              src={allPhotos[currentPhotoIndex]}
              alt={listing.address}
              className="w-full h-64 sm:h-80 md:h-96 object-cover"
            />
            {allPhotos.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
                  onClick={() => setCurrentPhotoIndex(i => (i - 1 + allPhotos.length) % allPhotos.length)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70"
                  onClick={() => setCurrentPhotoIndex(i => (i + 1) % allPhotos.length)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                  {currentPhotoIndex + 1} / {allPhotos.length}
                </div>
              </>
            )}

            {isOwner && (
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  className="bg-white/90 rounded-full p-2 hover:bg-white transition-colors"
                  onClick={() => photoRef.current?.click()}
                >
                  <ImagePlus className="h-4 w-4 text-black" />
                </button>
                {listing.marketingPhotos?.length > 0 && (
                  <button
                    className="bg-red-500/90 rounded-full p-2 hover:bg-red-600 transition-colors"
                    onClick={() => deletePhotoMut.mutate(listing.marketingPhotos[currentPhotoIndex]?.id)}
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 flex flex-col items-center justify-center gap-2">
            <Home className="h-12 w-12 text-emerald-300 dark:text-emerald-700" />
            {isOwner && (
              <Button variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Add Photos
              </Button>
            )}
          </div>
        )}

        <div className="px-4 py-4 space-y-6">
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                {listing.price && (
                  <p className="text-2xl font-bold">${listing.price.toLocaleString()}</p>
                )}
                <p className="text-sm text-muted-foreground mt-0.5">{listing.address}</p>
                {listing.city && (
                  <p className="text-sm text-muted-foreground">{listing.city}, {listing.state} {listing.zip_code}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditForm({
                        youtubeUrl: listing.marketing?.youtube_url || "",
                        matterportUrl: listing.marketing?.matterport_url || "",
                        description: listing.marketing?.description || "",
                      });
                      setShowEditMarketing(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
                  </Button>
                )}
                {!isOwner && (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowReport(true)}>
                    <Flag className="h-3.5 w-3.5 mr-1" /> Report
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3">
              {listing.bedrooms != null && (
                <div className="flex items-center gap-1 text-sm">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{listing.bedrooms}</span>
                  <span className="text-muted-foreground text-xs">beds</span>
                </div>
              )}
              {listing.bathrooms != null && (
                <div className="flex items-center gap-1 text-sm">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{listing.bathrooms}</span>
                  <span className="text-muted-foreground text-xs">baths</span>
                </div>
              )}
              {listing.square_feet != null && (
                <div className="flex items-center gap-1 text-sm">
                  <Maximize className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{listing.square_feet.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs">sqft</span>
                </div>
              )}
              {listing.property_type && (
                <Badge variant="secondary" className="text-xs capitalize">{listing.property_type.replace(/([A-Z])/g, ' $1').trim()}</Badge>
              )}
            </div>

            {listing.mls_number && (
              <p className="text-xs text-muted-foreground mt-2">MLS# {listing.mls_number}</p>
            )}
          </div>

          {listing.marketing?.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.marketing.description}</p>
              </CardContent>
            </Card>
          )}

          {youtubeEmbed && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Play className="h-4 w-4 text-red-500" /> Video Tour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={youtubeEmbed}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Video Tour"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {listing.marketing?.matterport_url && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Box className="h-4 w-4 text-blue-500" /> 3D Tour
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <iframe
                    src={listing.marketing.matterport_url}
                    className="w-full h-full"
                    allow="fullscreen"
                    allowFullScreen
                    title="3D Tour"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {listing.marketing?.floorplan_pdf && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" /> Floor Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" onClick={() => setShowFloorplan(true)}>
                  View Floor Plan
                </Button>
              </CardContent>
            </Card>
          )}

          {isOwner && !listing.marketing?.floorplan_pdf && (
            <Card className="border-dashed">
              <CardContent className="py-4 text-center">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="floorplan-upload"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) uploadFloorplanMut.mutate(file);
                    e.target.value = "";
                  }}
                />
                <label htmlFor="floorplan-upload" className="cursor-pointer">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Upload a floor plan (PDF, max 5MB)</p>
                </label>
              </CardContent>
            </Card>
          )}

          {listing.agent && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Link href={`/profile/${listing.agent.id}`}>
                    <div className="h-12 w-12 rounded-full bg-muted overflow-hidden cursor-pointer">
                      {listing.agent.profilePhotoUrl ? (
                        <img src={listing.agent.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${listing.agent.id}`}>
                      <p className="text-sm font-semibold hover:underline cursor-pointer">
                        {listing.agent.firstName} {listing.agent.lastName}
                      </p>
                    </Link>
                    {listing.agent.brokerageName && (
                      <p className="text-xs text-muted-foreground">{listing.agent.brokerageName}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {listing.agent.verificationStatus !== "unverified" && (
                        <Badge className="text-[9px] bg-emerald-600 text-white border-0 gap-0.5">
                          <ShieldCheck className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {listing.agent.profilePhone && (
                      <a href={`tel:${listing.agent.profilePhone}`}>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                          <Phone className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    <a href={`mailto:${listing.agent.email}`}>
                      <Button variant="outline" size="icon" className="h-9 w-9">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) uploadPhotoMut.mutate(file);
          e.target.value = "";
        }}
      />

      <Dialog open={showEditMarketing} onOpenChange={setShowEditMarketing}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Marketing Materials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">YouTube Video URL</Label>
              <Input
                value={editForm.youtubeUrl}
                onChange={e => setEditForm(p => ({ ...p, youtubeUrl: e.target.value }))}
                placeholder="https://youtube.com/watch?v=..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Matterport 3D Tour URL</Label>
              <Input
                value={editForm.matterportUrl}
                onChange={e => setEditForm(p => ({ ...p, matterportUrl: e.target.value }))}
                placeholder="https://my.matterport.com/show/?m=..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Listing Description</Label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the property, key features, neighborhood highlights..."
                className="mt-1"
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditMarketing(false)}>Cancel</Button>
            <Button
              onClick={() => updateMarketingMut.mutate({
                youtubeUrl: editForm.youtubeUrl || null,
                matterportUrl: editForm.matterportUrl || null,
                description: editForm.description || null,
              })}
              disabled={updateMarketingMut.isPending}
            >
              {updateMarketingMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Report Listing</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            placeholder="Why are you reporting this listing?"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReport(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => reportMut.mutate(reportReason)}
              disabled={reportMut.isPending || reportReason.length < 5}
            >
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showFloorplan} onOpenChange={setShowFloorplan}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Floor Plan</DialogTitle>
          </DialogHeader>
          {listing.marketing?.floorplan_pdf && (
            <iframe
              src={listing.marketing.floorplan_pdf}
              className="w-full h-[70vh] rounded-lg"
              title="Floor Plan"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
