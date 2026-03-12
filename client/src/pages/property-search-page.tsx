import { useState, useRef, lazy, Suspense, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ExternalLink, Home, DollarSign, BedDouble, Bath, Building2, Heart, Trash2, Loader2, MapPin, AlertTriangle, Database, Calendar, Ruler, LayoutGrid, List, CheckSquare, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, Eye, Map, Droplets, Phone, Mail, MessageSquare, Clock, FileText, ChevronDown, Send, Smartphone, Wifi, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useLocation } from "wouter";

const MapDrawSearch = lazy(() => import("@/components/map-draw-search"));
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { SavedProperty, EmailSnippet } from "@shared/schema";

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

const SQFT_MIN_OPTIONS = [
  { value: "any", label: "No Min" },
  { value: "1000", label: "1,000+" },
  { value: "1500", label: "1,500+" },
  { value: "2000", label: "2,000+" },
  { value: "2500", label: "2,500+" },
  { value: "3000", label: "3,000+" },
  { value: "4000", label: "4,000+" },
  { value: "5000", label: "5,000+" },
];

const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Pending", label: "Pending" },
  { value: "Sold", label: "Sold" },
];

function formatPriceInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  return "$" + parseInt(digits).toLocaleString();
}

function parsePriceInput(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  return digits || "";
}

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
  features?: string[];
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

function ListingCard({ listing, isSelected, onToggleSelect, onContactAgent, onViewDetail }: { listing: RentCastListing; isSelected: boolean; onToggleSelect: (id: string) => void; onContactAgent?: (listing: RentCastListing, mode: "sms" | "email") => void; onViewDetail?: (listing: RentCastListing) => void }) {
  const zillowSearchUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, '').replace(/\s+/g, '-'))}_rb/`;

  return (
    <div
      className={`border rounded-lg p-4 hover:bg-muted/30 transition-colors space-y-3 cursor-pointer ${isSelected ? 'ring-2 ring-primary border-primary' : ''}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button, a, [role='checkbox'], input")) return;
        onViewDetail?.(listing);
      }}
    >
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
        <Badge variant="outline" className="text-xs gap-1 font-medium">
          <Clock className="h-3 w-3" />
          {listing.daysOnMarket} DOM
        </Badge>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          Listed {formatDate(listing.listedDate)}
        </span>
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

      {(listing.listingAgent || listing.listingOffice) && (() => {
        const contactPhone = listing.listingAgent?.phone || listing.listingOffice?.phone;
        const contactEmail = listing.listingAgent?.email || listing.listingOffice?.email;
        const contactLabel = listing.listingAgent?.phone ? "Agent" : listing.listingOffice?.phone ? "Office" : "";
        return (
          <div className="text-xs border-t pt-2 space-y-1.5">
            <div className="text-muted-foreground">
              {listing.listingAgent && (
                <span><span className="font-medium">Agent:</span> {listing.listingAgent.name}</span>
              )}
              {listing.listingOffice && <span> · {listing.listingOffice.name}</span>}
            </div>
            {(contactPhone || contactEmail) && (
              <div className="flex flex-wrap gap-1.5">
                {contactPhone && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1 px-2"
                      onClick={() => window.open(`tel:${contactPhone}`, "_self")}
                    >
                      <Phone className="h-3 w-3" />
                      Call {contactLabel}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] gap-1 px-2"
                      onClick={() => onContactAgent?.(listing, "sms")}
                    >
                      <MessageSquare className="h-3 w-3" />
                      Text
                    </Button>
                  </>
                )}
                {contactEmail && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[11px] gap-1 px-2"
                    onClick={() => onContactAgent?.(listing, "email")}
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </Button>
                )}
                <span className="text-[11px] text-muted-foreground self-center">
                  {[contactPhone, contactEmail].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
          </div>
        );
      })()}

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

type SortKey = "price" | "bedrooms" | "bathrooms" | "squareFootage" | "yearBuilt" | "daysOnMarket" | null;
type SortDir = "asc" | "desc";

