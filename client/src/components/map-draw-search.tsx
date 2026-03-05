import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2, Trash2, Search, MapPin, BedDouble, Bath, Ruler, Building2,
  DollarSign, ExternalLink, Heart, AlertTriangle, Info, ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface RentCastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  yearBuilt?: number;
  status: string;
  price: number;
  daysOnMarket: number;
  listingAgent?: { name: string };
  listingOffice?: { name: string };
  mlsNumber?: string;
}

const PRICE_MIN_OPTIONS = [
  { value: "any", label: "No Min" },
  { value: "100000", label: "$100K" },
  { value: "200000", label: "$200K" },
  { value: "300000", label: "$300K" },
  { value: "400000", label: "$400K" },
  { value: "500000", label: "$500K" },
  { value: "750000", label: "$750K" },
  { value: "1000000", label: "$1M" },
];

const PRICE_MAX_OPTIONS = [
  { value: "any", label: "No Max" },
  { value: "200000", label: "$200K" },
  { value: "300000", label: "$300K" },
  { value: "400000", label: "$400K" },
  { value: "500000", label: "$500K" },
  { value: "750000", label: "$750K" },
  { value: "1000000", label: "$1M" },
  { value: "2000000", label: "$2M" },
  { value: "5000000", label: "$5M" },
];

const BEDS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

const PROPERTY_TYPES = [
  { value: "any", label: "Any Type" },
  { value: "Single Family", label: "Single Family" },
  { value: "Condo", label: "Condo" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "Multi-Family", label: "Multi-Family" },
];

function formatPrice(price: number): string {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

function pointInPolygon(lat: number, lng: number, polygon: L.LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lng;
    const xj = polygon[j].lat, yj = polygon[j].lng;
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

async function getUniqueZipCodes(polygon: L.LatLng[]): Promise<string[]> {
  const bounds = L.latLngBounds(polygon);
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  const gridSize = 4;
  const latStep = (ne.lat - sw.lat) / (gridSize + 1);
  const lngStep = (ne.lng - sw.lng) / (gridSize + 1);

  const samplePoints: L.LatLng[] = [];

  const center = bounds.getCenter();
  if (pointInPolygon(center.lat, center.lng, polygon)) {
    samplePoints.push(center);
  }

  for (let i = 1; i <= gridSize; i++) {
    for (let j = 1; j <= gridSize; j++) {
      const pt = L.latLng(sw.lat + latStep * i, sw.lng + lngStep * j);
      if (pointInPolygon(pt.lat, pt.lng, polygon)) {
        samplePoints.push(pt);
      }
    }
  }

  const uniquePoints = samplePoints.slice(0, 16);
  const zips = new Set<string>();

  for (const pt of uniquePoints) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pt.lat}&lon=${pt.lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "HomeBase-App/1.0" } }
      );
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) continue;
      const data = await res.json();
      const postcode = data?.address?.postcode;
      if (postcode && /^\d{5}/.test(postcode)) {
        zips.add(postcode.substring(0, 5));
      }
      await new Promise((r) => setTimeout(r, 300));
    } catch {
      continue;
    }
  }

  return Array.from(zips);
}

const listingIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function DrawControl({
  onPolygonCreated,
  onPolygonDeleted,
}: {
  onPolygonCreated: (polygon: L.LatLng[]) => void;
  onPolygonDeleted: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new (L.Control as any).Draw({
      position: "topright",
      draw: {
        polygon: {
          allowIntersection: false,
          shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.1 },
        },
        rectangle: {
          shapeOptions: { color: "#3b82f6", weight: 2, fillOpacity: 0.1 },
        },
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: { featureGroup: drawnItems, remove: true },
    });

    map.addControl(drawControl);

    const onCreated = (e: any) => {
      drawnItems.clearLayers();
      drawnItems.addLayer(e.layer);
      const latlngs = e.layer.getLatLngs();
      const polygon: L.LatLng[] = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
      onPolygonCreated(polygon);
    };

    const onDeleted = () => {
      onPolygonDeleted();
    };

    map.on(L.Draw.Event.CREATED, onCreated);
    map.on(L.Draw.Event.DELETED, onDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, onCreated);
      map.off(L.Draw.Event.DELETED, onDeleted);
      map.removeControl(drawControl);
      map.removeLayer(drawnItems);
    };
  }, [map, onPolygonCreated, onPolygonDeleted]);

  return null;
}

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

