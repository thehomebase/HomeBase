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
  Loader2, Copy, Edit, TrendingUp, TrendingDown
} from "lucide-react";
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
              <Input value={subjectAddress} onChange={e => setSubjectAddress(e.target.value)} placeholder="123 Main St" />
            </div>
            <div>
              <Label>City</Label>
              <Input value={subjectCity} onChange={e => setSubjectCity(e.target.value)} placeholder="Austin" />
            </div>
            <div>
              <Label>State</Label>
              <Input value={subjectState} onChange={e => setSubjectState(e.target.value)} placeholder="TX" maxLength={2} />
            </div>
            <div>
              <Label>ZIP Code</Label>
              <Input value={subjectZip} onChange={e => setSubjectZip(e.target.value)} placeholder="78701" maxLength={5} />
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

          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Searching properties...</span>
            </div>
          )}

          {listings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{listings.length} properties found</p>
                {selectedListingIds.size > 0 && (
                  <Button size="sm" onClick={addSelectedComps} className="gap-1">
                    <Plus className="h-4 w-4" />
                    Add {selectedListingIds.size} Selected
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {listings.map(listing => {
                  const isSelected = selectedListingIds.has(listing.id);
                  return (
                    <div
                      key={listing.id}
                      className={`border rounded-lg p-3 hover:bg-muted/30 transition-colors cursor-pointer ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
                      onClick={() => {
                        setSelectedListingIds(prev => {
                          const next = new Set(prev);
                          if (next.has(listing.id)) next.delete(listing.id);
                          else next.add(listing.id);
                          return next;
                        });
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox checked={isSelected} className="mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm truncate">{listing.formattedAddress || listing.addressLine1}</p>
                            <span className="font-bold text-primary shrink-0">{formatPrice(listing.price)}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1 text-xs text-muted-foreground">
                            {listing.bedrooms > 0 && <span>{listing.bedrooms} bd</span>}
                            {listing.bathrooms > 0 && <span>{listing.bathrooms} ba</span>}
                            {listing.squareFootage > 0 && <span>{listing.squareFootage.toLocaleString()} sqft</span>}
                            {listing.yearBuilt && <span>Built {listing.yearBuilt}</span>}
                            <span>{listing.daysOnMarket} DOM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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