function SortIcon({ columnKey, sortKey, sortDir }: { columnKey: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
  return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
}

function ListingTable({ listings, selectedIds, onToggleSelect, onToggleAll, onContactAgent, onViewDetail }: { listings: RentCastListing[]; selectedIds: Set<string>; onToggleSelect: (id: string) => void; onToggleAll: () => void; onContactAgent?: (listing: RentCastListing, mode: "sms" | "email") => void; onViewDetail?: (listing: RentCastListing) => void }) {
  const allSelected = listings.length > 0 && listings.every(l => selectedIds.has(l.id));
  const someSelected = listings.some(l => selectedIds.has(l.id));
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
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
            {thSortable("Price", "price", "text-right")}
            {thSortable("Beds", "bedrooms", "text-center")}
            {thSortable("Baths", "bathrooms", "text-center")}
            {thSortable("Sqft", "squareFootage", "text-right", "hidden sm:table-cell")}
            <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Type</th>
            {thSortable("Year", "yearBuilt", "text-center", "hidden md:table-cell")}
            {thSortable("DOM", "daysOnMarket", "text-center")}
            <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">Agent</th>
            <th className="text-center px-3 py-2.5 font-medium hidden md:table-cell">Contact</th>
            <th className="text-center px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium w-10"></th>
          </tr>
        </thead>
        <tbody>
          {sortedListings.map((listing, i) => {
            const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, '').replace(/\s+/g, '-'))}_rb/`;
            return (
              <tr
                key={listing.id}
                className={`border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-muted/10'} ${selectedIds.has(listing.id) ? 'bg-primary/5' : ''}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button, a, [role='checkbox'], input")) return;
                  onViewDetail?.(listing);
                }}
              >
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
                <td className="px-3 py-2.5 text-center">
                  <Badge variant="outline" className="text-xs font-medium">
                    {listing.daysOnMarket}
                  </Badge>
                </td>
                {(() => {
                  const tPhone = listing.listingAgent?.phone || listing.listingOffice?.phone;
                  const tEmail = listing.listingAgent?.email || listing.listingOffice?.email;
                  return (
                    <>
                      <td className="px-3 py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                        <div className="truncate max-w-[140px]">{listing.listingAgent?.name || '—'}</div>
                        {listing.listingOffice && (
                          <div className="truncate max-w-[140px] text-[11px] opacity-70">{listing.listingOffice.name}</div>
                        )}
                        {tPhone && (
                          <div className="truncate max-w-[140px] text-[11px]">{tPhone}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <div className="flex gap-1 justify-center">
                          {tPhone && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title={`Call ${tPhone}`}
                                onClick={() => window.open(`tel:${tPhone}`, "_self")}
                              >
                                <Phone className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title={`Text ${tPhone}`}
                                onClick={() => onContactAgent?.(listing, "sms")}
                              >
                                <MessageSquare className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {tEmail && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title={`Email ${tEmail}`}
                              onClick={() => onContactAgent?.(listing, "email")}
                            >
                              <Mail className="h-3 w-3" />
                            </Button>
                          )}
                          {!tPhone && !tEmail && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </td>
                    </>
                  );
                })()}
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

function ListingDetailDialog({
  listing,
  onClose,
  onContactAgent,
}: {
  listing: RentCastListing | null;
  onClose: () => void;
  onContactAgent?: (listing: RentCastListing, mode: "sms" | "email") => void;
}) {
  if (!listing) return null;
  const zillowUrl = `https://www.zillow.com/homes/${encodeURIComponent(listing.formattedAddress.replace(/[,#]/g, "").replace(/\s+/g, "-"))}_rb/`;
  const contactPhone = listing.listingAgent?.phone || listing.listingOffice?.phone;
  const contactEmail = listing.listingAgent?.email || listing.listingOffice?.email;
  const contactLabel = listing.listingAgent?.phone ? "Agent" : listing.listingOffice?.phone ? "Office" : "";
  const pricePerSqft = listing.squareFootage > 0 ? Math.round(listing.price / listing.squareFootage) : null;

  return (
    <Dialog open={!!listing} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-start gap-2">
            <svg viewBox="0 0 100 100" className="h-7 w-7 shrink-0 mt-0.5 fill-current" aria-hidden="true">
              <polygon points="50,0 0,50 0,100 100,100 100,50" />
            </svg>
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{listing.addressLine1}</h2>
              <p className="text-sm text-muted-foreground font-normal">
                {listing.city}, {listing.state} {listing.zipCode}
                {listing.county && ` · ${listing.county}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary">{formatPrice(listing.price)}</div>
            <Badge variant={listing.status === "Active" ? "default" : "secondary"} className="text-sm px-3 py-1">
              {listing.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <BedDouble className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{listing.bedrooms || "—"}</div>
              <div className="text-xs text-muted-foreground">Beds</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Bath className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{listing.bathrooms || "—"}</div>
              <div className="text-xs text-muted-foreground">Baths</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Ruler className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{listing.squareFootage ? listing.squareFootage.toLocaleString() : "—"}</div>
              <div className="text-xs text-muted-foreground">Sqft</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <Building2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <div className="font-semibold">{listing.yearBuilt || "—"}</div>
              <div className="text-xs text-muted-foreground">Built</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm border rounded-lg p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Days on Market</span>
              <span className="font-medium">{listing.daysOnMarket}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Listed</span>
              <span className="font-medium">{formatDate(listing.listedDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{listing.propertyType || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Listing Type</span>
              <span className="font-medium">{listing.listingType || "—"}</span>
            </div>
            {pricePerSqft && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price/Sqft</span>
                <span className="font-medium">${pricePerSqft}</span>
              </div>
            )}
            {listing.lotSize && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lot Size</span>
                <span className="font-medium">{listing.lotSize.toLocaleString()} sqft</span>
              </div>
            )}
            {listing.hoa?.fee && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">HOA</span>
                <span className="font-medium">${listing.hoa.fee}/mo</span>
              </div>
            )}
            {listing.mlsNumber && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">MLS#</span>
                <span className="font-medium">{listing.mlsNumber}</span>
              </div>
            )}
            {listing.mlsName && (
              <div className="flex justify-between col-span-2">
                <span className="text-muted-foreground">MLS</span>
                <span className="font-medium text-right truncate max-w-[200px]">{listing.mlsName}</span>
              </div>
            )}
          </div>

          {listing.features && listing.features.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Features</h4>
              <div className="flex flex-wrap gap-1.5">
                {listing.features.map((f, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">{f}</Badge>
                ))}
              </div>
            </div>
          )}

          {(listing.listingAgent || listing.listingOffice) && (
            <div className="border rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium">Listing Contact</h4>
              <div className="text-sm text-muted-foreground">
                {listing.listingAgent && (
                  <div><span className="font-medium text-foreground">{listing.listingAgent.name}</span> (Agent)</div>
                )}
                {listing.listingOffice && (
                  <div className="text-xs">{listing.listingOffice.name}</div>
                )}
                {(contactPhone || contactEmail) && (
                  <div className="text-xs mt-1">
                    {[contactPhone, contactEmail].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              {(contactPhone || contactEmail) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {contactPhone && (
                    <>
                      <Button variant="outline" size="sm" className="text-xs gap-1"
                        onClick={() => window.open(`tel:${contactPhone}`, "_self")}>
                        <Phone className="h-3 w-3" /> Call {contactLabel}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs gap-1"
                        onClick={() => onContactAgent?.(listing, "sms")}>
                        <MessageSquare className="h-3 w-3" /> Text
                      </Button>
                    </>
                  )}
                  {contactEmail && (
                    <Button variant="outline" size="sm" className="text-xs gap-1"
                      onClick={() => onContactAgent?.(listing, "email")}>
                      <Mail className="h-3 w-3" /> Email
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button className="flex-1 gap-2" onClick={() => window.open(zillowUrl, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4" /> View on Zillow
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ContactDialogState {
  open: boolean;
  mode: "sms" | "email";
  phone: string;
  email: string;
  address: string;
  agentName: string;
}

const emptyContactState: ContactDialogState = {
  open: false, mode: "sms", phone: "", email: "", address: "", agentName: "",
};

function ContactAgentDialog({
  state,
  onClose,
  snippets,
  commStatus,
}: {
  state: ContactDialogState;
  onClose: () => void;
  snippets: EmailSnippet[];
  commStatus: { twilio: boolean; gmail: { connected: boolean } } | undefined;
}) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [smsMessage, setSmsMessage] = useState("");
  const [showSnippets, setShowSnippets] = useState(false);
  const snippetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.open) setSmsMessage("");
  }, [state.open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (snippetRef.current && !snippetRef.current.contains(e.target as Node)) {
        setShowSnippets(false);
      }
    }
    if (showSnippets) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSnippets]);

  const sendSmsMutation = useMutation({
    mutationFn: async (data: { phone: string; content: string }) => {
      const res = await apiRequest("POST", "/api/communications/sms-direct", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "SMS sent successfully" });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send SMS", description: error.message, variant: "destructive" });
    },
  });

  const snippetsWithAddress = snippets.map((s) => ({
    ...s,
    body: s.body.replace(/<[^>]*>/g, "") + (state.address ? `\n\nRe: ${state.address}` : ""),
  }));

  const gmailConnected = commStatus?.gmail?.connected;
  const twilioAvailable = commStatus?.twilio;

  useEffect(() => {
    if (!state.open || state.mode !== "email") return;
    const subject = `Inquiry about ${state.address}`;
    if (gmailConnected) {
      const params = new URLSearchParams({
        composeTo: state.email,
        composeSubject: subject,
      });
      navigate(`/mail?${params.toString()}`);
    } else {
      window.open(`mailto:${state.email}?subject=${encodeURIComponent(subject)}`);
    }
    onClose();
  }, [state.open, state.mode]);

  if (state.mode === "email") return null;

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Text {state.agentName || "Listing Agent"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {state.address} · {state.phone}
        </p>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Message</Label>
            <div className="relative" ref={snippetRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setShowSnippets(!showSnippets)}
              >
                <FileText className="h-3.5 w-3.5" />
                Snippets
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showSnippets && (
                <div className="absolute right-0 top-full mt-1 z-50 bg-background border rounded-lg shadow-lg w-72 max-h-[280px] overflow-auto">
                  <div className="p-2 border-b">
                    <p className="text-xs font-medium text-muted-foreground">
                      Insert snippet (address auto-appended)
                    </p>
                  </div>
                  {snippetsWithAddress.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No snippets yet. Create them on the Mail page.
                    </div>
                  ) : (
                    snippetsWithAddress.map((s) => (
                      <button
                        key={s.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 transition-colors"
                        onClick={() => {
                          setSmsMessage(prev => prev ? prev + "\n" + s.body : s.body);
                          setShowSnippets(false);
                        }}
                      >
                        <p className="text-sm font-medium truncate">{s.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.body.slice(0, 80)}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <Textarea
            placeholder={`Hi${state.agentName ? ` ${state.agentName}` : ""}, I'm interested in ${state.address}...`}
            value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)}
            rows={4}
            maxLength={1600}
          />
          <p className="text-xs text-muted-foreground text-right">{smsMessage.length} / 1600</p>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                const body = encodeURIComponent(smsMessage);
                window.open(`sms:${state.phone}${smsMessage ? `?body=${body}` : ""}`, "_self");
                onClose();
              }}
            >
              <Smartphone className="h-4 w-4" />
              Send from my phone
              <span className="text-xs text-muted-foreground ml-auto">Opens your messaging app</span>
            </Button>

            {twilioAvailable && (
              <Button
                className="w-full justify-start gap-2"
                disabled={!smsMessage.trim() || sendSmsMutation.isPending}
                onClick={() => {
                  if (!smsMessage.trim()) return;
                  sendSmsMutation.mutate({ phone: state.phone, content: smsMessage.trim() });
                }}
              >
                {sendSmsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                Send via HomeBase
                <span className="text-xs text-muted-foreground ml-auto">Uses your platform number</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PropertySearchPage() {
  const [rcLocation, setRcLocation] = useState("");
  const [rcPropertyType, setRcPropertyType] = useState("any");
  const [rcMinPrice, setRcMinPrice] = useState("");
  const [rcMaxPrice, setRcMaxPrice] = useState("");
  const [rcBeds, setRcBeds] = useState("any");
  const [rcBaths, setRcBaths] = useState("any");
  const [rcMinSqft, setRcMinSqft] = useState("any");
  const [rcPool, setRcPool] = useState("any");
  const [rcStatus, setRcStatus] = useState("Active");

  const [searchParams, setSearchParams] = useState<Record<string, string> | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(new Set());
  const refreshFlagRef = useRef(false);
  const [contactDialog, setContactDialog] = useState<ContactDialogState>(emptyContactState);
  const [detailListing, setDetailListing] = useState<RentCastListing | null>(null);

  const { toast } = useToast();

  const { data: snippets = [] } = useQuery<EmailSnippet[]>({
    queryKey: ["/api/snippets"],
  });

  const { data: commStatus } = useQuery<{ twilio: boolean; gmail: { connected: boolean } }>({
    queryKey: ["/api/communications/status"],
  });

  function openContactDialog(listing: RentCastListing, mode: "sms" | "email") {
    const contactPhone = listing.listingAgent?.phone || listing.listingOffice?.phone || "";
    const contactEmail = listing.listingAgent?.email || listing.listingOffice?.email || "";
    setContactDialog({
      open: true,
      mode,
      phone: contactPhone,
      email: contactEmail,
      address: listing.formattedAddress,
      agentName: listing.listingAgent?.name || "",
    });
  }

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

  const showingToggleMutation = useMutation({
    mutationFn: async ({ id, showingRequested }: { id: number; showingRequested: boolean }) => {
      await apiRequest("PATCH", `/api/saved-properties/${id}/showing`, { showingRequested });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-properties"] });
      toast({
        title: variables.showingRequested ? "Showing Requested" : "Showing Removed",
        description: variables.showingRequested
          ? "This property has been submitted for a showing request. Your agent will see it on the map."
          : "Showing request removed for this property.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update showing request.", variant: "destructive" });
    },
  });

  const filteredListings = (rentcastResults?.listings || []).filter(listing => {
    const minP = parsePriceInput(rcMinPrice);
    const maxP = parsePriceInput(rcMaxPrice);
    if (minP && listing.price < parseInt(minP)) return false;
    if (maxP && listing.price > parseInt(maxP)) return false;
    if (rcBeds !== "any" && listing.bedrooms < parseInt(rcBeds)) return false;
    if (rcBaths !== "any" && listing.bathrooms < parseInt(rcBaths)) return false;
    if (rcMinSqft !== "any" && (listing.squareFootage || 0) < parseInt(rcMinSqft)) return false;
    if (rcPool === "yes" && !(listing.features || []).some((f: string) => /pool/i.test(f))) return false;
    if (rcPool === "no" && (listing.features || []).some((f: string) => /pool/i.test(f))) return false;
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

    const minP = parsePriceInput(rcMinPrice);
    const maxP = parsePriceInput(rcMaxPrice);
    if (minP) params.minPrice = minP;
    if (maxP) params.maxPrice = maxP;
    if (rcBeds !== "any") params.bedroomsMin = rcBeds;
    if (rcBaths !== "any") params.bathroomsMin = rcBaths;
    if (rcPropertyType !== "any") params.propertyType = rcPropertyType;
    params.status = rcStatus;
    params.limit = "500";

    setSearchParams(params);
    setSelectedListingIds(new Set());
  };

  const handleResetRentCast = () => {
    setRcLocation("");
    setRcPropertyType("any");
    setRcMinPrice("");
    setRcMaxPrice("");
    setRcBeds("any");
    setRcBaths("any");
    setRcMinSqft("any");
    setRcPool("any");
    setRcStatus("Active");
    setSearchParams(null);
  };

  const isRentCastSearchDisabled = !rcLocation.trim();
  const apiStatus = rentcastStatus as { apiCallsUsed: number; apiCallsLimit: number } | undefined;

  return (
    <div className="px-4 pt-6 pb-4 md:p-6 space-y-6 overflow-x-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Search className="h-6 w-6 shrink-0" />
            Property Search
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Search for active listings, then save the ones you like.
          </p>
        </div>
        {apiStatus && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
            <Database className="h-3.5 w-3.5" />
            <span>API: {apiStatus.apiCallsUsed}/{apiStatus.apiCallsLimit} calls used this month</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="text" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="text" className="gap-2">
            <Search className="h-4 w-4" /> Text Search
          </TabsTrigger>
          <TabsTrigger value="map" className="gap-2">
            <Map className="h-4 w-4" /> Map Search
          </TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Map className="h-5 w-5" />
                Draw Area Search
              </CardTitle>
              <CardDescription>
                Draw a rectangle or polygon on the map to search for active listings in that area.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              }>
                <MapDrawSearch />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Home className="h-5 w-5" />
                Search Active Listings
              </CardTitle>
              <CardDescription>
                Search for active, pending, or sold properties. Enter a city and state (e.g. "Fort Worth TX") or a ZIP code.
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Min Price
                  </Label>
                  <Input
                    placeholder="No Min"
                    value={formatPriceInput(rcMinPrice)}
                    onChange={(e) => setRcMinPrice(parsePriceInput(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4" />
                    Max Price
                  </Label>
                  <Input
                    placeholder="No Max"
                    value={formatPriceInput(rcMaxPrice)}
                    onChange={(e) => setRcMaxPrice(parsePriceInput(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    Status
                  </Label>
                  <Select value={rcStatus} onValueChange={setRcStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <Ruler className="h-4 w-4" />
                    Min Sqft
                  </Label>
                  <Select value={rcMinSqft} onValueChange={setRcMinSqft}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SQFT_MIN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium flex items-center gap-1.5">
                    <Droplets className="h-4 w-4" />
                    Pool
                  </Label>
                  <Select value={rcPool} onValueChange={setRcPool}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Either</SelectItem>
                      <SelectItem value="yes">Pool</SelectItem>
                      <SelectItem value="no">No Pool</SelectItem>
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
                        onContactAgent={openContactDialog}
                        onViewDetail={setDetailListing}
                      />
                    ))}
                  </div>
                ) : (
                  <ListingTable
                    listings={filteredListings}
                    selectedIds={selectedListingIds}
                    onToggleSelect={toggleSelectListing}
                    onToggleAll={toggleSelectAll}
                    onContactAgent={openContactDialog}
                    onViewDetail={setDetailListing}
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
      </Tabs>

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
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2.5 font-medium">Address</th>
                    <th className="text-right px-3 py-2.5 font-medium hidden sm:table-cell">Price</th>
                    <th className="text-center px-3 py-2.5 font-medium hidden sm:table-cell">Beds/Baths</th>
                    <th className="text-right px-3 py-2.5 font-medium hidden md:table-cell">Sqft</th>
                    <th className="text-center px-3 py-2.5 font-medium hidden md:table-cell">Source</th>
                    <th className="text-center px-3 py-2.5 font-medium">Status</th>
                    <th className="text-center px-3 py-2.5 font-medium w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedProperties.map((prop, i) => {
                    const notesParts = (prop.notes || "").split(" · ");
                    const priceMatch = notesParts.find(p => p.startsWith("$"));
                    const bedBathMatch = notesParts.find(p => /\d+bd\/\d+ba/.test(p));
                    const sqftMatch = notesParts.find(p => /sqft/i.test(p));
                    return (
                      <tr key={prop.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-medium truncate max-w-[220px]">{prop.streetAddress || formatAddress(prop)}</div>
                          <div className="text-xs text-muted-foreground">
                            {[prop.city, prop.state, prop.zipCode].filter(Boolean).join(", ") || "—"}
                          </div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                            {[priceMatch, bedBathMatch, sqftMatch].filter(Boolean).join(" · ")}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-primary whitespace-nowrap hidden sm:table-cell">
                          {priceMatch || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center hidden sm:table-cell">
                          {bedBathMatch || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-right hidden md:table-cell whitespace-nowrap">
                          {sqftMatch?.replace(" sqft", "") || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{getSourceLabel(prop.source)}</Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {prop.showingRequested ? (
                            <Badge className="text-xs bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={() => showingToggleMutation.mutate({ id: prop.id, showingRequested: false })}>
                              <Eye className="h-3 w-3 mr-1" />
                              Showing
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => showingToggleMutation.mutate({ id: prop.id, showingRequested: true })}
                              disabled={showingToggleMutation.isPending}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Request
                            </Button>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => window.open(prop.url, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(prop.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground pb-4">
        <p>Listing data provided by RentCast. Results are cached for 24 hours to conserve API usage.</p>
      </div>

      <ListingDetailDialog
        listing={detailListing}
        onClose={() => setDetailListing(null)}
        onContactAgent={openContactDialog}
      />

      <ContactAgentDialog
        state={contactDialog}
        onClose={() => setContactDialog(emptyContactState)}
        snippets={snippets}
        commStatus={commStatus}
      />
    </div>
  );
}
