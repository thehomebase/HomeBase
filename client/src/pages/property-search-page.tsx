import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, Home, DollarSign, BedDouble, Bath, Building2, Heart, Trash2, Link, Loader2, MapPin, AlertTriangle, Database, Calendar, Ruler, LayoutGrid, List, CheckSquare, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SavedProperty } from "@shared/schema";

const PROPERTY_TYPES = [
  { value: "any", label: "Any Type" },
  { value: "Houses", label: "Houses" },
  { value: "Condos", label: "Condos / Townhomes" },
  { value: "Apartments", label: "Apartments" },
  { value: "Manufactured", label: "Manufactured" },
  { value: "Land", label: "Lots / Land" },
];

const RENTCAST_PROPERTY_TYPES = [
  { value: "any", label: "Any Type" },
  { value: "Single Family", label: "Single Family" },
  { value: "Condo", label: "Condo" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "Multi-Family", label: "Multi-Family" },
  { value: "Land", label: "Land" },
];

const BEDS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const BATHS_OPTIONS = [
  { value: "any", label: "Any" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
];

const PRICE_MIN_OPTIONS = [
  { value: "any", label: "No Min" },
  { value: "50000", label: "$50,000" },
  { value: "100000", label: "$100,000" },
  { value: "150000", label: "$150,000" },
  { value: "200000", label: "$200,000" },
  { value: "250000", label: "$250,000" },
  { value: "300000", label: "$300,000" },
  { value: "400000", label: "$400,000" },
  { value: "500000", label: "$500,000" },
  { value: "600000", label: "$600,000" },
  { value: "750000", label: "$750,000" },
  { value: "1000000", label: "$1,000,000" },
  { value: "1500000", label: "$1,500,000" },
  { value: "2000000", label: "$2,000,000" },
];

const PRICE_MAX_OPTIONS = [
  { value: "any", label: "No Max" },
  { value: "100000", label: "$100,000" },
  { value: "150000", label: "$150,000" },
  { value: "200000", label: "$200,000" },
  { value: "250000", label: "$250,000" },
  { value: "300000", label: "$300,000" },
  { value: "400000", label: "$400,000" },
  { value: "500000", label: "$500,000" },
  { value: "600000", label: "$600,000" },
  { value: "750000", label: "$750,000" },
  { value: "1000000", label: "$1,000,000" },
  { value: "1500000", label: "$1,500,000" },
  { value: "2000000", label: "$2,000,000" },
  { value: "3000000", label: "$3,000,000" },
  { value: "5000000", label: "$5,000,000" },
];

const LISTING_TYPE_OPTIONS = [
  { value: "for_sale", label: "For Sale" },
  { value: "for_rent", label: "For Rent" },
  { value: "sold", label: "Recently Sold" },
];

interface RentCastListing {
  id: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  county?: string;
  latitude: number;
  longitude: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  lotSize?: number;
  yearBuilt?: number;
  hoa?: { fee: number };
  status: string;
  price: number;
  listingType: string;
  listedDate: string;
  daysOnMarket: number;
  mlsName?: string;
  mlsNumber?: string;
  listingAgent?: {
    name: string;
    phone?: string;
    email?: string;
  };
  listingOffice?: {
    name: string;
    phone?: string;
    email?: string;
  };
}

function buildZillowUrl(filters: {
  location: string;
  listingType: string;
  propertyType: string;
  minPrice: string;
  maxPrice: string;
  beds: string;
  baths: string;
}) {
  const loc = filters.location.trim();
  if (!loc) return null;

  const slug = loc
    .replace(/,\s*/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9\-]/g, "");

  const basePath = `https://www.zillow.com/homes/${slug}_rb/`;

  const filterState: Record<string, any> = {};

  if (filters.listingType === "for_sale") {
    filterState.sort = { value: "globalrelevanceex" };
    filterState.isAllHomes = { value: true };
  } else if (filters.listingType === "for_rent") {
    filterState.isForRent = { value: true };
    filterState.isForSaleByAgent = { value: false };
    filterState.isForSaleByOwner = { value: false };
    filterState.isNewConstruction = { value: false };
    filterState.isComingSoon = { value: false };
    filterState.isAuction = { value: false };
    filterState.isForSaleForeclosure = { value: false };
  } else if (filters.listingType === "sold") {
    filterState.isRecentlySold = { value: true };
    filterState.isForSaleByAgent = { value: false };
    filterState.isForSaleByOwner = { value: false };
    filterState.isNewConstruction = { value: false };
    filterState.isComingSoon = { value: false };
    filterState.isAuction = { value: false };
    filterState.isForSaleForeclosure = { value: false };
  }

  if (filters.minPrice !== "any") {
    filterState.price = { ...filterState.price, min: parseInt(filters.minPrice) };
  }
  if (filters.maxPrice !== "any") {
    filterState.price = { ...filterState.price, max: parseInt(filters.maxPrice) };
  }

  if (filters.beds !== "any") {
    filterState.beds = { min: parseInt(filters.beds) };
  }

  if (filters.baths !== "any") {
    filterState.baths = { min: parseInt(filters.baths) };
  }

  if (filters.propertyType !== "any") {
    const typeMap: Record<string, Record<string, { value: boolean }>> = {
      Houses: { isMultiFamily: { value: false }, isApartment: { value: false }, isCondo: { value: false }, isManufactured: { value: false }, isLotLand: { value: false }, isTownhouse: { value: false } },
      Condos: { isMultiFamily: { value: false }, isApartment: { value: false }, isCondo: { value: true }, isManufactured: { value: false }, isLotLand: { value: false } },
      Apartments: { isApartment: { value: true }, isCondo: { value: false }, isManufactured: { value: false }, isLotLand: { value: false } },
      Manufactured: { isManufactured: { value: true }, isApartment: { value: false }, isCondo: { value: false }, isLotLand: { value: false } },
      Land: { isLotLand: { value: true }, isApartment: { value: false }, isCondo: { value: false }, isManufactured: { value: false } },
    };
    if (typeMap[filters.propertyType]) {
      Object.assign(filterState, typeMap[filters.propertyType]);
    }
  }

  const searchQueryState = {
    pagination: {},
    isMapVisible: true,
    filterState,
  };

  const url = `${basePath}?searchQueryState=${encodeURIComponent(JSON.stringify(searchQueryState))}`;
  return url;
}

