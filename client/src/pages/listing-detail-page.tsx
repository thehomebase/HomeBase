import { useState, useRef, useEffect } from "react";
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
  ChevronRight, Loader2, X, ExternalLink, User as UserIcon,
  AlertTriangle, GraduationCap, Droplets, Heart, Share2, Clock,
  Calendar, Copy, Check, TrendingUp, TrendingDown, Minus,
  GripVertical, Upload, Images
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MapContainer, TileLayer, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import * as esri from "esri-leaflet";

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

const propertyMarkerIcon = L.divIcon({
  html: `<div style="background:#059669;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FloodLayer() {
  const map = useMap();

  useEffect(() => {
    const floodOverlay = esri.dynamicMapLayer({
      url: "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer",
      layers: [28],
      opacity: 0.55,
      attribution: "FEMA NFHL",
      f: "image" as any,
    });
    floodOverlay.addTo(map);
    return () => { map.removeLayer(floodOverlay); };
  }, [map]);

  return null;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getSchoolColor(tags: any): { bg: string; label: string } {
  const gradeStr = (tags?.["grades"] || tags?.["isced:level"] || tags?.["school:type"] || "").toLowerCase();
  const name = (tags?.name || "").toLowerCase();
  if (gradeStr.includes("1") || gradeStr.includes("primary") || name.includes("elementary") || name.includes("primary"))
    return { bg: "#22c55e", label: "Elementary" };
  if (gradeStr.includes("2") || gradeStr.includes("secondary") || name.includes("middle") || name.includes("junior"))
    return { bg: "#f59e0b", label: "Middle" };
  if (gradeStr.includes("3") || name.includes("high school") || name.includes("senior"))
    return { bg: "#8b5cf6", label: "High" };
  if (name.includes("montessori") || name.includes("academy") || name.includes("prep"))
    return { bg: "#ec4899", label: "Private" };
  return { bg: "#3b82f6", label: "School" };
}

function SchoolLayer({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const radius = 3000;
    const query = `[out:json][timeout:10];(node["amenity"="school"](around:${radius},${lat},${lng});way["amenity"="school"](around:${radius},${lat},${lng}););out center 30;`;
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (controller.signal.aborted) return;
        const results = (data.elements || []).map((el: any) => ({
          lat: el.lat || el.center?.lat,
          lon: el.lon || el.center?.lon,
          name: el.tags?.name || "School",
          tags: el.tags || {},
        })).filter((s: any) => s.lat && s.lon);

        results.forEach((school: any) => {
          const { bg, label } = getSchoolColor(school.tags);
          const icon = L.divIcon({
            html: `<div style="background:${bg};width:26px;height:26px;border-radius:50%;border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            </div>`,
            className: '',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          });
          const safeName = escapeHtml(school.name);
          const gsLink = `https://www.greatschools.org/search/search.page?q=${encodeURIComponent(school.name)}&lat=${school.lat}&lon=${school.lon}`;
          const popupHtml = `
            <div style="min-width:160px">
              <div style="font-weight:600;font-size:13px;margin-bottom:4px">${safeName}</div>
              <span style="display:inline-block;background:${bg};color:white;font-size:10px;padding:2px 8px;border-radius:10px;margin-bottom:6px">${label}</span>
              <div style="margin-top:6px">
                <a href="${gsLink}" target="_blank" rel="noopener" style="color:#3b82f6;font-size:11px;text-decoration:underline">View ratings on GreatSchools →</a>
              </div>
            </div>`;
          const m = L.marker([school.lat, school.lon], { icon })
            .bindPopup(popupHtml, { maxWidth: 220 })
            .addTo(map);
          markersRef.current.push(m);
        });
      })
      .catch(() => {});

    return () => {
      controller.abort();
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [map, lat, lng]);

  return null;
}

