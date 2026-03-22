import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Copy,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  Users,
  Calendar,
  Clock,
  MapPin,
  Play,
  CheckCircle2,
  ExternalLink,
  Link2,
  QrCode,
  Download,
  UserCheck,
  Briefcase,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[status] || variants.scheduled}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function VisitorRoleBadge({ role }: { role?: string }) {
  if (!role || role === "unrepresented_buyer") {
    return <Badge variant="default" className="text-xs">Buyer</Badge>;
  }
  if (role === "represented_buyer") {
    return <Badge variant="secondary" className="text-xs flex items-center gap-1"><UserCheck className="h-3 w-3" />Represented Buyer</Badge>;
  }
  if (role === "agent") {
    return <Badge variant="outline" className="text-xs flex items-center gap-1"><Briefcase className="h-3 w-3" />Agent</Badge>;
  }
  return null;
}

function QrCodeModal({ slug, address }: { slug: string; address: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const signInUrl = `${window.location.origin}/open-house/${slug}`;

  useEffect(() => {
    if (!open) return;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(signInUrl, {
        width: 400,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then((url: string) => setQrDataUrl(url));
    });
  }, [open, signInUrl]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.download = `open-house-qr-${slug}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="QR Code">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>QR Code for Sign-In</DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{address}</p>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="mx-auto rounded-lg border" />
          ) : (
            <Skeleton className="h-[400px] w-[400px] mx-auto" />
          )}
          <p className="text-xs text-muted-foreground break-all">{signInUrl}</p>
          <div className="flex gap-2">
            <Button className="flex-1" variant="outline" onClick={() => {
              navigator.clipboard.writeText(signInUrl);
            }}>
              <Copy className="h-4 w-4 mr-2" />Copy Link
            </Button>
            <Button className="flex-1" variant="outline" onClick={downloadQr} disabled={!qrDataUrl}>
              <Download className="h-4 w-4 mr-2" />Download
            </Button>
            <Button className="flex-1" onClick={() => {
              if (!qrDataUrl) return;
              const win = window.open("", "_blank");
              if (!win) return;
              const doc = win.document;
              doc.write(`<html><head><title>QR Code</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif;margin:0}img{max-width:400px}p{margin-top:16px;font-size:14px;color:#666;word-break:break-all;max-width:400px;text-align:center}h2{margin-bottom:8px}</style></head><body><h2 id="addr"></h2><img id="qr" /><p id="url"></p></body></html>`);
              doc.close();
              doc.getElementById("addr")!.textContent = address;
              doc.getElementById("qr")!.setAttribute("src", qrDataUrl);
              doc.getElementById("url")!.textContent = signInUrl;
              win.print();
            }} disabled={!qrDataUrl}>
              <QrCode className="h-4 w-4 mr-2" />Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OpenHouseForm({
  initial,
  onSubmit,
  isPending,
}: {
  initial?: any;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const [address, setAddress] = useState(initial?.address || "");
  const [city, setCity] = useState(initial?.city || "");
  const [state, setState] = useState(initial?.state || "");
  const [zipCode, setZipCode] = useState(initial?.zip_code || initial?.zipCode || "");
  const [date, setDate] = useState(
    initial?.date ? new Date(initial.date).toISOString().split("T")[0] : ""
  );
  const [startTime, setStartTime] = useState(initial?.start_time || initial?.startTime || "");
  const [endTime, setEndTime] = useState(initial?.end_time || initial?.endTime || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  return (
    <div className="space-y-4">
      <div>
        <Label>Address *</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label>City</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
        </div>
        <div>
          <Label>State</Label>
          <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="TX" />
        </div>
        <div>
          <Label>Zip Code</Label>
          <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="75001" />
        </div>
      </div>
      <div>
        <Label>Date *</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Start Time *</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div>
          <Label>End Time *</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." rows={3} />
      </div>
      <Button
        className="w-full"
        disabled={!address || !date || !startTime || !endTime || isPending}
        onClick={() =>
          onSubmit({ address, city, state, zipCode, date, startTime, endTime, notes })
        }
      >
        {isPending ? "Saving..." : initial ? "Update Open House" : "Create Open House"}
      </Button>
    </div>
  );
}

function VisitorList({ openHouseId }: { openHouseId: number }) {
  const { data: visitors, isLoading } = useQuery<any[]>({
    queryKey: ["/api/open-houses", openHouseId, "visitors"],
    queryFn: async () => {
      const res = await fetch(`/api/open-houses/${openHouseId}/visitors`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch visitors");
      return res.json();
    },
  });

  if (isLoading) return <Skeleton className="h-20 w-full" />;
  if (!visitors?.length)
    return <p className="text-sm text-muted-foreground py-2">No visitors yet.</p>;

  return (
    <div className="space-y-2">
      {visitors.map((v: any) => (
        <div key={v.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{v.first_name} {v.last_name || ""}</p>
              <VisitorRoleBadge role={v.visitor_role} />
            </div>
            <div className="flex gap-3 text-muted-foreground text-xs mt-0.5">
              {v.email && <span>{v.email}</span>}
              {v.phone && <span>{v.phone}</span>}
              {v.brokerage_name && <span className="italic">{v.brokerage_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {v.interested_level && <span>Interest: {v.interested_level}/5</span>}
            {v.pre_approved && <Badge variant="secondary" className="text-xs">Pre-approved</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OpenHousesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingHouse, setEditingHouse] = useState<any | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

  const { data: openHouses, isLoading } = useQuery<any[]>({
    queryKey: ["/api/open-houses"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/open-houses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-houses"] });
      setCreateOpen(false);
      toast({ title: "Open house created!" });
    },
    onError: () => toast({ title: "Error", description: "Failed to create open house", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/open-houses/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-houses"] });
      setEditingHouse(null);
      setUpdatingStatusId(null);
      const newStatus = variables.data?.status;
      toast({ title: newStatus === "active" ? "Open house started!" : newStatus === "completed" ? "Open house completed!" : "Open house updated!" });
    },
    onError: () => {
      setUpdatingStatusId(null);
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/open-houses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/open-houses"] });
      toast({ title: "Open house deleted" });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete", variant: "destructive" }),
  });

  const copySignInLink = (slug: string) => {
    const url = `${window.location.origin}/open-house/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: url });
  };

  const nextStatus: Record<string, string> = {
    scheduled: "active",
    active: "completed",
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    } catch {
      return d;
    }
  };

  const formatTime = (t: string) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    const ampm = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Open Houses</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Open House
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Open House</DialogTitle>
            </DialogHeader>
            <OpenHouseForm onSubmit={(data) => createMutation.mutate(data)} isPending={createMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : !openHouses?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">No open houses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first open house to start collecting visitor sign-ins.</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Open House
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {openHouses.map((oh: any) => (
            <Card key={oh.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{oh.address}</h3>
                      <StatusBadge status={oh.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {(oh.city || oh.state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[oh.city, oh.state].filter(Boolean).join(", ")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(oh.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(oh.start_time)} – {formatTime(oh.end_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {oh.visitor_count || 0} visitor{(oh.visitor_count || 0) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <QrCodeModal slug={oh.slug} address={oh.address} />
                    <Button variant="ghost" size="icon" onClick={() => copySignInLink(oh.slug)} title="Copy sign-in link">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {nextStatus[oh.status] && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={nextStatus[oh.status] === "active" ? "default" : "outline"}
                              size="sm"
                              disabled={updatingStatusId === oh.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setUpdatingStatusId(oh.id);
                                updateMutation.mutate({ id: oh.id, data: { status: nextStatus[oh.status] } });
                              }}
                            >
                              {updatingStatusId === oh.id ? "Updating..." : nextStatus[oh.status] === "active" ? (
                                <><Play className="h-3.5 w-3.5 mr-1.5" />Go Live</>
                              ) : (
                                <><CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />End Session</>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[220px] text-center">
                            {nextStatus[oh.status] === "active"
                              ? "Start the open house session and enable the visitor sign-in page for guests"
                              : "End the open house session and close the visitor sign-in page"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Dialog open={editingHouse?.id === oh.id} onOpenChange={(open) => !open && setEditingHouse(null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => setEditingHouse(oh)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Open House</DialogTitle>
                        </DialogHeader>
                        <OpenHouseForm
                          initial={editingHouse}
                          onSubmit={(data) => updateMutation.mutate({ id: oh.id, data })}
                          isPending={updateMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Open House?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this open house and all visitor data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(oh.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(expandedId === oh.id ? null : oh.id)}
                    >
                      {expandedId === oh.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              {oh.status === "active" && (
                <div className="border-t bg-green-50 dark:bg-green-950/30 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-green-800 dark:text-green-200">Live — Visitor Sign-In Active</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Share this link or QR code with visitors so they can sign in on their phone:</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-white dark:bg-gray-900 border rounded-md px-3 py-2 text-sm font-mono truncate">
                      {window.location.origin}/open-house/{oh.slug}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => copySignInLink(oh.slug)}>
                      <Copy className="h-3.5 w-3.5 mr-1.5" />Copy
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`/open-house/${oh.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              {expandedId === oh.id && (
                <div className="border-t px-4 py-3">
                  {oh.notes && <p className="text-sm text-muted-foreground mb-3">{oh.notes}</p>}
                  <h4 className="text-sm font-medium mb-2">Visitors</h4>
                  <VisitorList openHouseId={oh.id} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
