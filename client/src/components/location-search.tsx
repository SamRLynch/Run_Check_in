import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, X, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export interface LocationResult {
  displayName: string;
  lat: number;
  lon: number;
}

export interface SavedLocationItem {
  id: number;
  displayName: string;
  lat: number | null;
  lon: number | null;
}

const YORK_VIEWBOX = "-70.73,43.09,-70.53,43.27";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    amenity?: string;
    tourism?: string;
    leisure?: string;
    natural?: string;
    beach?: string;
    park?: string;
    campsite?: string;
    house_number?: string;
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    state?: string;
    postcode?: string;
  };
}

function formatPlace(item: NominatimResult): string {
  const a = item.address;
  const primaryName = item.display_name.split(", ")[0];
  const street = a.house_number ? `${a.house_number} ${a.road || ""}`.trim() : null;
  const locality = a.city || a.town || a.village;
  const parts: string[] = [primaryName];
  if (street && street !== primaryName) {
    parts.push(street);
  } else if (!street && a.road && a.road !== primaryName) {
    if (!primaryName.toLowerCase().includes(a.road.toLowerCase())) {
      parts.push(a.road);
    }
  }
  if (locality && locality !== primaryName) parts.push(locality);
  if (a.state) parts.push(a.state);
  return parts.join(", ");
}

// ─── Weather Address Geocoder ─────────────────────────────────────────────────

interface LocationSearchProps {
  value: string;
  lat: number | null;
  lon: number | null;
  onChange: (text: string) => void;
  onSelect: (result: LocationResult) => void;
  onClearCoords: () => void;
  placeholder?: string;
  testId?: string;
}

export function LocationSearch({
  value,
  lat,
  lon,
  onChange,
  onSelect,
  onClearCoords,
  placeholder = "Search for an address near York, ME…",
  testId,
}: LocationSearchProps) {
  const [suggestions, setSuggestions] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasCoords = lat !== null && lon !== null;

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(q)}&format=json&limit=8&addressdetails=1&extratags=1&namedetails=1` +
        `&viewbox=${YORK_VIEWBOX}&bounded=0&countrycodes=us`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "en", "Accept": "application/json" },
      });
      if (!res.ok) throw new Error("Nominatim error");
      const data: NominatimResult[] = await res.json();
      const results: LocationResult[] = data
        .map((item) => ({
          displayName: formatPlace(item),
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        }))
        .filter((r) => r.displayName);
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(text: string) {
    onChange(text);
    onClearCoords();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 500);
  }

  function handleSelect(result: LocationResult) {
    onSelect(result);
    setSuggestions([]);
    setOpen(false);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${
            hasCoords ? "text-primary" : "text-muted-foreground"
          }`}
        />
        <Input
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-8"
          data-testid={testId}
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
            ···
          </span>
        )}
        {!loading && hasCoords && (
          <button
            type="button"
            onClick={() => { onChange(""); onClearCoords(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            data-testid="button-clear-weather-address"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {hasCoords && (
        <p className="mt-1 text-[11px] text-primary flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Weather will show for this location
        </p>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-start gap-2 border-b border-border last:border-0"
              onClick={() => handleSelect(s)}
              data-testid={`suggestion-${i}`}
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span>{s.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Location Name Input (plain text + saved locations dropdown) ───────────────

interface LocationNameInputProps {
  value: string;
  onChange: (text: string) => void;
  onSelectSaved: (saved: SavedLocationItem) => void;
  placeholder?: string;
  testId?: string;
}

export function LocationNameInput({
  value,
  onChange,
  onSelectSaved,
  placeholder = "e.g. Short Sands Beach",
  testId,
}: LocationNameInputProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: savedLocations = [] } = useQuery<SavedLocationItem[]>({
    queryKey: ["/api/saved-locations"],
    staleTime: 60 * 1000,
  });

  const matches = savedLocations.filter((s) =>
    value.length === 0 || s.displayName.toLowerCase().includes(value.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        data-testid={testId}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {matches.map((s, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 border-b border-border last:border-0"
              onClick={() => { onSelectSaved(s); setOpen(false); }}
              data-testid={`saved-location-${i}`}
            >
              <Star className="w-3.5 h-3.5 shrink-0 text-primary fill-primary" />
              <span className="flex-1 truncate">{s.displayName}</span>
              {s.lat != null && s.lon != null && (
                <span className="text-[10px] text-muted-foreground shrink-0">weather ✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