function SafetyLayer({ lat, lng, city, state, onStatusChange }: { lat: number; lng: number; city: string; state: string; onStatusChange?: (status: { available: boolean; source?: string; total?: number; topTypes?: [string, number][] }) => void }) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);
  const markersRef = useRef<L.Marker[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/crime-data?lat=${lat}&lng=${lng}&city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`, { signal: controller.signal, credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (controller.signal.aborted) return;

        if (data.available && data.incidents?.length > 0) {
          const heatPoints: [number, number, number][] = data.incidents.map((i: any) => [i.lat, i.lng, 0.5]);

          heatLayerRef.current = (L as any).heatLayer(heatPoints, {
            radius: 30,
            blur: 20,
            maxZoom: 17,
            max: 1.0,
            gradient: { 0.1: '#22c55e', 0.3: '#84cc16', 0.5: '#eab308', 0.7: '#f97316', 1.0: '#ef4444' },
          });
          heatLayerRef.current.addTo(map);

          onStatusChange?.({ available: true, source: data.source, total: data.totalIncidents, topTypes: data.topTypes });
        } else {
          onStatusChange?.({ available: false });
          const radius = 3000;
          const query = `[out:json][timeout:10];(node["amenity"="police"](around:${radius},${lat},${lng});way["amenity"="police"](around:${radius},${lat},${lng});node["amenity"="fire_station"](around:${radius},${lat},${lng});way["amenity"="fire_station"](around:${radius},${lat},${lng}););out center 20;`;
          fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`, { signal: controller.signal })
            .then(r => r.json())
            .then(osm => {
              if (controller.signal.aborted) return;
              (osm.elements || []).forEach((el: any) => {
                const elLat = el.lat || el.center?.lat;
                const elLon = el.lon || el.center?.lon;
                if (!elLat || !elLon) return;
                const isPolice = el.tags?.amenity === "police";
                const rawName = el.tags?.name || (isPolice ? "Police Station" : "Fire Station");
                const color = isPolice ? "#1d4ed8" : "#dc2626";
                const svgPath = isPolice
                  ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'
                  : '<path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>';
                const icon = L.divIcon({
                  html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">${svgPath}</svg>
                  </div>`,
                  className: '',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12],
                });
                const m = L.marker([elLat, elLon], { icon })
                  .bindPopup(`<div style="min-width:120px"><strong>${escapeHtml(rawName)}</strong><br/><span style="font-size:11px;color:#666">${isPolice ? "Police Station" : "Fire Station"}</span></div>`, { maxWidth: 200 })
                  .addTo(map);
                markersRef.current.push(m);
              });
            })
            .catch(() => {});
        }
      })
      .catch(() => { onStatusChange?.({ available: false }); });

    return () => {
      controller.abort();
      if (heatLayerRef.current) { map.removeLayer(heatLayerRef.current); heatLayerRef.current = null; }
      markersRef.current.forEach(m => map.removeLayer(m));
      markersRef.current = [];
    };
  }, [map, lat, lng, city, state]);

  return null;
}

function PropertyMap({ lat, lng, address, city, state }: { lat: number; lng: number; address: string; city: string; state: string }) {
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [crimeStatus, setCrimeStatus] = useState<{ available: boolean; source?: string; total?: number; topTypes?: [string, number][] } | null>(null);

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
        if (layer === 'safety') setCrimeStatus(null);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-500" /> Location
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={activeLayers.has('safety') ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              onClick={() => toggleLayer('safety')}
            >
              <AlertTriangle className="h-3 w-3" />
              Safety
            </Button>
            <Button
              variant={activeLayers.has('schools') ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              onClick={() => toggleLayer('schools')}
            >
              <GraduationCap className="h-3 w-3" />
              Schools
            </Button>
            <Button
              variant={activeLayers.has('flood') ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2 gap-1"
              onClick={() => toggleLayer('flood')}
            >
              <Droplets className="h-3 w-3" />
              Flood
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg overflow-hidden border h-64 sm:h-80">
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com">CARTO</a>'
            />
            <Marker position={[lat, lng]} icon={propertyMarkerIcon} />
            {activeLayers.has('flood') && <FloodLayer />}
            {activeLayers.has('schools') && <SchoolLayer lat={lat} lng={lng} />}
            {activeLayers.has('safety') && <SafetyLayer lat={lat} lng={lng} city={city} state={state} onStatusChange={setCrimeStatus} />}
          </MapContainer>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{address}</p>
        {activeLayers.size > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeLayers.has('safety') && (
              <div className="flex flex-col gap-1">
                {crimeStatus?.available ? (
                  <>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <AlertTriangle className="h-2.5 w-2.5 text-red-500" />
                      {crimeStatus.total} incidents · Source: {crimeStatus.source}
                    </Badge>
                    {crimeStatus.topTypes && crimeStatus.topTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {crimeStatus.topTypes.slice(0, 5).map(([type, count]) => (
                          <Badge key={type} variant="secondary" className="text-[9px] py-0 gap-0.5">
                            {type.toLowerCase().replace(/_/g, ' ')} ({count})
                          </Badge>
                        ))}
                      </div>
                    )}
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500" />Low
                      <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 ml-1" />Medium
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1" />High density
                    </span>
                  </>
                ) : crimeStatus !== null ? (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />
                    Crime data not available for this area · Showing emergency services
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    Loading crime data...
                  </Badge>
                )}
              </div>
            )}
            {activeLayers.has('schools') && (
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] gap-1">
                  <GraduationCap className="h-2.5 w-2.5 text-blue-500" />
                  Click schools for ratings
                </Badge>
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500" />Elem
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-1" />Middle
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500 ml-1" />High
                  <span className="inline-block w-2 h-2 rounded-full bg-pink-500 ml-1" />Private
                </span>
              </div>
            )}
            {activeLayers.has('flood') && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Droplets className="h-2.5 w-2.5 text-cyan-500" />
                FEMA flood zones overlay
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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
  const [showShowing, setShowShowing] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [dragOverPhoto, setDragOverPhoto] = useState(false);
  const [draggedPhotoIdx, setDraggedPhotoIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    youtubeUrl: "",
    matterportUrl: "",
    description: "",
  });
  const [showingForm, setShowingForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
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

  const { data: savedProperties } = useQuery<Array<{ id: number; url: string }>>({
    queryKey: ["/api/saved-properties"],
    enabled: !!user,
  });

  const listingUrl = `/listing/${listingId}`;
  const matchesSavedUrl = (url: string | undefined) => {
    if (!url) return false;
    try {
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      return path === listingUrl;
    } catch { return url === listingUrl; }
  };
  const isSaved = savedProperties?.some(sp => matchesSavedUrl(sp.url));

  const saveMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/saved-properties", {
        url: listingUrl,
        source: "verified_listing",
        streetAddress: listing?.address,
        city: listing?.city,
        state: listing?.state,
        zipCode: listing?.zip_code,
        notes: `${listing?.bedrooms || '?'} bed, ${listing?.bathrooms || '?'} bath — $${listing?.price?.toLocaleString() || 'N/A'}`,
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({ title: "Property saved to favorites" });
    },
    onError: () => toast({ title: "Failed to save property", variant: "destructive" }),
  });

  const unsaveMut = useMutation({
    mutationFn: async () => {
      const saved = savedProperties?.find(sp => matchesSavedUrl(sp.url));
      if (!saved) throw new Error("Not saved");
      const res = await apiRequest("DELETE", `/api/saved-properties/${saved.id}`);
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({ title: "Removed from favorites" });
    },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  const showingMut = useMutation({
    mutationFn: async (data: typeof showingForm) => {
      const res = await apiRequest("POST", "/api/leads/submit", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        zipCode: listing?.zip_code || "",
        type: "buyer" as const,
        message: `Showing request for ${listing?.address}, ${listing?.city}, ${listing?.state} ${listing?.zip_code}${data.message ? ` — ${data.message}` : ''}`,
        source: "listing_showing_request",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setShowShowing(false);
      setShowingForm({ firstName: "", lastName: "", email: "", phone: "", message: "" });
      toast({ title: "Showing request submitted! An agent in this area will contact you shortly." });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/listing/${listingId}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({ title: "Link copied to clipboard" });
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out this property: ${listing?.address}`);
    const body = encodeURIComponent(`I found this property on HomeBase:\n\n${listing?.address}, ${listing?.city}, ${listing?.state} ${listing?.zip_code}\n${listing?.bedrooms || '?'} bed, ${listing?.bathrooms || '?'} bath — $${listing?.price?.toLocaleString() || 'N/A'}\n\nView it here: ${window.location.origin}/listing/${listingId}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
    setShowShareMenu(false);
  };

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
    mutationFn: async (files: File[]) => {
      setUploadProgress(`Uploading ${files.length} photo${files.length > 1 ? 's' : ''}...`);
      const fd = new FormData();
      for (const file of files) fd.append("photos", file);
      const res = await fetch(`/api/verified-listings/${listingId}/photos/bulk`, {
        method: "POST", body: fd, credentials: "include"
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      setUploadProgress(null);
      queryClient.invalidateQueries({ queryKey: ["/api/verified-listings", listingId] });
      toast({ title: `${data.count || 1} photo${(data.count || 1) > 1 ? 's' : ''} added` });
    },
    onError: (e: Error) => {
      setUploadProgress(null);
      toast({ title: e.message, variant: "destructive" });
    },
  });

  const reorderPhotosMut = useMutation({
    mutationFn: async (photoIds: number[]) => {
      const res = await apiRequest("PUT", `/api/verified-listings/${listingId}/photos/reorder`, { photoIds });
      if (!res.ok) throw new Error("Reorder failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/verified-listings", listingId] });
      toast({ title: "Photo order updated" });
    },
    onError: () => toast({ title: "Failed to reorder", variant: "destructive" }),
  });

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPhoto(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length > 0) uploadPhotoMut.mutate(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) uploadPhotoMut.mutate(files);
    e.target.value = "";
  };

  const handlePhotoDragStart = (idx: number) => setDraggedPhotoIdx(idx);
  const handlePhotoDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };
  const handlePhotoDrop = (idx: number) => {
    if (draggedPhotoIdx == null || draggedPhotoIdx === idx || !listing.marketingPhotos) return;
    const photos = [...listing.marketingPhotos];
    const [moved] = photos.splice(draggedPhotoIdx, 1);
    photos.splice(idx, 0, moved);
    reorderPhotosMut.mutate(photos.map(p => p.id));
    setDraggedPhotoIdx(null);
    setDragOverIdx(null);
  };

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
          <div
            className={`relative bg-black ${isOwner && dragOverPhoto ? 'ring-4 ring-emerald-500 ring-inset' : ''}`}
            onDragOver={isOwner ? (e) => { e.preventDefault(); setDragOverPhoto(true); } : undefined}
            onDragLeave={isOwner ? () => setDragOverPhoto(false) : undefined}
            onDrop={isOwner ? handleFileDrop : undefined}
          >
            {dragOverPhoto && (
              <div className="absolute inset-0 z-10 bg-emerald-500/30 flex items-center justify-center pointer-events-none">
                <div className="bg-white dark:bg-gray-900 rounded-lg px-6 py-4 flex items-center gap-3 shadow-xl">
                  <Upload className="h-6 w-6 text-emerald-600" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Drop photos here</span>
                </div>
              </div>
            )}
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

            {uploadProgress && (
              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                <Loader2 className="h-3 w-3 animate-spin" />
                {uploadProgress}
              </div>
            )}

            {isOwner && (
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  className="bg-white/90 rounded-full p-2 hover:bg-white transition-colors"
                  onClick={() => photoRef.current?.click()}
                  title="Add photos"
                >
                  <ImagePlus className="h-4 w-4 text-black" />
                </button>
                {listing.marketingPhotos?.length > 0 && (
                  <>
                    <button
                      className="bg-white/90 rounded-full p-2 hover:bg-white transition-colors"
                      onClick={() => setShowPhotoManager(true)}
                      title="Manage photos"
                    >
                      <Images className="h-4 w-4 text-black" />
                    </button>
                    <button
                      className="bg-red-500/90 rounded-full p-2 hover:bg-red-600 transition-colors"
                      onClick={() => deletePhotoMut.mutate(listing.marketingPhotos[currentPhotoIndex]?.id)}
                      title="Delete this photo"
                    >
                      <Trash2 className="h-4 w-4 text-white" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`h-48 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 flex flex-col items-center justify-center gap-2 ${isOwner && dragOverPhoto ? 'ring-4 ring-emerald-500 ring-inset' : ''}`}
            onDragOver={isOwner ? (e) => { e.preventDefault(); setDragOverPhoto(true); } : undefined}
            onDragLeave={isOwner ? () => setDragOverPhoto(false) : undefined}
            onDrop={isOwner ? handleFileDrop : undefined}
          >
            {dragOverPhoto ? (
              <div className="flex items-center gap-3">
                <Upload className="h-8 w-8 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Drop photos here</span>
              </div>
            ) : (
              <>
                <Home className="h-12 w-12 text-emerald-300 dark:text-emerald-700" />
                {isOwner && (
                  <div className="flex flex-col items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => photoRef.current?.click()}>
                      <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Add Photos
                    </Button>
                    <p className="text-[10px] text-muted-foreground">or drag & drop images here</p>
                  </div>
                )}
              </>
            )}
            {uploadProgress && (
              <div className="flex items-center gap-2 text-emerald-600 text-xs mt-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {uploadProgress}
              </div>
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

            {(() => {
              const rc = listing.rentcast_data as any;
              const dom = rc?.daysOnMarket;
              const listedDate = rc?.listedDate;
              if (dom != null || listedDate) {
                const computed = listedDate ? Math.floor((Date.now() - new Date(listedDate).getTime()) / 86400000) : null;
                const days = typeof dom === 'number' ? dom : computed;
                if (days == null || isNaN(days)) return null;
                const color = days <= 7 ? "text-emerald-600" : days <= 21 ? "text-amber-600" : days <= 60 ? "text-orange-600" : "text-red-600";
                const bgColor = days <= 7 ? "bg-emerald-50 dark:bg-emerald-950" : days <= 21 ? "bg-amber-50 dark:bg-amber-950" : days <= 60 ? "bg-orange-50 dark:bg-orange-950" : "bg-red-50 dark:bg-red-950";
                const label = days <= 7 ? "New listing" : days <= 14 ? "Recently listed" : days <= 30 ? "On the market" : days <= 60 ? "Getting stale" : "Long time on market";
                return (
                  <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md ${bgColor}`}>
                    <Clock className={`h-3.5 w-3.5 ${color}`} />
                    <span className={`text-xs font-medium ${color}`}>{days} days on market</span>
                    <span className="text-xs text-muted-foreground">· {label}</span>
                    {listedDate && <span className="text-xs text-muted-foreground">· Listed {new Date(listedDate).toLocaleDateString()}</span>}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              className="flex-1 gap-2"
              onClick={() => setShowShowing(true)}
            >
              <Calendar className="h-4 w-4" />
              Schedule a Showing
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="icon"
                    className={isSaved ? "bg-red-500 hover:bg-red-600" : ""}
                    onClick={() => isSaved ? unsaveMut.mutate() : saveMut.mutate()}
                    disabled={saveMut.isPending || unsaveMut.isPending}
                  >
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-white text-white" : ""}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isSaved ? "Remove from favorites" : "Save to favorites"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="relative">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setShowShareMenu(p => !p)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share listing</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {showShareMenu && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-popover border rounded-lg shadow-lg p-1 min-w-[160px]">
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    onClick={handleCopyLink}
                  >
                    {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? "Copied!" : "Copy link"}
                  </button>
                  <button
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                    onClick={handleEmailShare}
                  >
                    <Mail className="h-4 w-4" />
                    Email listing
                  </button>
                </div>
              )}
            </div>
          </div>

          {(() => {
            const rc = listing.rentcast_data as any;
            const rawHistory = rc?.priceHistory || rc?.price_history;
            if (!rawHistory || !Array.isArray(rawHistory) || rawHistory.length < 2) return null;
            const validHistory = rawHistory.filter((p: any) => p && typeof p.price === 'number' && !isNaN(p.price) && p.date && !isNaN(new Date(p.date).getTime()));
            if (validHistory.length < 2) return null;
            const sorted = [...validHistory].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const maxPrice = Math.max(...sorted.map((p: any) => p.price || 0));
            const minPrice = Math.min(...sorted.map((p: any) => p.price || Infinity));
            const latest = sorted[sorted.length - 1];
            const previous = sorted[sorted.length - 2];
            const priceChange = latest && previous ? latest.price - previous.price : 0;
            const pctChange = previous?.price ? ((priceChange / previous.price) * 100).toFixed(1) : "0";
            return (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-500" /> Price History
                    </CardTitle>
                    {priceChange !== 0 && (
                      <Badge variant={priceChange > 0 ? "destructive" : "default"} className="text-[10px] gap-1">
                        {priceChange > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {priceChange > 0 ? '+' : ''}{Number(pctChange)}% ({priceChange > 0 ? '+' : ''}${Math.abs(priceChange).toLocaleString()})
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {sorted.map((entry: any, i: number) => {
                      const barWidth = maxPrice > minPrice ? ((entry.price - minPrice) / (maxPrice - minPrice)) * 100 : 100;
                      return (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0">{new Date(entry.date).toLocaleDateString()}</span>
                          <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden">
                            <div className="h-full bg-emerald-500/20 rounded-sm flex items-center" style={{ width: `${Math.max(barWidth, 10)}%` }}>
                              <span className="text-[10px] font-medium px-1.5 truncate">${entry.price?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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

          {(() => {
            const rc = listing.rentcast_data as any;
            const lat = rc?.latitude || rc?.lat;
            const lng = rc?.longitude || rc?.lng || rc?.lon;
            if (lat && lng) {
              return <PropertyMap lat={lat} lng={lng} city={listing.city || ''} state={listing.state || ''} address={`${listing.address}${listing.city ? `, ${listing.city}` : ''}${listing.state ? `, ${listing.state}` : ''} ${listing.zip_code || ''}`} />;
            }
            return null;
          })()}

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
        multiple
        className="hidden"
        onChange={handleFileSelect}
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

      <Dialog open={showPhotoManager} onOpenChange={setShowPhotoManager}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Images className="h-5 w-5 text-emerald-500" />
              Manage Photos ({listing.marketingPhotos?.length || 0})
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Drag photos to reorder. The first photo is the cover image.</p>

          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragOverPhoto ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverPhoto(true); }}
            onDragLeave={(e) => { e.stopPropagation(); setDragOverPhoto(false); }}
            onDrop={(e) => { e.stopPropagation(); handleFileDrop(e); }}
          >
            <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Drag & drop images here or</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => photoRef.current?.click()}>
              <ImagePlus className="h-3.5 w-3.5 mr-1.5" /> Choose Files
            </Button>
            {uploadProgress && (
              <div className="flex items-center justify-center gap-2 mt-2 text-emerald-600 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> {uploadProgress}
              </div>
            )}
          </div>

          {listing.marketingPhotos && listing.marketingPhotos.length > 0 && (
            <div className="space-y-1">
              {listing.marketingPhotos.map((photo: any, idx: number) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => handlePhotoDragStart(idx)}
                  onDragOver={(e) => handlePhotoDragOver(e, idx)}
                  onDrop={() => handlePhotoDrop(idx)}
                  onDragEnd={() => { setDraggedPhotoIdx(null); setDragOverIdx(null); }}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                    draggedPhotoIdx === idx ? 'opacity-40 scale-95' : ''
                  } ${dragOverIdx === idx && draggedPhotoIdx !== idx ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-border hover:bg-muted/50'}`}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <img
                    src={photo.photo_url}
                    alt={`Photo ${idx + 1}`}
                    className="h-14 w-20 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {idx === 0 ? (
                        <Badge variant="default" className="text-[10px] bg-emerald-600">Cover Photo</Badge>
                      ) : (
                        <span className="text-muted-foreground">Photo {idx + 1}</span>
                      )}
                    </p>
                    {photo.caption && <p className="text-[10px] text-muted-foreground truncate">{photo.caption}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500 flex-shrink-0"
                    onClick={() => deletePhotoMut.mutate(photo.id)}
                    disabled={deletePhotoMut.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhotoManager(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showShowing} onOpenChange={setShowShowing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              Schedule a Showing
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Submit your info and an agent covering <span className="font-medium text-foreground">{listing.zip_code || 'this area'}</span> will contact you to schedule a tour of <span className="font-medium text-foreground">{listing.address}</span>.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">First Name *</Label>
                <Input
                  value={showingForm.firstName}
                  onChange={e => setShowingForm(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="Jane"
                />
              </div>
              <div>
                <Label className="text-xs">Last Name *</Label>
                <Input
                  value={showingForm.lastName}
                  onChange={e => setShowingForm(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Smith"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={showingForm.email}
                onChange={e => setShowingForm(p => ({ ...p, email: e.target.value }))}
                placeholder="jane@email.com"
              />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input
                type="tel"
                value={showingForm.phone}
                onChange={e => setShowingForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label className="text-xs">Message (optional)</Label>
              <Textarea
                value={showingForm.message}
                onChange={e => setShowingForm(p => ({ ...p, message: e.target.value }))}
                placeholder="I'm interested in seeing this property..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShowing(false)}>Cancel</Button>
            <Button
              onClick={() => showingMut.mutate(showingForm)}
              disabled={!showingForm.firstName || !showingForm.lastName || !showingForm.email || !listing.zip_code || showingMut.isPending}
            >
              {showingMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              Request Showing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
