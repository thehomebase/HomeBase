import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Inbox,
  Mail,
  Phone,
  UserPlus,
  DollarSign,
  Shield,
  AlertTriangle,
  Search,
  Lock,
  Bell,
  BellOff,
  Clock,
  Map,
  BarChart3,
  Eye,
  Target,
  X,
  Loader2,
} from "lucide-react";
import type { Lead } from "@shared/schema";
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isCurrentlySubscribed, getPushPermissionState, getPushUnsupportedReason, isIOS } from "@/lib/push-notifications";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  expired: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const SOURCE_LABELS: Record<string, string> = {
  lead_gen: "Lead Gen",
  open_house: "Open House",
  referral: "Referral",
  website: "Website",
  zillow: "Zillow",
  realtor_com: "Realtor.com",
  social_media: "Social Media",
  cold_call: "Cold Call",
  sign_call: "Sign Call",
  sphere: "Sphere of Influence",
  unknown: "Unknown",
};

function formatResponseTime(ms: number): string {
  if (ms <= 0) return "N/A";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

const TYPE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buyer & Seller",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(value);

interface ZipCodeData {
  id: number;
  agentId: number;
  zipCode: string;
  isActive: boolean;
  monthlyRate: number;
  createdAt: string;
  currentAgents: number;
  maxAgents: number;
  isFreeSlot: boolean;
}

interface ZipCodesResponse {
  zipCodes: ZipCodeData[];
  freeZipsUsed: number;
  freeZipsTotal: number;
  maxAgentsPerZip: number;
}

interface ZipPricing {
  zipCode: string;
  currentAgents: number;
  maxAgents: number;
  spotsRemaining: number;
  isFull: boolean;
  alreadyClaimed: boolean;
  freeZipsUsed: number;
  freeZipsTotal: number;
  hasFreeSlots: boolean;
  zipEligibleForFree: boolean;
  isFreeSlot: boolean;
  monthlyRate: number;
  monthlyRateDisplay: string;
}

interface ZipMetrics {
  zipCode: string;
  avgHomeValue: number;
  currentAgents: number;
  maxAgents: number;
  spotsRemaining: number;
  isFull: boolean;
  alreadyClaimed: boolean;
  shareOfVoice: number;
  estMonthlyLeads: number;
  estConnections: number;
  estAdditionalLeads: number;
  roiSixMonth: number;
  totalLeads: number;
  sixMonthLeads: number;
  monthlyRate: number;
  monthlyRateDisplay: string;
  isFreeSlot: boolean;
  hasFreeSlots: boolean;
  freeZipsUsed: number;
  freeZipsTotal: number;
}

function ZipMetricsDialog({
  zipCode,
  open,
  onClose,
  onClaim,
  claiming,
}: {
  zipCode: string;
  open: boolean;
  onClose: () => void;
  onClaim: (zip: string) => void;
  claiming: boolean;
}) {
  const { data: metrics, isLoading } = useQuery<ZipMetrics>({
    queryKey: ["/api/leads/zip-metrics", zipCode],
    queryFn: async () => {
      const res = await fetch(`/api/leads/zip-metrics/${zipCode}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: open && /^\d{5}$/.test(zipCode),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : metrics ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <MapPin className="h-5 w-5" />
                {metrics.zipCode}
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{metrics.avgHomeValue > 0 ? `${formatCompact(metrics.avgHomeValue)} Avg Home Value` : "No home value data"}</span>
              <span>{metrics.spotsRemaining > 0 ? `${Math.round((metrics.spotsRemaining / metrics.maxAgents) * 100)}% Available` : "Full"}</span>
            </div>

            <div className="space-y-4 mt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share of Voice</span>
                  <span className="text-sm font-bold">{metrics.shareOfVoice}%</span>
                </div>
                <Progress value={metrics.shareOfVoice} className="h-2" />
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estimated Outcome</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold">{metrics.estConnections}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Connections</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{metrics.estAdditionalLeads}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Est. Leads</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{metrics.roiSixMonth > 0 ? `${metrics.roiSixMonth}x` : "—"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">ROI 6 Mo</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Competition</p>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">{metrics.currentAgents} of {metrics.maxAgents} agents</span>
                  <Badge variant={metrics.isFull ? "destructive" : "outline"} className="text-[10px]">
                    {metrics.isFull ? "Full" : `${metrics.spotsRemaining} spots left`}
                  </Badge>
                </div>
                <Progress value={(metrics.currentAgents / metrics.maxAgents) * 100} className="h-2" />
                <div className="flex gap-1 mt-3">
                  {Array.from({ length: metrics.maxAgents }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-6 rounded-sm ${
                        i < metrics.currentAgents
                          ? "bg-foreground/70"
                          : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                  <p className="text-2xl font-bold">
                    {metrics.isFreeSlot ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      metrics.monthlyRateDisplay + "/mo"
                    )}
                  </p>
                  {metrics.isFreeSlot && (
                    <p className="text-[10px] text-muted-foreground">
                      Free slot ({metrics.freeZipsUsed + 1} of {metrics.freeZipsTotal})
                    </p>
                  )}
                </div>
                {!metrics.alreadyClaimed && !metrics.isFull ? (
                  <Button onClick={() => onClaim(metrics.zipCode)} disabled={claiming} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Claim ZIP
                  </Button>
                ) : metrics.alreadyClaimed ? (
                  <Badge variant="secondary" className="text-sm py-1.5 px-3">Already Claimed</Badge>
                ) : (
                  <Badge variant="destructive" className="text-sm py-1.5 px-3">
                    <Lock className="h-3 w-3 mr-1" /> Full
                  </Badge>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">No data available</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const BOUNDARY_MIN_ZOOM = 10;
const TIGER_API_BASE = "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query";

async function fetchZipBoundaries(bounds: L.LatLngBounds): Promise<any> {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();
  const envelope = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
  const params = new URLSearchParams({
    geometry: envelope,
    geometryType: "esriGeometryEnvelope",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "ZCTA5,GEOID,BASENAME",
    returnGeometry: "true",
    f: "geojson",
    outSR: "4326",
    inSR: "4326",
  });
  const res = await fetch(`${TIGER_API_BASE}?${params}`);
  if (!res.ok) throw new Error("Failed to fetch boundaries");
  return res.json();
}

async function geocodeZipCode(zip: string): Promise<L.LatLngTuple | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`
    );
    const data = await res.json();
    if (data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch {}
  return null;
}

interface MapSelectedZip {
  zipCode: string;
  metrics?: ZipMetrics;
  loading?: boolean;
}

function ZipMapView({
  claimedZips,
  onSelectZip,
  onClaimZip,
  claiming,
  onPolygonClick,
}: {
  claimedZips: ZipCodeData[];
  onSelectZip: (zip: string) => void;
  onClaimZip: (zip: string) => void;
  claiming: boolean;
  onPolygonClick?: (zip: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);
  const labelLayerRef = useRef<L.LayerGroup | null>(null);
  const highlightLayerRef = useRef<L.LayerGroup | null>(null);
  const [mapZipSearch, setMapZipSearch] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [selectedZips, setSelectedZips] = useState<MapSelectedZip[]>([]);
  const [zoomLevel, setZoomLevel] = useState(4);
  const [loadingBoundaries, setLoadingBoundaries] = useState(false);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedBoundsRef = useRef<string>("");
  const claimedSetRef = useRef<Set<string>>(new Set());

  const { data: allZipData } = useQuery<Array<{ zipCode: string; agentCount: number; isMine: boolean; spotsRemaining: number; isFull: boolean }>>({
    queryKey: ["/api/leads/all-zip-data"],
  });

  useEffect(() => {
    claimedSetRef.current = new Set(claimedZips.map(z => z.zipCode));
  }, [claimedZips]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    boundaryLayerRef.current = L.layerGroup().addTo(map);
    labelLayerRef.current = L.layerGroup().addTo(map);
    highlightLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    const loadBoundaries = () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        const z = map.getZoom();
        setZoomLevel(z);
        if (z >= BOUNDARY_MIN_ZOOM) {
          const b = map.getBounds();
          const key = `${b.toBBoxString()}_${z}`;
          if (key !== loadedBoundsRef.current) {
            loadedBoundsRef.current = key;
            renderBoundaries(map, b);
          }
        } else {
          boundaryLayerRef.current?.clearLayers();
          labelLayerRef.current?.clearLayers();
          loadedBoundsRef.current = "";
        }
      }, 300);
    };

    map.on("moveend", loadBoundaries);
    map.on("zoomend", loadBoundaries);

    setTimeout(() => {
      map.invalidateSize();
      setMapReady(true);
    }, 200);

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const renderBoundaries = async (map: L.Map, bounds: L.LatLngBounds) => {
    if (!boundaryLayerRef.current || !labelLayerRef.current) return;
    setLoadingBoundaries(true);
    try {
      const geojson = await fetchZipBoundaries(bounds);
      boundaryLayerRef.current.clearLayers();
      labelLayerRef.current.clearLayers();

      if (!geojson.features) return;

      const activeZipSet = new Set(allZipData?.map(z => z.zipCode) || []);

      geojson.features.forEach((feature: any) => {
        const zipCode = feature.properties?.ZCTA5 || feature.properties?.GEOID || feature.properties?.BASENAME || "";
        if (!zipCode) return;

        const isMine = claimedSetRef.current.has(zipCode);
        const isActive = activeZipSet.has(zipCode);

        let fillColor = "rgba(59, 130, 246, 0.08)";
        let borderColor = "rgba(59, 130, 246, 0.5)";
        let fillOpacity = 0.08;
        if (isMine) {
          fillColor = "rgba(34, 197, 94, 0.15)";
          borderColor = "rgba(34, 197, 94, 0.8)";
          fillOpacity = 0.15;
        } else if (isActive) {
          fillColor = "rgba(245, 158, 11, 0.1)";
          borderColor = "rgba(245, 158, 11, 0.6)";
          fillOpacity = 0.1;
        }

        const layer = L.geoJSON(feature, {
          style: {
            color: borderColor,
            weight: 2,
            fillColor: fillColor,
            fillOpacity: fillOpacity,
            opacity: 0.7,
          },
          onEachFeature: (_feat, lyr) => {
            lyr.on("click", () => handlePolygonClick(zipCode));
            lyr.on("mouseover", (e: any) => {
              e.target.setStyle({
                weight: 3,
                fillOpacity: fillOpacity + 0.15,
                opacity: 1,
              });
            });
            lyr.on("mouseout", (e: any) => {
              e.target.setStyle({
                weight: 2,
                fillOpacity: fillOpacity,
                opacity: 0.7,
              });
            });
          },
        }).addTo(boundaryLayerRef.current!);

        const center = layer.getBounds().getCenter();
        const labelIcon = L.divIcon({
          html: `<div style="font-size:11px;font-weight:700;color:#1e3a5f;text-shadow:0 0 3px white,0 0 3px white,0 0 3px white,0 0 3px white;pointer-events:none;white-space:nowrap;">${zipCode}</div>`,
          className: "",
          iconSize: [50, 16],
          iconAnchor: [25, 8],
        });
        L.marker(center, { icon: labelIcon, interactive: false }).addTo(labelLayerRef.current!);
      });
    } catch (err) {
      console.error("Failed to load zip boundaries:", err);
    } finally {
      setLoadingBoundaries(false);
    }
  };

  const highlightPolygon = async (zipCode: string) => {
    if (!highlightLayerRef.current || !mapInstanceRef.current) return;
    try {
      const coords = await geocodeZipCode(zipCode);
      if (!coords) return;

      const smallBounds = L.latLngBounds(
        [coords[0] - 0.05, coords[1] - 0.05],
        [coords[0] + 0.05, coords[1] + 0.05]
      );
      const geojson = await fetchZipBoundaries(smallBounds);
      if (!geojson.features) return;

      const feature = geojson.features.find((f: any) => {
        const z = f.properties?.ZCTA5 || f.properties?.GEOID || f.properties?.BASENAME || "";
        return z === zipCode;
      });
      if (!feature) return;

      L.geoJSON(feature, {
        style: {
          color: "#2563eb",
          weight: 3,
          fillColor: "#3b82f6",
          fillOpacity: 0.25,
          opacity: 1,
        },
        interactive: false,
      }).addTo(highlightLayerRef.current);
    } catch {}
  };

  const handlePolygonClick = async (zipCode: string) => {
    const alreadySelected = selectedZips.some(z => z.zipCode === zipCode);
    if (alreadySelected) {
      removeSelectedZip(zipCode);
      return;
    }

    setSelectedZips([{ zipCode, loading: true }]);

    highlightLayerRef.current?.clearLayers();
    highlightPolygon(zipCode);

    if (onPolygonClick) {
      onPolygonClick(zipCode);
    }

    try {
      const res = await fetch(`/api/leads/zip-metrics/${zipCode}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      const metrics: ZipMetrics = await res.json();
      setSelectedZips([{ zipCode, metrics, loading: false }]);
    } catch {
      setSelectedZips([{ zipCode, loading: false }]);
    }
  };

  const removeSelectedZip = (zipCode: string) => {
    highlightLayerRef.current?.clearLayers();
    setSelectedZips([]);
  };

  const handleMapSearch = async () => {
    const zip = mapZipSearch.trim();
    if (!/^\d{5}$/.test(zip) || !mapInstanceRef.current) return;

    const coords = await geocodeZipCode(zip);
    if (coords) {
      mapInstanceRef.current.setView(coords, 13);
    }
    handlePolygonClick(zip);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Enter 5-digit ZIP code"
          value={mapZipSearch}
          onChange={(e) => setMapZipSearch(e.target.value.replace(/\D/g, "").slice(0, 5))}
          onKeyDown={(e) => e.key === "Enter" && handleMapSearch()}
          className="max-w-xs"
        />
        <Button onClick={handleMapSearch} variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
        {loadingBoundaries && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading boundaries...
          </span>
        )}
      </div>

      <div className="relative">
        <div
          ref={mapRef}
          className="h-[450px] md:h-[550px] w-full rounded-lg border border-border overflow-hidden"
          style={{ isolation: "isolate" }}
        />
        {zoomLevel < BOUNDARY_MIN_ZOOM && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-sm border rounded-lg px-4 py-2 text-xs text-muted-foreground shadow-md flex items-center gap-2 z-[1000]">
            <Search className="h-3.5 w-3.5" />
            Zoom in or search a ZIP code to see boundaries
          </div>
        )}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2" style={{ borderColor: "rgba(34,197,94,0.8)", background: "rgba(34,197,94,0.15)" }} /> Your ZIPs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2" style={{ borderColor: "rgba(245,158,11,0.6)", background: "rgba(245,158,11,0.1)" }} /> Other Active ZIPs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border-2" style={{ borderColor: "rgba(59,130,246,0.5)", background: "rgba(59,130,246,0.08)" }} /> Available
        </span>
      </div>

      {selectedZips.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold uppercase">ZIP</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-center">Est. ROI 6 Months</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-center hidden sm:table-cell">Est. Cost/Lead</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-center">Est. Leads</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-center hidden sm:table-cell">Avg. Home Value</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-center">Available</TableHead>
                <TableHead className="text-xs font-semibold uppercase text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedZips.map((sz) => (
                <TableRow key={sz.zipCode}>
                  {sz.loading ? (
                    <TableCell colSpan={7} className="text-center py-3">
                      <span className="flex items-center gap-2 justify-center text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading {sz.zipCode}...
                      </span>
                    </TableCell>
                  ) : sz.metrics ? (
                    <>
                      <TableCell>
                        <button
                          className="text-primary font-bold hover:underline text-sm"
                          onClick={() => onSelectZip(sz.zipCode)}
                        >
                          {sz.zipCode}
                        </button>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {sz.metrics.roiSixMonth > 0 ? `${sz.metrics.roiSixMonth}x` : "N/A"}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {sz.metrics.monthlyRate > 0 && sz.metrics.estAdditionalLeads > 0
                          ? formatCurrency(Math.round((sz.metrics.monthlyRate / 100) / Math.max(sz.metrics.estAdditionalLeads, 1)))
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {sz.metrics.estAdditionalLeads || 0}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {sz.metrics.avgHomeValue > 0 ? formatCompact(sz.metrics.avgHomeValue) : "N/A"}
                      </TableCell>
                      <TableCell className="text-center">
                        {sz.metrics.isFull ? (
                          <span className="text-red-500 text-sm">0%</span>
                        ) : (
                          <span className="text-sm">{Math.round((sz.metrics.spotsRemaining / sz.metrics.maxAgents) * 100)}%</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {!sz.metrics.alreadyClaimed && !sz.metrics.isFull ? (
                            <Button
                              size="sm"
                              variant="link"
                              className="text-primary h-auto p-0 text-xs"
                              onClick={() => onClaimZip(sz.zipCode)}
                              disabled={claiming}
                            >
                              Select ZIP
                            </Button>
                          ) : sz.metrics.alreadyClaimed ? (
                            <Badge variant="secondary" className="text-[10px]">Claimed</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Full</Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-muted-foreground"
                            onClick={() => removeSelectedZip(sz.zipCode)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-bold text-sm">{sz.zipCode}</TableCell>
                      <TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No data available</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-muted-foreground"
                          onClick={() => removeSelectedZip(sz.zipCode)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function LeadGenerationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("leads");
  const [newZipCode, setNewZipCode] = useState("");
  const [previewZip, setPreviewZip] = useState("");
  const [metricsZip, setMetricsZip] = useState("");
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushUnsupportedMsg, setPushUnsupportedMsg] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [contactPromptLeadId, setContactPromptLeadId] = useState<number | null>(null);

  useEffect(() => {
    const checkPush = async () => {
      const supported = isPushSupported();
      setPushSupported(supported);
      if (supported) {
        const subscribed = await isCurrentlySubscribed();
        setPushEnabled(subscribed);
      } else {
        setPushUnsupportedMsg(getPushUnsupportedReason());
      }
    };
    checkPush();
  }, []);

  const handlePushToggle = async (enabled: boolean) => {
    setPushLoading(true);
    try {
      if (enabled) {
        const success = await subscribeToPush();
        setPushEnabled(success);
        if (success) {
          toast({ title: "Push notifications enabled", description: "You'll receive alerts when new leads come in." });
        } else {
          const perm = await getPushPermissionState();
          if (perm === 'denied') {
            toast({ title: "Notifications blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
          } else {
            toast({ title: "Could not enable notifications", description: "Please try again.", variant: "destructive" });
          }
        }
      } else {
        await unsubscribeFromPush();
        setPushEnabled(false);
        toast({ title: "Push notifications disabled" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to update notification settings.", variant: "destructive" });
    } finally {
      setPushLoading(false);
    }
  };

  const { data: zipData, isLoading: zipCodesLoading } = useQuery<ZipCodesResponse>({
    queryKey: ["/api/leads/zip-codes"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: stats } = useQuery<{ total: number; new: number; accepted: number; converted: number }>({
    queryKey: ["/api/leads/stats"],
  });

  const { data: pricing, isLoading: pricingLoading } = useQuery<ZipPricing>({
    queryKey: ["/api/leads/zip-pricing", previewZip],
    queryFn: async () => {
      const res = await fetch(`/api/leads/zip-pricing/${previewZip}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
    enabled: /^\d{5}$/.test(previewZip),
  });

  const claimZipMutation = useMutation({
    mutationFn: async (zipCode: string) => {
      const res = await apiRequest("POST", "/api/leads/zip-codes", { zipCode });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-metrics"] });
      setNewZipCode("");
      setPreviewZip("");
      setMetricsOpen(false);
      toast({ title: "Zip code claimed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unclaimZipMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/zip-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-pricing"] });
      toast({ title: "Zip code removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({ title: "Lead status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const { data: responseMetrics } = useQuery<{ avgResponseMs: number; fastestMs: number; slowestMs: number; totalResponded: number; responseRate: number }>({
    queryKey: ["/api/leads/response-metrics"],
  });

  const contactMutation = useMutation({
    mutationFn: async ({ id, connected }: { id: number; connected: boolean }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}/contact`, { connected });
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      setContactPromptLeadId(null);
      toast({ title: variables.connected ? "Connection logged" : "Contact attempt logged" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const totalLeads = stats?.total ?? 0;
  const newLeads = stats?.new ?? 0;
  const acceptedLeads = stats?.accepted ?? 0;
  const convertedLeads = stats?.converted ?? 0;
  const acceptanceRate = totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0;
  const connectionRate = (stats as any)?.connectionRate ?? 0;

  const filteredLeads = (leads || []).filter(l =>
    sourceFilter === "all" ? true : (l.source || "unknown") === sourceFilter
  );

  const zipCodes = zipData?.zipCodes ?? [];
  const freeZipsUsed = zipData?.freeZipsUsed ?? 0;
  const freeZipsTotal = zipData?.freeZipsTotal ?? 3;
  const totalMonthlyBudget = zipCodes.reduce((sum, zc) => sum + zc.monthlyRate, 0);

  const handleZipInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setNewZipCode(cleaned);
    if (cleaned.length === 5) {
      setPreviewZip(cleaned);
    } else {
      setPreviewZip("");
    }
  };

  const handleClaimZip = () => {
    const trimmed = newZipCode.trim();
    if (!trimmed) return;
    if (!/^\d{5}$/.test(trimmed)) {
      toast({ title: "Invalid zip code", description: "Please enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    claimZipMutation.mutate(trimmed);
  };

  const handleMapSelectZip = useCallback((zip: string) => {
    setMetricsZip(zip);
    setMetricsOpen(true);
  }, []);

  const competitionLevel = (count: number, max: number) => {
    const ratio = count / max;
    if (ratio === 0) return { label: "No competition", color: "text-green-600", bg: "bg-green-500" };
    if (ratio < 0.4) return { label: "Low competition", color: "text-green-600", bg: "bg-green-500" };
    if (ratio < 0.6) return { label: "Medium competition", color: "text-yellow-600", bg: "bg-yellow-500" };
    if (ratio < 0.8) return { label: "High competition", color: "text-orange-600", bg: "bg-orange-500" };
    return { label: "Very high", color: "text-red-600", bg: "bg-red-500" };
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6 overflow-x-hidden pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Lead Generation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Claim zip codes and manage incoming leads
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl sm:text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-xl sm:text-2xl font-bold">{newLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="text-xl sm:text-2xl font-bold">{acceptedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Converted</p>
                <p className="text-xl sm:text-2xl font-bold">{convertedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accept Rate</p>
                <p className="text-xl sm:text-2xl font-bold">{acceptanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-cyan-500/10 rounded-lg">
                <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Connection Rate</p>
                <p className="text-xl sm:text-2xl font-bold">{connectionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {responseMetrics && responseMetrics.totalResponded > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Response Metrics</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold">{formatResponseTime(responseMetrics.avgResponseMs)}</p>
                <p className="text-xs text-muted-foreground">Avg Response</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{formatResponseTime(responseMetrics.fastestMs)}</p>
                <p className="text-xs text-muted-foreground">Fastest</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{formatResponseTime(responseMetrics.slowestMs)}</p>
                <p className="text-xs text-muted-foreground">Slowest</p>
              </div>
              <div>
                <p className="text-lg font-semibold">{Math.round(responseMetrics.responseRate)}%</p>
                <p className="text-xs text-muted-foreground">Response Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leads">Incoming Leads</TabsTrigger>
          <TabsTrigger value="zip-codes" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            My ZIPs
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-1.5">
            <Map className="h-3.5 w-3.5" />
            ZIP Map
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          {leadsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : leads && leads.length > 0 ? (
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-sm text-muted-foreground">Filter by source:</span>
                  <select
                    className="text-sm border rounded px-2 py-1 bg-background"
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value)}
                  >
                    <option value="all">All Sources</option>
                    {Array.from(new Set(leads.map(l => l.source || 'unknown'))).map(src => (
                      <option key={src} value={src}>{SOURCE_LABELS[src] || src}</option>
                    ))}
                  </select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Zip</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="hidden sm:table-cell">Source</TableHead>
                      <TableHead className="hidden sm:table-cell">Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Timer</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </span>
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{lead.zipCode}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TYPE_LABELS[lead.type] ?? lead.type}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="secondary" className="text-xs">{SOURCE_LABELS[lead.source || 'unknown'] || lead.source || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{lead.budget || "—"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[lead.status] ?? ""}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {lead.exclusiveUntil && new Date(lead.exclusiveUntil) > new Date() ? (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Exclusive {Math.ceil((new Date(lead.exclusiveUntil).getTime() - Date.now()) / 60000)}m
                            </span>
                          ) : lead.exclusiveUntil ? (
                            <span className="text-xs text-red-500">Expired</span>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(lead.status === "new" || lead.status === "assigned") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600"
                                  onClick={() => {
                                    updateLeadStatusMutation.mutate({ id: lead.id, status: "accepted" });
                                    setContactPromptLeadId(lead.id);
                                  }}
                                  disabled={updateLeadStatusMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => updateLeadStatusMutation.mutate({ id: lead.id, status: "rejected" })}
                                  disabled={updateLeadStatusMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {lead.status === "accepted" && !lead.contactedAt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => setContactPromptLeadId(lead.id)}
                              >
                                Log Contact
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">No leads yet. Claim some zip codes to start receiving leads.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="zip-codes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Free Zip Codes</p>
                    <p className="text-xs text-muted-foreground">Included with Agent Plan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(freeZipsUsed / freeZipsTotal) * 100} className="flex-1 h-2" />
                  <span className="text-sm font-medium whitespace-nowrap">{freeZipsUsed}/{freeZipsTotal} used</span>
                </div>
                {freeZipsUsed < freeZipsTotal && (
                  <p className="text-xs text-green-600 mt-2">{freeZipsTotal - freeZipsUsed} free slot{freeZipsTotal - freeZipsUsed !== 1 ? "s" : ""} remaining</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Monthly Budget</p>
                    <p className="text-xs text-muted-foreground">Total across all ZIPs</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {totalMonthlyBudget > 0 ? `$${(totalMonthlyBudget / 100).toFixed(2)}` : "Free"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Active ZIPs</p>
                    <p className="text-xs text-muted-foreground">{zipData?.maxAgentsPerZip ?? 5} agents max per area</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{zipCodes.length}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    {pushEnabled ? <Bell className="h-5 w-5 text-blue-500" /> : <BellOff className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Lead Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      {!pushSupported
                        ? (isIOS() ? "Requires Add to Home Screen" : "Not available in this browser")
                        : pushEnabled
                          ? "You'll get push + SMS alerts for new leads"
                          : "Enable to get instant alerts when leads arrive"
                      }
                    </p>
                  </div>
                </div>
                {pushSupported && (
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={handlePushToggle}
                    disabled={pushLoading}
                  />
                )}
              </div>
              {!pushSupported && pushUnsupportedMsg && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                  {pushUnsupportedMsg}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Add New ZIP
              </CardTitle>
              <CardDescription>
                Enter a zip code to check availability, metrics, and pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Enter 5-digit ZIP"
                  value={newZipCode}
                  onChange={(e) => handleZipInput(e.target.value)}
                  maxLength={5}
                  onKeyDown={(e) => e.key === "Enter" && pricing && !pricing.isFull && !pricing.alreadyClaimed && handleClaimZip()}
                />
                {previewZip && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 shrink-0"
                    onClick={() => {
                      setMetricsZip(previewZip);
                      setMetricsOpen(true);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View Metrics
                  </Button>
                )}
              </div>

              {previewZip && (
                <div className="max-w-md">
                  {pricingLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : pricing ? (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="text-lg font-bold">{pricing.zipCode}</span>
                        </div>
                        {pricing.alreadyClaimed ? (
                          <Badge variant="secondary">Already Claimed</Badge>
                        ) : pricing.isFull ? (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="h-3 w-3" /> Full
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={competitionLevel(pricing.currentAgents, pricing.maxAgents).color}>
                            {competitionLevel(pricing.currentAgents, pricing.maxAgents).label}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Agents in this zip</span>
                          <span className="font-medium">{pricing.currentAgents}/{pricing.maxAgents}</span>
                        </div>
                        <Progress
                          value={(pricing.currentAgents / pricing.maxAgents) * 100}
                          className="h-2"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Your cost</p>
                          <p className="text-lg font-bold">
                            {pricing.isFreeSlot ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              pricing.monthlyRateDisplay
                            )}
                          </p>
                          {pricing.isFreeSlot && (
                            <p className="text-xs text-muted-foreground">
                              Using free slot ({pricing.freeZipsUsed + 1} of {pricing.freeZipsTotal})
                            </p>
                          )}
                        </div>
                        {!pricing.alreadyClaimed && !pricing.isFull && (
                          <Button
                            onClick={handleClaimZip}
                            disabled={claimZipMutation.isPending}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Claim
                          </Button>
                        )}
                      </div>

                      {!pricing.isFreeSlot && !pricing.alreadyClaimed && !pricing.isFull && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            {pricing.hasFreeSlots && !pricing.zipEligibleForFree
                              ? `This zip code has too much competition for a free slot (needs 3+ open spots). You can claim it for ${pricing.monthlyRateDisplay}, or pick a less competitive zip to use your free slot.`
                              : `You've used all ${pricing.freeZipsTotal} free slots. This zip will cost ${pricing.monthlyRateDisplay}. Price is based on competition level.`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {zipCodesLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : zipCodes.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Active ZIPs</CardTitle>
                  {totalMonthlyBudget > 0 && (
                    <span className="text-sm text-muted-foreground">
                      Total Budget: <span className="font-semibold text-foreground">${(totalMonthlyBudget / 100).toFixed(2)}/mo</span>
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ZIP</TableHead>
                      <TableHead className="text-center">Agents</TableHead>
                      <TableHead className="text-center">Competition</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Share of Voice</TableHead>
                      <TableHead className="text-right">Monthly Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zipCodes.map(zc => {
                      const comp = competitionLevel(zc.currentAgents, zc.maxAgents);
                      const sov = zc.currentAgents > 0
                        ? Math.round((1 / zc.currentAgents) * 100)
                        : 100;
                      return (
                        <TableRow key={zc.id}>
                          <TableCell>
                            <button
                              className="text-primary font-semibold hover:underline"
                              onClick={() => handleMapSelectZip(zc.zipCode)}
                            >
                              {zc.zipCode}
                            </button>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm">{zc.currentAgents}/{zc.maxAgents}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] ${comp.color}`}>
                              {comp.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center hidden sm:table-cell">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress value={sov} className="h-1.5 w-16" />
                              <span className="text-xs font-medium">{sov}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {zc.isFreeSlot ? (
                              <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">Free</Badge>
                            ) : (
                              <span>${(zc.monthlyRate / 100).toFixed(0)}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleMapSelectZip(zc.zipCode)}
                                title="View metrics"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500"
                                onClick={() => unclaimZipMutation.mutate(zc.id)}
                                disabled={unclaimZipMutation.isPending}
                                title="Remove"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">
                  No zip codes claimed yet. Enter a zip code above or use the ZIP Map tab to explore areas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="map" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Map className="h-5 w-5" />
                ZIP Code Map
              </CardTitle>
              <CardDescription>
                Zoom in or search a ZIP to see boundaries. Click any zip code area to view metrics and claim it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ZipMapView
                claimedZips={zipCodes}
                onSelectZip={handleMapSelectZip}
                onClaimZip={(zip) => claimZipMutation.mutate(zip)}
                claiming={claimZipMutation.isPending}
                onPolygonClick={(zip) => {
                  setMetricsZip(zip);
                  setMetricsOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ZipMetricsDialog
        zipCode={metricsZip}
        open={metricsOpen}
        onClose={() => setMetricsOpen(false)}
        onClaim={(zip) => claimZipMutation.mutate(zip)}
        claiming={claimZipMutation.isPending}
      />

      <Dialog open={contactPromptLeadId !== null} onOpenChange={(open) => !open && setContactPromptLeadId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Contact Attempt</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">Were you able to connect with this lead?</p>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => contactPromptLeadId && contactMutation.mutate({ id: contactPromptLeadId, connected: false })}
              disabled={contactMutation.isPending}
            >
              No Connection
            </Button>
            <Button
              className="flex-1"
              onClick={() => contactPromptLeadId && contactMutation.mutate({ id: contactPromptLeadId, connected: true })}
              disabled={contactMutation.isPending}
            >
              Yes, Connected
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
