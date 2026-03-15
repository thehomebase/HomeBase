import { useState, useRef } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Megaphone, Eye, MousePointerClick, DollarSign, Trash2, Edit, Pause, Play,
  ImagePlus, X, ExternalLink, Star, Monitor, Smartphone, CreditCard, AlertTriangle, Info
} from "lucide-react";

function AdPreview({ title, description, imageUrl, type, targetUrl, mobile }: {
  title: string; description: string; imageUrl?: string; type: string; targetUrl?: string; mobile?: boolean;
}) {
  if (type === "marketplace") {
    if (mobile) {
      return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 shadow-sm">
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Sponsored</span>
            </div>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <img src={imageUrl} alt={title || "Ad"} className="h-12 w-12 rounded-lg object-cover shrink-0 border" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-dashed">
                  <ImagePlus className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{title || "Your Ad Title"}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {description || "Your ad description..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-3 w-3 ${i <= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">4.8 (reviews)</span>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
        <div className="p-4 flex items-center gap-4">
          {imageUrl ? (
            <img src={imageUrl} alt={title || "Ad"} className="h-16 w-16 rounded-lg object-cover shrink-0 border" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-dashed">
              <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Sponsored</span>
            </div>
            <h4 className="font-semibold text-sm truncate">{title || "Your Ad Title"}</h4>
            {(description || !title) && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {description || "Your ad description will appear here..."}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className={`h-3 w-3 ${i <= 4 ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground">4.8 (reviews)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "sidebar") {
    if (mobile) {
      return (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
          <div className="p-3 flex items-center gap-3">
            {imageUrl ? (
              <img src={imageUrl} alt={title || "Ad"} className="h-14 w-14 rounded-lg object-cover shrink-0 border" />
            ) : (
              <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 border border-dashed">
                <ImagePlus className="h-5 w-5 text-muted-foreground/30" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="bg-primary text-primary-foreground text-[8px] font-semibold px-1.5 py-0.5 rounded-full uppercase">Ad</span>
                <h4 className="font-bold text-xs truncate">{title || "Your Ad Title"}</h4>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {description || "Your ad description..."}
              </p>
              <button className="bg-primary text-primary-foreground text-[10px] font-semibold py-1 px-3 rounded-md">
                {targetUrl ? "Visit →" : "Learn More →"}
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden max-w-[280px]">
        {imageUrl ? (
          <div className="relative">
            <img src={imageUrl} alt={title || "Ad"} className="w-full h-32 object-cover" />
            <div className="absolute top-2 left-2">
              <span className="bg-primary text-primary-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Ad</span>
            </div>
          </div>
        ) : (
          <div className="relative h-32 bg-muted flex items-center justify-center">
            <ImagePlus className="h-8 w-8 text-muted-foreground/30" />
            <div className="absolute top-2 left-2">
              <span className="bg-primary text-primary-foreground text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">Ad</span>
            </div>
          </div>
        )}
        <div className="p-3 space-y-2">
          <h4 className="font-bold text-sm">{title || "Your Ad Title"}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description || "Your ad description will appear here..."}
          </p>
          <button className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 px-4 rounded-lg">
            {targetUrl ? "Visit Website →" : "Learn More →"}
          </button>
        </div>
      </div>
    );
  }

  if (mobile) {
    return (
      <div className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-sm overflow-hidden">
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Megaphone className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Sponsored</span>
          </div>
          {imageUrl && (
            <img src={imageUrl} alt={title || "Ad"} className="w-full h-28 rounded-lg object-cover border" />
          )}
          <h3 className="font-bold text-sm">{title || "Your Ad Title"}</h3>
          <p className="text-xs text-muted-foreground">
            {description || "Your ad description will appear here..."}
          </p>
          <button className="w-full bg-primary text-primary-foreground text-xs font-semibold py-2 px-4 rounded-lg">
            Learn More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-primary/5 shadow-sm overflow-hidden">
      <div className="flex items-center gap-5 p-4">
        {imageUrl ? (
          <img src={imageUrl} alt={title || "Ad"} className="h-20 w-20 rounded-xl object-cover shrink-0 border hidden sm:block" />
        ) : (
          <div className="h-20 w-20 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-dashed hidden sm:block">
            <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Sponsored</span>
          </div>
          <h3 className="font-bold text-base">{title || "Your Ad Title"}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {description || "Your ad description will appear here. Make it compelling to attract clicks!"}
          </p>
        </div>
        <button className="bg-primary text-primary-foreground text-xs font-semibold py-2.5 px-5 rounded-lg shrink-0 hidden sm:block">
          Learn More
        </button>
      </div>
    </div>
  );
}

export default function SponsoredAdsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editAd, setEditAd] = useState<any>(null);
  const [form, setForm] = useState({
    title: "", description: "", type: "marketplace", category: "",
    targetUrl: "", imageUrl: "", budgetCents: "", startDate: "", endDate: ""
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ads = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/ads/mine"] });
  const { data: stripeInfo } = useQuery<any>({ queryKey: ["/api/stripe/subscription"] });
  const hasPaymentMethod = stripeInfo?.hasPaymentMethod === true;

  const createAd = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/ads", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ads/mine"] });
      setShowCreate(false);
      resetForm();
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

  function resetForm() {
    setForm({ title: "", description: "", type: "marketplace", category: "", targetUrl: "", imageUrl: "", budgetCents: "", startDate: "", endDate: "" });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        if (editAd) {
          setEditAd({ ...editAd, image_url: base64 });
        } else {
          setForm(prev => ({ ...prev, imageUrl: base64 }));
        }
        setImageUploading(false);
      };
      reader.onerror = () => {
        toast({ title: "Failed to read image", variant: "destructive" });
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
      setImageUploading(false);
    }
  }

  const currentTitle = editAd ? editAd.title : form.title;
  const currentDesc = editAd ? (editAd.description || "") : form.description;
  const currentImage = editAd ? (editAd.image_url || "") : form.imageUrl;
  const currentType = editAd ? editAd.type : form.type;
  const currentUrl = editAd ? (editAd.target_url || "") : form.targetUrl;

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

      {!hasPaymentMethod && stripeInfo && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Payment method required</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              You need a payment method on file to run ads. Your ad budget will be billed monthly through the same payment system used for your platform subscription.
              <a href="/settings" className="underline ml-1 font-medium">Go to Settings → Billing</a> to add one.
            </p>
          </div>
        </div>
      )}

      {hasPaymentMethod && (
        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">How ad billing works</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your monthly ad budget is charged through the same payment method used for your platform subscription. Billing starts when an admin approves your ad and stops if you pause or delete it.
            </p>
          </div>
        </div>
      )}

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
                <TableHead>Ad</TableHead>
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
                    <div className="flex items-center gap-3">
                      {(ad.image_url || ad.imageUrl) && (
                        <img src={ad.image_url || ad.imageUrl} alt={ad.title} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{ad.title}</p>
                        {ad.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ad.description}</p>}
                      </div>
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
        <Dialog open onOpenChange={() => { setShowCreate(false); setEditAd(null); resetForm(); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editAd ? "Edit Ad" : "Create Sponsored Ad"}</DialogTitle></DialogHeader>
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="preview">Live Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 mt-4">
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Ad Image</label>
                  <div className="flex items-center gap-3">
                    {currentImage ? (
                      <div className="relative group">
                        <img src={currentImage} alt="Ad image" className="h-20 w-20 rounded-lg object-cover border" />
                        <button
                          className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => editAd ? setEditAd({ ...editAd, image_url: "" }) : setForm(prev => ({ ...prev, imageUrl: "" }))}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageUploading}
                      >
                        <ImagePlus className="h-4 w-4 mr-2" />
                        {imageUploading ? "Uploading..." : currentImage ? "Change Image" : "Upload Image"}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP. Max 5MB.</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>

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
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">
                      {currentType === "marketplace" ? "Marketplace" : currentType === "sidebar" ? "Sidebar" : "Banner"} Ad Preview
                    </p>
                    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                      <button
                        onClick={() => setPreviewDevice("desktop")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          previewDevice === "desktop" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5" />
                        Desktop
                      </button>
                      <button
                        onClick={() => setPreviewDevice("mobile")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          previewDevice === "mobile" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                        Mobile
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div
                      className={`transition-all duration-300 ${
                        previewDevice === "mobile"
                          ? "w-full max-w-[320px] border-[6px] border-foreground/10 rounded-[2rem] p-3 bg-background shadow-lg"
                          : "w-full"
                      }`}
                    >
                      {previewDevice === "mobile" && (
                        <div className="w-20 h-1 bg-foreground/10 rounded-full mx-auto mb-3" />
                      )}
                      <div className={`bg-muted/30 rounded-lg p-4 border border-dashed pointer-events-none select-none ${
                        currentType === "sidebar" && previewDevice === "desktop" ? "flex justify-center" : ""
                      }`}>
                        <AdPreview
                          title={currentTitle}
                          description={currentDesc}
                          imageUrl={currentImage}
                          type={currentType}
                          targetUrl={currentUrl}
                          mobile={previewDevice === "mobile"}
                        />
                      </div>
                      {previewDevice === "mobile" && (
                        <div className="w-10 h-1 bg-foreground/10 rounded-full mx-auto mt-3" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    {previewDevice === "desktop"
                      ? "This is how your ad will look on desktop screens."
                      : "This is how your ad will look on mobile devices."
                    }
                    {" "}Switch the "Type" in Details to see other formats.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            {!hasPaymentMethod && !editAd && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 mt-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  A payment method is required before your ad can go live.
                  <a href="/settings" className="underline ml-1 font-medium">Add one in Settings</a>
                </p>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditAd(null); resetForm(); }}>Cancel</Button>
              <Button
                disabled={createAd.isPending || updateAd.isPending || (!hasPaymentMethod && !editAd)}
                onClick={() => {
                  if (editAd) {
                    updateAd.mutate({ id: editAd.id, data: { title: editAd.title, description: editAd.description, type: editAd.type, category: editAd.category, targetUrl: editAd.target_url, imageUrl: editAd.image_url, budgetCents: editAd.budget_cents } });
                  } else {
                    if (!form.title.trim()) return;
                    createAd.mutate({
                      title: form.title, description: form.description || undefined, type: form.type,
                      category: form.category || undefined, targetUrl: form.targetUrl || undefined,
                      imageUrl: form.imageUrl || undefined,
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
