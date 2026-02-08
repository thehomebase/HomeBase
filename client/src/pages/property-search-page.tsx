import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, Home, DollarSign, BedDouble, Bath, Building2 } from "lucide-react";

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

  let basePath = `https://www.zillow.com/homes/${slug}_rb/`;

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

export default function PropertySearchPage() {
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState("for_sale");
  const [propertyType, setPropertyType] = useState("any");
  const [minPrice, setMinPrice] = useState("any");
  const [maxPrice, setMaxPrice] = useState("any");
  const [beds, setBeds] = useState("any");
  const [baths, setBaths] = useState("any");

  const handleSearch = () => {
    const url = buildZillowUrl({
      location,
      listingType,
      propertyType,
      minPrice,
      maxPrice,
      beds,
      baths,
    });
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

  const isSearchDisabled = !location.trim();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6" />
          Property Search
        </h1>
        <p className="text-muted-foreground mt-1">
          Find your perfect property — search results open on Zillow.com
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