import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Bell, Plus, Trash2, Pencil, MapPin, DollarSign, BedDouble, Bath,
  Home, Mail, MessageSquare, Smartphone, Clock, ChevronDown, ChevronUp,
  Power, PowerOff, Search, Building2
} from "lucide-react";

interface ListingAlert {
  id: number;
  user_id: number;
  name: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  min_price: number | null;
  max_price: number | null;
  bedrooms_min: number | null;
  bathrooms_min: number | null;
  property_type: string | null;
  notify_email: boolean;
  notify_sms: boolean;
  notify_in_app: boolean;
  is_active: boolean;
  last_checked_at: string | null;
  last_match_count: number;
  created_at: string;
}

interface AlertResult {
  id: number;
  alert_id: number;
  listing_address: string;
  listing_price: number | null;
  listing_bedrooms: number | null;
  listing_bathrooms: number | null;
  notified_at: string;
}

const PROPERTY_TYPES = [
  { value: "Single Family", label: "Single Family" },
  { value: "Condo", label: "Condo" },
  { value: "Townhouse", label: "Townhouse" },
  { value: "Multi Family", label: "Multi Family" },
  { value: "Land", label: "Land" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

function formatPrice(price: number | null): string {
  if (!price) return "Any";
  return "$" + price.toLocaleString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"
  });
}

const defaultForm = {
  name: "",
  city: "",
  state: "",
  zipCode: "",
  minPrice: "",
  maxPrice: "",
  bedroomsMin: "",
  bathroomsMin: "",
  propertyType: "",
  notifyEmail: true,
  notifySms: false,
  notifyInApp: true,
};

