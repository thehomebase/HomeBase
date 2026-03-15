import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Megaphone, Eye, MousePointerClick, DollarSign, Trash2, Edit, Pause, Play
} from "lucide-react";

export default function SponsoredAdsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editAd, setEditAd] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", type: "marketplace", category: "",
    targetUrl: "", budgetCents: "", startDate: "", endDate: ""
  });

  const { data: ads = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/ads/mine"] });

  const createAd = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/ads", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/mine"] });
      setShowCreate(false);
      setForm({ title: "", description: "", type: "marketplace", category: "", targetUrl: "", budgetCents: "", startDate: "", endDate: "" });
      toast({ title: "Ad submitted for review" });
    },
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { await apiRequest("PATCH", `/api/ads/${id}`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/mine"] });
      setEditAd(null);
      toast({ title: "Ad updated" });
    },
  });

  const deleteAd = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/ads/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/mine"] });
      toast({ title: "Ad deleted" });
    },
  });

  const totalImpressions = ads.reduce((sum: number, a: any) => sum + (a.impressions || 0), 0);
  const totalClicks = ads.reduce((sum: number, a: any) => sum + (a.clicks || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";
  const activeCount = ads.filter((a: any) => a.status === "active").length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Sponsored Ads</h1>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create Ad</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{ads.length}</p><p className="text-xs text-muted-foreground">Total Ads</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{activeCount}</p><p className="text-xs text-muted-foreground">Active</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-1"><Eye className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p></div><p className="text-xs text-muted-foreground">Impressions</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><div className="flex items-center justify-center gap-1"><MousePointerClick className="h-4 w-4 text-muted-foreground" /><p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p></div><p className="text-xs text-muted-foreground">Clicks ({ctr}% CTR)</p></CardContent></Card>
      </div>

      {isLoading && <p className="text-center text-muted-foreground py-8">Loading...</p>}

      {ads.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No ads yet. Create one to promote your business!</p>
          <p className="text-sm mt-2">Ads appear in the marketplace and throughout the platform. An admin will review your ad before it goes live.</p>
        </div>
      )}

      {ads.length > 0 && (
        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Impressions</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad: any) => (
                <TableRow key={ad.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{ad.title}</p>
                      {ad.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ad.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{ad.type}</Badge></TableCell>
                  <TableCell>${((ad.budget_cents || 0) / 100).toFixed(2)}/mo</TableCell>
                  <TableCell>{ad.impressions?.toLocaleString() || 0}</TableCell>
                  <TableCell>{ad.clicks?.toLocaleString() || 0}</TableCell>
                  <TableCell>
                    <Badge variant={ad.status === "active" ? "default" : ad.status === "pending" ? "secondary" : ad.status === "rejected" ? "destructive" : "outline"}>
                      {ad.status}
                    </Badge>
                    {ad.admin_notes && <p className="text-xs text-muted-foreground mt-1">{ad.admin_notes}</p>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {ad.status === "active" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateAd.mutate({ id: ad.id, data: { status: "paused" } })}><Pause className="h-4 w-4" /></Button>
                      )}
                      {ad.status === "paused" && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateAd.mutate({ id: ad.id, data: { status: "draft" } })}><Play className="h-4 w-4" /></Button>
                      )}
                      {["draft", "rejected"].includes(ad.status) && (
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditAd(ad)}><Edit className="h-4 w-4" /></Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteAd.mutate(ad.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {(showCreate || editAd) && (
        <Dialog open onOpenChange={() => { setShowCreate(false); setEditAd(null); }}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editAd ? "Edit Ad" : "Create Sponsored Ad"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Ad title"
                value={editAd ? editAd.title : form.title}
                onChange={(e) => editAd ? setEditAd({ ...editAd, title: e.target.value }) : setForm({ ...form, title: e.target.value })}
              />
              <Textarea
                placeholder="Description"
                value={editAd ? (editAd.description || "") : form.description}
                onChange={(e) => editAd ? setEditAd({ ...editAd, description: e.target.value }) : setForm({ ...form, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={editAd ? editAd.type : form.type}
                    onValueChange={(v) => editAd ? setEditAd({ ...editAd, type: v }) : setForm({ ...form, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="marketplace">Marketplace</SelectItem>
                      <SelectItem value="sidebar">Sidebar</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Input
                    placeholder="e.g. Plumbing, Roofing"
                    value={editAd ? (editAd.category || "") : form.category}
                    onChange={(e) => editAd ? setEditAd({ ...editAd, category: e.target.value }) : setForm({ ...form, category: e.target.value })}
                  />
                </div>
              </div>
              <Input
                placeholder="Target URL (https://...)"
                value={editAd ? (editAd.target_url || "") : form.targetUrl}
                onChange={(e) => editAd ? setEditAd({ ...editAd, target_url: e.target.value }) : setForm({ ...form, targetUrl: e.target.value })}
              />
              <div>
                <label className="text-sm font-medium">Monthly Budget ($)</label>
                <Input
                  type="number"
                  placeholder="25"
                  value={editAd ? ((editAd.budget_cents || 0) / 100).toString() : form.budgetCents}
                  onChange={(e) => editAd ? setEditAd({ ...editAd, budget_cents: Math.round(Number(e.target.value) * 100) }) : setForm({ ...form, budgetCents: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={editAd ? (editAd.start_date ? new Date(editAd.start_date).toISOString().split("T")[0] : "") : form.startDate}
                    onChange={(e) => editAd ? setEditAd({ ...editAd, start_date: e.target.value }) : setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={editAd ? (editAd.end_date ? new Date(editAd.end_date).toISOString().split("T")[0] : "") : form.endDate}
                    onChange={(e) => editAd ? setEditAd({ ...editAd, end_date: e.target.value }) : setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditAd(null); }}>Cancel</Button>
              <Button
                disabled={createAd.isPending || updateAd.isPending}
                onClick={() => {
                  if (editAd) {
                    updateAd.mutate({ id: editAd.id, data: { title: editAd.title, description: editAd.description, type: editAd.type, category: editAd.category, targetUrl: editAd.target_url, budgetCents: editAd.budget_cents } });
                  } else {
                    if (!form.title.trim()) return;
                    createAd.mutate({
                      title: form.title, description: form.description || undefined, type: form.type,
                      category: form.category || undefined, targetUrl: form.targetUrl || undefined,
                      budgetCents: form.budgetCents ? Math.round(Number(form.budgetCents) * 100) : 0,
                      startDate: form.startDate || undefined, endDate: form.endDate || undefined,
                    });
                  }
                }}
              >
                {editAd ? "Save" : "Submit for Review"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
