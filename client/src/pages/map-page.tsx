import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, School, Building, Loader2, Home, Star, ThumbsUp, ThumbsDown, Plus, RefreshCw, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transaction, PropertyViewing, Client } from "@shared/schema";

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
}

interface NearbyPlace {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  distance?: number;
}

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || 15);
  }, [center, zoom, map]);
  return null;
}

const transactionIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const viewingIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const schoolIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

export default function MapPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAgent = user?.role === "agent";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.8283, -98.5795]);
  const [mapZoom, setMapZoom] = useState(4);
  const [isSearching, setIsSearching] = useState(false);
  const [nearbySchools, setNearbySchools] = useState<NearbyPlace[]>([]);
  const [nearbyAmenities, setNearbyAmenities] = useState<NearbyPlace[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [showAddViewing, setShowAddViewing] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<PropertyViewing | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [newViewing, setNewViewing] = useState({
    clientId: 0,
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: ""
  });
  
  const [newFeedback, setNewFeedback] = useState({
    rating: 3,
    liked: "",
    disliked: "",
    overallImpression: "",
    wouldPurchase: false
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: isAgent
  });

  const { data: viewings = [], isLoading: loadingViewings } = useQuery<PropertyViewing[]>({
    queryKey: ["/api/viewings"]
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: isAgent
  });

  const geocodeTransactionMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const res = await apiRequest("POST", `/api/transactions/${transactionId}/geocode`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Location updated", description: "Transaction location has been geocoded" });
    },
    onError: () => {
      toast({ title: "Failed to geocode", description: "Could not find coordinates for this address", variant: "destructive" });
    }
  });

  const createViewingMutation = useMutation({
    mutationFn: async (data: typeof newViewing) => {
      const geocodeRes = await apiRequest("POST", "/api/geocode", { address: `${data.address}, ${data.city}, ${data.state} ${data.zipCode}` });
      const geo = await geocodeRes.json();
      
      const res = await apiRequest("POST", "/api/viewings", {
        ...data,
        latitude: geo.lat,
        longitude: geo.lon
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewings"] });
      setShowAddViewing(false);
      setNewViewing({ clientId: 0, address: "", city: "", state: "", zipCode: "", notes: "" });
      toast({ title: "Viewing added", description: "Property viewing has been scheduled" });
    },
    onError: () => {
      toast({ title: "Failed to add viewing", description: "Could not create the property viewing", variant: "destructive" });
    }
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async ({ viewingId, data }: { viewingId: number; data: typeof newFeedback }) => {
      const res = await apiRequest("POST", `/api/viewings/${viewingId}/feedback`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewings"] });
      setShowFeedbackDialog(false);
      setSelectedViewing(null);
      setNewFeedback({ rating: 3, liked: "", disliked: "", overallImpression: "", wouldPurchase: false });
      toast({ title: "Feedback submitted", description: "Your property feedback has been saved" });
    },
    onError: () => {
      toast({ title: "Failed to submit feedback", description: "Could not save your feedback", variant: "destructive" });
    }
  });

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&countrycodes=us`,
        { headers: { "Accept": "application/json" } }
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
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setSelectedLocation({ lat, lon, name: result.display_name });
    setMapCenter([lat, lon]);
    setMapZoom(15);
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
          node["shop"="supermarket"](around:${radius},${lat},${lon});
          node["amenity"="restaurant"](around:${radius},${lat},${lon});
        );
        out body;
      `;
      
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(overpassQuery)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      
      const data = await response.json();
      const schools: NearbyPlace[] = [];
      const amenities: NearbyPlace[] = [];
      
      data.elements?.forEach((element: any) => {
        const place: NearbyPlace = {
          id: element.id,
          name: element.tags?.name || element.tags?.amenity || "Unknown",
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
    return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
  };

  const transactionsWithCoords = transactions.filter(t => t.latitude && t.longitude);
  const viewingsWithCoords = viewings.filter(v => v.latitude && v.longitude);

  useEffect(() => {
    if (transactionsWithCoords.length > 0 && !selectedLocation) {
      const first = transactionsWithCoords[0];
      if (first.latitude && first.longitude) {
        setMapCenter([first.latitude, first.longitude]);
        setMapZoom(10);
      }
    } else if (viewingsWithCoords.length > 0 && !selectedLocation) {
      const first = viewingsWithCoords[0];
      if (first.latitude && first.longitude) {
        setMapCenter([first.latitude, first.longitude]);
        setMapZoom(10);
      }
    }
  }, [transactionsWithCoords.length, viewingsWithCoords.length]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAddress()}
              className="pl-10 w-80 bg-background shadow-lg"
              data-testid="input-address-search"
            />
          </div>
          <Button onClick={searchAddress} disabled={isSearching} className="shadow-lg" data-testid="button-search">
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {searchResults.length > 0 && (
          <Card className="w-96 bg-background shadow-lg">
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
                    <p className="text-sm text-muted-foreground truncate max-w-[280px]">{result.display_name}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          {isAgent && (
            <>
              <Badge variant="outline" className="flex items-center gap-1 bg-background shadow">
                <Home className="h-3 w-3 text-green-600" />
                {transactionsWithCoords.length} transactions
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 bg-background shadow">
                <MapPin className="h-3 w-3 text-blue-600" />
                {viewingsWithCoords.length} viewings
              </Badge>
            </>
          )}
          {!isAgent && (
            <Badge variant="outline" className="flex items-center gap-1 bg-background shadow">
              <MapPin className="h-3 w-3 text-blue-600" />
              {viewingsWithCoords.length} properties
            </Badge>
          )}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        {isAgent && (
          <Dialog open={showAddViewing} onOpenChange={setShowAddViewing}>
            <DialogTrigger asChild>
              <Button className="shadow-lg" data-testid="button-add-viewing">
                <Plus className="h-4 w-4 mr-2" /> Add Viewing
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Property Viewing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select value={String(newViewing.clientId)} onValueChange={(v) => setNewViewing({ ...newViewing, clientId: Number(v) })}>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Street Address</Label>
                  <Input value={newViewing.address} onChange={e => setNewViewing({ ...newViewing, address: e.target.value })} placeholder="123 Main St" data-testid="input-address" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>City</Label>
                    <Input value={newViewing.city} onChange={e => setNewViewing({ ...newViewing, city: e.target.value })} placeholder="City" data-testid="input-city" />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input value={newViewing.state} onChange={e => setNewViewing({ ...newViewing, state: e.target.value })} placeholder="TX" data-testid="input-state" />
                  </div>
                  <div>
                    <Label>Zip</Label>
                    <Input value={newViewing.zipCode} onChange={e => setNewViewing({ ...newViewing, zipCode: e.target.value })} placeholder="12345" data-testid="input-zip" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={newViewing.notes} onChange={e => setNewViewing({ ...newViewing, notes: e.target.value })} placeholder="Any notes about this property..." data-testid="input-notes" />
                </div>
                <Button onClick={() => createViewingMutation.mutate(newViewing)} disabled={createViewingMutation.isPending || !newViewing.clientId || !newViewing.address} className="w-full" data-testid="button-submit-viewing">
                  {createViewingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Schedule Viewing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Button variant="outline" className="shadow-lg bg-background" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="button-toggle-sidebar">
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>

      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={mapCenter} zoom={mapZoom} />
        
        {selectedLocation && (
          <Circle
            center={[selectedLocation.lat, selectedLocation.lon]}
            radius={1000}
            pathOptions={{ color: "blue", fillColor: "blue", fillOpacity: 0.1 }}
          />
        )}

        {isAgent && transactionsWithCoords.map((tx) => (
          <Marker key={`tx-${tx.id}`} position={[tx.latitude!, tx.longitude!]} icon={transactionIcon}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-green-700">{tx.streetName}</h3>
                <p className="text-sm text-gray-600">{tx.city}, {tx.state} {tx.zipCode}</p>
                <Badge className="mt-2" variant={tx.status === "active" ? "default" : "secondary"}>{tx.status}</Badge>
                <p className="text-sm mt-2">{tx.type === "buy" ? "Purchase" : "Sale"}</p>
                {tx.contractPrice && <p className="text-sm font-medium">${tx.contractPrice.toLocaleString()}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {viewingsWithCoords.map((viewing) => (
          <Marker key={`v-${viewing.id}`} position={[viewing.latitude!, viewing.longitude!]} icon={viewingIcon}>
            <Popup>
              <div className="p-2 min-w-[200px]">
                <h3 className="font-bold text-blue-700">{viewing.address}</h3>
                <p className="text-sm text-gray-600">{viewing.city}, {viewing.state}</p>
                <Badge className="mt-2">{viewing.status}</Badge>
                {viewing.notes && <p className="text-sm mt-2 text-gray-500">{viewing.notes}</p>}
                {!isAgent && (
                  <Button size="sm" className="mt-2 w-full" onClick={() => { setSelectedViewing(viewing); setShowFeedbackDialog(true); }} data-testid={`button-feedback-${viewing.id}`}>
                    <Star className="h-3 w-3 mr-1" /> Leave Feedback
                  </Button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {nearbySchools.map((school) => (
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
      </MapContainer>

      <div className={`absolute top-0 right-0 h-full w-80 bg-background border-l shadow-xl z-[1001] transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Properties</h2>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} data-testid="button-close-sidebar">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)]">
          <Tabs defaultValue={isAgent ? "transactions" : "viewings"} className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b px-4">
              {isAgent && <TabsTrigger value="transactions">Transactions</TabsTrigger>}
              <TabsTrigger value="viewings">Viewings</TabsTrigger>
              {selectedLocation && <TabsTrigger value="nearby">Nearby</TabsTrigger>}
            </TabsList>

            {isAgent && (
              <TabsContent value="transactions" className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Home className="h-4 w-4 text-green-600" />
                  Your Transactions
                </h3>
                {loadingTransactions ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <Card key={tx.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => {
                        if (tx.latitude && tx.longitude) {
                          setMapCenter([tx.latitude, tx.longitude]);
                          setMapZoom(15);
                        }
                      }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-sm">{tx.streetName}</h4>
                            <p className="text-xs text-muted-foreground">{tx.city}, {tx.state}</p>
                          </div>
                          {tx.latitude && tx.longitude ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">On Map</Badge>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); geocodeTransactionMutation.mutate(tx.id); }} disabled={geocodeTransactionMutation.isPending} data-testid={`button-geocode-${tx.id}`}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="viewings" className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600" />
                {isAgent ? "Scheduled Viewings" : "Properties to View"}
              </h3>
              {loadingViewings ? (
                <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : viewings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No viewings scheduled</p>
              ) : (
                <div className="space-y-2">
                  {viewings.map((viewing) => (
                    <Card key={viewing.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => {
                      if (viewing.latitude && viewing.longitude) {
                        setMapCenter([viewing.latitude, viewing.longitude]);
                        setMapZoom(15);
                        setSelectedViewing(viewing);
                      }
                    }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-sm">{viewing.address}</h4>
                          <p className="text-xs text-muted-foreground">{viewing.city}, {viewing.state}</p>
                          <Badge variant="secondary" className="mt-1 text-xs">{viewing.status}</Badge>
                        </div>
                        {!isAgent && (
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedViewing(viewing); setShowFeedbackDialog(true); }} data-testid={`button-rate-${viewing.id}`}>
                            <Star className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {selectedLocation && (
              <TabsContent value="nearby" className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Nearby Places
                </h3>
                {isLoadingNearby ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : (
                  <>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <School className="h-3 w-3" /> Schools ({nearbySchools.length})
                      </h4>
                      {nearbySchools.slice(0, 5).map((school) => (
                        <div key={school.id} className="text-sm py-1 border-b last:border-0">
                          <span className="font-medium">{school.name}</span>
                          {school.distance && <span className="text-muted-foreground ml-2">{formatDistance(school.distance)}</span>}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Amenities ({nearbyAmenities.length})</h4>
                      {nearbyAmenities.slice(0, 10).map((amenity) => (
                        <div key={amenity.id} className="text-sm py-1 border-b last:border-0">
                          <span className="font-medium">{amenity.name}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">{amenity.type}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate This Property</DialogTitle>
            <CardDescription>
              {selectedViewing?.address}, {selectedViewing?.city}
            </CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Overall Rating</Label>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button key={star} variant={newFeedback.rating >= star ? "default" : "outline"} size="sm" onClick={() => setNewFeedback({ ...newFeedback, rating: star })} data-testid={`button-star-${star}`}>
                    <Star className={`h-4 w-4 ${newFeedback.rating >= star ? "fill-current" : ""}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-600" /> What did you love?</Label>
              <Textarea value={newFeedback.liked} onChange={e => setNewFeedback({ ...newFeedback, liked: e.target.value })} placeholder="Beautiful kitchen, great backyard, natural light..." data-testid="input-liked" />
            </div>
            <div>
              <Label className="flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-600" /> What didn't you like?</Label>
              <Textarea value={newFeedback.disliked} onChange={e => setNewFeedback({ ...newFeedback, disliked: e.target.value })} placeholder="Small bedrooms, needs updates, noisy street..." data-testid="input-disliked" />
            </div>
            <div>
              <Label>Overall Impression</Label>
              <Textarea value={newFeedback.overallImpression} onChange={e => setNewFeedback({ ...newFeedback, overallImpression: e.target.value })} placeholder="Your overall thoughts on this property..." data-testid="input-impression" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="wouldPurchase" checked={newFeedback.wouldPurchase} onChange={e => setNewFeedback({ ...newFeedback, wouldPurchase: e.target.checked })} className="rounded" data-testid="checkbox-would-purchase" />
              <Label htmlFor="wouldPurchase">I would consider purchasing this property</Label>
            </div>
            <Button onClick={() => selectedViewing && createFeedbackMutation.mutate({ viewingId: selectedViewing.id, data: newFeedback })} disabled={createFeedbackMutation.isPending} className="w-full" data-testid="button-submit-feedback">
              {createFeedbackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