function FitBoundsToListings({ listings }: { listings: RentCastListing[] }) {
  const map = useMap();
  const hasFitted = useRef(false);

  useEffect(() => {
    if (listings.length > 0 && !hasFitted.current) {
      const bounds = L.latLngBounds(
        listings.map((l) => [l.latitude, l.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [30, 30] });
      hasFitted.current = true;
    }
  }, [listings, map]);

  useEffect(() => {
    if (listings.length === 0) {
      hasFitted.current = false;
    }
  }, [listings]);

  return null;
}

type SortKey = "price" | "bedrooms" | "bathrooms" | "squareFootage" | "yearBuilt" | "daysOnMarket" | null;
type SortDir = "asc" | "desc";

function SortIcon({ columnKey, sortKey, sortDir }: { columnKey: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

function MapSearchResultsTable({
  listings,
  onSave,
  isSaving,
}: {
  listings: RentCastListing[];
  onSave: (listing: RentCastListing) => void;
  isSaving: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedListings = [...listings].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    if (valA < valB) return sortDir === "asc" ? -1 : 1;
    if (valA > valB) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const thSortable = (label: string, key: SortKey, align: string, extraClass = "") => (
    <th
      className={`${align} px-3 py-2.5 font-medium cursor-pointer select-none hover:bg-muted/80 transition-colors ${extraClass}`}
      onClick={() => handleSort(key)}
    >
      <span className={`inline-flex items-center gap-1 ${align === "text-right" ? "justify-end" : align === "text-center" ? "justify-center" : ""}`}>
        {label}
        <SortIcon columnKey={key} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="text-sm font-medium mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Listings in Area ({listings.length})
        </div>
        <div className="overflow-x-auto border rounded-lg max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-3 py-2.5 font-medium">Address</th>
                {thSortable("Price", "price", "text-right")}
                {thSortable("Beds", "bedrooms", "text-center")}
                {thSortable("Baths", "bathrooms", "text-center")}
                {thSortable("Sqft", "squareFootage", "text-right", "hidden sm:table-cell")}
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Type</th>
                {thSortable("Year", "yearBuilt", "text-center", "hidden md:table-cell")}
                {thSortable("DOM", "daysOnMarket", "text-center", "hidden lg:table-cell")}
                <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Agent</th>
                <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">MLS#</th>
                <th className="text-center px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              {sortedListings.map((listing, i) => {
                const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, "").replace(/\s+/g, "-"))}_rb/`;
                return (
                  <tr
                    key={listing.id || listing.formattedAddress}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                  >
                    <td className="px-3 py-2.5">
                      <div className="font-medium truncate max-w-[200px]">{listing.addressLine1}</div>
                      <div className="text-xs text-muted-foreground">{listing.city}, {listing.state} {listing.zipCode}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-primary whitespace-nowrap">
                      {formatPrice(listing.price)}
                    </td>
                    <td className="px-3 py-2.5 text-center">{listing.bedrooms || "—"}</td>
                    <td className="px-3 py-2.5 text-center">{listing.bathrooms || "—"}</td>
                    <td className="px-3 py-2.5 text-right hidden sm:table-cell whitespace-nowrap">
                      {listing.squareFootage ? listing.squareFootage.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground text-xs">
                      {listing.propertyType || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center hidden md:table-cell text-muted-foreground">
                      {listing.yearBuilt || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center hidden lg:table-cell text-muted-foreground">
                      {listing.daysOnMarket}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[140px]">
                      {listing.listingAgent?.name || "—"}
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                      {listing.mlsNumber || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant={listing.status === "Active" ? "default" : "secondary"} className="text-xs">
                        {listing.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onSave(listing)}
                          disabled={isSaving}
                          title="Save to favorites"
                        >
                          <Heart className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => window.open(zillowUrl, "_blank", "noopener,noreferrer")}
                          title="View on Zillow"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MapDrawSearch() {
  const [drawnPolygon, setDrawnPolygon] = useState<L.LatLng[] | null>(null);
  const [zipCodes, setZipCodes] = useState<string[]>([]);
  const [isGeocodingZips, setIsGeocodingZips] = useState(false);
  const [allListings, setAllListings] = useState<RentCastListing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [apiCallsUsed, setApiCallsUsed] = useState(0);
  const [apiCallsLimit, setApiCallsLimit] = useState(45);

  const [minPrice, setMinPrice] = useState("any");
  const [maxPrice, setMaxPrice] = useState("any");
  const [beds, setBeds] = useState("any");
  const [propertyType, setPropertyType] = useState("any");

  const { toast } = useToast();

  const filteredListings = allListings.filter((listing) => {
    if (!drawnPolygon) return true;
    if (!pointInPolygon(listing.latitude, listing.longitude, drawnPolygon)) return false;
    const min = minPrice !== "any" ? parseInt(minPrice) : 0;
    const max = maxPrice !== "any" ? parseInt(maxPrice) : Infinity;
    if (listing.price < min || listing.price > max) return false;
    if (beds !== "any" && listing.bedrooms < parseInt(beds)) return false;
    if (propertyType !== "any" && listing.propertyType !== propertyType) return false;
    return true;
  });

  const handlePolygonCreated = useCallback((polygon: L.LatLng[]) => {
    setDrawnPolygon(polygon);
    setAllListings([]);
    setSearchError(null);
  }, []);

  const handlePolygonDeleted = useCallback(() => {
    setDrawnPolygon(null);
    setZipCodes([]);
    setAllListings([]);
    setSearchError(null);
  }, []);

  const handleSearch = async () => {
    if (!drawnPolygon) return;

    setIsGeocodingZips(true);
    setSearchError(null);
    setAllListings([]);

    try {
      const zips = await getUniqueZipCodes(drawnPolygon);
      setZipCodes(zips);

      if (zips.length === 0) {
        setSearchError("Could not determine ZIP codes for the selected area. Try drawing a larger area.");
        setIsGeocodingZips(false);
        return;
      }

      setIsGeocodingZips(false);
      setIsSearching(true);

      const allResults: RentCastListing[] = [];
      let lastCallsUsed = 0;
      let lastCallsLimit = 45;

      for (const zip of zips) {
        const params = new URLSearchParams();
        params.set("zipCode", zip);
        params.set("status", "Active");
        params.set("limit", "500");
        if (minPrice !== "any") params.set("minPrice", minPrice);
        if (maxPrice !== "any") params.set("maxPrice", maxPrice);
        if (beds !== "any") params.set("bedrooms", beds);
        if (propertyType !== "any") params.set("propertyType", propertyType);

        try {
          const res = await apiRequest("GET", `/api/rentcast/listings?${params.toString()}`);
          if (!res.ok) {
            const err = await res.json();
            if (res.status === 429) {
              setSearchError(err.error || "Monthly API limit reached.");
              break;
            }
            continue;
          }
          const data = await res.json();
          lastCallsUsed = data.apiCallsUsed;
          lastCallsLimit = data.apiCallsLimit;
          if (data.listings && Array.isArray(data.listings)) {
            allResults.push(...data.listings);
          }
        } catch {
          continue;
        }

        if (zips.indexOf(zip) < zips.length - 1) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      const uniqueListings = Array.from(
        new Map(allResults.map((l) => [l.id || l.formattedAddress, l])).values()
      );

      setAllListings(uniqueListings);
      setApiCallsUsed(lastCallsUsed);
      setApiCallsLimit(lastCallsLimit);

      if (uniqueListings.length === 0) {
        setSearchError("No listings found in the selected area.");
      }
    } catch (err) {
      setSearchError("An error occurred during the search. Please try again.");
    } finally {
      setIsGeocodingZips(false);
      setIsSearching(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (listing: RentCastListing) => {
      const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, "").replace(/\s+/g, "-"))}_rb/`;
      await apiRequest("POST", "/api/saved-properties", {
        url: zillowUrl,
        source: "zillow",
        streetAddress: listing.addressLine1,
        city: listing.city,
        state: listing.state,
        zipCode: listing.zipCode,
        notes: `${listing.propertyType || ""} · ${formatPrice(listing.price)} · ${listing.bedrooms}bd/${listing.bathrooms}ba · ${listing.squareFootage?.toLocaleString() || "?"} sqft`.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({ title: "Saved!", description: "Property added to your favorites." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save property.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">How to use Map Search</p>
          <p className="mt-1">Use the drawing tools on the right side of the map to draw a rectangle or polygon around your area of interest. Then click "Search This Area" to find active listings.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-[1001]">
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Min Price
          </Label>
          <Select value={minPrice} onValueChange={setMinPrice}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1100]">
              {PRICE_MIN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Max Price
          </Label>
          <Select value={maxPrice} onValueChange={setMaxPrice}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1100]">
              {PRICE_MAX_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <BedDouble className="h-3 w-3" /> Beds
          </Label>
          <Select value={beds} onValueChange={setBeds}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1100]">
              {BEDS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs flex items-center gap-1">
            <Building2 className="h-3 w-3" /> Type
          </Label>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent className="z-[1100]">
              {PROPERTY_TYPES.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden border" style={{ height: "500px" }}>
        <MapContainer
          center={[32.75, -97.33]}
          zoom={10}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateMapSize />
          <DrawControl
            onPolygonCreated={handlePolygonCreated}
            onPolygonDeleted={handlePolygonDeleted}
          />
          {filteredListings.map((listing) => (
            <Marker
              key={listing.id || listing.formattedAddress}
              position={[listing.latitude, listing.longitude]}
              icon={listingIcon}
            >
              <Popup maxWidth={280}>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-sm">{listing.addressLine1}</p>
                  <p className="text-gray-600">{listing.city}, {listing.state} {listing.zipCode}</p>
                  <p className="text-primary font-bold text-base">{formatPrice(listing.price)}</p>
                  <div className="flex gap-2 text-gray-600">
                    {listing.bedrooms > 0 && <span>{listing.bedrooms} bd</span>}
                    {listing.bathrooms > 0 && <span>{listing.bathrooms} ba</span>}
                    {listing.squareFootage > 0 && <span>{listing.squareFootage.toLocaleString()} sqft</span>}
                  </div>
                  {listing.listingAgent && (
                    <p className="text-gray-500">Agent: {listing.listingAgent.name}</p>
                  )}
                  <div className="flex gap-1 pt-1">
                    <button
                      className="text-blue-600 underline text-xs"
                      onClick={() => {
                        const url = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, "").replace(/\s+/g, "-"))}_rb/`;
                        window.open(url, "_blank");
                      }}
                    >
                      View on Zillow
                    </button>
                    <span className="text-gray-400">·</span>
                    <button
                      className="text-green-600 underline text-xs"
                      onClick={() => saveMutation.mutate(listing)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          <FitBoundsToListings listings={filteredListings} />
        </MapContainer>

        {(isGeocodingZips || isSearching) && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-[1000]">
            <div className="bg-background rounded-lg shadow-lg p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">
                {isGeocodingZips ? "Finding ZIP codes in area..." : `Searching listings (${zipCodes.length} ZIP codes)...`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSearch}
          disabled={!drawnPolygon || isSearching || isGeocodingZips}
          className="gap-2"
        >
          {isSearching || isGeocodingZips ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search This Area
        </Button>

        {drawnPolygon && (
          <Button
            variant="outline"
            onClick={() => {
              setDrawnPolygon(null);
              setZipCodes([]);
              setAllListings([]);
              setSearchError(null);
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Clear Area
          </Button>
        )}

        {zipCodes.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>ZIP codes: {zipCodes.join(", ")}</span>
          </div>
        )}

        {allListings.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {filteredListings.length} of {allListings.length} listings in area
          </Badge>
        )}

        <div className="ml-auto text-xs text-muted-foreground">
          API: {apiCallsUsed}/{apiCallsLimit} calls
        </div>
      </div>

      {searchError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {searchError}
        </div>
      )}

      {filteredListings.length > 0 && (
        <MapSearchResultsTable
          listings={filteredListings}
          onSave={(listing) => saveMutation.mutate(listing)}
          isSaving={saveMutation.isPending}
        />
      )}
    </div>
  );
}
