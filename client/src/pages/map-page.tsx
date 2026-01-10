import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, GeoJSON } from "react-leaflet";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, MapPin, School, Building, Loader2, Home, Star, ThumbsUp, ThumbsDown, Plus, RefreshCw, PanelRightClose, PanelRightOpen, X, Calendar, Clock, Bell, Check, XCircle, Route, Navigation, Square, CheckSquare, Edit2, Trash2, Ban, CheckCircle, MoreVertical } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Transaction, PropertyViewing, Client, ShowingRequest } from "@shared/schema";

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

const searchIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const clientIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface ClientWithCoords extends Client {
  latitude?: number;
  longitude?: number;
}

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
  
  const [includeShowingRequest, setIncludeShowingRequest] = useState(false);
  const [newShowingDate, setNewShowingDate] = useState("");
  const [newShowingTime, setNewShowingTime] = useState("");
  
  const [newFeedback, setNewFeedback] = useState({
    rating: 3,
    liked: "",
    disliked: "",
    overallImpression: "",
    wouldPurchase: false
  });

  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [requestViewing, setRequestViewing] = useState<PropertyViewing | null>(null);
  const [requestDate, setRequestDate] = useState("");
  const [requestTime, setRequestTime] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [showRequestsPanel, setShowRequestsPanel] = useState(false);

  // Route planning state
  const [routePlanningMode, setRoutePlanningMode] = useState(false);
  const [selectedForRoute, setSelectedForRoute] = useState<Set<number>>(new Set());
  const [routeData, setRouteData] = useState<{
    optimized: boolean;
    waypoints: Array<{ lat: number; lon: number; order: number; address?: string; id?: number }>;
    geometry: any;
    totalDistance: number;
    totalDuration: number;
  } | null>(null);

  // Viewing management state
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [rescheduleViewing, setRescheduleViewing] = useState<PropertyViewing | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");

  // Client filter state (agents only)
  const [selectedClientFilter, setSelectedClientFilter] = useState<number | "all">("all");

  // Map display filter (agents only)
  const [mapDisplayFilter, setMapDisplayFilter] = useState<"showings" | "clients" | "listings">("showings");

  // Client geocoding state
  const [clientsWithCoords, setClientsWithCoords] = useState<ClientWithCoords[]>([]);
  const [isGeocodingClients, setIsGeocodingClients] = useState(false);

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

  const { data: showingRequests = [] } = useQuery<ShowingRequest[]>({
    queryKey: ["/api/showing-requests"]
  });

  const pendingRequests = showingRequests.filter(r => 
    r.status === "pending" && 
    (r.recipientId === user?.id || (user?.clientRecordId && r.recipientId === user.clientRecordId))
  );

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
    mutationFn: async (data: typeof newViewing & { requestShowing?: boolean; showingDate?: string; showingTime?: string }) => {
      const geocodeRes = await apiRequest("POST", "/api/geocode", { address: `${data.address}, ${data.city}, ${data.state} ${data.zipCode}` });
      const geo = await geocodeRes.json();
      const res = await apiRequest("POST", "/api/viewings", { 
        clientId: data.clientId, 
        address: data.address, 
        city: data.city, 
        state: data.state, 
        zipCode: data.zipCode, 
        notes: data.notes, 
        latitude: geo.lat, 
        longitude: geo.lon 
      });
      const viewing = await res.json();
      
      if (data.requestShowing && data.showingDate && data.showingTime) {
        const requestedDate = new Date(`${data.showingDate}T${data.showingTime}`).toISOString();
        await apiRequest("POST", "/api/showing-requests", {
          viewingId: viewing.id,
          requestedDate,
          notes: data.notes || null
        });
      }
      
      return viewing;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/showing-requests"] });
      setShowAddViewing(false);
      setNewViewing({ clientId: 0, address: "", city: "", state: "", zipCode: "", notes: "" });
      setIncludeShowingRequest(false);
      setNewShowingDate("");
      setNewShowingTime("");
      if (variables.requestShowing) {
        toast({ title: "Property added", description: "Property and showing request have been created" });
      } else {
        toast({ title: "Property added", description: "Property has been added to the map" });
      }
    },
    onError: () => {
      toast({ title: "Failed to add property", description: "Could not create the property", variant: "destructive" });
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

  const createShowingRequestMutation = useMutation({
    mutationFn: async (data: { viewingId: number; recipientId: number; requestedDate: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/showing-requests", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/showing-requests"] });
      setShowRequestDialog(false);
      setRequestViewing(null);
      setRequestDate("");
      setRequestTime("");
      setRequestNotes("");
      toast({ title: "Request sent", description: "Your showing request has been submitted for approval" });
    },
    onError: () => {
      toast({ title: "Failed to send request", description: "Could not submit showing request", variant: "destructive" });
    }
  });

  const respondToRequestMutation = useMutation({
    mutationFn: async ({ id, status, responseNotes }: { id: number; status: string; responseNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/showing-requests/${id}`, { status, responseNotes });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/showing-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/viewings"] });
      toast({ 
        title: variables.status === "approved" ? "Request approved" : "Request declined",
        description: variables.status === "approved" ? "The showing has been confirmed" : "The showing request has been declined"
      });
    },
    onError: () => {
      toast({ title: "Failed to respond", description: "Could not update the request", variant: "destructive" });
    }
  });

  const planRouteMutation = useMutation({
    mutationFn: async (coordinates: Array<{ lat: number; lon: number; id: number; address: string }>) => {
      const res = await apiRequest("POST", "/api/route-plan", { coordinates });
      return res.json();
    },
    onSuccess: (data, variables) => {
      const waypointsWithInfo = data.waypoints.map((wp: any, idx: number) => {
        const original = variables.find((v: any) => 
          Math.abs(v.lat - wp.lat) < 0.0001 && Math.abs(v.lon - wp.lon) < 0.0001
        );
        return {
          ...wp,
          address: original?.address || `Stop ${idx + 1}`,
          id: original?.id
        };
      });
      setRouteData({ ...data, waypoints: waypointsWithInfo });
      toast({ 
        title: data.optimized ? "Route optimized" : "Route planned",
        description: `${waypointsWithInfo.length} stops, ${formatRouteDuration(data.totalDuration)}, ${formatRouteDistance(data.totalDistance)}`
      });
    },
    onError: () => {
      toast({ title: "Route planning failed", description: "Could not calculate route. Try fewer stops or check connectivity.", variant: "destructive" });
    }
  });

  const updateViewingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status?: string; scheduledDate?: string } }) => {
      const res = await apiRequest("PATCH", `/api/viewings/${id}`, data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewings"] });
      if (variables.data.status === "approved") {
        toast({ title: "Property approved", description: "The property has been approved for showing" });
      } else if (variables.data.status === "cancelled") {
        toast({ title: "Property cancelled", description: "The property showing has been cancelled" });
      } else if (variables.data.scheduledDate) {
        toast({ title: "Property rescheduled", description: "The showing time has been updated" });
        setShowRescheduleDialog(false);
        setRescheduleViewing(null);
        setRescheduleDate("");
        setRescheduleTime("");
      }
    },
    onError: () => {
      toast({ title: "Update failed", description: "Could not update the property", variant: "destructive" });
    }
  });

  const deleteViewingMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/viewings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/viewings"] });
      toast({ title: "Property deleted", description: "The property has been removed" });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not delete the property", variant: "destructive" });
    }
  });

  const formatRouteDistance = (meters: number) => {
    const miles = meters / 1609.34;
    return miles < 1 ? `${Math.round(meters)} m` : `${miles.toFixed(1)} mi`;
  };

  const formatRouteDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
  };

  const toggleRouteSelection = (viewingId: number) => {
    const newSet = new Set(selectedForRoute);
    if (newSet.has(viewingId)) {
      newSet.delete(viewingId);
    } else {
      if (newSet.size < 10) {
        newSet.add(viewingId);
      } else {
        toast({ title: "Limit reached", description: "Maximum 10 stops allowed", variant: "destructive" });
      }
    }
    setSelectedForRoute(newSet);
  };

  const planRoute = () => {
    const selectedViewings = viewingsWithCoords.filter(v => selectedForRoute.has(v.id));
    if (selectedViewings.length < 2) {
      toast({ title: "Not enough stops", description: "Select at least 2 properties to plan a route", variant: "destructive" });
      return;
    }
    const coords = selectedViewings.map(v => ({
      lat: v.latitude!,
      lon: v.longitude!,
      id: v.id,
      address: v.address
    }));
    planRouteMutation.mutate(coords);
  };

  const clearRoute = () => {
    setRouteData(null);
    setSelectedForRoute(new Set());
    setRoutePlanningMode(false);
  };

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
      const overpassQuery = `[out:json][timeout:25];(node["amenity"="school"](around:${radius},${lat},${lon});node["shop"="supermarket"](around:${radius},${lat},${lon});node["amenity"="restaurant"](around:${radius},${lat},${lon}););out body;`;
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
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = (km: number): string => {
    const miles = km * 0.621371;
    return miles < 0.1 ? `${Math.round(miles * 5280)} ft` : `${miles.toFixed(1)} mi`;
  };

  const transactionsWithCoords = transactions.filter(t => t.latitude && t.longitude);
  const filteredViewings = isAgent && selectedClientFilter !== "all" 
    ? viewings.filter(v => v.clientId === selectedClientFilter)
    : viewings;
  const viewingsWithCoords = filteredViewings.filter(v => v.latitude && v.longitude);

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

  // Geocode clients when switching to clients filter - with caching
  useEffect(() => {
    if (mapDisplayFilter !== "clients" || !isAgent || clients.length === 0) return;
    
    const CACHE_KEY = 'client_geocode_cache';
    
    const getCache = (): Record<string, { lat: number; lon: number }> => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : {};
      } catch {
        return {};
      }
    };
    
    const saveCache = (cache: Record<string, { lat: number; lon: number }>) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch {
        // Ignore cache save errors
      }
    };
    
    const geocodeClients = async () => {
      setIsGeocodingClients(true);
      const geocodedClients: ClientWithCoords[] = [];
      const cache = getCache();
      const clientsToGeocode: { client: typeof clients[0]; address: string }[] = [];
      
      // First pass: use cached coordinates where available
      for (const client of clients) {
        const addressParts = [];
        if (client.street) addressParts.push(client.street);
        if (client.city) addressParts.push(client.city);
        if (client.zipCode) addressParts.push(client.zipCode);
        
        if (addressParts.length === 0) {
          geocodedClients.push(client);
          continue;
        }
        
        const fullAddress = addressParts.join(", ");
        const cacheKey = fullAddress.toLowerCase().trim();
        
        if (cache[cacheKey]) {
          geocodedClients.push({
            ...client,
            latitude: cache[cacheKey].lat,
            longitude: cache[cacheKey].lon
          });
        } else {
          clientsToGeocode.push({ client, address: fullAddress });
        }
      }
      
      // Second pass: geocode uncached clients
      for (const { client, address } of clientsToGeocode) {
        const cacheKey = address.toLowerCase().trim();
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=us`,
            { headers: { "Accept": "application/json" } }
          );
          const data = await response.json();
          
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            cache[cacheKey] = { lat, lon };
            geocodedClients.push({
              ...client,
              latitude: lat,
              longitude: lon
            });
          } else {
            geocodedClients.push(client);
          }
          
          // Rate limit to respect Nominatim usage policy
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error("Failed to geocode client:", client.id, error);
          geocodedClients.push(client);
        }
      }
      
      // Save updated cache
      saveCache(cache);
      
      setClientsWithCoords(geocodedClients);
      setIsGeocodingClients(false);
      
      // Center map on first client with coordinates
      const firstWithCoords = geocodedClients.find(c => c.latitude && c.longitude);
      if (firstWithCoords && firstWithCoords.latitude && firstWithCoords.longitude) {
        setMapCenter([firstWithCoords.latitude, firstWithCoords.longitude]);
        setMapZoom(10);
      }
    };
    
    geocodeClients();
  }, [mapDisplayFilter, clients, isAgent]);

  const clientsWithValidCoords = clientsWithCoords.filter(c => c.latitude && c.longitude);

  return (
    <div style={{ position: "fixed", top: 0, left: "60px", right: 0, bottom: 0 }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={mapCenter} zoom={mapZoom} />
        
        {selectedLocation && (
          <>
            <Circle center={[selectedLocation.lat, selectedLocation.lon]} radius={1000} pathOptions={{ color: "blue", fillColor: "blue", fillOpacity: 0.1 }} />
            <Marker position={[selectedLocation.lat, selectedLocation.lon]} icon={searchIcon}>
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <h3 className="font-bold text-red-700 text-sm">{selectedLocation.name.split(',')[0]}</h3>
                  <p className="text-xs text-gray-600 mb-3">{selectedLocation.name.split(',').slice(1, 3).join(',')}</p>
                  {isAgent && (
                    <Button 
                      size="sm" 
                      className="w-full" 
                      onClick={() => {
                        const parts = selectedLocation.name.split(',').map(p => p.trim());
                        setNewViewing({
                          clientId: 0,
                          address: parts[0] || '',
                          city: parts[1] || '',
                          state: parts[2]?.split(' ')[0] || '',
                          zipCode: parts[2]?.split(' ')[1] || '',
                          notes: ''
                        });
                        setShowAddViewing(true);
                      }}
                      data-testid="button-add-from-search"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add as Property
                    </Button>
                  )}
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {isAgent && mapDisplayFilter === "listings" && transactionsWithCoords.map((tx) => (
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

        {(mapDisplayFilter === "showings" || mapDisplayFilter === "clients" || !isAgent) && viewingsWithCoords.map((viewing) => (
          <Marker key={`v-${viewing.id}`} position={[viewing.latitude!, viewing.longitude!]} icon={viewingIcon}>
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold text-blue-700">{viewing.address}</h3>
                <p className="text-sm text-gray-600">{viewing.city}, {viewing.state}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={viewing.status === "approved" ? "default" : viewing.status === "cancelled" ? "destructive" : "secondary"}>
                    {viewing.status}
                  </Badge>
                  {viewing.scheduledDate && (
                    <span className="text-xs text-gray-500">
                      {new Date(viewing.scheduledDate).toLocaleDateString()} {new Date(viewing.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                {viewing.notes && <p className="text-sm mt-2 text-gray-500">{viewing.notes}</p>}
                {!isAgent && (
                  <div className="flex flex-col gap-1 mt-3">
                    <Button size="sm" className="w-full" onClick={() => { setRequestViewing(viewing); setShowRequestDialog(true); }} data-testid={`button-request-showing-${viewing.id}`}>
                      <Calendar className="h-3 w-3 mr-1" /> Request Showing
                    </Button>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => { setSelectedViewing(viewing); setShowFeedbackDialog(true); }} data-testid={`button-feedback-${viewing.id}`}>
                      <Star className="h-3 w-3 mr-1" /> Leave Feedback
                    </Button>
                  </div>
                )}
                {isAgent && (
                  <div className="flex items-center gap-2 mt-3">
                    {viewing.status !== "approved" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => updateViewingMutation.mutate({ id: viewing.id, data: { status: "approved" } })}
                        data-testid={`button-popup-approve-${viewing.id}`}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="flex-1" data-testid={`button-popup-actions-${viewing.id}`}>
                          <MoreVertical className="h-3 w-3 mr-1" /> Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => {
                            setRescheduleViewing(viewing);
                            if (viewing.scheduledDate) {
                              const date = new Date(viewing.scheduledDate);
                              setRescheduleDate(date.toISOString().split('T')[0]);
                              setRescheduleTime(date.toTimeString().slice(0, 5));
                            }
                            setShowRescheduleDialog(true);
                          }}
                          data-testid={`menu-popup-reschedule-${viewing.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-2" /> Reschedule
                        </DropdownMenuItem>
                        {viewing.status !== "cancelled" && (
                          <DropdownMenuItem 
                            onClick={() => updateViewingMutation.mutate({ id: viewing.id, data: { status: "cancelled" } })}
                            className="text-orange-600"
                            data-testid={`menu-popup-cancel-${viewing.id}`}
                          >
                            <Ban className="h-4 w-4 mr-2" /> Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this property?")) {
                              deleteViewingMutation.mutate(viewing.id);
                            }
                          }}
                          className="text-red-600"
                          data-testid={`menu-popup-delete-${viewing.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

        {isAgent && mapDisplayFilter === "clients" && clientsWithValidCoords.map((client) => (
          <Marker key={`client-${client.id}`} position={[client.latitude!, client.longitude!]} icon={clientIcon}>
            <Popup>
              <div className="p-2 min-w-[220px]">
                <h3 className="font-bold text-purple-700">{client.firstName} {client.lastName}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(Array.isArray(client.type) ? client.type : [client.type]).map((t, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs capitalize">{t}</Badge>
                  ))}
                </div>
                {(client.street || client.city || client.zipCode) && (
                  <p className="text-sm text-gray-600 mt-2">
                    {client.street && <span>{client.street}<br/></span>}
                    {client.city}{client.zipCode && `, ${client.zipCode}`}
                  </p>
                )}
                {client.email && (
                  <p className="text-sm text-gray-500 mt-1">{client.email}</p>
                )}
                {client.phone && (
                  <p className="text-sm text-gray-500">{client.phone}</p>
                )}
                {client.labels && client.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {client.labels.map((label, idx) => (
                      <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{label}</span>
                    ))}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
        
        {routeData?.geometry && (
          <GeoJSON 
            key={JSON.stringify(routeData.geometry)} 
            data={routeData.geometry} 
            style={{ color: "#2563eb", weight: 4, opacity: 0.8 }} 
          />
        )}
      </MapContainer>

      <div className="absolute top-4 z-[1000] flex flex-col gap-2" style={{ left: "180px" }}>
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
                <button key={result.place_id} onClick={() => selectLocation(result)} className="w-full text-left p-3 hover:bg-muted rounded-md flex items-start gap-3" data-testid={`search-result-${result.place_id}`}>
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

        {isAgent && (
          <div className="flex items-center gap-1 bg-background rounded-lg p-1 shadow-lg">
            <Button
              size="sm"
              variant={mapDisplayFilter === "showings" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => { setMapDisplayFilter("showings"); setSelectedClientFilter("all"); }}
              data-testid="filter-showings"
            >
              <MapPin className="h-3 w-3 mr-1" /> Showings
            </Button>
            <Button
              size="sm"
              variant={mapDisplayFilter === "clients" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMapDisplayFilter("clients")}
              data-testid="filter-clients"
            >
              <Star className="h-3 w-3 mr-1" /> Clients
              {isGeocodingClients && <Loader2 className="h-3 w-3 ml-1 animate-spin" />}
            </Button>
            <Button
              size="sm"
              variant={mapDisplayFilter === "listings" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setMapDisplayFilter("listings")}
              data-testid="filter-listings"
            >
              <Home className="h-3 w-3 mr-1" /> Listings
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {isAgent && mapDisplayFilter === "listings" && (
            <Badge variant="outline" className="flex items-center gap-1 bg-background shadow">
              <Home className="h-3 w-3 text-green-600" />
              {transactionsWithCoords.length} listings
            </Badge>
          )}
          {isAgent && mapDisplayFilter === "showings" && (
            <Badge variant="outline" className="flex items-center gap-1 bg-background shadow">
              <MapPin className="h-3 w-3 text-blue-600" />
              {viewingsWithCoords.length} showings
            </Badge>
          )}
          {isAgent && mapDisplayFilter === "clients" && (
            <Badge variant="outline" className="flex items-center gap-1 bg-background shadow">
              <Star className="h-3 w-3 text-purple-600" />
              {clientsWithValidCoords.length} of {clients.length} clients mapped
            </Badge>
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
        {isAgent && !routePlanningMode && viewingsWithCoords.length >= 2 && (
          <Button 
            variant="outline" 
            className="shadow-lg bg-background" 
            onClick={() => setRoutePlanningMode(true)}
            data-testid="button-plan-route"
          >
            <Route className="h-4 w-4 mr-2" /> Plan Route
          </Button>
        )}
        {isAgent && routePlanningMode && (
          <div className="flex gap-2">
            <Button 
              onClick={planRoute} 
              disabled={selectedForRoute.size < 2 || planRouteMutation.isPending}
              className="shadow-lg"
              data-testid="button-calculate-route"
            >
              {planRouteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
              Calculate ({selectedForRoute.size})
            </Button>
            <Button 
              variant="outline" 
              className="shadow-lg bg-background" 
              onClick={clearRoute}
              data-testid="button-cancel-route"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isAgent && (
          <Dialog open={showAddViewing} onOpenChange={setShowAddViewing}>
            <DialogTrigger asChild>
              <Button className="shadow-lg" data-testid="button-add-viewing">
                <Plus className="h-4 w-4 mr-2" /> Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Property</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Client</Label>
                  <Select value={String(newViewing.clientId)} onValueChange={(v) => setNewViewing({ ...newViewing, clientId: Number(v) })}>
                    <SelectTrigger data-testid="select-client"><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (<SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Street Address</Label>
                  <Input value={newViewing.address} onChange={e => setNewViewing({ ...newViewing, address: e.target.value })} placeholder="123 Main St" data-testid="input-address" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>City</Label><Input value={newViewing.city} onChange={e => setNewViewing({ ...newViewing, city: e.target.value })} placeholder="City" data-testid="input-city" /></div>
                  <div><Label>State</Label><Input value={newViewing.state} onChange={e => setNewViewing({ ...newViewing, state: e.target.value })} placeholder="TX" data-testid="input-state" /></div>
                  <div><Label>Zip</Label><Input value={newViewing.zipCode} onChange={e => setNewViewing({ ...newViewing, zipCode: e.target.value })} placeholder="12345" data-testid="input-zip" /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={newViewing.notes} onChange={e => setNewViewing({ ...newViewing, notes: e.target.value })} placeholder="Any notes..." data-testid="input-notes" /></div>
                
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="checkbox" 
                      id="requestShowing" 
                      checked={includeShowingRequest} 
                      onChange={e => setIncludeShowingRequest(e.target.checked)} 
                      className="rounded" 
                      data-testid="checkbox-request-showing" 
                    />
                    <Label htmlFor="requestShowing" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Request a specific showing time
                    </Label>
                  </div>
                  
                  {includeShowingRequest && (
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      <div>
                        <Label>Date</Label>
                        <Input 
                          type="date" 
                          value={newShowingDate} 
                          onChange={e => setNewShowingDate(e.target.value)} 
                          min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                          data-testid="input-showing-date" 
                        />
                      </div>
                      <div>
                        <Label>Time</Label>
                        <Select value={newShowingTime} onValueChange={setNewShowingTime}>
                          <SelectTrigger data-testid="input-showing-time">
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="08:00">8:00 AM</SelectItem>
                            <SelectItem value="08:30">8:30 AM</SelectItem>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                            <SelectItem value="09:30">9:30 AM</SelectItem>
                            <SelectItem value="10:00">10:00 AM</SelectItem>
                            <SelectItem value="10:30">10:30 AM</SelectItem>
                            <SelectItem value="11:00">11:00 AM</SelectItem>
                            <SelectItem value="11:30">11:30 AM</SelectItem>
                            <SelectItem value="12:00">12:00 PM</SelectItem>
                            <SelectItem value="12:30">12:30 PM</SelectItem>
                            <SelectItem value="13:00">1:00 PM</SelectItem>
                            <SelectItem value="13:30">1:30 PM</SelectItem>
                            <SelectItem value="14:00">2:00 PM</SelectItem>
                            <SelectItem value="14:30">2:30 PM</SelectItem>
                            <SelectItem value="15:00">3:00 PM</SelectItem>
                            <SelectItem value="15:30">3:30 PM</SelectItem>
                            <SelectItem value="16:00">4:00 PM</SelectItem>
                            <SelectItem value="16:30">4:30 PM</SelectItem>
                            <SelectItem value="17:00">5:00 PM</SelectItem>
                            <SelectItem value="17:30">5:30 PM</SelectItem>
                            <SelectItem value="18:00">6:00 PM</SelectItem>
                            <SelectItem value="18:30">6:30 PM</SelectItem>
                            <SelectItem value="19:00">7:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                
                <Button 
                  onClick={() => createViewingMutation.mutate({ 
                    ...newViewing, 
                    requestShowing: includeShowingRequest, 
                    showingDate: newShowingDate, 
                    showingTime: newShowingTime 
                  })} 
                  disabled={createViewingMutation.isPending || !newViewing.clientId || !newViewing.address || (includeShowingRequest && (!newShowingDate || !newShowingTime))} 
                  className="w-full" 
                  data-testid="button-submit-viewing"
                >
                  {createViewingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {includeShowingRequest ? "Add Property & Request Showing" : "Add Property"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        <Button 
          variant="outline" 
          className="shadow-lg bg-background relative" 
          onClick={() => setShowRequestsPanel(!showRequestsPanel)} 
          data-testid="button-showing-requests"
        >
          <Bell className="h-4 w-4" />
          {pendingRequests.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {pendingRequests.length}
            </span>
          )}
        </Button>
        <Button variant="outline" className="shadow-lg bg-background" onClick={() => setSidebarOpen(!sidebarOpen)} data-testid="button-toggle-sidebar">
          {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      </div>

      <div className={`absolute top-0 right-0 h-full w-80 bg-background border-l shadow-xl z-[1001] transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Properties</h2>
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} data-testid="button-close-sidebar"><X className="h-4 w-4" /></Button>
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
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Home className="h-4 w-4 text-green-600" />Your Transactions</h3>
                {loadingTransactions ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : transactions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                  <div className="space-y-2">
                    {transactions.map((tx) => (
                      <Card key={tx.id} className="p-3 cursor-pointer hover:bg-muted/50" onClick={() => { if (tx.latitude && tx.longitude) { setMapCenter([tx.latitude, tx.longitude]); setMapZoom(15); } }}>
                        <div className="flex justify-between items-start">
                          <div><h4 className="font-medium text-sm">{tx.streetName}</h4><p className="text-xs text-muted-foreground">{tx.city}, {tx.state}</p></div>
                          {tx.latitude && tx.longitude ? (<Badge variant="outline" className="text-xs bg-green-50 text-green-700">On Map</Badge>) : (
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); geocodeTransactionMutation.mutate(tx.id); }} disabled={geocodeTransactionMutation.isPending} data-testid={`button-geocode-${tx.id}`}><RefreshCw className="h-3 w-3" /></Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="viewings" className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-600" />{isAgent ? "Scheduled Viewings" : "Properties to View"}</h3>
              {isAgent && selectedClientFilter !== "all" && (
                <div className="mb-3">
                  <Badge variant="secondary" className="text-xs">
                    Filtered by: {clients.find(c => c.id === selectedClientFilter)?.firstName} {clients.find(c => c.id === selectedClientFilter)?.lastName}
                  </Badge>
                </div>
              )}
              {loadingViewings ? (
                <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
              ) : filteredViewings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{selectedClientFilter !== "all" ? "No viewings for this client" : "No viewings scheduled"}</p>
              ) : (
                <div className="space-y-2">
                  {filteredViewings.map((viewing) => (
                    <Card 
                      key={viewing.id} 
                      className={`p-3 cursor-pointer hover:bg-muted/50 ${routePlanningMode && selectedForRoute.has(viewing.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`} 
                      onClick={() => { 
                        if (routePlanningMode && viewing.latitude && viewing.longitude) {
                          toggleRouteSelection(viewing.id);
                        } else if (viewing.latitude && viewing.longitude) { 
                          setMapCenter([viewing.latitude, viewing.longitude]); 
                          setMapZoom(15); 
                          setSelectedViewing(viewing); 
                        } 
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-2">
                          {routePlanningMode && viewing.latitude && viewing.longitude && (
                            <div className="mt-0.5">
                              {selectedForRoute.has(viewing.id) ? (
                                <CheckSquare className="h-4 w-4 text-primary" />
                              ) : (
                                <Square className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div>
                            <h4 className="font-medium text-sm">{viewing.address}</h4>
                            <p className="text-xs text-muted-foreground">{viewing.city}, {viewing.state}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge 
                                variant={viewing.status === "approved" ? "default" : viewing.status === "cancelled" ? "destructive" : "secondary"} 
                                className="text-xs"
                              >
                                {viewing.status}
                              </Badge>
                              {viewing.scheduledDate && (
                                <span className="text-xs text-muted-foreground">
                                  {new Date(viewing.scheduledDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {!routePlanningMode && (
                          <div className="flex items-center gap-1">
                            {!isAgent && (
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedViewing(viewing); setShowFeedbackDialog(true); }} data-testid={`button-rate-${viewing.id}`}>
                                <Star className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {isAgent && !routePlanningMode && (
                        <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t">
                          {viewing.status !== "approved" && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50"
                              onClick={(e) => { e.stopPropagation(); updateViewingMutation.mutate({ id: viewing.id, data: { status: "approved" } }); }}
                              disabled={updateViewingMutation.isPending}
                              data-testid={`button-approve-${viewing.id}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" /> Approve
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" data-testid={`button-viewing-actions-${viewing.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setRescheduleViewing(viewing);
                                  if (viewing.scheduledDate) {
                                    const date = new Date(viewing.scheduledDate);
                                    setRescheduleDate(date.toISOString().split('T')[0]);
                                    setRescheduleTime(date.toTimeString().slice(0, 5));
                                  }
                                  setShowRescheduleDialog(true);
                                }}
                                data-testid={`menu-reschedule-${viewing.id}`}
                              >
                                <Edit2 className="h-4 w-4 mr-2" /> Reschedule
                              </DropdownMenuItem>
                              {viewing.status !== "cancelled" && (
                                <DropdownMenuItem 
                                  onClick={() => updateViewingMutation.mutate({ id: viewing.id, data: { status: "cancelled" } })}
                                  className="text-orange-600"
                                  data-testid={`menu-cancel-${viewing.id}`}
                                >
                                  <Ban className="h-4 w-4 mr-2" /> Cancel
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this property?")) {
                                    deleteViewingMutation.mutate(viewing.id);
                                  }
                                }}
                                className="text-red-600"
                                data-testid={`menu-delete-${viewing.id}`}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {selectedLocation && (
              <TabsContent value="nearby" className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Building className="h-4 w-4" />Nearby Places</h3>
                {isLoadingNearby ? (
                  <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
                ) : (
                  <>
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1"><School className="h-3 w-3" /> Schools ({nearbySchools.length})</h4>
                      {nearbySchools.slice(0, 5).map((school) => (<div key={school.id} className="text-sm py-1 border-b last:border-0"><span className="font-medium">{school.name}</span>{school.distance && <span className="text-muted-foreground ml-2">{formatDistance(school.distance)}</span>}</div>))}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Amenities ({nearbyAmenities.length})</h4>
                      {nearbyAmenities.slice(0, 10).map((amenity) => (<div key={amenity.id} className="text-sm py-1 border-b last:border-0"><span className="font-medium">{amenity.name}</span><span className="text-xs text-muted-foreground ml-2 capitalize">{amenity.type}</span></div>))}
                    </div>
                  </>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {routeData && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-background rounded-lg shadow-xl border p-4 max-w-lg w-full" style={{ marginLeft: "30px" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">
                {routeData.optimized ? "Optimized Route" : "Planned Route"}
              </h3>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {formatRouteDuration(routeData.totalDuration)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {formatRouteDistance(routeData.totalDistance)}
              </span>
              <Button variant="ghost" size="sm" onClick={clearRoute}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {routeData.waypoints.map((wp, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                onClick={() => { setMapCenter([wp.lat, wp.lon]); setMapZoom(16); }}
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </div>
                <span className="text-sm truncate">{wp.address}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate This Property</DialogTitle>
            <CardDescription>{selectedViewing?.address}, {selectedViewing?.city}</CardDescription>
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
            <div><Label className="flex items-center gap-2"><ThumbsUp className="h-4 w-4 text-green-600" /> What did you love?</Label><Textarea value={newFeedback.liked} onChange={e => setNewFeedback({ ...newFeedback, liked: e.target.value })} placeholder="Beautiful kitchen, great backyard..." data-testid="input-liked" /></div>
            <div><Label className="flex items-center gap-2"><ThumbsDown className="h-4 w-4 text-red-600" /> What didn't you like?</Label><Textarea value={newFeedback.disliked} onChange={e => setNewFeedback({ ...newFeedback, disliked: e.target.value })} placeholder="Small bedrooms, needs updates..." data-testid="input-disliked" /></div>
            <div><Label>Overall Impression</Label><Textarea value={newFeedback.overallImpression} onChange={e => setNewFeedback({ ...newFeedback, overallImpression: e.target.value })} placeholder="Your overall thoughts..." data-testid="input-impression" /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="wouldPurchase" checked={newFeedback.wouldPurchase} onChange={e => setNewFeedback({ ...newFeedback, wouldPurchase: e.target.checked })} className="rounded" data-testid="checkbox-would-purchase" />
              <Label htmlFor="wouldPurchase">I would consider purchasing this property</Label>
            </div>
            <Button onClick={() => selectedViewing && createFeedbackMutation.mutate({ viewingId: selectedViewing.id, data: newFeedback })} disabled={createFeedbackMutation.isPending} className="w-full" data-testid="button-submit-feedback">
              {createFeedbackMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Submit Feedback
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Showing Time</DialogTitle>
            <CardDescription>{requestViewing?.address}, {requestViewing?.city}</CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Preferred Date</Label>
              <Input 
                type="date" 
                value={requestDate} 
                onChange={(e) => setRequestDate(e.target.value)}
                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                className="mt-1"
                data-testid="input-request-date"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Preferred Time</Label>
              <Select value={requestTime} onValueChange={setRequestTime}>
                <SelectTrigger className="mt-1" data-testid="input-request-time">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="08:30">8:30 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="09:30">9:30 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="10:30">10:30 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="11:30">11:30 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="12:30">12:30 PM</SelectItem>
                  <SelectItem value="13:00">1:00 PM</SelectItem>
                  <SelectItem value="13:30">1:30 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="14:30">2:30 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="15:30">3:30 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="16:30">4:30 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="17:30">5:30 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="18:30">6:30 PM</SelectItem>
                  <SelectItem value="19:00">7:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea 
                value={requestNotes} 
                onChange={(e) => setRequestNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                data-testid="input-request-notes"
              />
            </div>
            <Button 
              onClick={() => {
                if (requestViewing && requestDate && requestTime) {
                  const requestedDate = new Date(`${requestDate}T${requestTime}`).toISOString();
                  const recipientId = isAgent ? requestViewing.clientId : requestViewing.agentId;
                  createShowingRequestMutation.mutate({
                    viewingId: requestViewing.id,
                    recipientId,
                    requestedDate,
                    notes: requestNotes || undefined
                  });
                }
              }} 
              disabled={createShowingRequestMutation.isPending || !requestDate || !requestTime} 
              className="w-full"
              data-testid="button-submit-request"
            >
              {createShowingRequestMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Property</DialogTitle>
            <CardDescription>{rescheduleViewing?.address}, {rescheduleViewing?.city}</CardDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> New Date</Label>
              <Input 
                type="date" 
                value={rescheduleDate} 
                onChange={(e) => setRescheduleDate(e.target.value)}
                min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                className="mt-1"
                data-testid="input-reschedule-date"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> New Time</Label>
              <Select value={rescheduleTime} onValueChange={setRescheduleTime}>
                <SelectTrigger className="mt-1" data-testid="input-reschedule-time">
                  <SelectValue placeholder="Select a time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">8:00 AM</SelectItem>
                  <SelectItem value="08:30">8:30 AM</SelectItem>
                  <SelectItem value="09:00">9:00 AM</SelectItem>
                  <SelectItem value="09:30">9:30 AM</SelectItem>
                  <SelectItem value="10:00">10:00 AM</SelectItem>
                  <SelectItem value="10:30">10:30 AM</SelectItem>
                  <SelectItem value="11:00">11:00 AM</SelectItem>
                  <SelectItem value="11:30">11:30 AM</SelectItem>
                  <SelectItem value="12:00">12:00 PM</SelectItem>
                  <SelectItem value="12:30">12:30 PM</SelectItem>
                  <SelectItem value="13:00">1:00 PM</SelectItem>
                  <SelectItem value="13:30">1:30 PM</SelectItem>
                  <SelectItem value="14:00">2:00 PM</SelectItem>
                  <SelectItem value="14:30">2:30 PM</SelectItem>
                  <SelectItem value="15:00">3:00 PM</SelectItem>
                  <SelectItem value="15:30">3:30 PM</SelectItem>
                  <SelectItem value="16:00">4:00 PM</SelectItem>
                  <SelectItem value="16:30">4:30 PM</SelectItem>
                  <SelectItem value="17:00">5:00 PM</SelectItem>
                  <SelectItem value="17:30">5:30 PM</SelectItem>
                  <SelectItem value="18:00">6:00 PM</SelectItem>
                  <SelectItem value="18:30">6:30 PM</SelectItem>
                  <SelectItem value="19:00">7:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => {
                if (rescheduleViewing && rescheduleDate && rescheduleTime) {
                  const scheduledDate = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
                  updateViewingMutation.mutate({ id: rescheduleViewing.id, data: { scheduledDate } });
                }
              }} 
              disabled={updateViewingMutation.isPending || !rescheduleDate || !rescheduleTime} 
              className="w-full"
              data-testid="button-submit-reschedule"
            >
              {updateViewingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showRequestsPanel && (
        <div className="absolute top-16 right-4 z-[1002] w-80 bg-background rounded-lg shadow-xl border max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b sticky top-0 bg-background">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" /> Showing Requests
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowRequestsPanel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-3">
            {showingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No showing requests</p>
            ) : (
              <div className="space-y-3">
                {showingRequests.map((request) => {
                  const viewing = viewings.find(v => v.id === request.viewingId);
                  const isPending = request.status === "pending";
                  const isRecipient = request.recipientId === user?.id || 
                    (user?.clientRecordId && request.recipientId === user.clientRecordId);
                  
                  return (
                    <Card key={request.id} className={`p-3 ${isPending && isRecipient ? 'border-orange-300 bg-orange-50' : ''}`}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{viewing?.address || 'Unknown property'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.requestedDate).toLocaleDateString()} at {new Date(request.requestedDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                          <Badge variant={
                            request.status === "approved" ? "default" :
                            request.status === "declined" ? "destructive" : "secondary"
                          }>
                            {request.status}
                          </Badge>
                        </div>
                        {request.notes && <p className="text-xs text-muted-foreground">{request.notes}</p>}
                        {isPending && isRecipient && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => respondToRequestMutation.mutate({ id: request.id, status: "approved" })}
                              disabled={respondToRequestMutation.isPending}
                              data-testid={`button-approve-${request.id}`}
                            >
                              <Check className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1"
                              onClick={() => respondToRequestMutation.mutate({ id: request.id, status: "declined" })}
                              disabled={respondToRequestMutation.isPending}
                              data-testid={`button-decline-${request.id}`}
                            >
                              <XCircle className="h-3 w-3 mr-1" /> Decline
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
