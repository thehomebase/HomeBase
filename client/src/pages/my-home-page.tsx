import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type HomeownerHome, type MaintenanceRecord } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Home,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  CalendarDays,
  MapPin,
  Wrench,
  Search,
  FileText,
  Users,
  ClipboardList,
  Building2
} from "lucide-react";
import { Link } from "wouter";

type HomeWithMaintenance = HomeownerHome & {
  maintenance?: MaintenanceRecord[];
};

const MAINTENANCE_CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "roofing", label: "Roofing" },
  { value: "painting", label: "Painting" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning" },
  { value: "pest_control", label: "Pest Control" },
  { value: "appliance_repair", label: "Appliance Repair" },
  { value: "flooring", label: "Flooring" },
  { value: "handyman", label: "Handyman" },
  { value: "pool_maintenance", label: "Pool Maintenance" },
  { value: "window_specialist", label: "Windows" },
  { value: "garage_door", label: "Garage Door" },
  { value: "security_system", label: "Security System" },
  { value: "other", label: "Other" },
];

function AddHomeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    purchaseDate: "",
    purchasePrice: "",
    notes: "",
  });

  const createHomeMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/my-homes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes"] });
      toast({ title: "Home added successfully" });
      onOpenChange(false);
      setForm({ address: "", city: "", state: "", zipCode: "", purchaseDate: "", purchasePrice: "", notes: "" });
    },
    onError: () => {
      toast({ title: "Failed to add home", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createHomeMutation.mutate({
      ...form,
      purchasePrice: form.purchasePrice ? parseInt(form.purchasePrice) : null,
      userId: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Home</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zipCode">Zip Code</Label>
              <Input id="zipCode" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasePrice">Purchase Price</Label>
            <Input id="purchasePrice" type="number" placeholder="e.g. 350000" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.address || createHomeMutation.isPending}>
              {createHomeMutation.isPending ? "Adding..." : "Add Home"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceDialog({
  open,
  onOpenChange,
  homeId,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: number;
  record?: MaintenanceRecord | null;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    category: record?.category || "",
    description: record?.description || "",
    serviceDate: record?.serviceDate || "",
    cost: record?.cost?.toString() || "",
    notes: record?.notes || "",
    contractorId: record?.contractorId || null,
  });

  useEffect(() => {
    if (open) {
      setForm({
        category: record?.category || "",
        description: record?.description || "",
        serviceDate: record?.serviceDate || "",
        cost: record?.cost?.toString() || "",
        notes: record?.notes || "",
        contractorId: record?.contractorId || null,
      });
    }
  }, [open, record]);

  const isEditing = !!record;

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        const res = await apiRequest("PATCH", `/api/maintenance/${record!.id}`, data);
        return res.json();
      } else {
        const res = await apiRequest("POST", `/api/my-homes/${homeId}/maintenance`, data);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes"] });
      toast({ title: isEditing ? "Record updated" : "Maintenance record added" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to save record", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      homeId,
      cost: form.cost ? parseInt(form.cost) : null,
      contractorId: form.contractorId || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit" : "Add"} Maintenance Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-category">Category *</Label>
            <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {MAINTENANCE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-description">Description *</Label>
            <Textarea id="m-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="m-date">Service Date</Label>
              <Input id="m-date" type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-cost">Cost ($)</Label>
              <Input id="m-cost" type="number" placeholder="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-notes">Notes</Label>
            <Textarea id="m-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.category || !form.description || mutation.isPending}>
              {mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function HomeCard({ home, onSelect, isSelected }: { home: HomeownerHome; onSelect: (id: number) => void; isSelected: boolean }) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`}
      onClick={() => onSelect(home.id)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{home.address}</CardTitle>
          </div>
        </div>
        {(home.city || home.state) && (
          <CardDescription className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[home.city, home.state, home.zipCode].filter(Boolean).join(", ")}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {home.purchasePrice && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span>${home.purchasePrice.toLocaleString()}</span>
            </div>
          )}
          {home.purchaseDate && (
            <div className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{new Date(home.purchaseDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HomeDetail({ homeId }: { homeId: number }) {
  const { toast } = useToast();
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);

  const { data: homeData, isLoading } = useQuery<HomeWithMaintenance>({
    queryKey: ["/api/my-homes", homeId],
    queryFn: async () => {
      const res = await fetch(`/api/my-homes/${homeId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch home");
      return res.json();
    },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (recordId: number) => {
      await apiRequest("DELETE", `/api/maintenance/${recordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId] });
      toast({ title: "Record deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete record", variant: "destructive" });
    },
  });

  const deleteHomeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/my-homes/${homeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes"] });
      toast({ title: "Home removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove home", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!homeData) return null;

  const maintenance = homeData.maintenance || [];
  const categoryLabel = (cat: string) => MAINTENANCE_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle>{homeData.address}</CardTitle>
              </div>
              {(homeData.city || homeData.state) && (
                <CardDescription className="mt-1">
                  {[homeData.city, homeData.state, homeData.zipCode].filter(Boolean).join(", ")}
                </CardDescription>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteHomeMutation.mutate()} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {homeData.purchasePrice && (
              <div>
                <p className="text-sm text-muted-foreground">Purchase Price</p>
                <p className="text-lg font-semibold">${homeData.purchasePrice.toLocaleString()}</p>
              </div>
            )}
            {homeData.purchaseDate && (
              <div>
                <p className="text-sm text-muted-foreground">Purchase Date</p>
                <p className="text-lg font-semibold">{new Date(homeData.purchaseDate).toLocaleDateString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Service Records</p>
              <p className="text-lg font-semibold">{maintenance.length}</p>
            </div>
            {maintenance.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-lg font-semibold">
                  ${maintenance.reduce((sum, r) => sum + (r.cost || 0), 0).toLocaleString()}
                </p>
              </div>
            )}
          </div>
          {homeData.notes && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{homeData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => { setEditingRecord(null); setShowMaintenanceDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Maintenance Record
        </Button>
        <Link href="/marketplace">
          <Button variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Find a Pro
          </Button>
        </Link>
        <Link href="/my-team">
          <Button variant="outline">
            <Users className="h-4 w-4 mr-2" />
            My Team
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Maintenance History</CardTitle>
            </div>
            <Badge variant="secondary">{maintenance.length} record{maintenance.length !== 1 ? "s" : ""}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {maintenance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No maintenance records yet</p>
              <p className="text-sm mt-1">Track your home services and repairs here</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setEditingRecord(null); setShowMaintenanceDialog(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maintenance
                    .sort((a, b) => {
                      if (!a.serviceDate && !b.serviceDate) return 0;
                      if (!a.serviceDate) return 1;
                      if (!b.serviceDate) return -1;
                      return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime();
                    })
                    .map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="whitespace-nowrap">
                          {record.serviceDate ? new Date(record.serviceDate).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{categoryLabel(record.category)}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{record.description}</TableCell>
                        <TableCell className="text-right">
                          {record.cost ? `$${record.cost.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingRecord(record);
                                setShowMaintenanceDialog(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => deleteMaintenanceMutation.mutate(record.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <MaintenanceDialog
        open={showMaintenanceDialog}
        onOpenChange={setShowMaintenanceDialog}
        homeId={homeId}
        record={editingRecord}
      />
    </div>
  );
}

export default function MyHomePage() {
  const { user } = useAuth();
  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(null);
  const [showAddHome, setShowAddHome] = useState(false);

  const { data: homes = [], isLoading } = useQuery<HomeownerHome[]>({
    queryKey: ["/api/my-homes"],
  });

  if (selectedHomeId && !homes.find((h) => h.id === selectedHomeId) && homes.length > 0) {
    setSelectedHomeId(homes[0].id);
  }

  const activeHomeId = selectedHomeId || (homes.length > 0 ? homes[0].id : null);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            MyHome
          </h1>
          <p className="text-muted-foreground mt-1">Manage your homes and track maintenance</p>
        </div>
        <Button onClick={() => setShowAddHome(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Home
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : homes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-semibold mb-2">No homes added yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your home to start tracking maintenance and managing your property.
            </p>
            <Button onClick={() => setShowAddHome(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Home
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {homes.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {homes.map((home) => (
                <HomeCard key={home.id} home={home} onSelect={setSelectedHomeId} isSelected={home.id === activeHomeId} />
              ))}
            </div>
          )}

          {activeHomeId && <HomeDetail homeId={activeHomeId} />}
        </>
      )}

      <AddHomeDialog open={showAddHome} onOpenChange={setShowAddHome} />
    </div>
  );
}