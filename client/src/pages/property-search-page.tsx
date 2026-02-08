import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, Home, DollarSign, BedDouble, Bath, Building2, Heart, Trash2, Link, Loader2, MapPin } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SavedProperty } from "@shared/schema";

const PROPERTY_TYPES = [
  { value: "any", label: "Any Type" },
  { value: "Houses", label: "Houses" },
  { value: "Condos", label: "Condos / Townhomes" },
  { value: "Apartments", label: "Apartments" },
  { value: "Manufactured", label: "Manufactured" },
  { value: "Land", label: "Lots / Land" },
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
          const streetParts: string[] = [];
          let foundCity = false;
          const streetPattern = /^\d+|^[A-Z][a-z]+$/;

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
    // invalid URL
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

export default function PropertySearchPage() {
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState("for_sale");
  const [propertyType, setPropertyType] = useState("any");
  const [minPrice, setMinPrice] = useState("any");
  const [maxPrice, setMaxPrice] = useState("any");
  const [beds, setBeds] = useState("any");
  const [baths, setBaths] = useState("any");

  const [saveUrl, setSaveUrl] = useState("");
  const [saveNotes, setSaveNotes] = useState("");

  const { toast } = useToast();

  const { data: savedProperties = [], isLoading: isLoadingSaved } = useQuery<SavedProperty[]>({
    queryKey: ["/api/saved-properties"],
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

  const handleSearch = () => {
    const url = buildZillowUrl({ location, listingType, propertyType, minPrice, maxPrice, beds, baths });
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleReset = () => {
    setLocation("");
    setListingType("for_sale");
    setPropertyType("any");
    setMinPrice("any");
    setMaxPrice("any");
    setBeds("any");
    setBaths("any");
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

  const isSearchDisabled = !location.trim();
  const previewParsed = saveUrl.trim() ? parsePropertyUrl(saveUrl.trim()) : null;
  const previewAddress = previewParsed ? [previewParsed.streetAddress, previewParsed.city, previewParsed.state, previewParsed.zipCode].filter(Boolean).join(", ") : null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6" />
          Property Search
        </h1>
        <p className="text-muted-foreground mt-1">
          Find properties on Zillow, then save the ones you like here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5" />
            Search Filters
          </CardTitle>
          <CardDescription>
            Enter a city, neighborhood, ZIP code, or address to get started.
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
                if (e.key === "Enter" && !isSearchDisabled) handleSearch();
              }}
              className="text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Listing Type</Label>
            <Select value={listingType} onValueChange={setListingType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LISTING_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_MIN_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_MAX_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEDS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BATHS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
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
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={handleSearch}
              disabled={isSearchDisabled}
              className="flex-1 gap-2"
              size="lg"
            >
              <ExternalLink className="h-4 w-4" />
              Search on Zillow
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm mt-1">Search on Zillow, find a property you like, and paste the URL above to save it.</p>
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
                      <MapPin className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{formatAddress(prop)}</span>
                    </div>
                    {prop.notes && (
                      <p className="text-sm text-muted-foreground ml-6 mb-1">{prop.notes}</p>
                    )}
                    <div className="flex items-center gap-3 ml-6">
                      <a
                        href={prop.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View on {getSourceLabel(prop.source)}
                      </a>
                      {prop.createdAt && (
                        <span className="text-xs text-muted-foreground">
                          Saved {new Date(prop.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteMutation.mutate(prop.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center space-y-2 py-4">
        <p className="text-xs text-muted-foreground">
          Search powered by{" "}
          <a
            href="https://www.zillow.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 hover:underline"
          >
            Zillow&reg;
          </a>
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Clicking "Search on Zillow" will open Zillow.com in a new tab with your selected filters applied.
          All listing data and search results are provided by Zillow.
        </p>
      </div>
    </div>
  );
}