function parsePropertyUrl(url: string): { source: string; streetAddress: string | null; city: string | null; state: string | null; zipCode: string | null } {
  const result = { source: "other", streetAddress: null as string | null, city: null as string | null, state: null as string | null, zipCode: null as string | null };

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("zillow.com")) {
      result.source = "zillow";
      const match = parsed.pathname.match(/\/homedetails\/([^/]+)\//);
      if (match) {
        const parts = match[1].split("-");
        const zipMatch = parts[parts.length - 1]?.match(/^\d{5}$/);
        if (zipMatch) {
          result.zipCode = zipMatch[0];
          parts.pop();
        }
        const stateAbbrs = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
        if (parts.length >= 2 && stateAbbrs.includes(parts[parts.length - 1]?.toUpperCase())) {
          result.state = parts.pop()!.toUpperCase();
        }
        if (parts.length >= 2) {
          const cityParts: string[] = [];
          let foundCity = false;

          let i = parts.length - 1;
          while (i >= 0) {
            const part = parts[i];
            if (!foundCity && /^[A-Z][a-z]+$/.test(part)) {
              cityParts.unshift(part);
              i--;
            } else {
              foundCity = true;
              break;
            }
          }

          if (cityParts.length > 0 && i >= 0) {
            result.city = cityParts.join(" ");
            result.streetAddress = parts.slice(0, i + 1).join(" ");
          } else {
            result.streetAddress = parts.join(" ");
          }
        } else if (parts.length > 0) {
          result.streetAddress = parts.join(" ");
        }
      }
    } else if (parsed.hostname.includes("realtor.com")) {
      result.source = "realtor";
      const match = parsed.pathname.match(/\/realestateandhomes-detail\/([^/]+)/);
      if (match) {
        const slug = match[1];
        const parts = slug.split("_");
        if (parts.length >= 1) {
          result.streetAddress = parts[0].replace(/-/g, " ");
        }
        if (parts.length >= 2) {
          result.city = parts[1].replace(/-/g, " ");
        }
        if (parts.length >= 3) {
          result.state = parts[2].toUpperCase();
        }
        if (parts.length >= 4) {
          const zipMatch = parts[3].match(/^(\d{5})/);
          if (zipMatch) result.zipCode = zipMatch[1];
        }
      }
    } else if (parsed.hostname.includes("redfin.com")) {
      result.source = "redfin";
      const match = parsed.pathname.match(/\/([A-Z]{2})\/([^/]+)\/([^/]+)/);
      if (match) {
        result.state = match[1];
        result.city = match[2].replace(/-/g, " ");
        const street = match[3].replace(/-/g, " ");
        result.streetAddress = street;
      }
    }
  } catch {
  }

  return result;
}

