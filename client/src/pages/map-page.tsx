import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MapPin, School, Shield, Footprints, Building, Loader2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

interface NearbyPlace {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance?: number;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

const schoolIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const shopIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbySchools, setNearbySchools] = useState<NearbyPlace[]>([]);
  const [nearbyAmenities, setNearbyAmenities] = useState<NearbyPlace[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<string>("all");

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&countrycodes=us`,
        {
          headers: {
            "Accept": "application/json",
          }
        }
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectLocation = async (result: SearchResult) => {
    setSelectedLocation(result);
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setMapCenter([lat, lon]);
    setSearchResults([]);
    
    await fetchNearbyPlaces(lat, lon);
  };

  const fetchNearbyPlaces = async (lat: number, lon: number) => {
    setIsLoadingNearby(true);
    try {
      const radius = 1000;
      const overpassQuery = `
        [out:json][timeout:25];
        (
          node["amenity"="school"](around:${radius},${lat},${lon});
          node["amenity"="hospital"](around:${radius},${lat},${lon});
          node["amenity"="police"](around:${radius},${lat},${lon});
          node["shop"="supermarket"](around:${radius},${lat},${lon});
          node["amenity"="restaurant"](around:${radius},${lat},${lon});
          node["amenity"="pharmacy"](around:${radius},${lat},${lon});
        );
        out body;
      `;
      
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      
      const data = await response.json();
      
      const schools: NearbyPlace[] = [];
      const amenities: NearbyPlace[] = [];
      
      data.elements?.forEach((element: any) => {
        const place: NearbyPlace = {
          id: element.id,
          name: element.tags?.name || element.tags?.amenity || element.tags?.shop || "Unknown",
          type: element.tags?.amenity || element.tags?.shop || "other",
          lat: element.lat,
          lon: element.lon,
          distance: calculateDistance(lat, lon, element.lat, element.lon)
        };
        
        if (element.tags?.amenity === "school") {
          schools.push(place);
        } else {
          amenities.push(place);
        }
      });
      
      setNearbySchools(schools.sort((a, b) => (a.distance || 0) - (b.distance || 0)));
      setNearbyAmenities(amenities.sort((a, b) => (a.distance || 0) - (b.distance || 0)));
    } catch (error) {
      console.error("Failed to fetch nearby places:", error);
    } finally {
      setIsLoadingNearby(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = (km: number): string => {
    const miles = km * 0.621371;
    if (miles < 0.1) {
      return `${Math.round(miles * 5280)} ft`;
    }
    return `${miles.toFixed(1)} mi`;
  };

  const getWalkabilityScore = (): { score: number; label: string; color: string } => {
    const totalNearby = nearbySchools.length + nearbyAmenities.length;
    if (totalNearby >= 15) return { score: 90, label: "Walker's Paradise", color: "bg-green-500" };
    if (totalNearby >= 10) return { score: 70, label: "Very Walkable", color: "bg-green-400" };
    if (totalNearby >= 5) return { score: 50, label: "Somewhat Walkable", color: "bg-yellow-500" };
    if (totalNearby >= 2) return { score: 30, label: "Car-Dependent", color: "bg-orange-500" };
    return { score: 10, label: "Almost All Errands Require a Car", color: "bg-red-500" };
  };

  const getPlaceIcon = (type: string) => {
    if (type === "school") return schoolIcon;
    if (type === "hospital" || type === "pharmacy") return hospitalIcon;
    return shopIcon;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-background">
        <h1 className="text-2xl font-bold mb-4">Neighborhood Explorer</h1>
        
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAddress()}
              className="pl-10"
              data-testid="input-address-search"
            />
          </div>
          <Button onClick={searchAddress} disabled={isSearching} data-testid="button-search">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <Card className="absolute z-[1000] w-[calc(100%-2rem)] max-w-2xl bg-background shadow-lg">
            <CardContent className="p-2">
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => selectLocation(result)}
                  className="w-full text-left p-3 hover:bg-muted rounded-md flex items-start gap-3"
                  data-testid={`search-result-${result.place_id}`}
                >
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{result.display_name.split(",")[0]}</p>
                    <p className="text-sm text-muted-foreground">{result.display_name}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {selectedLocation && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {selectedLocation.display_name.split(",").slice(0, 2).join(", ")}
            </Badge>
            {!isLoadingNearby && (
              <>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <School className="h-3 w-3" />
                  {nearbySchools.length} schools nearby
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  {nearbyAmenities.length} amenities
                </Badge>
                <Badge className={`${getWalkabilityScore().color} text-white flex items-center gap-1`}>
                  <Footprints className="h-3 w-3" />
                  {getWalkabilityScore().score} - {getWalkabilityScore().label}
                </Badge>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={4}
            className="h-full w-full"
            style={{ minHeight: "400px" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} />
            
            {selectedLocation && (
              <>
                <Marker position={[parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lon)]}>
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold">{selectedLocation.display_name.split(",")[0]}</h3>
                      <p className="text-sm text-gray-600">{selectedLocation.display_name}</p>
                    </div>
                  </Popup>
                </Marker>
                
                <Circle
                  center={[parseFloat(selectedLocation.lat), parseFloat(selectedLocation.lon)]}
                  radius={1000}
                  pathOptions={{ color: "blue", fillColor: "blue", fillOpacity: 0.1 }}
                />
              </>
            )}

            {(activeOverlay === "all" || activeOverlay === "schools") && nearbySchools.map((school) => (
              <Marker key={school.id} position={[school.lat, school.lon]} icon={schoolIcon}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{school.name}</h3>
                    <p className="text-sm text-gray-600">School</p>
                    {school.distance && <p className="text-sm">{formatDistance(school.distance)}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {(activeOverlay === "all" || activeOverlay === "amenities") && nearbyAmenities.map((amenity) => (
              <Marker key={amenity.id} position={[amenity.lat, amenity.lon]} icon={getPlaceIcon(amenity.type)}>
                <Popup>
                  <div className="p-2">
                    <h3 className="font-bold">{amenity.name}</h3>
                    <p className="text-sm text-gray-600 capitalize">{amenity.type}</p>
                    {amenity.distance && <p className="text-sm">{formatDistance(amenity.distance)}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="absolute top-4 right-4 z-[1000]">
            <Card className="w-48">
              <CardHeader className="p-3">
                <CardTitle className="text-sm">Map Layers</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <Button
                  variant={activeOverlay === "all" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveOverlay("all")}
                  data-testid="button-layer-all"
                >
                  Show All
                </Button>
                <Button
                  variant={activeOverlay === "schools" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveOverlay("schools")}
                  data-testid="button-layer-schools"
                >
                  <School className="h-4 w-4 mr-2" /> Schools Only
                </Button>
                <Button
                  variant={activeOverlay === "amenities" ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setActiveOverlay("amenities")}
                  data-testid="button-layer-amenities"
                >
                  <Building className="h-4 w-4 mr-2" /> Amenities Only
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {selectedLocation && (
          <div className="w-80 border-l overflow-y-auto bg-background">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schools">Schools</TabsTrigger>
                <TabsTrigger value="amenities">Nearby</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="p-4 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Footprints className="h-5 w-5" />
                      Walkability Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingNearby ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Analyzing neighborhood...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`text-3xl font-bold ${getWalkabilityScore().score >= 50 ? "text-green-600" : "text-orange-600"}`}>
                            {getWalkabilityScore().score}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getWalkabilityScore().label}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getWalkabilityScore().color}`}
                            style={{ width: `${getWalkabilityScore().score}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Based on {nearbySchools.length + nearbyAmenities.length} nearby places within 1km
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Safety Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {nearbyAmenities.filter(a => a.type === "police").length > 0 
                        ? `${nearbyAmenities.filter(a => a.type === "police").length} police station(s) nearby`
                        : "No police stations within 1km"
                      }
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {nearbyAmenities.filter(a => a.type === "hospital").length > 0
                        ? `${nearbyAmenities.filter(a => a.type === "hospital").length} hospital(s) nearby`
                        : "No hospitals within 1km"
                      }
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schools" className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Schools Nearby
                </h3>
                {isLoadingNearby ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : nearbySchools.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No schools found within 1km</p>
                ) : (
                  <div className="space-y-2">
                    {nearbySchools.map((school) => (
                      <Card key={school.id} className="p-3">
                        <h4 className="font-medium">{school.name}</h4>
                        {school.distance && (
                          <p className="text-sm text-muted-foreground">
                            {formatDistance(school.distance)}
                          </p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="amenities" className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Nearby Places
                </h3>
                {isLoadingNearby ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : nearbyAmenities.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No amenities found within 1km</p>
                ) : (
                  <div className="space-y-2">
                    {nearbyAmenities.slice(0, 20).map((amenity) => (
                      <Card key={amenity.id} className="p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{amenity.name}</h4>
                            <p className="text-xs text-muted-foreground capitalize">{amenity.type}</p>
                          </div>
                          {amenity.distance && (
                            <Badge variant="outline" className="text-xs">
                              {formatDistance(amenity.distance)}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