export default function ListingAlertsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: alerts = [], isLoading } = useQuery<ListingAlert[]>({
    queryKey: ["/api/listing-alerts"],
  });

  const { data: expandedResults = [] } = useQuery<AlertResult[]>({
    queryKey: ["/api/listing-alerts", expandedId, "results"],
    queryFn: async () => {
      if (!expandedId) return [];
      const res = await fetch(`/api/listing-alerts/${expandedId}/results`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!expandedId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/listing-alerts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-alerts"] });
      setShowForm(false);
      setForm(defaultForm);
      toast({ title: "Alert created", description: "You'll be notified when new listings match your criteria." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to create alert", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/listing-alerts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-alerts"] });
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      toast({ title: "Alert updated" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to update alert", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/listing-alerts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-alerts"] });
      toast({ title: "Alert deleted" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/listing-alerts/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listing-alerts"] });
    },
  });

  function handleSubmit() {
    const data: any = {
      name: form.name,
      city: form.city || null,
      state: form.state || null,
      zipCode: form.zipCode || null,
      minPrice: form.minPrice ? parseInt(form.minPrice) : null,
      maxPrice: form.maxPrice ? parseInt(form.maxPrice) : null,
      bedroomsMin: form.bedroomsMin ? parseInt(form.bedroomsMin) : null,
      bathroomsMin: form.bathroomsMin ? parseInt(form.bathroomsMin) : null,
      propertyType: form.propertyType || null,
      notifyEmail: form.notifyEmail,
      notifySms: form.notifySms,
      notifyInApp: form.notifyInApp,
    };

    if (!data.name) {
      toast({ title: "Name required", description: "Give your alert a name so you can identify it.", variant: "destructive" });
      return;
    }
    if (!data.city && !data.zipCode) {
      toast({ title: "Location required", description: "Enter a city or ZIP code.", variant: "destructive" });
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function openEdit(alert: ListingAlert) {
    setEditingId(alert.id);
    setForm({
      name: alert.name,
      city: alert.city || "",
      state: alert.state || "",
      zipCode: alert.zip_code || "",
      minPrice: alert.min_price?.toString() || "",
      maxPrice: alert.max_price?.toString() || "",
      bedroomsMin: alert.bedrooms_min?.toString() || "",
      bathroomsMin: alert.bathrooms_min?.toString() || "",
      propertyType: alert.property_type || "",
      notifyEmail: alert.notify_email,
      notifySms: alert.notify_sms,
      notifyInApp: alert.notify_in_app,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm);
  }

  if (isLoading) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 py-6 max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Listing Alerts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get notified when new listings match your search criteria
          </p>
        </div>
        <Button onClick={() => { setForm(defaultForm); setEditingId(null); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Alert
        </Button>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Listing Alerts Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Set up alerts to automatically get notified when new property listings match your search criteria. Choose to receive notifications via email, SMS, or in-app.
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Create Your First Alert
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => (
            <Card key={alert.id} className={!alert.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base">{alert.name}</h3>
                      {alert.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 text-xs">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Paused</Badge>
                      )}
                      {alert.last_match_count > 0 && (
                        <Badge className="text-xs">{alert.last_match_count} match{alert.last_match_count !== 1 ? "es" : ""}</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      {(alert.city || alert.zip_code) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[alert.city, alert.state, alert.zip_code].filter(Boolean).join(", ")}
                        </span>
                      )}
                      {(alert.min_price || alert.max_price) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatPrice(alert.min_price)} - {formatPrice(alert.max_price)}
                        </span>
                      )}
                      {alert.bedrooms_min && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="h-3.5 w-3.5" /> {alert.bedrooms_min}+ beds
                        </span>
                      )}
                      {alert.bathrooms_min && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-3.5 w-3.5" /> {alert.bathrooms_min}+ baths
                        </span>
                      )}
                      {alert.property_type && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> {alert.property_type}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Checked: {formatDate(alert.last_checked_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        Alerts via:
                        {alert.notify_in_app && <Bell className="h-3 w-3 text-primary" />}
                        {alert.notify_email && <Mail className="h-3 w-3 text-primary" />}
                        {alert.notify_sms && <Smartphone className="h-3 w-3 text-primary" />}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.is_active })}
                      title={alert.is_active ? "Pause alert" : "Resume alert"}
                    >
                      {alert.is_active ? <Power className="h-4 w-4 text-green-600" /> : <PowerOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(alert)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        if (confirm("Delete this alert?")) deleteMutation.mutate(alert.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                    >
                      {expandedId === alert.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {expandedId === alert.id && (
                  <div className="mt-3 pt-3 border-t">
                    <h4 className="text-sm font-medium mb-2">Recent Matches</h4>
                    {expandedResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No matches found yet. The system checks for new listings daily.</p>
                    ) : (
                      <div className="space-y-2">
                        {expandedResults.map(result => (
                          <div key={result.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <span className="font-medium">{result.listing_address}</span>
                              <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                                {result.listing_price && <span>${result.listing_price.toLocaleString()}</span>}
                                {result.listing_bedrooms && <span>{result.listing_bedrooms}bd</span>}
                                {result.listing_bathrooms && <span>{result.listing_bathrooms}ba</span>}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {formatDate(result.notified_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle>{editingId ? "Edit Alert" : "Create Listing Alert"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Alert Name</Label>
              <Input
                placeholder="e.g. Austin 3BR Homes"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <Separator />
            <p className="text-sm font-medium">Location</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  placeholder="e.g. Austin"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">State</Label>
                <Select value={form.state} onValueChange={v => setForm(p => ({ ...p, state: v === "any" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">ZIP Code</Label>
              <Input
                placeholder="e.g. 78701"
                value={form.zipCode}
                onChange={e => setForm(p => ({ ...p, zipCode: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter either a city or ZIP code (or both)</p>
            </div>

            <Separator />
            <p className="text-sm font-medium">Filters</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Price</Label>
                <Input
                  type="number"
                  placeholder="No min"
                  value={form.minPrice}
                  onChange={e => setForm(p => ({ ...p, minPrice: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Max Price</Label>
                <Input
                  type="number"
                  placeholder="No max"
                  value={form.maxPrice}
                  onChange={e => setForm(p => ({ ...p, maxPrice: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Bedrooms</Label>
                <Select value={form.bedroomsMin} onValueChange={v => setForm(p => ({ ...p, bedroomsMin: v === "any" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Min Bathrooms</Label>
                <Select value={form.bathroomsMin} onValueChange={v => setForm(p => ({ ...p, bathroomsMin: v === "any" ? "" : v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any</SelectItem>
                    {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n}+</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Property Type</Label>
              <Select value={form.propertyType} onValueChange={v => setForm(p => ({ ...p, propertyType: v === "any" ? "" : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Any type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  {PROPERTY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />
            <p className="text-sm font-medium">How to notify you</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-normal">In-App Notification</Label>
                </div>
                <Switch checked={form.notifyInApp} onCheckedChange={v => setForm(p => ({ ...p, notifyInApp: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-normal">Email</Label>
                </div>
                <Switch checked={form.notifyEmail} onCheckedChange={v => setForm(p => ({ ...p, notifyEmail: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-normal">SMS Text Message</Label>
                </div>
                <Switch checked={form.notifySms} onCheckedChange={v => setForm(p => ({ ...p, notifySms: v }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingId ? "Update Alert" : "Create Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
