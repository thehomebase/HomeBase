import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";

interface AddressSuggestion {
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    county?: string;
  };
  lat: string;
  lon: string;
}

interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

const US_STATE_ABBREVS: Record<string, string> = {
  "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
  "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
  "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
  "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
  "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
  "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
  "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
  "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
  "District of Columbia": "DC"
};

function abbreviateState(state: string): string {
  if (state.length === 2) return state.toUpperCase();
  return US_STATE_ABBREVS[state] || state;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Start typing an address...",
  id,
  className,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 4) {
      setSuggestions([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=us&addressdetails=1`,
        { headers: { "User-Agent": "HomeBase-RealEstate-App/1.0", "Accept": "application/json" }, signal: controller.signal }
      );
      const data: AddressSuggestion[] = await response.json();
      const filtered = data.filter(s => s.address?.road);
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setHighlightedIndex(-1);
    } catch (e: any) {
      if (e?.name !== "AbortError") setSuggestions([]);
    }
  }, []);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), 400);
  };

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    const addr = suggestion.address;
    const houseNum = addr.house_number || "";
    const road = addr.road || "";
    const street = [houseNum, road].filter(Boolean).join(" ");
    const city = addr.city || addr.town || addr.village || "";
    const state = abbreviateState(addr.state || "");
    const zipCode = addr.postcode || "";

    onChange(street);
    setShowSuggestions(false);
    setSuggestions([]);

    onAddressSelect({
      street,
      city,
      state,
      zipCode,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const formatSuggestion = (s: AddressSuggestion) => {
    const addr = s.address;
    const street = [addr.house_number, addr.road].filter(Boolean).join(" ");
    const city = addr.city || addr.town || addr.village || "";
    const state = abbreviateState(addr.state || "");
    const zip = addr.postcode || "";
    return { street, secondary: [city, state, zip].filter(Boolean).join(", ") };
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          className={className}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder={placeholder}
          autoComplete="off"
        />
        {suggestions.length > 0 && showSuggestions && (
          <MapPin className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-pulse" />
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-[200px] overflow-y-auto">
          {suggestions.map((s, i) => {
            const { street, secondary } = formatSuggestion(s);
            return (
              <button
                key={i}
                type="button"
                className={`w-full px-3 py-2 text-left text-sm flex items-start gap-2 hover:bg-accent transition-colors ${
                  i === highlightedIndex ? "bg-accent" : ""
                }`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => selectSuggestion(s)}
              >
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{street}</div>
                  <div className="text-xs text-muted-foreground truncate">{secondary}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