function formatAddress(prop: SavedProperty): string {
  const parts: string[] = [];
  if (prop.streetAddress) parts.push(prop.streetAddress);
  if (prop.city) parts.push(prop.city);
  if (prop.state) parts.push(prop.state);
  if (prop.zipCode) parts.push(prop.zipCode);
  return parts.join(", ") || "Address not available";
}

function getSourceLabel(source: string): string {
  switch (source) {
    case "zillow": return "Zillow";
    case "realtor": return "Realtor.com";
    case "redfin": return "Redfin";
    default: return "Link";
  }
}

function formatPrice(price: number): string {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(price % 1000000 === 0 ? 0 : 1)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
  return `$${price.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function parseLocation(location: string): { city?: string; state?: string; zipCode?: string } {
  const trimmed = location.trim();
  if (/^\d{5}$/.test(trimmed)) {
    return { zipCode: trimmed };
  }
  const parts = trimmed.split(/[,\s]+/).filter(Boolean);
  const stateAbbrs = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toUpperCase();
    if (stateAbbrs.includes(lastPart)) {
      return { city: parts.slice(0, -1).join(" "), state: lastPart };
    }
  }
  return { city: trimmed };
}

function ListingCard({ listing, isSelected, onToggleSelect }: { listing: RentCastListing; isSelected: boolean; onToggleSelect: (id: string) => void }) {
  const zillowSearchUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, '').replace(/\s+/g, '-'))}_rb/`;

  return (
    <div className={`border rounded-lg p-4 hover:bg-muted/30 transition-colors space-y-3 ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(listing.id)}
            className="mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{listing.addressLine1}</h3>
            <p className="text-sm text-muted-foreground">{listing.city}, {listing.state} {listing.zipCode}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-lg text-primary">{formatPrice(listing.price)}</div>
          <Badge variant={listing.status === "Active" ? "default" : "secondary"} className="text-xs">
            {listing.status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
        {listing.bedrooms > 0 && (
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" />
            {listing.bedrooms} bed
          </span>
        )}
        {listing.bathrooms > 0 && (
          <span className="flex items-center gap-1">
            <Bath className="h-3.5 w-3.5" />
            {listing.bathrooms} bath
          </span>
        )}
        {listing.squareFootage > 0 && (
          <span className="flex items-center gap-1">
            <Ruler className="h-3.5 w-3.5" />
            {listing.squareFootage.toLocaleString()} sqft
          </span>
        )}
        {listing.yearBuilt && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5" />
            Built {listing.yearBuilt}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Listed {formatDate(listing.listedDate)}
        </span>
        <span>·</span>
        <span>{listing.daysOnMarket} days on market</span>
        {listing.propertyType && (
          <>
            <span>·</span>
            <span>{listing.propertyType}</span>
          </>
        )}
        {listing.hoa?.fee && (
          <>
            <span>·</span>
            <span>HOA ${listing.hoa.fee}/mo</span>
          </>
        )}
      </div>

      {listing.listingAgent && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <span className="font-medium">Agent:</span> {listing.listingAgent.name}
          {listing.listingOffice && <span> · {listing.listingOffice.name}</span>}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => window.open(zillowSearchUrl, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="h-3 w-3" />
          View on Zillow
        </Button>
        {listing.mlsNumber && (
          <Badge variant="outline" className="text-xs">
            MLS# {listing.mlsNumber}
          </Badge>
        )}
      </div>
    </div>
  );
}

function ListingTable({ listings, selectedIds, onToggleSelect, onToggleAll }: { listings: RentCastListing[]; selectedIds: Set<string>; onToggleSelect: (id: string) => void; onToggleAll: () => void }) {
  const allSelected = listings.length > 0 && listings.every(l => selectedIds.has(l.id));
  const someSelected = listings.some(l => selectedIds.has(l.id));

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b">
            <th className="px-3 py-2.5 w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={onToggleAll}
                className={someSelected && !allSelected ? "opacity-60" : ""}
              />
            </th>
            <th className="text-left px-3 py-2.5 font-medium">Address</th>
            <th className="text-right px-3 py-2.5 font-medium">Price</th>
            <th className="text-center px-3 py-2.5 font-medium">Beds</th>
            <th className="text-center px-3 py-2.5 font-medium">Baths</th>
            <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Sqft</th>
            <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Type</th>
            <th className="text-center px-3 py-2.5 font-medium hidden md:table-cell">Year</th>
            <th className="text-center px-3 py-2.5 font-medium hidden lg:table-cell">DOM</th>
            <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">Agent</th>
            <th className="text-left px-3 py-2.5 font-medium hidden lg:table-cell">MLS#</th>
            <th className="text-center px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing, i) => {
            const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, '').replace(/\s+/g, '-'))}_rb/`;
            return (
              <tr key={listing.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'} ${selectedIds.has(listing.id) ? 'bg-primary/5' : ''}`}>
                <td className="px-3 py-2.5">
                  <Checkbox
                    checked={selectedIds.has(listing.id)}
                    onCheckedChange={() => onToggleSelect(listing.id)}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="font-medium truncate max-w-[200px]">{listing.addressLine1}</div>
                  <div className="text-xs text-muted-foreground">{listing.city}, {listing.state} {listing.zipCode}</div>
                </td>
                <td className="px-3 py-2.5 text-right font-semibold text-primary whitespace-nowrap">
                  {formatPrice(listing.price)}
                </td>
                <td className="px-3 py-2.5 text-center">{listing.bedrooms || '—'}</td>
                <td className="px-3 py-2.5 text-center">{listing.bathrooms || '—'}</td>
                <td className="px-3 py-2.5 text-right hidden sm:table-cell whitespace-nowrap">
                  {listing.squareFootage ? listing.squareFootage.toLocaleString() : '—'}
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell text-muted-foreground text-xs">
                  {listing.propertyType || '—'}
                </td>
                <td className="px-3 py-2.5 text-center hidden md:table-cell text-muted-foreground">
                  {listing.yearBuilt || '—'}
                </td>
                <td className="px-3 py-2.5 text-center hidden lg:table-cell text-muted-foreground">
                  {listing.daysOnMarket}
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[140px]">
                  {listing.listingAgent?.name || '—'}
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-muted-foreground">
                  {listing.mlsNumber || '—'}
                </td>
                <td className="px-3 py-2.5 text-center">
                  <Badge variant={listing.status === "Active" ? "default" : "secondary"} className="text-xs">
                    {listing.status}
                  </Badge>
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(zillowUrl, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PropertySearchPage() {
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState("for_sale");
  const [propertyType, setPropertyType] = useState("any");
  const [minPrice, setMinPrice] = useState("any");
  const [maxPrice, setMaxPrice] = useState("any");
  const [beds, setBeds] = useState("any");
  const [baths, setBaths] = useState("any");

  const [rcLocation, setRcLocation] = useState("");
  const [rcPropertyType, setRcPropertyType] = useState("any");
  const [rcMinPrice, setRcMinPrice] = useState("any");
  const [rcMaxPrice, setRcMaxPrice] = useState("any");
  const [rcBeds, setRcBeds] = useState("any");
  const [rcBaths, setRcBaths] = useState("any");
  const [rcLimit, setRcLimit] = useState("500");

  const [searchParams, setSearchParams] = useState<Record<string, string> | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());
  const refreshFlagRef = useRef(false);

  const [saveUrl, setSaveUrl] = useState("");
  const [saveNotes, setSaveNotes] = useState("");

  const { toast } = useToast();

  const { data: savedProperties = [], isLoading: isLoadingSaved } = useQuery<SavedProperty[]>({
    queryKey: ["/api/saved-properties"],
  });

  const { data: rentcastStatus } = useQuery({
    queryKey: ["/api/rentcast/status"],
  });

  const { data: rentcastResults, isLoading: isSearching, isError: isSearchError, error: searchError } = useQuery<{
    listings: RentCastListing[];
    fromCache: boolean;
    apiCallsUsed: number;
    apiCallsLimit: number;
  }>({
    queryKey: ["/api/rentcast/listings", searchParams],
    queryFn: async ({ queryKey }) => {
      if (!searchParams) return { listings: [], fromCache: false, apiCallsUsed: 0, apiCallsLimit: 45 };
      const params = new URLSearchParams(searchParams);
      if (refreshFlagRef.current) {
        params.set("refresh", "true");
        refreshFlagRef.current = false;
      }
      const res = await apiRequest("GET", `/api/rentcast/listings?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Search failed");
      }
      return res.json();
    },
    enabled: !!searchParams,
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { url: string; notes: string }) => {
      const parsed = parsePropertyUrl(data.url);
      await apiRequest("POST", "/api/saved-properties", {
        url: data.url,
        source: parsed.source,
        streetAddress: parsed.streetAddress,
        city: parsed.city,
        state: parsed.state,
        zipCode: parsed.zipCode,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      setSaveUrl("");
      setSaveNotes("");
      toast({ title: "Property saved!", description: "The listing has been added to your saved properties." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save property. Please try again.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/saved-properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({ title: "Removed", description: "Property removed from your saved list." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove property.", variant: "destructive" });
    },
  });

  const filteredListings = (rentcastResults?.listings || []).filter(listing => {
    const min = rcMinPrice !== "any" ? parseInt(rcMinPrice) : 0;
    const max = rcMaxPrice !== "any" ? parseInt(rcMaxPrice) : Infinity;
    if (listing.price < min || listing.price > max) return false;
    if (rcBeds !== "any" && listing.bedrooms < parseInt(rcBeds)) return false;
    if (rcBaths !== "any" && listing.bathrooms < parseInt(rcBaths)) return false;
    return true;
  });

  const toggleSelectListing = (id: string) => {
    setSelectedListingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (filteredListings.every(l => selectedListingIds.has(l.id))) {
      setSelectedListingIds(new Set());
    } else {
      setSelectedListingIds(new Set(filteredListings.map(l => l.id)));
    }
  };

  const bulkSaveMutation = useMutation({
    mutationFn: async (listings: RentCastListing[]) => {
      for (const listing of listings) {
        const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, '').replace(/\s+/g, '-'))}_rb/`;
        await apiRequest("POST", "/api/saved-properties", {
          url: zillowUrl,
          source: "zillow",
          streetAddress: listing.addressLine1,
          city: listing.city,
          state: listing.state,
          zipCode: listing.zipCode,
          notes: `${listing.propertyType || ''} · ${formatPrice(listing.price)} · ${listing.bedrooms}bd/${listing.bathrooms}ba · ${listing.squareFootage?.toLocaleString() || '?'} sqft`.trim(),
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      setSelectedListingIds(new Set());
      toast({ title: "Saved!", description: `${variables.length} ${variables.length === 1 ? 'property' : 'properties'} added to your favorites.` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save some properties. Please try again.", variant: "destructive" });
    },
  });

  const handleBulkSave = () => {
    const selected = filteredListings.filter(l => selectedListingIds.has(l.id));
    if (selected.length === 0) return;
    bulkSaveMutation.mutate(selected);
  };

  const handleZillowSearch = () => {
    const url = buildZillowUrl({ location, listingType, propertyType, minPrice, maxPrice, beds, baths });
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleRentCastSearch = () => {
    const loc = rcLocation.trim();
    if (!loc) return;

    const parsed = parseLocation(loc);
    const params: Record<string, string> = {};

    if (parsed.zipCode) {
      params.zipCode = parsed.zipCode;
    } else {
      if (parsed.city) params.city = parsed.city;
      if (parsed.state) params.state = parsed.state;
    }

    if (rcMinPrice !== "any") params.minPrice = rcMinPrice;
    if (rcMaxPrice !== "any") params.maxPrice = rcMaxPrice;
    if (rcBeds !== "any") params.bedrooms = rcBeds;
    if (rcBaths !== "any") params.bathrooms = rcBaths;
    if (rcPropertyType !== "any") params.propertyType = rcPropertyType;
    params.status = "Active";
    params.limit = rcLimit;

    setSearchParams(params);
    setSelectedListingIds(new Set());
  };

  const handleResetZillow = () => {
    setLocation("");
    setListingType("for_sale");
    setPropertyType("any");
    setMinPrice("any");
    setMaxPrice("any");
    setBeds("any");
    setBaths("any");
  };

  const handleResetRentCast = () => {
    setRcLocation("");
    setRcPropertyType("any");
    setRcMinPrice("any");
    setRcMaxPrice("any");
    setRcBeds("any");
    setRcBaths("any");
    setRcLimit("500");
    setSearchParams(null);
  };

  const handleSaveProperty = () => {
    const trimmed = saveUrl.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
    } catch {
      toast({ title: "Invalid URL", description: "Please paste a valid property listing URL.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ url: trimmed, notes: saveNotes.trim() });
  };

  const isZillowSearchDisabled = !location.trim();
  const isRentCastSearchDisabled = !rcLocation.trim();
  const previewParsed = saveUrl.trim() ? parsePropertyUrl(saveUrl.trim()) : null;
  const previewAddress = previewParsed ? [previewParsed.streetAddress, previewParsed.city, previewParsed.state, previewParsed.zipCode].filter(Boolean).join(", ") : null;
  const apiStatus = rentcastStatus as { apiCallsUsed: number; apiCallsLimit: number } | undefined;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6" />
            Property Search
          </h1>
          <p className="text-muted-foreground mt-1">
            Search for active listings or browse on Zillow, then save the ones you like.
          </p>
        </div>
        {apiStatus && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <Database className="h-3.5 w-3.5" />
            <span>API: {apiStatus.apiCallsUsed}/{apiStatus.apiCallsLimit} calls used this month</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="rentcast" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rentcast">Listing Search</TabsTrigger>
          <TabsTrigger value="zillow">Zillow Search</TabsTrigger>
        </TabsList>

        <TabsContent value="rentcast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5" />
                Search Active Listings
              </CardTitle>
              <CardDescription>
                Search for properties currently on the market. Enter a city and state (e.g. "Fort Worth TX") or a ZIP code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="rc-location" className="font-medium">Location</Label>
                <Input
                  id="rc-location"
                  placeholder="e.g. Fort Worth TX, 76244, Austin TX"
                  value={rcLocation}
                  onChange={(e) => setRcLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isRentCastSearchDisabled) handleRentCastSearch();
                  }}
                  className="text-base"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Min Price
                  </Label>
                  <Select value={rcMinPrice} onValueChange={setRcMinPrice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_MIN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Max Price
                  </Label>
                  <Select value={rcMaxPrice} onValueChange={setRcMaxPrice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_MAX_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4" />
                    Bedrooms
                  </Label>
                  <Select value={rcBeds} onValueChange={setRcBeds}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BEDS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <Bath className="h-4 w-4" />
                    Bathrooms
                  </Label>
                  <Select value={rcBaths} onValueChange={setRcBaths}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BATHS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" />
                    Property Type
                  </Label>
                  <Select value={rcPropertyType} onValueChange={setRcPropertyType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RENTCAST_PROPERTY_TYPES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <List className="h-4 w-4" />
                    Max Results
                  </Label>
                  <Select value={rcLimit} onValueChange={setRcLimit}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleRentCastSearch}
                  disabled={isRentCastSearchDisabled || isSearching}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search Listings
                </Button>
                <Button onClick={handleResetRentCast} variant="outline" size="lg">
                  Reset Filters
                </Button>
              </div>

              {apiStatus && (
                <div className="sm:hidden flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  <Database className="h-3.5 w-3.5" />
                  <span>API: {apiStatus.apiCallsUsed}/{apiStatus.apiCallsLimit} calls used this month</span>
                </div>
              )}
            </CardContent>
          </Card>

          {isSearchError && (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{(searchError as Error)?.message || "Search failed"}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {rentcastResults && rentcastResults.listings.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Results
                    <span className="text-sm font-normal text-muted-foreground">
                      ({filteredListings.length}{filteredListings.length !== rentcastResults.listings.length ? ` of ${rentcastResults.listings.length}` : ''} listings)
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {rentcastResults.fromCache && (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs gap-1">
                          <Database className="h-3 w-3" />
                          Cached
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1 text-xs"
                          onClick={() => {
                            refreshFlagRef.current = true;
                            setSelectedListingIds(new Set());
                            queryClient.invalidateQueries({ queryKey: ["/api/rentcast/listings", searchParams] });
                          }}
                          disabled={isSearching}
                        >
                          <RefreshCw className={`h-3 w-3 ${isSearching ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant={viewMode === "cards" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-2 rounded-r-none"
                        onClick={() => setViewMode("cards")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "table" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-2 rounded-l-none"
                        onClick={() => setViewMode("table")}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                {selectedListingIds.size > 0 && (
                  <div className="flex items-center gap-3 mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <CheckSquare className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium">
                      {selectedListingIds.size} {selectedListingIds.size === 1 ? 'listing' : 'listings'} selected
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={handleBulkSave}
                        disabled={bulkSaveMutation.isPending}
                      >
                        {bulkSaveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className="h-3.5 w-3.5" />}
                        Save to Favorites
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedListingIds(new Set())}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {viewMode === "cards" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredListings.map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        isSelected={selectedListingIds.has(listing.id)}
                        onToggleSelect={toggleSelectListing}
                      />
                    ))}
                  </div>
                ) : (
                  <ListingTable
                    listings={filteredListings}
                    selectedIds={selectedListingIds}
                    onToggleSelect={toggleSelectListing}
                    onToggleAll={toggleSelectAll}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {filteredListings.length === 0 && searchParams && !isSearching && rentcastResults && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6 text-muted-foreground">
                  <Home className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No listings found</p>
                  <p className="text-sm mt-1">Try adjusting your filters or searching a different location.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="zillow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5" />
                Search on Zillow
              </CardTitle>
              <CardDescription>
                Set your filters and search on Zillow in a new tab.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="location" className="font-medium">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Austin TX, 90210, Miami Beach FL"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isZillowSearchDisabled) handleZillowSearch();
                  }}
                  className="text-base"
                />
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Listing Type</Label>
                <Select value={listingType} onValueChange={setListingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Min Price
                  </Label>
                  <Select value={minPrice} onValueChange={setMinPrice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_MIN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Max Price
                  </Label>
                  <Select value={maxPrice} onValueChange={setMaxPrice}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_MAX_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4" />
                    Bedrooms
                  </Label>
                  <Select value={beds} onValueChange={setBeds}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BEDS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <Bath className="h-4 w-4" />
                    Bathrooms
                  </Label>
                  <Select value={baths} onValueChange={setBaths}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BATHS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-medium flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  Property Type
                </Label>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleZillowSearch}
                  disabled={isZillowSearchDisabled}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  <ExternalLink className="h-4 w-4" />
                  Search on Zillow
                </Button>
                <Button onClick={handleResetZillow} variant="outline" size="lg">
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5" />
            Save a Property
          </CardTitle>
          <CardDescription>
            Found a property you like? Paste the listing URL below and we'll save it for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="save-url" className="font-medium flex items-center gap-1.5">
              <Link className="h-4 w-4" />
              Listing URL
            </Label>
            <Input
              id="save-url"
              placeholder="Paste a Zillow, Realtor.com, or Redfin listing URL"
              value={saveUrl}
              onChange={(e) => setSaveUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && saveUrl.trim()) handleSaveProperty();
              }}
              className="text-base"
            />
            {previewAddress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">{previewAddress}</span>
                  {previewParsed && <span className="ml-1.5">({getSourceLabel(previewParsed.source)})</span>}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="save-notes" className="font-medium">Notes (optional)</Label>
            <Textarea
              id="save-notes"
              placeholder="e.g. Love the backyard, great school district"
              value={saveNotes}
              onChange={(e) => setSaveNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            onClick={handleSaveProperty}
            disabled={!saveUrl.trim() || saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
            Save Property
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Saved Properties
            {savedProperties.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({savedProperties.length})</span>
            )}
          </CardTitle>
          <CardDescription>
            Properties you've saved from your searches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSaved ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedProperties.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Home className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No saved properties yet</p>
              <p className="text-sm mt-1">Search for listings above, then paste the URL to save it.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="flex items-start justify-between gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm truncate">{formatAddress(prop)}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{getSourceLabel(prop.source)}</Badge>
                    </div>
                    {prop.notes && <p className="text-sm text-muted-foreground ml-6">{prop.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(prop.url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(prop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-4">
        <p>Listing data provided by RentCast. Results are cached for 24 hours to conserve API usage.</p>
      </div>
    </div>
  );
}
