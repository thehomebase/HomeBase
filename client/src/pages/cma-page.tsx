import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3, Plus, ArrowLeft, Search, Save, Share2, Printer, Trash2,
  Home, MapPin, BedDouble, Bath, Ruler, Calendar, DollarSign, Building2,
  Loader2, Copy, Edit, TrendingUp, TrendingDown, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ExternalLink
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import type { CmaReport } from "@shared/schema";

interface RentCastListing {
  id: string;
  formattedAddress: string;
  addressLine1?: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  yearBuilt?: number;
  daysOnMarket: number;
  status: string;
  latitude: number;
  longitude: number;
  lotSize?: number;
  features?: string[];
}

interface CompData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  yearBuilt?: number;
  daysOnMarket: number;
  pricePerSqft: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

function CmaListView({ onSelect, onCreate }: { onSelect: (id: number) => void; onCreate: () => void }) {
  const { data: reports = [], isLoading } = useQuery<CmaReport[]>({
    queryKey: ["/api/cma"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/cma/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cma"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Market Analysis (CMA)
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage comparative market analysis reports</p>
        </div>
        <Button onClick={onCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          New CMA
        </Button>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No CMA Reports Yet</h3>
            <p className="text-muted-foreground mb-4">Create your first comparative market analysis report</p>
            <Button onClick={onCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Create CMA Report
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reports.map((report) => {
            const comps = (report.comps as CompData[]) || [];
            return (
              <Card key={report.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => onSelect(report.id)}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{report.subjectAddress}</h3>
                    <p className="text-sm text-muted-foreground">
                      {report.subjectCity}, {report.subjectState} {report.subjectZip}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {report.subjectPrice && <span>{formatPrice(report.subjectPrice)}</span>}
                      <span>{comps.length} comps</span>
                      <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onSelect(report.id); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this CMA report?")) deleteMutation.mutate(report.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CmaBuilderView({ reportId, onBack }: { reportId: number | null; onBack: () => void }) {
  const { toast } = useToast();
  const isEditing = reportId !== null;

  const [subjectAddress, setSubjectAddress] = useState("");
  const [subjectCity, setSubjectCity] = useState("");
  const [subjectState, setSubjectState] = useState("");
  const [subjectZip, setSubjectZip] = useState("");
  const [subjectBeds, setSubjectBeds] = useState("");
  const [subjectBaths, setSubjectBaths] = useState("");
  const [subjectSqft, setSubjectSqft] = useState("");
  const [subjectPrice, setSubjectPrice] = useState("");
  const [subjectYearBuilt, setSubjectYearBuilt] = useState("");
  const [notes, setNotes] = useState("");
  const [comps, setComps] = useState<CompData[]>([]);
  const [shareToken, setShareToken] = useState("");

  const [searchCity, setSearchCity] = useState("");
  const [searchState, setSearchState] = useState("");
  const [searchZip, setSearchZip] = useState("");
  const [searchParams, setSearchParams] = useState<Record<string, string> | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [narrowed, setNarrowed] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [subjectCoords, setSubjectCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocodingSubject, setIsGeocodingSubject] = useState(false);
  const [isLookingUpSubject, setIsLookingUpSubject] = useState(false);
  const [filterPropertyType, setFilterPropertyType] = useState("all");
  const [filterSqftRange, setFilterSqftRange] = useState<[number, number]>([0, 10000]);
  const [filterLotRange, setFilterLotRange] = useState<[number, number]>([0, 20]);
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());

  const { isLoading: isLoadingReport } = useQuery<CmaReport>({
    queryKey: ["/api/cma", reportId],
    enabled: isEditing,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cma/${reportId}`);
      return res.json();
    },
    staleTime: 0,
    refetchOnMount: "always" as const,
  });

  const populateFromReport = (report: CmaReport) => {
    setSubjectAddress(report.subjectAddress);
    setSubjectCity(report.subjectCity);
    setSubjectState(report.subjectState);
    setSubjectZip(report.subjectZip);
    setSubjectBeds(report.subjectBeds?.toString() || "");
    setSubjectBaths(report.subjectBaths?.toString() || "");
    setSubjectSqft(report.subjectSqft?.toString() || "");
    setSubjectPrice(report.subjectPrice?.toString() || "");
    setSubjectYearBuilt(report.subjectYearBuilt?.toString() || "");
    setNotes(report.notes || "");
    setComps((report.comps as CompData[]) || []);
    setShareToken(report.shareToken);
    setSearchCity(report.subjectCity);
    setSearchState(report.subjectState);
    setSearchZip(report.subjectZip);
  };

  const { data: existingReport } = useQuery<CmaReport>({
    queryKey: ["/api/cma", reportId],
    enabled: isEditing,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cma/${reportId}`);
      const data = await res.json();
      populateFromReport(data);
      return data;
    },
  });

  const { data: searchResults, isLoading: isSearching } = useQuery<{
    listings: RentCastListing[];
    fromCache: boolean;
  }>({
    queryKey: ["/api/rentcast/listings", searchParams],
    queryFn: async () => {
      if (!searchParams) return { listings: [], fromCache: false };
      const params = new URLSearchParams(searchParams);
      const res = await apiRequest("GET", `/api/rentcast/listings?${params.toString()}`);
      return res.json();
    },
    enabled: !!searchParams,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const listings = searchResults?.listings || [];

  const geocodeSubject = async () => {
    const addr = subjectAddress.trim();
    const city = subjectCity.trim();
    const state = subjectState.trim();
    const zip = subjectZip.trim();
    if (!addr && !city) {
      toast({ title: "Enter subject property", description: "Fill in the subject property address first.", variant: "destructive" });
      return;
    }
    setIsGeocodingSubject(true);
    try {
      const q = [addr, city, state, zip].filter(Boolean).join(", ");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        setSubjectCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        toast({ title: "Subject property located", description: `Coordinates set. Radius filter is now active.` });
      } else {
        toast({ title: "Could not locate address", description: "Try adding more detail to the subject property address.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Geocoding failed", description: "Unable to look up the address. Try again.", variant: "destructive" });
    } finally {
      setIsGeocodingSubject(false);
    }
  };

  const lookupSubjectProperty = async () => {
    const addr = subjectAddress.trim();
    const city = subjectCity.trim();
    const state = subjectState.trim();
    const zip = subjectZip.trim();
    const fullAddress = [addr, city, state, zip].filter(Boolean).join(", ");
    if (!addr) {
      toast({ title: "Enter an address", description: "Type the subject property street address first.", variant: "destructive" });
      return;
    }
    setIsLookingUpSubject(true);
    try {
      const res = await apiRequest("GET", `/api/rentcast/property?address=${encodeURIComponent(fullAddress)}`);
      const { property } = await res.json();
      if (!property || (!property.addressLine1 && !property.formattedAddress)) {
        toast({ title: "Property not found", description: "Could not find data for that address. You can fill in the details manually.", variant: "destructive" });
        return;
      }
      if (property.city) setSubjectCity(property.city);
      if (property.state) setSubjectState(property.state);
      if (property.zipCode) setSubjectZip(property.zipCode);
      if (property.bedrooms) setSubjectBeds(String(property.bedrooms));
      if (property.bathrooms) setSubjectBaths(String(property.bathrooms));
      if (property.squareFootage) setSubjectSqft(String(property.squareFootage));
      if (property.yearBuilt) setSubjectYearBuilt(String(property.yearBuilt));
      if (property.price || property.lastSalePrice) setSubjectPrice(String(property.price || property.lastSalePrice));
      if (property.latitude && property.longitude) {
        setSubjectCoords({ lat: property.latitude, lng: property.longitude });
      }
      toast({ title: "Property data loaded", description: "Fields have been auto-filled. You can edit any value as needed." });
    } catch (err: any) {
      const msg = err?.message || "Failed to look up property";
      toast({ title: "Lookup failed", description: msg, variant: "destructive" });
    } finally {
      setIsLookingUpSubject(false);
    }
  };

  const handleSearchComps = () => {
    const params: Record<string, string> = {};
    const city = searchCity || subjectCity;
    const state = searchState || subjectState;
    const zip = searchZip || subjectZip;

    if (zip) {
      params.zipCode = zip;
    } else if (city) {
      params.city = city;
      if (state) params.state = state;
    } else {
      toast({ title: "Enter a location", description: "Provide a city or ZIP code to search comps.", variant: "destructive" });
      return;
    }

    if (subjectBeds) params.bedroomsMin = String(Math.max(1, parseInt(subjectBeds) - 1));
    params.status = "Active";
    params.limit = "100";
    setSearchParams(params);
    setSelectedListingIds(new Set());
  };

  const addSelectedComps = () => {
    const selected = listings.filter(l => selectedListingIds.has(l.id));
    const newComps: CompData[] = selected.map(l => ({
      address: l.formattedAddress || l.addressLine1 || "",
      city: l.city,
      state: l.state,
      zipCode: l.zipCode,
      price: l.price,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      squareFootage: l.squareFootage,
      propertyType: l.propertyType,
      yearBuilt: l.yearBuilt,
      daysOnMarket: l.daysOnMarket,
      pricePerSqft: l.squareFootage > 0 ? Math.round(l.price / l.squareFootage) : 0,
    }));
    const existingAddresses = new Set(comps.map(c => c.address));
    const deduped = newComps.filter(c => !existingAddresses.has(c.address));
    setComps(prev => [...prev, ...deduped]);
    setSelectedListingIds(new Set());
    toast({ title: "Comps Added", description: `${deduped.length} comparable(s) added to your analysis.` });
  };

  const removeComp = (index: number) => {
    setComps(prev => prev.filter((_, i) => i !== index));
  };

  const analysis = useMemo(() => {
    if (comps.length === 0) return null;
    const prices = comps.map(c => c.price).sort((a, b) => a - b);
    const sqftPrices = comps.filter(c => c.pricePerSqft > 0).map(c => c.pricePerSqft);
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const median = prices.length % 2 === 0
      ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
      : prices[Math.floor(prices.length / 2)];
    const avgPricePerSqft = sqftPrices.length > 0 ? Math.round(sqftPrices.reduce((a, b) => a + b, 0) / sqftPrices.length) : 0;
    const rangeLow = Math.round(median * 0.95);
    const rangeHigh = Math.round(median * 1.05);
    return { avg, median, avgPricePerSqft, rangeLow, rangeHigh };
  }, [comps]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        subjectAddress,
        subjectCity,
        subjectState,
        subjectZip,
        subjectBeds: subjectBeds ? parseInt(subjectBeds) : null,
        subjectBaths: subjectBaths ? parseInt(subjectBaths) : null,
        subjectSqft: subjectSqft ? parseInt(subjectSqft) : null,
        subjectPrice: subjectPrice ? parseInt(subjectPrice) : null,
        subjectYearBuilt: subjectYearBuilt ? parseInt(subjectYearBuilt) : null,
        comps,
        notes,
      };
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/cma/${reportId}`, body);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/cma", body);
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cma"] });
      if (!isEditing && data.shareToken) {
        setShareToken(data.shareToken);
      }
      toast({ title: "Saved", description: "CMA report saved successfully." });
      if (!isEditing) {
        onBack();
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save CMA report.", variant: "destructive" });
    },
  });

  const handleCopyShareLink = () => {
    const token = shareToken || existingReport?.shareToken;
    if (!token) {
      toast({ title: "Save First", description: "Save the report to generate a share link.", variant: "destructive" });
      return;
    }
    const url = `${window.location.origin}/cma/share/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied", description: "Share link copied to clipboard." });
  };

  const handlePrint = () => window.print();

  if (isEditing && isLoadingReport) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? "Edit CMA Report" : "New CMA Report"}
            </h1>
            <p className="text-muted-foreground text-sm">Comparative Market Analysis Builder</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1">
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyShareLink} className="gap-1">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !subjectAddress} className="gap-1">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Home className="h-5 w-5" />
            Subject Property
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="md:col-span-2 lg:col-span-3">
              <Label>Address</Label>
              <div className="flex gap-2">
                <Input value={subjectAddress} onChange={e => { setSubjectAddress(e.target.value); setSubjectCoords(null); }} placeholder="123 Main St" className="flex-1" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={lookupSubjectProperty}
                  disabled={isLookingUpSubject || !subjectAddress.trim()}
                  className="gap-1 whitespace-nowrap h-10"
                >
                  {isLookingUpSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Look Up
                </Button>
              </div>
            </div>
            <div>
              <Label>City</Label>
              <Input value={subjectCity} onChange={e => { setSubjectCity(e.target.value); setSubjectCoords(null); }} placeholder="Austin" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={subjectState} onChange={e => { setSubjectState(e.target.value); setSubjectCoords(null); }} placeholder="TX" maxLength={2} />
            </div>
            <div>
              <Label>ZIP Code</Label>
              <Input value={subjectZip} onChange={e => { setSubjectZip(e.target.value); setSubjectCoords(null); }} placeholder="78701" maxLength={5} />
            </div>
            <div>
              <Label>Bedrooms</Label>
              <Input type="number" value={subjectBeds} onChange={e => setSubjectBeds(e.target.value)} placeholder="3" />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input type="number" value={subjectBaths} onChange={e => setSubjectBaths(e.target.value)} placeholder="2" />
            </div>
            <div>
              <Label>Square Footage</Label>
              <Input type="number" value={subjectSqft} onChange={e => setSubjectSqft(e.target.value)} placeholder="1800" />
            </div>
            <div>
              <Label>Estimated Price</Label>
              <Input type="number" value={subjectPrice} onChange={e => setSubjectPrice(e.target.value)} placeholder="450000" />
            </div>
            <div>
              <Label>Year Built</Label>
              <Input type="number" value={subjectYearBuilt} onChange={e => setSubjectYearBuilt(e.target.value)} placeholder="2005" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button
              variant={subjectCoords ? "outline" : "default"}
              size="sm"
              onClick={geocodeSubject}
              disabled={isGeocodingSubject || (!subjectAddress.trim() && !subjectCity.trim())}
              className="gap-1"
            >
              {isGeocodingSubject ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {subjectCoords ? "Re-locate Subject" : "Lock in Subject Location"}
            </Button>
            {subjectCoords && (
              <span className="text-sm text-muted-foreground">
                Location set — radius filter active
              </span>
            )}
            {!subjectCoords && subjectAddress.trim() && (
              <span className="text-sm text-muted-foreground">
                Lock in location to enable radius filtering on comps
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Search Comps
          </CardTitle>
          <CardDescription>Find comparable properties nearby using RentCast data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label>City</Label>
              <Input value={searchCity} onChange={e => setSearchCity(e.target.value)} placeholder={subjectCity || "City"} className="w-40" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={searchState} onChange={e => setSearchState(e.target.value)} placeholder={subjectState || "ST"} className="w-20" maxLength={2} />
            </div>
            <div>
              <Label>ZIP</Label>
              <Input value={searchZip} onChange={e => setSearchZip(e.target.value)} placeholder={subjectZip || "ZIP"} className="w-24" maxLength={5} />
            </div>
            <Button onClick={handleSearchComps} disabled={isSearching} className="gap-1">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>

          {listings.length > 0 && (
            <div className="flex flex-wrap items-end gap-4 pt-1">
              {subjectCoords ? (
                <div className="flex items-center gap-3">
                  <Label className="text-sm whitespace-nowrap min-w-fit">Radius: {radiusMiles} mi</Label>
                  <Slider
                    value={[radiusMiles]}
                    onValueChange={([v]) => setRadiusMiles(v)}
                    min={1}
                    max={25}
                    step={1}
                    className="w-40"
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Lock in subject location above to enable radius filtering.</p>
              )}
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Type:</Label>
                <select
                  value={filterPropertyType}
                  onChange={e => setFilterPropertyType(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background text-foreground px-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  <option value="all">All Types</option>
                  <option value="Single Family">Single Family</option>
                  <option value="Condo">Condo</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Multi Family">Multi Family</option>
                  <option value="Land">Land</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm whitespace-nowrap min-w-fit">
                  Sqft: {filterSqftRange[0].toLocaleString()}–{filterSqftRange[1] >= 10000 ? "10k+" : filterSqftRange[1].toLocaleString()}
                </Label>
                <Slider
                  value={filterSqftRange}
                  onValueChange={([min, max]) => setFilterSqftRange([min, max])}
                  min={0}
                  max={10000}
                  step={100}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-sm whitespace-nowrap min-w-fit">
                  Lot: {filterLotRange[0]}–{filterLotRange[1] >= 20 ? "20+" : filterLotRange[1]} ac
                </Label>
                <Slider
                  value={filterLotRange}
                  onValueChange={([min, max]) => setFilterLotRange([min, max])}
                  min={0}
                  max={20}
                  step={0.25}
                  className="w-40"
                />
              </div>
            </div>
          )}

          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Searching properties...</span>
            </div>
          )}

          {listings.length > 0 && (() => {
            const handleSort = (col: string) => {
              if (sortColumn === col) {
                setSortDirection(prev => prev === "asc" ? "desc" : "asc");
              } else {
                setSortColumn(col);
                setSortDirection("asc");
              }
            };

            const SortIcon = ({ col }: { col: string }) => {
              if (sortColumn !== col) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
              return sortDirection === "asc" ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
            };

            const hasPool = (listing: RentCastListing) =>
              (listing.features || []).some((f: string) => /pool/i.test(f));

            const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
              const R = 3958.8;
              const dLat = (lat2 - lat1) * Math.PI / 180;
              const dLon = (lon2 - lon1) * Math.PI / 180;
              const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
              return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            };

            const getVal = (listing: RentCastListing, col: string): number => {
              switch (col) {
                case "price": return listing.price || 0;
                case "beds": return listing.bedrooms || 0;
                case "baths": return listing.bathrooms || 0;
                case "sqft": return listing.squareFootage || 0;
                case "ppsqft": return listing.squareFootage > 0 ? listing.price / listing.squareFootage : 0;
                case "year": return listing.yearBuilt || 0;
                case "dom": return listing.daysOnMarket || 0;
                case "lot": return listing.lotSize ? listing.lotSize / 43560 : 0;
                case "pool": return hasPool(listing) ? 1 : 0;
                default: return 0;
              }
            };

            const radiusFiltered = subjectCoords
              ? listings.filter(l => !l.latitude || !l.longitude || haversineDistance(subjectCoords.lat, subjectCoords.lng, l.latitude, l.longitude) <= radiusMiles)
              : listings;

            const typeFiltered = filterPropertyType === "all"
              ? radiusFiltered
              : radiusFiltered.filter(l => (l.propertyType || "").toLowerCase().includes(filterPropertyType.toLowerCase()));

            const sqftFiltered = typeFiltered.filter(l => {
              const sqft = l.squareFootage || 0;
              if (sqft === 0) return true;
              return sqft >= filterSqftRange[0] && (filterSqftRange[1] >= 10000 || sqft <= filterSqftRange[1]);
            });

            const lotFiltered = sqftFiltered.filter(l => {
              const acres = l.lotSize ? l.lotSize / 43560 : 0;
              if (acres === 0) return true;
              return acres >= filterLotRange[0] && (filterLotRange[1] >= 20 || acres <= filterLotRange[1]);
            });

            const visibleListings = narrowed && selectedListingIds.size > 0
              ? lotFiltered.filter(l => selectedListingIds.has(l.id))
              : lotFiltered;

            const sortedListings = sortColumn
              ? [...visibleListings].sort((a, b) => {
                  const aVal = getVal(a, sortColumn);
                  const bVal = getVal(b, sortColumn);
                  return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
                })
              : visibleListings;

            return (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  {narrowed && selectedListingIds.size > 0
                    ? `Showing ${sortedListings.length} of ${listings.length} properties`
                    : lotFiltered.length < listings.length
                    ? `${lotFiltered.length} of ${listings.length} properties (filtered)`
                    : `${listings.length} properties found`}
                </p>
                <div className="flex items-center gap-2">
                  {selectedListingIds.size > 0 && (
                    <Button
                      size="sm"
                      variant={narrowed ? "default" : "outline"}
                      onClick={() => setNarrowed(!narrowed)}
                      className="gap-1"
                    >
                      {narrowed ? <X className="h-3.5 w-3.5" /> : <Filter className="h-3.5 w-3.5" />}
                      {narrowed ? "Show All" : `Narrow to ${selectedListingIds.size} Selected`}
                    </Button>
                  )}
                  {selectedListingIds.size > 0 && (
                    <Button size="sm" onClick={addSelectedComps} className="gap-1">
                      <Plus className="h-4 w-4" />
                      Add {selectedListingIds.size} Selected
                    </Button>
                  )}
                </div>
              </div>
              <div className="max-h-[400px] overflow-y-auto border rounded-lg">
                <table className="w-full text-sm table-fixed">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left w-10">
                        <Checkbox
                          checked={sortedListings.length > 0 && sortedListings.every(l => selectedListingIds.has(l.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedListingIds(prev => {
                                const next = new Set(prev);
                                sortedListings.forEach(l => next.add(l.id));
                                return next;
                              });
                            } else {
                              setSelectedListingIds(prev => {
                                const next = new Set(prev);
                                sortedListings.forEach(l => next.delete(l.id));
                                return next;
                              });
                              setNarrowed(false);
                            }
                          }}
                        />
                      </th>
                      <th className="px-2 py-2 text-left font-medium w-[22%]">Address</th>
                      <th className="px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-foreground w-[10%]" onClick={() => handleSort("price")}>
                        <span className="inline-flex items-center justify-end">Price<SortIcon col="price" /></span>
                      </th>
                      <th className="px-2 py-2 text-center font-medium cursor-pointer select-none hover:text-foreground w-[6%]" onClick={() => handleSort("beds")}>
                        <span className="inline-flex items-center justify-center">Beds<SortIcon col="beds" /></span>
                      </th>
                      <th className="px-2 py-2 text-center font-medium cursor-pointer select-none hover:text-foreground w-[6%]" onClick={() => handleSort("baths")}>
                        <span className="inline-flex items-center justify-center">Baths<SortIcon col="baths" /></span>
                      </th>
                      <th className="px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-foreground w-[8%]" onClick={() => handleSort("sqft")}>
                        <span className="inline-flex items-center justify-end">Sqft<SortIcon col="sqft" /></span>
                      </th>
                      <th className="px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-foreground w-[8%]" onClick={() => handleSort("ppsqft")}>
                        <span className="inline-flex items-center justify-end">$/Sqft<SortIcon col="ppsqft" /></span>
                      </th>
                      <th className="px-2 py-2 text-center font-medium cursor-pointer select-none hover:text-foreground w-[6%]" onClick={() => handleSort("year")}>
                        <span className="inline-flex items-center justify-center">Year<SortIcon col="year" /></span>
                      </th>
                      <th className="px-2 py-2 text-center font-medium cursor-pointer select-none hover:text-foreground w-[6%]" onClick={() => handleSort("dom")}>
                        <span className="inline-flex items-center justify-center">DOM<SortIcon col="dom" /></span>
                      </th>
                      <th className="px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-foreground w-[7%]" onClick={() => handleSort("lot")}>
                        <span className="inline-flex items-center justify-end">Lot(ac)<SortIcon col="lot" /></span>
                      </th>
                      <th className="px-2 py-2 text-center font-medium cursor-pointer select-none hover:text-foreground w-[6%]" onClick={() => handleSort("pool")}>
                        <span className="inline-flex items-center justify-center">Pool<SortIcon col="pool" /></span>
                      </th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedListings.map(listing => {
                      const isSelected = selectedListingIds.has(listing.id);
                      const pricePerSqft = listing.squareFootage > 0 ? Math.round(listing.price / listing.squareFootage) : 0;
                      return (
                        <tr
                          key={listing.id}
                          className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                          onClick={() => {
                            setSelectedListingIds(prev => {
                              const next = new Set(prev);
                              if (next.has(listing.id)) next.delete(listing.id);
                              else next.add(listing.id);
                              return next;
                            });
                          }}
                        >
                          <td className="px-2 py-2">
                            <Checkbox checked={isSelected} />
                          </td>
                          <td className="px-2 py-2 font-medium truncate">{listing.formattedAddress || listing.addressLine1}</td>
                          <td className="px-2 py-2 text-right font-semibold text-primary">{formatPrice(listing.price)}</td>
                          <td className="px-2 py-2 text-center">{listing.bedrooms || "—"}</td>
                          <td className="px-2 py-2 text-center">{listing.bathrooms || "—"}</td>
                          <td className="px-2 py-2 text-right">{listing.squareFootage > 0 ? listing.squareFootage.toLocaleString() : "—"}</td>
                          <td className="px-2 py-2 text-right">{pricePerSqft > 0 ? `$${pricePerSqft}` : "—"}</td>
                          <td className="px-2 py-2 text-center">{listing.yearBuilt || "—"}</td>
                          <td className="px-2 py-2 text-center">{listing.daysOnMarket}</td>
                          <td className="px-2 py-2 text-right">{listing.lotSize ? (listing.lotSize / 43560).toFixed(2) : "—"}</td>
                          <td className="px-2 py-2 text-center">
                            {hasPool(listing)
                              ? <Badge variant="default" className="text-xs px-1.5 py-0">Yes</Badge>
                              : <span className="text-muted-foreground text-xs">No</span>}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                const addr = (listing.formattedAddress || listing.addressLine1 || "").replace(/[,#]/g, "").replace(/\s+/g, "-");
                                window.open(`https://www.zillow.com/homes/${encodeURIComponent(addr)}_rb/`, "_blank", "noopener,noreferrer");
                              }}
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
            </div>
            );
          })()}
        </CardContent>
      </Card>

      {comps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Selected Comparables ({comps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2.5 font-medium">Address</th>
                    <th className="text-right px-3 py-2.5 font-medium">Price</th>
                    <th className="text-right px-3 py-2.5 font-medium">Sqft</th>
                    <th className="text-center px-3 py-2.5 font-medium">Beds/Baths</th>
                    <th className="text-right px-3 py-2.5 font-medium">$/Sqft</th>
                    <th className="text-center px-3 py-2.5 font-medium">DOM</th>
                    <th className="text-center px-3 py-2.5 font-medium">Year</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {comps.map((comp, i) => (
                    <tr key={i} className={`border-b last:border-0 hover:bg-muted/30 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                      <td className="px-3 py-2.5">
                        <div className="font-medium truncate max-w-[200px]">{comp.address}</div>
                        <div className="text-xs text-muted-foreground">{comp.city}, {comp.state} {comp.zipCode}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-primary whitespace-nowrap">{formatPrice(comp.price)}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">{comp.squareFootage > 0 ? comp.squareFootage.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2.5 text-center">{comp.bedrooms}/{comp.bathrooms}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">{comp.pricePerSqft > 0 ? `$${comp.pricePerSqft}` : "—"}</td>
                      <td className="px-3 py-2.5 text-center">{comp.daysOnMarket}</td>
                      <td className="px-3 py-2.5 text-center">{comp.yearBuilt || "—"}</td>
                      <td className="px-3 py-2.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeComp(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Price Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Average Price</p>
                <p className="text-xl font-bold mt-1">{formatPrice(analysis.avg)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Median Price</p>
                <p className="text-xl font-bold mt-1">{formatPrice(analysis.median)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg $/Sqft</p>
                <p className="text-xl font-bold mt-1">{analysis.avgPricePerSqft > 0 ? `$${analysis.avgPricePerSqft}` : "N/A"}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Suggested Range</p>
                <p className="text-lg font-bold mt-1">{formatPrice(analysis.rangeLow)} – {formatPrice(analysis.rangeHigh)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agent Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about the market analysis, property condition, adjustments..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pb-6">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !subjectAddress} className="gap-1">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isEditing ? "Update Report" : "Save Report"}
        </Button>
      </div>
    </div>
  );
}

export default function CmaPage() {
  const [view, setView] = useState<"list" | "builder">("list");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {view === "list" ? (
        <CmaListView
          onSelect={(id) => { setSelectedReportId(id); setView("builder"); }}
          onCreate={() => { setSelectedReportId(null); setView("builder"); }}
        />
      ) : (
        <CmaBuilderView
          reportId={selectedReportId}
          onBack={() => { setView("list"); setSelectedReportId(null); }}
        />
      )}
    </div>
  );
}