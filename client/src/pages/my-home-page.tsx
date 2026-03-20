import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type HomeownerHome, type MaintenanceRecord, type HomeExpense, type HomeMaintenanceReminder, type HomeEquityProfile, type HomeWarrantyItem, type HomeImprovement } from "@shared/schema";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Home, Plus, Pencil, Trash2, DollarSign, CalendarDays, MapPin, Wrench,
  Search, FileText, Users, ClipboardList, Building2, Zap, Droplets, Flame,
  Bug, Waves, Sparkles, Wifi, TreePine, Shield, MoreHorizontal,
  Bell, Clock, CheckCircle2, AlertTriangle, TrendingUp, RefreshCw,
  PiggyBank, Percent, ArrowUpRight, HelpCircle, Hammer, PaintBucket,
  Thermometer, Package, FolderOpen, ScanLine, Camera, Loader2,
  UserPlus, Check, X
} from "lucide-react";
import { Link } from "wouter";

type HomeWithMaintenance = HomeownerHome & { maintenance?: MaintenanceRecord[] };

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

const EXPENSE_CATEGORIES = [
  { value: "electric", label: "Electric", icon: Zap },
  { value: "gas", label: "Gas", icon: Flame },
  { value: "water", label: "Water", icon: Droplets },
  { value: "sewer", label: "Sewer", icon: Droplets },
  { value: "trash", label: "Trash", icon: Package },
  { value: "pest_control", label: "Pest Control", icon: Bug },
  { value: "pool_maintenance", label: "Pool Maintenance", icon: Waves },
  { value: "home_cleaning", label: "Home Cleaning", icon: Sparkles },
  { value: "internet", label: "Internet", icon: Wifi },
  { value: "lawn_care", label: "Lawn Care", icon: TreePine },
  { value: "hoa", label: "HOA", icon: Building2 },
  { value: "security", label: "Security", icon: Shield },
  { value: "other", label: "Other", icon: MoreHorizontal },
];

const REMINDER_CATEGORIES = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "roofing", label: "Roofing" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "appliance", label: "Appliance" },
  { value: "safety", label: "Safety" },
  { value: "seasonal", label: "Seasonal" },
  { value: "other", label: "Other" },
];

const IMPROVEMENT_CATEGORIES = [
  { value: "kitchen", label: "Kitchen" },
  { value: "bathroom", label: "Bathroom" },
  { value: "bedroom", label: "Bedroom" },
  { value: "living_area", label: "Living Area" },
  { value: "exterior", label: "Exterior" },
  { value: "landscaping", label: "Landscaping" },
  { value: "roofing", label: "Roofing" },
  { value: "flooring", label: "Flooring" },
  { value: "painting", label: "Painting" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "hvac", label: "HVAC" },
  { value: "addition", label: "Addition" },
  { value: "other", label: "Other" },
];

const SEASONAL_REMINDERS = [
  { title: "Change HVAC filters", category: "hvac" as const, frequency: "quarterly" as const, description: "Replace air filters to maintain efficiency and air quality" },
  { title: "Clean gutters", category: "exterior" as const, frequency: "semi_annual" as const, description: "Clear debris from gutters and downspouts" },
  { title: "Flush water heater", category: "plumbing" as const, frequency: "annual" as const, description: "Drain and flush sediment from water heater tank" },
  { title: "Test smoke detectors", category: "safety" as const, frequency: "semi_annual" as const, description: "Test all smoke and carbon monoxide detectors, replace batteries" },
  { title: "Inspect roof", category: "roofing" as const, frequency: "annual" as const, description: "Check for damaged or missing shingles, flashing issues" },
  { title: "Service HVAC system", category: "hvac" as const, frequency: "annual" as const, description: "Professional tune-up before summer/winter season" },
  { title: "Check caulking & weatherstripping", category: "exterior" as const, frequency: "annual" as const, description: "Inspect and replace around windows, doors, and foundation" },
  { title: "Clean dryer vent", category: "appliance" as const, frequency: "annual" as const, description: "Clear lint buildup from dryer vent and exhaust duct" },
  { title: "Test garage door safety", category: "safety" as const, frequency: "quarterly" as const, description: "Test auto-reverse feature and lubricate moving parts" },
  { title: "Inspect plumbing for leaks", category: "plumbing" as const, frequency: "semi_annual" as const, description: "Check under sinks, around toilets, and water heater connections" },
];

function AddHomeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ address: "", city: "", state: "", zipCode: "", purchaseDate: "", purchasePrice: "", notes: "" });
  const createHomeMutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", "/api/my-homes", data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes"] }); toast({ title: "Home added successfully" }); onOpenChange(false); setForm({ address: "", city: "", state: "", zipCode: "", purchaseDate: "", purchasePrice: "", notes: "" }); },
    onError: () => { toast({ title: "Failed to add home", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); createHomeMutation.mutate({ ...form, purchasePrice: form.purchasePrice ? parseInt(form.purchasePrice) : null, userId: 0 }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a Home</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="address">Address *</Label><Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="city">City</Label><Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="state">State</Label><Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="zipCode">Zip Code</Label><Input id="zipCode" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="purchaseDate">Purchase Date</Label><Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="purchasePrice">Purchase Price</Label><Input id="purchasePrice" type="number" placeholder="e.g. 350000" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="notes">Notes</Label><Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.address || createHomeMutation.isPending}>{createHomeMutation.isPending ? "Adding..." : "Add Home"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseDialog({ open, onOpenChange, homeId, expense }: { open: boolean; onOpenChange: (open: boolean) => void; homeId: number; expense?: HomeExpense | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "", description: "", amount: "", billingDate: "", isRecurring: true, frequency: "monthly", provider: "", notes: "" });
  useEffect(() => { if (open) { setForm({ category: expense?.category || "", description: expense?.description || "", amount: expense?.amount?.toString() || "", billingDate: expense?.billingDate || "", isRecurring: expense?.isRecurring ?? true, frequency: expense?.frequency || "monthly", provider: expense?.provider || "", notes: expense?.notes || "" }); } }, [open, expense]);
  const isEditing = !!(expense && 'id' in expense && expense.id);
  const mutation = useMutation({
    mutationFn: async (data: any) => { const res = isEditing ? await apiRequest("PATCH", `/api/expenses/${expense!.id}`, data) : await apiRequest("POST", `/api/my-homes/${homeId}/expenses`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "expenses"] }); toast({ title: isEditing ? "Expense updated" : "Expense added" }); onOpenChange(false); },
    onError: () => { toast({ title: "Failed to save expense", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate({ ...form, homeId, amount: form.amount ? parseInt(form.amount) : 0 }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? "Edit" : "Add"} Expense</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Amount ($) *</Label><Input type="number" placeholder="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Billing Date *</Label><Input type="date" value={form.billingDate} onChange={(e) => setForm({ ...form, billingDate: e.target.value })} required /></div>
          </div>
          <div className="space-y-2"><Label>Provider</Label><Input placeholder="e.g. AT&T, TXU Energy" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={form.isRecurring} onCheckedChange={(v) => setForm({ ...form, isRecurring: v })} />
              <Label>Recurring</Label>
            </div>
            {form.isRecurring && (
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2"><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.category || !form.amount || mutation.isPending}>{mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Expense"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MaintenanceDialog({ open, onOpenChange, homeId, record }: { open: boolean; onOpenChange: (open: boolean) => void; homeId: number; record?: MaintenanceRecord | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "", description: "", serviceDate: "", cost: "", notes: "", contractorId: null as number | null });
  useEffect(() => { if (open) { setForm({ category: record?.category || "", description: record?.description || "", serviceDate: record?.serviceDate || "", cost: record?.cost?.toString() || "", notes: record?.notes || "", contractorId: record?.contractorId || null }); } }, [open, record]);
  const isEditing = !!(record && 'id' in record && record.id);
  const mutation = useMutation({
    mutationFn: async (data: any) => { const res = isEditing ? await apiRequest("PATCH", `/api/maintenance/${record!.id}`, data) : await apiRequest("POST", `/api/my-homes/${homeId}/maintenance`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId] }); queryClient.invalidateQueries({ queryKey: ["/api/my-homes"] }); toast({ title: isEditing ? "Record updated" : "Maintenance record added" }); onOpenChange(false); },
    onError: () => { toast({ title: "Failed to save record", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate({ ...form, homeId, cost: form.cost ? parseInt(form.cost) : null, contractorId: form.contractorId || null }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? "Edit" : "Add"} Maintenance Record</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{MAINTENANCE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Service Date</Label><Input type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Cost ($)</Label><Input type="number" placeholder="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.category || !form.description || mutation.isPending}>{mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Record"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReminderDialog({ open, onOpenChange, homeId, reminder }: { open: boolean; onOpenChange: (open: boolean) => void; homeId: number; reminder?: HomeMaintenanceReminder | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", description: "", category: "", frequency: "quarterly", nextDue: "", notifyViaSms: false, notifyViaPush: true, notes: "" });
  useEffect(() => { if (open) { setForm({ title: reminder?.title || "", description: reminder?.description || "", category: reminder?.category || "", frequency: reminder?.frequency || "quarterly", nextDue: reminder?.nextDue || "", notifyViaSms: reminder?.notifyViaSms ?? false, notifyViaPush: reminder?.notifyViaPush ?? true, notes: reminder?.notes || "" }); } }, [open, reminder]);
  const isEditing = !!reminder;
  const mutation = useMutation({
    mutationFn: async (data: any) => { const res = isEditing ? await apiRequest("PATCH", `/api/home-reminders/${reminder!.id}`, data) : await apiRequest("POST", `/api/my-homes/${homeId}/reminders`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "reminders"] }); toast({ title: isEditing ? "Reminder updated" : "Reminder added" }); onOpenChange(false); },
    onError: () => { toast({ title: "Failed to save reminder", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate({ ...form, homeId }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? "Edit" : "Add"} Reminder</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Change HVAC filters" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{REMINDER_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="one_time">One-Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Next Due Date *</Label><Input type="date" value={form.nextDue} onChange={(e) => setForm({ ...form, nextDue: e.target.value })} required /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2"><Switch checked={form.notifyViaPush} onCheckedChange={(v) => setForm({ ...form, notifyViaPush: v })} /><Label>Push</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.notifyViaSms} onCheckedChange={(v) => setForm({ ...form, notifyViaSms: v })} /><Label>SMS</Label></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.title || !form.category || !form.nextDue || mutation.isPending}>{mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Reminder"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WarrantyDialog({ open, onOpenChange, homeId, item }: { open: boolean; onOpenChange: (open: boolean) => void; homeId: number; item?: HomeWarrantyItem | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ itemName: "", brand: "", model: "", warrantyProvider: "", coverageDetails: "", purchaseDate: "", expirationDate: "", notes: "" });
  useEffect(() => { if (open) { setForm({ itemName: item?.itemName || "", brand: item?.brand || "", model: item?.model || "", warrantyProvider: item?.warrantyProvider || "", coverageDetails: item?.coverageDetails || "", purchaseDate: item?.purchaseDate || "", expirationDate: item?.expirationDate || "", notes: item?.notes || "" }); } }, [open, item]);
  const isEditing = !!(item && 'id' in item && item.id);
  const mutation = useMutation({
    mutationFn: async (data: any) => { const res = isEditing ? await apiRequest("PATCH", `/api/warranty/${item!.id}`, data) : await apiRequest("POST", `/api/my-homes/${homeId}/warranty`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "warranty"] }); toast({ title: isEditing ? "Warranty updated" : "Warranty added" }); onOpenChange(false); },
    onError: () => { toast({ title: "Failed to save warranty", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate({ ...form, homeId }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? "Edit" : "Add"} Warranty Item</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Item Name *</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} required placeholder="e.g. HVAC System, Dishwasher" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
            <div className="space-y-2"><Label>Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Warranty Provider</Label><Input value={form.warrantyProvider} onChange={(e) => setForm({ ...form, warrantyProvider: e.target.value })} placeholder="e.g. American Home Shield" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Purchase Date</Label><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Expiration Date</Label><Input type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Coverage Details</Label><Textarea value={form.coverageDetails} onChange={(e) => setForm({ ...form, coverageDetails: e.target.value })} rows={2} placeholder="What's covered, deductible, etc." /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.itemName || mutation.isPending}>{mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Warranty"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ImprovementDialog({ open, onOpenChange, homeId, item }: { open: boolean; onOpenChange: (open: boolean) => void; homeId: number; item?: HomeImprovement | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ projectName: "", description: "", category: "", cost: "", startDate: "", completionDate: "", materials: "", notes: "" });
  useEffect(() => { if (open) { setForm({ projectName: item?.projectName || "", description: item?.description || "", category: item?.category || "", cost: item?.cost?.toString() || "", startDate: item?.startDate || "", completionDate: item?.completionDate || "", materials: item?.materials || "", notes: item?.notes || "" }); } }, [open, item]);
  const isEditing = !!(item && 'id' in item && item.id);
  const mutation = useMutation({
    mutationFn: async (data: any) => { const res = isEditing ? await apiRequest("PATCH", `/api/improvements/${item!.id}`, data) : await apiRequest("POST", `/api/my-homes/${homeId}/improvements`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "improvements"] }); toast({ title: isEditing ? "Project updated" : "Project added" }); onOpenChange(false); },
    onError: () => { toast({ title: "Failed to save project", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate({ ...form, homeId, cost: form.cost ? parseInt(form.cost) : null }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEditing ? "Edit" : "Add"} Home Improvement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Project Name *</Label><Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} required placeholder="e.g. Kitchen Remodel" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{IMPROVEMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cost ($)</Label><Input type="number" placeholder="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Completion Date</Label><Input type="date" value={form.completionDate} onChange={(e) => setForm({ ...form, completionDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Materials Used</Label><Input value={form.materials} onChange={(e) => setForm({ ...form, materials: e.target.value })} placeholder="e.g. Sherwin-Williams Agreeable Gray SW 7029" /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.projectName || !form.category || mutation.isPending}>{mutation.isPending ? "Saving..." : isEditing ? "Update" : "Add Project"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EquitySetupDialog({ open, onOpenChange, homeId, profile }: { open: boolean; onOpenChange: (open: boolean) => void; homeId: number; profile?: HomeEquityProfile | null }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ loanAmount: "", interestRate: "", loanTermYears: "30", paymentFrequency: "monthly", loanStartDate: "" });
  useEffect(() => { if (open) { setForm({ loanAmount: profile?.loanAmount?.toString() || "", interestRate: profile?.interestRate || "", loanTermYears: profile?.loanTermYears?.toString() || "30", paymentFrequency: profile?.paymentFrequency || "monthly", loanStartDate: profile?.loanStartDate || "" }); } }, [open, profile]);
  const mutation = useMutation({
    mutationFn: async (data: any) => { const res = await apiRequest("POST", `/api/my-homes/${homeId}/equity`, data); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "equity"] }); toast({ title: "Equity profile saved" }); onOpenChange(false); },
    onError: () => { toast({ title: "Failed to save equity profile", variant: "destructive" }); },
  });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); mutation.mutate({ ...form, homeId, loanAmount: parseInt(form.loanAmount), loanTermYears: parseInt(form.loanTermYears) }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{profile ? "Update" : "Set Up"} Equity Tracker</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label>Original Loan Amount *</Label><Input type="number" placeholder="e.g. 320000" value={form.loanAmount} onChange={(e) => setForm({ ...form, loanAmount: e.target.value })} required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Interest Rate (%) *</Label><Input placeholder="e.g. 6.5" value={form.interestRate} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Loan Term *</Label>
              <Select value={form.loanTermYears} onValueChange={(v) => setForm({ ...form, loanTermYears: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 years</SelectItem>
                  <SelectItem value="20">20 years</SelectItem>
                  <SelectItem value="30">30 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Loan Start Date *</Label><Input type="date" value={form.loanStartDate} onChange={(e) => setForm({ ...form, loanStartDate: e.target.value })} required /></div>
            <div className="space-y-2">
              <Label>Payment Frequency</Label>
              <Select value={form.paymentFrequency} onValueChange={(v) => setForm({ ...form, paymentFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!form.loanAmount || !form.interestRate || !form.loanStartDate || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ScanResult = {
  documentType: string;
  suggestedCategory: string;
  vendor: { name: string; phone: string | null; email: string | null; website: string | null; address: string | null; category: string | null } | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  lineItems: { description: string; amount: number }[] | null;
  expenseCategory: string | null;
  isRecurring: boolean;
  billingPeriod: string | null;
  accountNumber: string | null;
  itemName: string | null;
  brand: string | null;
  model: string | null;
  warrantyProvider: string | null;
  expirationDate: string | null;
  coverageDetails: string | null;
  serviceCategory: string | null;
  recommendation: string | null;
  projectCategory: string | null;
  materials: string | null;
};

function ScanReceiptDialog({ open, onOpenChange, homeId, onResult, targetTab }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  homeId: number;
  onResult: (result: ScanResult) => void;
  targetTab?: string;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!validTypes.some(t => file.type.startsWith(t.split("/")[0]) || file.type === t)) {
      toast({ title: "Unsupported file type", description: "Please upload a PDF, photo, or image file", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB", variant: "destructive" });
      return;
    }

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }

    setScanning(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/my-homes/${homeId}/scan-receipt`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Scan failed");
      const result: ScanResult = await res.json();
      toast({ title: "Document scanned successfully", description: `Detected: ${result.documentType.replace(/_/g, " ")}${result.vendor?.name ? ` from ${result.vendor.name}` : ""}` });
      onResult(result);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Failed to scan document", description: "Please try again or enter details manually", variant: "destructive" });
    } finally {
      setScanning(false);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    }
  }, [homeId, toast, onResult, onOpenChange, preview]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!scanning) { onOpenChange(v); setPreview(null); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanLine className="h-5 w-5 text-primary" />Scan Document</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Upload a photo or PDF of a receipt, invoice, utility bill, warranty card, or service record. AI will extract the details automatically.</p>

        {scanning ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyzing document...</p>
            <p className="text-xs text-muted-foreground">This usually takes a few seconds</p>
            {preview && <img src={preview} alt="Preview" className="mt-2 max-h-32 rounded-lg border object-contain" />}
          </div>
        ) : (
          <div className="space-y-3">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { if (fileRef.current) { fileRef.current.setAttribute("capture", "environment"); fileRef.current.click(); } }}>
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-xs">Take Photo</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); } }}>
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="text-xs">Upload File</span>
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center">Supports PDF, JPG, PNG, WebP · Max 20MB</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddVendorToTeamPrompt({ vendor, onDismiss }: { vendor: ScanResult["vendor"]; onDismiss: () => void }) {
  const { toast } = useToast();
  const [adding, setAdding] = useState(false);

  if (!vendor || !vendor.name) return null;

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await apiRequest("POST", "/api/my-team", {
        contractorId: 0,
        category: vendor.category || "other",
        notes: `Added from scanned document. ${vendor.phone ? `Phone: ${vendor.phone}` : ""} ${vendor.email ? `Email: ${vendor.email}` : ""} ${vendor.website ? `Website: ${vendor.website}` : ""}`.trim(),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
        toast({ title: `${vendor.name} noted`, description: "Check the HomeBase Pros marketplace to find and add verified vendors to your team." });
      } else {
        toast({ title: "Could not add to team directly", description: "Search for this vendor in the HomeBase Pros marketplace to add them to your team." });
      }
    } catch {
      toast({ title: "Search in marketplace", description: `Look for "${vendor.name}" in HomeBase Pros to add them to your team.` });
    }
    setAdding(false);
    onDismiss();
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <UserPlus className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Add {vendor.name} to your team?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[vendor.phone, vendor.email, vendor.category?.replace(/_/g, " ")].filter(Boolean).join(" · ")}
            </p>
            <div className="flex gap-2 mt-2">
              <Link href={`/marketplace?search=${encodeURIComponent(vendor.name)}`}>
                <Button size="sm" variant="default" className="h-7 text-xs"><Search className="h-3 w-3 mr-1" />Find in Marketplace</Button>
              </Link>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onDismiss}><X className="h-3 w-3 mr-1" />Dismiss</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpensesTab({ homeId, pendingScan, onScanConsumed }: { homeId: number; pendingScan?: ScanResult | null; onScanConsumed?: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<HomeExpense | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [scannedVendor, setScannedVendor] = useState<ScanResult["vendor"] | null>(null);
  const { data: expenses = [], isLoading } = useQuery<HomeExpense[]>({ queryKey: ["/api/my-homes", homeId, "expenses"], queryFn: async () => { const r = await fetch(`/api/my-homes/${homeId}/expenses`, { credentials: "include" }); return r.json(); } });
  const deleteMutation = useMutation({ mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/expenses/${id}`); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "expenses"] }); } });

  useEffect(() => {
    if (pendingScan) {
      handleScanResult(pendingScan);
      onScanConsumed?.();
    }
  }, [pendingScan]);

  const handleScanResult = useCallback((result: ScanResult) => {
    const prefilled: any = {
      category: result.expenseCategory || "",
      description: result.description || "",
      amount: result.amount?.toString() || "",
      billingDate: result.date || "",
      isRecurring: result.isRecurring,
      frequency: "monthly",
      provider: result.vendor?.name || "",
      notes: result.recommendation || "",
    };
    setEditing(prefilled as any);
    setShowDialog(true);
    if (result.vendor?.name) setScannedVendor(result.vendor);
  }, []);

  const monthlyTotal = useMemo(() => expenses.filter(e => e.isRecurring && e.frequency === 'monthly').reduce((s, e) => s + (e.amount || 0), 0), [expenses]);
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => { map.set(e.category, (map.get(e.category) || 0) + (e.amount || 0)); });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Home Expenses</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowScan(true)}><ScanLine className="h-4 w-4 mr-1" />Scan</Button>
          <Button size="sm" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Expense</Button>
        </div>
      </div>

      {expenses.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Monthly Recurring</p><p className="text-xl font-bold">${monthlyTotal.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Entries</p><p className="text-xl font-bold">{expenses.length}</p></CardContent></Card>
        </div>
      )}

      {expenses.length === 0 ? (
        <Card><CardContent className="text-center py-8">
          <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No expenses tracked yet</p>
          <p className="text-sm text-muted-foreground mt-1">Track your recurring home costs like electric, water, internet, and more</p>
          <Button variant="outline" className="mt-4" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add First Expense</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {expenses.map((e) => {
            const catInfo = EXPENSE_CATEGORIES.find(c => c.value === e.category);
            const Icon = catInfo?.icon || MoreHorizontal;
            return (
              <Card key={e.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{catInfo?.label || e.category}</span>
                        <span className="text-base font-bold ml-auto">${(e.amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {e.provider && <span className="text-xs text-muted-foreground">{e.provider}</span>}
                        {e.billingDate && <span className="text-xs text-muted-foreground">{new Date(e.billingDate).toLocaleDateString()}</span>}
                        <Badge variant={e.isRecurring ? "default" : "secondary"} className="text-[10px] h-5">{e.isRecurring ? e.frequency : "one-time"}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(e); setShowDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {scannedVendor && <AddVendorToTeamPrompt vendor={scannedVendor} onDismiss={() => setScannedVendor(null)} />}
      <ExpenseDialog open={showDialog} onOpenChange={setShowDialog} homeId={homeId} expense={editing} />
      <ScanReceiptDialog open={showScan} onOpenChange={setShowScan} homeId={homeId} onResult={handleScanResult} targetTab="expenses" />
    </div>
  );
}

function RemindersTab({ homeId }: { homeId: number }) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<HomeMaintenanceReminder | null>(null);
  const { data: reminders = [], isLoading } = useQuery<HomeMaintenanceReminder[]>({ queryKey: ["/api/my-homes", homeId, "reminders"], queryFn: async () => { const r = await fetch(`/api/my-homes/${homeId}/reminders`, { credentials: "include" }); return r.json(); } });
  const deleteMutation = useMutation({ mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/home-reminders/${id}`); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "reminders"] }); } });
  const completeMutation = useMutation({
    mutationFn: async (r: HomeMaintenanceReminder) => {
      const today = new Date().toISOString().split('T')[0];
      let nextDue = r.nextDue;
      const d = new Date(r.nextDue);
      if (r.frequency === 'monthly') d.setMonth(d.getMonth() + 1);
      else if (r.frequency === 'quarterly') d.setMonth(d.getMonth() + 3);
      else if (r.frequency === 'semi_annual') d.setMonth(d.getMonth() + 6);
      else if (r.frequency === 'annual') d.setFullYear(d.getFullYear() + 1);
      nextDue = d.toISOString().split('T')[0];
      const res = await apiRequest("PATCH", `/api/home-reminders/${r.id}`, { lastCompleted: today, nextDue, isCompleted: r.frequency === 'one_time' });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "reminders"] }); toast({ title: "Marked as complete" }); },
  });

  const addSeasonalReminders = useMutation({
    mutationFn: async () => {
      const today = new Date();
      for (const r of SEASONAL_REMINDERS) {
        const nextDue = new Date(today);
        if (r.frequency === 'quarterly') nextDue.setMonth(nextDue.getMonth() + 3);
        else if (r.frequency === 'semi_annual') nextDue.setMonth(nextDue.getMonth() + 6);
        else nextDue.setFullYear(nextDue.getFullYear() + 1);
        await apiRequest("POST", `/api/my-homes/${homeId}/reminders`, { ...r, homeId, nextDue: nextDue.toISOString().split('T')[0] });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "reminders"] }); toast({ title: "Seasonal reminders added" }); },
  });

  const overdue = reminders.filter(r => !r.isCompleted && new Date(r.nextDue) < new Date());
  const upcoming = reminders.filter(r => !r.isCompleted && new Date(r.nextDue) >= new Date());
  const completed = reminders.filter(r => r.isCompleted);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Maintenance Reminders</h3>
        <div className="flex gap-2">
          {reminders.length === 0 && <Button size="sm" variant="outline" onClick={() => addSeasonalReminders.mutate()} disabled={addSeasonalReminders.isPending}><Sparkles className="h-4 w-4 mr-1" />Add Seasonal Checklist</Button>}
          <Button size="sm" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Reminder</Button>
        </div>
      </div>

      {overdue.length > 0 && (
        <Card className="border-destructive/50"><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" />Overdue ({overdue.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overdue.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div><p className="font-medium text-sm">{r.title}</p><p className="text-xs text-muted-foreground">Due {new Date(r.nextDue).toLocaleDateString()} · {REMINDER_CATEGORIES.find(c => c.value === r.category)?.label}</p></div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(r)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Done</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setShowDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcoming.length > 0 && (
        <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Upcoming ({upcoming.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div><p className="font-medium text-sm">{r.title}</p><p className="text-xs text-muted-foreground">Due {new Date(r.nextDue).toLocaleDateString()} · {REMINDER_CATEGORIES.find(c => c.value === r.category)?.label} · {r.frequency?.replace('_', '-')}</p></div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => completeMutation.mutate(r)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Done</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setShowDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {reminders.length === 0 && (
        <Card><CardContent className="text-center py-8">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reminders set</p>
          <p className="text-sm text-muted-foreground mt-1">Stay on top of home maintenance with automated reminders</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => addSeasonalReminders.mutate()} disabled={addSeasonalReminders.isPending}><Sparkles className="h-4 w-4 mr-1" />Add Seasonal Checklist</Button>
            <Button variant="outline" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Custom Reminder</Button>
          </div>
        </CardContent></Card>
      )}

      <ReminderDialog open={showDialog} onOpenChange={setShowDialog} homeId={homeId} reminder={editing} />
    </div>
  );
}

type LenderLeadType = 'refinance' | 'heloc' | 'purchase' | 'other';

function LenderLeadDialog({ open, onOpenChange, home, equityData, leadType }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  home: HomeownerHome;
  equityData?: { balance: number; equityPercent: number; equityAmount: number; estimatedValue: number; monthlyPayment: number; rateDiff?: number | null; currentRate?: number | null } | null;
  leadType: LenderLeadType;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ phone: "", creditScore: "", message: "", loanType: "conventional" as string });

  useEffect(() => {
    if (open) {
      const defaultMsg = leadType === 'refinance'
        ? `I'm interested in refinancing. Current rate: ${equityData?.rateDiff ? `my rate is ${equityData.rateDiff.toFixed(2)}% above current market rates` : 'seeking a better rate'}. Estimated home value: $${(equityData?.estimatedValue || home.purchasePrice || 0).toLocaleString()}. Remaining balance: ~$${(equityData?.balance || 0).toLocaleString()}.`
        : leadType === 'heloc'
        ? `I'm interested in a HELOC or home equity loan. Estimated equity: $${(equityData?.equityAmount || 0).toLocaleString()} (${equityData?.equityPercent || 0}%). Estimated home value: $${(equityData?.estimatedValue || home.purchasePrice || 0).toLocaleString()}.`
        : '';
      setForm({ phone: user?.phone || "", creditScore: "", message: defaultMsg, loanType: "conventional" });
    }
  }, [open, leadType, equityData, home, user]);

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/lender-leads/submit", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: data.assigned ? "Request sent to a local lender!" : "Request submitted",
        description: data.assigned
          ? "A lender in your area will be in touch soon."
          : "We'll connect you with a lender when one is available in your area.",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to submit request", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const nameParts = (user.name || user.username || "").split(" ");
    submitMutation.mutate({
      firstName: nameParts[0] || user.username,
      lastName: nameParts.slice(1).join(" ") || "",
      email: user.email || "",
      phone: form.phone || null,
      zipCode: home.zipCode || "00000",
      loanType: form.loanType,
      purchasePrice: (equityData?.estimatedValue || home.purchasePrice || "").toString(),
      creditScore: form.creditScore || null,
      message: form.message || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {leadType === 'refinance' ? <><Percent className="h-5 w-5 text-green-600" />Talk to a Lender About Refinancing</> : <><PiggyBank className="h-5 w-5 text-primary" />Explore Home Equity Options</>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5 text-sm">
            <p className="font-medium">{home.address}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground text-xs">
              {equityData?.estimatedValue && <span>Est. Value: ${equityData.estimatedValue.toLocaleString()}</span>}
              {equityData?.balance && <span>Balance: ${equityData.balance.toLocaleString()}</span>}
              {equityData?.equityPercent && <span>Equity: {equityData.equityPercent}%</span>}
              {equityData?.monthlyPayment && <span>Payment: ${equityData.monthlyPayment.toLocaleString()}/mo</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input placeholder="(555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Credit Score Range</Label>
              <Select value={form.creditScore} onValueChange={(v) => setForm({ ...form, creditScore: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="760+">Excellent (760+)</SelectItem>
                  <SelectItem value="700-759">Good (700-759)</SelectItem>
                  <SelectItem value="660-699">Fair (660-699)</SelectItem>
                  <SelectItem value="620-659">Below Avg (620-659)</SelectItem>
                  <SelectItem value="below-620">Poor (&lt;620)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Loan Type</Label>
            <Select value={form.loanType} onValueChange={(v) => setForm({ ...form, loanType: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conventional">Conventional</SelectItem>
                <SelectItem value="fha">FHA</SelectItem>
                <SelectItem value="va">VA</SelectItem>
                <SelectItem value="usda">USDA</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Message to Lender</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
          </div>
          <p className="text-[11px] text-muted-foreground">Your information will be shared with a verified lender in your area. By submitting, you agree to be contacted about lending options.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitMutation.isPending}>{submitMutation.isPending ? "Submitting..." : "Connect Me with a Lender"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EquityTab({ homeId, home }: { homeId: number; home: HomeownerHome }) {
  const { toast } = useToast();
  const [showSetup, setShowSetup] = useState(false);
  const [showLenderDialog, setShowLenderDialog] = useState(false);
  const [leadType, setLeadType] = useState<LenderLeadType>('refinance');
  const { data: profile, isLoading } = useQuery<HomeEquityProfile | null>({ queryKey: ["/api/my-homes", homeId, "equity"], queryFn: async () => { const r = await fetch(`/api/my-homes/${homeId}/equity`, { credentials: "include" }); return r.json(); } });
  const { data: rates } = useQuery<{ rate30yr: string; rate15yr: string; source: string; asOf: string }>({ queryKey: ["/api/mortgage-rates"] });
  const { data: insights } = useQuery<{ medianValue: number | null; estimatedValue: number | null; disclaimer: string }>({ queryKey: ["/api/my-homes", homeId, "market-insights"], queryFn: async () => { const r = await fetch(`/api/my-homes/${homeId}/market-insights`, { credentials: "include" }); return r.json(); } });

  const refreshMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", `/api/my-homes/${homeId}/equity/refresh-estimate`); return res.json(); },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "equity"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "market-insights"] });
      if (data.estimatedValue) toast({ title: `Estimated value: $${data.estimatedValue.toLocaleString()}` });
      else toast({ title: "Could not determine estimate", description: "Try again later", variant: "destructive" });
    },
    onError: (error: any) => {
      if (error?.message?.includes('429')) toast({ title: "Recently refreshed", description: "You can refresh once per month" });
      else toast({ title: "Failed to refresh estimate", variant: "destructive" });
    },
  });

  const equity = useMemo(() => {
    if (!profile) return null;
    const loanAmount = profile.loanAmount;
    const rate = parseFloat(profile.interestRate) / 100;
    const monthlyRate = rate / 12;
    const totalPayments = profile.loanTermYears * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
    const startDate = new Date(profile.loanStartDate);
    const now = new Date();
    const monthsElapsed = Math.max(0, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
    let balance = loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;
    for (let i = 0; i < Math.min(monthsElapsed, totalPayments); i++) {
      const interest = balance * monthlyRate;
      const principal = monthlyPayment - interest;
      totalInterest += interest;
      totalPrincipal += principal;
      balance -= principal;
    }
    balance = Math.max(0, balance);
    const purchasePrice = home.purchasePrice || loanAmount;
    const estimatedValue = profile.estimatedValue || purchasePrice;
    const equityAmount = estimatedValue - balance;
    const equityPercent = (equityAmount / estimatedValue) * 100;
    const currentRate = rates ? parseFloat(rates.rate30yr) : null;
    const rateDiff = currentRate ? parseFloat(profile.interestRate) - currentRate : null;
    const refinanceOpportunity = rateDiff !== null && rateDiff >= 0.5;
    const helocAvailable = equityPercent > 20 ? Math.round((estimatedValue * 0.8) - balance) : 0;
    return { balance: Math.round(balance), monthlyPayment: Math.round(monthlyPayment), equityAmount: Math.round(equityAmount), equityPercent: Math.round(equityPercent), totalInterest: Math.round(totalInterest), totalPrincipal: Math.round(totalPrincipal), monthsElapsed, estimatedValue, refinanceOpportunity, rateDiff, currentRate, helocAvailable };
  }, [profile, home, rates]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  if (!profile) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Equity Tracker</h3>
        <Card><CardContent className="text-center py-8">
          <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Set up your equity tracker</p>
          <p className="text-sm text-muted-foreground mt-1">Enter your loan details to track your equity, get refinance alerts, and explore home equity options</p>
          <Button className="mt-4" onClick={() => setShowSetup(true)}><Plus className="h-4 w-4 mr-1" />Set Up Equity Tracker</Button>
        </CardContent></Card>
        <EquitySetupDialog open={showSetup} onOpenChange={setShowSetup} homeId={homeId} profile={null} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Equity Tracker</h3>
        <Button size="sm" variant="outline" onClick={() => setShowSetup(true)}><Pencil className="h-4 w-4 mr-1" />Edit Loan Details</Button>
      </div>

      {equity && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Estimated Equity</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">${equity.equityAmount.toLocaleString()}</p>
              <Progress value={Math.min(equity.equityPercent, 100)} className="mt-1.5 h-1.5" />
              <p className="text-[11px] text-muted-foreground mt-1">{equity.equityPercent}% equity</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Remaining Balance</p>
              <p className="text-lg md:text-2xl font-bold">${equity.balance.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{equity.monthsElapsed} months paid</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Monthly Payment</p>
              <p className="text-lg md:text-2xl font-bold">${equity.monthlyPayment.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground mt-1">P&I at {profile.interestRate}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-3">
              <p className="text-xs text-muted-foreground">Estimated Value</p>
              <p className="text-lg md:text-2xl font-bold">${equity.estimatedValue.toLocaleString()}</p>
              <Button size="sm" variant="link" className="p-0 h-auto text-xs" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                <RefreshCw className={`h-3 w-3 mr-1 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Estimate
              </Button>
            </CardContent></Card>
          </div>

          {rates && (
            <Card><CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><Percent className="h-3.5 w-3.5 text-primary" />Current Rates</h4>
                <Badge variant="outline" className="text-[10px]">{rates.source === 'freddie_mac' ? 'PMMS' : 'Est.'}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><p className="text-xs text-muted-foreground">30-Yr Fixed</p><p className="text-base font-bold">{rates.rate30yr}%</p></div>
                <div><p className="text-xs text-muted-foreground">15-Yr Fixed</p><p className="text-base font-bold">{rates.rate15yr}%</p></div>
                <div><p className="text-xs text-muted-foreground">Your Rate</p><p className="text-base font-bold">{profile.interestRate}%</p></div>
                <div><p className="text-xs text-muted-foreground">Difference</p><p className={`text-base font-bold ${equity.rateDiff && equity.rateDiff > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>{equity.rateDiff !== null ? `${equity.rateDiff > 0 ? '+' : ''}${equity.rateDiff.toFixed(2)}%` : '—'}</p></div>
              </div>
            </CardContent></Card>
          )}

          {equity.refinanceOpportunity && (
            <Card className="border-green-500/50 bg-green-50 dark:bg-green-950/20"><CardContent className="p-4">
              <div className="flex items-start gap-3">
                <ArrowUpRight className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300">Refinance Opportunity</h4>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">Current rates are {equity.rateDiff?.toFixed(2)}% lower than your rate. Refinancing could save you approximately ${Math.round((equity.rateDiff || 0) / 100 * equity.balance / 12).toLocaleString()}/month.</p>
                  <Button size="sm" className="mt-3 gap-1" onClick={() => { setLeadType('refinance'); setShowLenderDialog(true); }}>Talk to a Lender<ArrowUpRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          )}

          {equity.helocAvailable > 0 && (
            <Card><CardContent className="p-4">
              <div className="flex items-start gap-3">
                <PiggyBank className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold">Home Equity Options</h4>
                  <p className="text-sm text-muted-foreground mt-1">With {equity.equityPercent}% equity, you may qualify for a HELOC or home equity loan up to approximately <span className="font-semibold text-foreground">${equity.helocAvailable.toLocaleString()}</span>. Use it for home improvements, debt consolidation, or major purchases.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => { setLeadType('heloc'); setShowLenderDialog(true); }}>Explore Equity Options<ArrowUpRight className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent></Card>
          )}

          {insights && (
            <Card><CardContent className="p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-3"><MapPin className="h-4 w-4 text-primary" />Market Insights</h4>
              <div className="grid grid-cols-2 gap-4">
                {insights.medianValue && <div><p className="text-sm text-muted-foreground">ZIP Median Home Value</p><p className="text-lg font-bold">${insights.medianValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Census Bureau ACS</p></div>}
                {insights.estimatedValue && <div><p className="text-sm text-muted-foreground">Your Property Estimate</p><p className="text-lg font-bold">${insights.estimatedValue.toLocaleString()}</p></div>}
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1"><HelpCircle className="h-3 w-3" />{insights.disclaimer}</p>
            </CardContent></Card>
          )}
        </>
      )}

      <EquitySetupDialog open={showSetup} onOpenChange={setShowSetup} homeId={homeId} profile={profile} />
      <LenderLeadDialog open={showLenderDialog} onOpenChange={setShowLenderDialog} home={home} equityData={equity} leadType={leadType} />
    </div>
  );
}

function WarrantyTab({ homeId, pendingScan, onScanConsumed }: { homeId: number; pendingScan?: ScanResult | null; onScanConsumed?: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<HomeWarrantyItem | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [scannedVendor, setScannedVendor] = useState<ScanResult["vendor"] | null>(null);
  const { data: items = [], isLoading } = useQuery<HomeWarrantyItem[]>({ queryKey: ["/api/my-homes", homeId, "warranty"], queryFn: async () => { const r = await fetch(`/api/my-homes/${homeId}/warranty`, { credentials: "include" }); return r.json(); } });
  const deleteMutation = useMutation({ mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/warranty/${id}`); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "warranty"] }); } });

  useEffect(() => {
    if (pendingScan) {
      handleScanResult(pendingScan);
      onScanConsumed?.();
    }
  }, [pendingScan]);

  const handleScanResult = useCallback((result: ScanResult) => {
    const prefilled: any = {
      itemName: result.itemName || result.description || "",
      brand: result.brand || "",
      model: result.model || "",
      warrantyProvider: result.warrantyProvider || result.vendor?.name || "",
      coverageDetails: result.coverageDetails || "",
      purchaseDate: result.date || "",
      expirationDate: result.expirationDate || "",
      notes: "",
    };
    setEditing(prefilled as any);
    setShowDialog(true);
    if (result.vendor?.name) setScannedVendor(result.vendor);
  }, []);

  const expiringSoon = items.filter(i => { if (!i.expirationDate) return false; const d = new Date(i.expirationDate); const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24); return diff > 0 && diff <= 90; });
  const expired = items.filter(i => i.expirationDate && new Date(i.expirationDate) < new Date());

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Shield className="h-5 w-5 text-primary" />Warranty Tracker</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowScan(true)}><ScanLine className="h-4 w-4 mr-1" />Scan</Button>
          <Button size="sm" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Warranty</Button>
        </div>
      </div>

      {expiringSoon.length > 0 && (
        <Card className="border-amber-500/50"><CardContent className="p-4">
          <p className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Expiring Soon</p>
          <div className="mt-2 space-y-1">{expiringSoon.map(i => <p key={i.id} className="text-sm">{i.itemName} — expires {new Date(i.expirationDate!).toLocaleDateString()}</p>)}</div>
        </CardContent></Card>
      )}

      {items.length === 0 ? (
        <Card><CardContent className="text-center py-8">
          <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No warranty items tracked</p>
          <p className="text-sm text-muted-foreground mt-1">Keep track of warranties for your appliances, systems, and home components</p>
          <Button variant="outline" className="mt-4" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add First Warranty</Button>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map(i => {
            const isExpired = i.expirationDate && new Date(i.expirationDate) < new Date();
            return (
              <Card key={i.id} className={isExpired ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{i.itemName}</p>
                      {i.brand && <p className="text-sm text-muted-foreground">{i.brand} {i.model ? `· ${i.model}` : ''}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(i); setShowDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {i.warrantyProvider && <p className="text-sm mt-1">Provider: {i.warrantyProvider}</p>}
                  {i.expirationDate && <Badge variant={isExpired ? "destructive" : "secondary"} className="mt-2">{isExpired ? "Expired" : `Expires ${new Date(i.expirationDate).toLocaleDateString()}`}</Badge>}
                  {i.coverageDetails && <p className="text-xs text-muted-foreground mt-2">{i.coverageDetails}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {scannedVendor && <AddVendorToTeamPrompt vendor={scannedVendor} onDismiss={() => setScannedVendor(null)} />}
      <WarrantyDialog open={showDialog} onOpenChange={setShowDialog} homeId={homeId} item={editing} />
      <ScanReceiptDialog open={showScan} onOpenChange={setShowScan} homeId={homeId} onResult={handleScanResult} targetTab="warranty" />
    </div>
  );
}

function ImprovementsTab({ homeId, pendingScan, onScanConsumed }: { homeId: number; pendingScan?: ScanResult | null; onScanConsumed?: () => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<HomeImprovement | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [scannedVendor, setScannedVendor] = useState<ScanResult["vendor"] | null>(null);
  const { data: items = [], isLoading } = useQuery<HomeImprovement[]>({ queryKey: ["/api/my-homes", homeId, "improvements"], queryFn: async () => { const r = await fetch(`/api/my-homes/${homeId}/improvements`, { credentials: "include" }); return r.json(); } });
  const deleteMutation = useMutation({ mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/improvements/${id}`); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId, "improvements"] }); } });

  useEffect(() => {
    if (pendingScan) {
      handleScanResult(pendingScan);
      onScanConsumed?.();
    }
  }, [pendingScan]);

  const handleScanResult = useCallback((result: ScanResult) => {
    const prefilled: any = {
      projectName: result.description || "",
      description: result.recommendation || "",
      category: result.projectCategory || "",
      cost: result.amount?.toString() || "",
      startDate: result.date || "",
      completionDate: "",
      materials: result.materials || "",
      notes: result.vendor?.name ? `Contractor: ${result.vendor.name}` : "",
    };
    setEditing(prefilled as any);
    setShowDialog(true);
    if (result.vendor?.name) setScannedVendor(result.vendor);
  }, []);

  const totalSpent = useMemo(() => items.reduce((s, i) => s + (i.cost || 0), 0), [items]);

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Hammer className="h-5 w-5 text-primary" />Home Improvements</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowScan(true)}><ScanLine className="h-4 w-4 mr-1" />Scan</Button>
          <Button size="sm" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add Project</Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Projects</p><p className="text-2xl font-bold">{items.length}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Invested</p><p className="text-2xl font-bold">${totalSpent.toLocaleString()}</p></CardContent></Card>
        </div>
      )}

      {items.length === 0 ? (
        <Card><CardContent className="text-center py-8">
          <Hammer className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No improvements logged</p>
          <p className="text-sm text-muted-foreground mt-1">Track renovations, paint colors, materials, and costs for resale or insurance</p>
          <Button variant="outline" className="mt-4" onClick={() => { setEditing(null); setShowDialog(true); }}><Plus className="h-4 w-4 mr-1" />Add First Project</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {items.map(i => (
            <Card key={i.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{i.projectName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{IMPROVEMENT_CATEGORIES.find(c => c.value === i.category)?.label || i.category}</Badge>
                      {i.cost && <span className="text-sm font-medium">${i.cost.toLocaleString()}</span>}
                      {i.completionDate && <span className="text-xs text-muted-foreground">Completed {new Date(i.completionDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(i); setShowDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(i.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                {i.description && <p className="text-sm text-muted-foreground mt-2">{i.description}</p>}
                {i.materials && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><PaintBucket className="h-3 w-3" />{i.materials}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {scannedVendor && <AddVendorToTeamPrompt vendor={scannedVendor} onDismiss={() => setScannedVendor(null)} />}
      <ImprovementDialog open={showDialog} onOpenChange={setShowDialog} homeId={homeId} item={editing} />
      <ScanReceiptDialog open={showScan} onOpenChange={setShowScan} homeId={homeId} onResult={handleScanResult} targetTab="improvements" />
    </div>
  );
}

function DocumentsTab() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary" />Document Vault</h3>
      <Card><CardContent className="p-6">
        <div className="text-center py-4">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Connect your Dropbox</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Store important home documents like insurance policies, title work, surveys, and appliance manuals securely in your Dropbox — accessible anytime from your MyHome hub.</p>
          <Link href="/settings"><Button className="mt-4 gap-1">Connect Dropbox in Settings<ArrowUpRight className="h-3.5 w-3.5" /></Button></Link>
        </div>
      </CardContent></Card>
    </div>
  );
}

function HomeCard({ home, onSelect, isSelected }: { home: HomeownerHome; onSelect: (id: number) => void; isSelected: boolean }) {
  return (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "ring-2 ring-primary" : ""}`} onClick={() => onSelect(home.id)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /><CardTitle className="text-base">{home.address}</CardTitle></div>
        </div>
        {(home.city || home.state) && <CardDescription className="flex items-center gap-1"><MapPin className="h-3 w-3" />{[home.city, home.state, home.zipCode].filter(Boolean).join(", ")}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {home.purchasePrice && <div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /><span>${home.purchasePrice.toLocaleString()}</span></div>}
          {home.purchaseDate && <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /><span>{new Date(home.purchaseDate).toLocaleDateString()}</span></div>}
        </div>
      </CardContent>
    </Card>
  );
}

function HomeDetail({ homeId }: { homeId: number }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [scannedVendor, setScannedVendor] = useState<ScanResult["vendor"] | null>(null);
  const [pendingScanResult, setPendingScanResult] = useState<ScanResult | null>(null);

  const handleScanResult = useCallback((result: ScanResult) => {
    const cat = result.suggestedCategory;
    if (cat === "expense") {
      setPendingScanResult(result);
      setActiveTab("expenses");
    } else if (cat === "warranty") {
      setPendingScanResult(result);
      setActiveTab("warranty");
    } else if (cat === "improvement") {
      setPendingScanResult(result);
      setActiveTab("improvements");
    } else {
      const prefilled: any = {
        category: result.serviceCategory || "",
        description: result.description || "",
        serviceDate: result.date || "",
        cost: result.amount?.toString() || "",
        notes: result.recommendation || "",
        contractorId: null,
      };
      setEditingRecord(prefilled as any);
      setShowMaintenanceDialog(true);
    }
    if (result.vendor?.name) setScannedVendor(result.vendor);
  }, []);

  const { data: homeData, isLoading } = useQuery<HomeWithMaintenance>({
    queryKey: ["/api/my-homes", homeId],
    queryFn: async () => { const res = await fetch(`/api/my-homes/${homeId}`, { credentials: "include" }); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const deleteMaintenanceMutation = useMutation({
    mutationFn: async (recordId: number) => { await apiRequest("DELETE", `/api/maintenance/${recordId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes", homeId] }); toast({ title: "Record deleted" }); },
  });

  const deleteHomeMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/my-homes/${homeId}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/my-homes"] }); toast({ title: "Home removed" }); },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if (!homeData) return null;

  const maintenance = homeData.maintenance || [];
  const categoryLabel = (cat: string) => MAINTENANCE_CATEGORIES.find((c) => c.value === cat)?.label || cat;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-semibold text-base truncate">{homeData.address}</h2>
              </div>
              {(homeData.city || homeData.state) && <p className="text-sm text-muted-foreground mt-0.5 ml-6">{[homeData.city, homeData.state, homeData.zipCode].filter(Boolean).join(", ")}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => deleteHomeMutation.mutate()} className="text-destructive hover:text-destructive h-8 w-8 shrink-0"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {homeData.purchasePrice && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Purchase Price</p><p className="text-base font-semibold">${homeData.purchasePrice.toLocaleString()}</p></div>}
            {homeData.purchaseDate && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Purchase Date</p><p className="text-base font-semibold">{new Date(homeData.purchaseDate).toLocaleDateString()}</p></div>}
            <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Service Records</p><p className="text-base font-semibold">{maintenance.length}</p></div>
            {maintenance.length > 0 && <div className="bg-muted/50 rounded-lg p-2.5"><p className="text-xs text-muted-foreground">Total Spent</p><p className="text-base font-semibold">${maintenance.reduce((sum, r) => sum + (r.cost || 0), 0).toLocaleString()}</p></div>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full md:hidden">
            <SelectValue>
              {[
                { value: "overview", label: "Overview", icon: ClipboardList },
                { value: "expenses", label: "Expenses", icon: DollarSign },
                { value: "reminders", label: "Reminders", icon: Bell },
                { value: "equity", label: "Equity Tracker", icon: TrendingUp },
                { value: "warranty", label: "Warranty", icon: Shield },
                { value: "improvements", label: "Projects", icon: Hammer },
                { value: "documents", label: "Documents", icon: FolderOpen },
              ].map(t => activeTab === t.value ? <span key={t.value} className="flex items-center gap-2"><t.icon className="h-4 w-4" />{t.label}</span> : null)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {[
              { value: "overview", label: "Overview", icon: ClipboardList },
              { value: "expenses", label: "Expenses", icon: DollarSign },
              { value: "reminders", label: "Reminders", icon: Bell },
              { value: "equity", label: "Equity Tracker", icon: TrendingUp },
              { value: "warranty", label: "Warranty", icon: Shield },
              { value: "improvements", label: "Projects", icon: Hammer },
              { value: "documents", label: "Documents", icon: FolderOpen },
            ].map(t => (
              <SelectItem key={t.value} value={t.value}>
                <span className="flex items-center gap-2"><t.icon className="h-4 w-4" />{t.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="hidden md:flex w-full">
            <TabsTrigger value="overview" className="flex-1 gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="expenses" className="flex-1 gap-1.5"><DollarSign className="h-3.5 w-3.5" />Expenses</TabsTrigger>
            <TabsTrigger value="reminders" className="flex-1 gap-1.5"><Bell className="h-3.5 w-3.5" />Reminders</TabsTrigger>
            <TabsTrigger value="equity" className="flex-1 gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Equity</TabsTrigger>
            <TabsTrigger value="warranty" className="flex-1 gap-1.5"><Shield className="h-3.5 w-3.5" />Warranty</TabsTrigger>
            <TabsTrigger value="improvements" className="flex-1 gap-1.5"><Hammer className="h-3.5 w-3.5" />Projects</TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 gap-1.5"><FolderOpen className="h-3.5 w-3.5" />Docs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1 md:flex-none" onClick={() => setShowScan(true)}><ScanLine className="h-4 w-4 mr-1.5" />Scan</Button>
                <Button size="sm" className="flex-1 md:flex-none" onClick={() => { setEditingRecord(null); setShowMaintenanceDialog(true); }}><Plus className="h-4 w-4 mr-1.5" />Add Record</Button>
                <Link href="/marketplace" className="flex-1 md:flex-none"><Button size="sm" variant="outline" className="w-full"><Search className="h-4 w-4 mr-1.5" />Find a Pro</Button></Link>
                <Link href="/my-team" className="flex-1 md:flex-none"><Button size="sm" variant="outline" className="w-full"><Users className="h-4 w-4 mr-1.5" />My Team</Button></Link>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><CardTitle className="text-base">Maintenance History</CardTitle></div>
                    <Badge variant="secondary" className="text-xs">{maintenance.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {maintenance.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Wrench className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No maintenance records yet</p>
                      <p className="text-xs mt-1">Track your home services and repairs here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {maintenance.sort((a, b) => { if (!a.serviceDate && !b.serviceDate) return 0; if (!a.serviceDate) return 1; if (!b.serviceDate) return -1; return new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime(); }).map((record) => (
                        <div key={record.id} className="flex items-start justify-between p-3 rounded-lg border">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs shrink-0">{categoryLabel(record.category)}</Badge>
                              {record.cost ? <span className="text-sm font-semibold">${record.cost.toLocaleString()}</span> : null}
                            </div>
                            <p className="text-sm mt-1 truncate">{record.description}</p>
                            {record.serviceDate && <p className="text-xs text-muted-foreground mt-0.5">{new Date(record.serviceDate).toLocaleDateString()}</p>}
                          </div>
                          <div className="flex gap-0.5 ml-2 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingRecord(record); setShowMaintenanceDialog(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMaintenanceMutation.mutate(record.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="expenses" className="mt-4"><ExpensesTab homeId={homeId} pendingScan={activeTab === "expenses" ? pendingScanResult : null} onScanConsumed={() => setPendingScanResult(null)} /></TabsContent>
          <TabsContent value="reminders" className="mt-4"><RemindersTab homeId={homeId} /></TabsContent>
          <TabsContent value="equity" className="mt-4"><EquityTab homeId={homeId} home={homeData} /></TabsContent>
          <TabsContent value="warranty" className="mt-4"><WarrantyTab homeId={homeId} pendingScan={activeTab === "warranty" ? pendingScanResult : null} onScanConsumed={() => setPendingScanResult(null)} /></TabsContent>
          <TabsContent value="improvements" className="mt-4"><ImprovementsTab homeId={homeId} pendingScan={activeTab === "improvements" ? pendingScanResult : null} onScanConsumed={() => setPendingScanResult(null)} /></TabsContent>
          <TabsContent value="documents" className="mt-4"><DocumentsTab /></TabsContent>
        </Tabs>
      </div>

      {scannedVendor && <AddVendorToTeamPrompt vendor={scannedVendor} onDismiss={() => setScannedVendor(null)} />}
      <MaintenanceDialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog} homeId={homeId} record={editingRecord} />
      <ScanReceiptDialog open={showScan} onOpenChange={setShowScan} homeId={homeId} onResult={handleScanResult} targetTab="overview" />
    </div>
  );
}

export default function MyHomePage() {
  const { user } = useAuth();
  const [selectedHomeId, setSelectedHomeId] = useState<number | null>(null);
  const [showAddHome, setShowAddHome] = useState(false);

  const { data: homes = [], isLoading } = useQuery<HomeownerHome[]>({ queryKey: ["/api/my-homes"] });

  if (selectedHomeId && !homes.find((h) => h.id === selectedHomeId) && homes.length > 0) {
    setSelectedHomeId(homes[0].id);
  }

  const activeHomeId = selectedHomeId || (homes.length > 0 ? homes[0].id : null);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Home className="h-5 w-5 md:h-6 md:w-6 text-primary" />MyHome</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your complete homeowner hub</p>
        </div>
        <Button size="sm" onClick={() => setShowAddHome(true)}><Plus className="h-4 w-4 mr-1.5" />Add Home</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : homes.length === 0 ? (
        <Card><CardContent className="text-center py-12">
          <Home className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-semibold mb-2">No homes added yet</h3>
          <p className="text-muted-foreground mb-4">Add your home to start tracking expenses, maintenance, equity, and more.</p>
          <Button onClick={() => setShowAddHome(true)}><Plus className="h-4 w-4 mr-2" />Add Your First Home</Button>
        </CardContent></Card>
      ) : (
        <>
          {homes.length > 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {homes.map((home) => <HomeCard key={home.id} home={home} onSelect={setSelectedHomeId} isSelected={home.id === activeHomeId} />)}
            </div>
          )}
          {activeHomeId && <HomeDetail homeId={activeHomeId} />}
        </>
      )}
      <AddHomeDialog open={showAddHome} onOpenChange={setShowAddHome} />
    </div>
  );
}
