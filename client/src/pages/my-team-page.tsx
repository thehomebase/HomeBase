import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Trash2,
  ShoppingBag,
  Star,
  Shield,
  MapPin,
  Wrench,
  Zap,
  Thermometer,
  Home,
  Paintbrush,
  TreePine,
  Sparkles,
  Hammer,
  Bug,
  Waves,
  Key,
  Droplets,
  Layers,
  Settings,
  Search,
  User as UserIcon,
  Loader2,
  ExternalLink,
  Smartphone,
  PhoneOutgoing,
  X,
  Plus,
  Send,
  Copy,
  Check,
  Pencil,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Contractor, HomeTeamMember } from "@shared/schema";

type TeamMemberWithContractor = HomeTeamMember & {
  contractor: Contractor | null;
  vendorProfilePhoto?: string | null;
};

const CATEGORY_ICONS: Record<string, any> = {
  plumbing: Wrench,
  electrical: Zap,
  hvac: Thermometer,
  roofing: Home,
  painting: Paintbrush,
  landscaping: TreePine,
  cleaning: Sparkles,
  handyman: Hammer,
  pest_control: Bug,
  pool_maintenance: Waves,
  window_specialist: Home,
  locksmith: Key,
  tree_service: TreePine,
  gutter_cleaning: Droplets,
  flooring: Layers,
  appliance_repair: Settings,
  security_system: Shield,
  inspector: Search,
  other: Wrench,
};

const VENDOR_CATEGORIES = [
  { value: "home_inspector", label: "Home Inspector" },
  { value: "roofer", label: "Roofer" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "hvac", label: "HVAC" },
  { value: "painter", label: "Painter" },
  { value: "landscaper", label: "Landscaper" },
  { value: "handyman", label: "Handyman" },
  { value: "mover", label: "Mover" },
  { value: "cleaner", label: "Cleaner" },
  { value: "pest_control", label: "Pest Control" },
  { value: "title_company", label: "Title Company" },
  { value: "mortgage_lender", label: "Mortgage Lender" },
  { value: "appraiser", label: "Appraiser" },
  { value: "photographer", label: "Photographer" },
  { value: "stager", label: "Stager" },
  { value: "other", label: "Other" },
];

function formatCategoryName(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ContactActions({ contractor, onRemove, isRemoving }: { contractor: Contractor | null; onRemove: () => void; isRemoving: boolean }) {
  const { toast } = useToast();
  const [contactMode, setContactMode] = useState<"phone" | "sms" | "email" | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const { data: commStatus } = useQuery<{ twilio: boolean; twilioPhone?: string; hasOwnNumber?: boolean; gmail: { connected: boolean; email?: string } }>({
    queryKey: ["/api/communications/status"],
    enabled: contactMode !== null,
  });

  const smsMutation = useMutation({
    mutationFn: async (data: { phone: string; message: string }) => {
      await apiRequest("POST", "/api/communications/sms", {
        to: data.phone,
        message: data.message,
      });
    },
    onSuccess: () => {
      toast({ title: "SMS sent" });
      setSmsMessage("");
      setContactMode(null);
    },
    onError: () => toast({ title: "Failed to send SMS", variant: "destructive" }),
  });

  const emailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      await apiRequest("POST", "/api/gmail/send", data);
    },
    onSuccess: () => {
      toast({ title: "Email sent" });
      setEmailSubject("");
      setEmailBody("");
      setContactMode(null);
    },
    onError: () => toast({ title: "Failed to send email", variant: "destructive" }),
  });

  if (!contractor) return null;

  return (
    <>
      <div className="flex items-center justify-center gap-1 mt-2">
        {contractor.phone && (
          <button
            onClick={() => setContactMode("phone")}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </button>
        )}
        {contractor.phone && (
          <button
            onClick={() => setContactMode("sms")}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            title="Text"
          >
            <MessageSquare className="h-4 w-4" />
          </button>
        )}
        {contractor.email && (
          <button
            onClick={() => setContactMode("email")}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
            title="Email"
          >
            <Mail className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onRemove}
          disabled={isRemoving}
          className="p-2 rounded-full hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
          title="Remove from team"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={contactMode === "phone"} onOpenChange={(o) => !o && setContactMode(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">Call {contractor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <a href={`tel:${contractor.phone}`}>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Smartphone className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Personal Phone</div>
                  <div className="text-xs text-muted-foreground">Call from your device</div>
                </div>
              </Button>
            </a>
            {commStatus?.twilio && commStatus?.twilioPhone && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => {
                  toast({ title: "Twilio call", description: "Call logging available via the Phone page." });
                  setContactMode(null);
                }}
              >
                <PhoneOutgoing className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Twilio Number</div>
                  <div className="text-xs text-muted-foreground">{commStatus.twilioPhone}</div>
                </div>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">{contractor.phone}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={contactMode === "sms"} onOpenChange={(o) => !o && setContactMode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">Text {contractor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <a href={`sms:${contractor.phone}`}>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Smartphone className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Personal Phone</div>
                  <div className="text-xs text-muted-foreground">Open your messaging app</div>
                </div>
              </Button>
            </a>
            {commStatus?.twilio && commStatus?.twilioPhone && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <PhoneOutgoing className="h-4 w-4" />
                  Send via Twilio
                </div>
                <p className="text-xs text-muted-foreground">From: {commStatus.twilioPhone}</p>
                <Textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => smsMutation.mutate({ phone: contractor.phone!, message: smsMessage })}
                  disabled={!smsMessage.trim() || smsMutation.isPending}
                >
                  {smsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                  Send SMS
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contactMode === "email"} onOpenChange={(o) => !o && setContactMode(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base">Email {contractor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <a href={`mailto:${contractor.email}`}>
              <Button variant="outline" className="w-full justify-start gap-3">
                <Mail className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Default Email App</div>
                  <div className="text-xs text-muted-foreground">Open your email client</div>
                </div>
              </Button>
            </a>
            {commStatus?.gmail?.connected && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" />
                  Send via Gmail
                </div>
                <p className="text-xs text-muted-foreground">From: {commStatus.gmail.email}</p>
                <div>
                  <Label className="text-xs">Subject</Label>
                  <Input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Subject line..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Type your message..."
                    rows={4}
                    className="mt-1"
                  />
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => emailMutation.mutate({ to: contractor.email!, subject: emailSubject, body: emailBody })}
                  disabled={!emailBody.trim() || !emailSubject.trim() || emailMutation.isPending}
                >
                  {emailMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Send Email
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InviteToHomebaseButton({ contractor }: { contractor: Contractor }) {
  const { toast } = useToast();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/vendor-invite", {
        contractorId: contractor.id,
        contractorName: contractor.name,
      });
      return res.json();
    },
    onSuccess: (data) => {
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/invite/${data.token}`);
      setShowInviteDialog(true);
    },
    onError: () => toast({ title: "Failed to generate invite", variant: "destructive" }),
  });

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5 text-xs mt-2 border-primary/30 text-primary hover:bg-primary/5"
        onClick={() => inviteMutation.mutate()}
        disabled={inviteMutation.isPending}
      >
        {inviteMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Send className="h-3 w-3" />
        )}
        Invite to HomeBase
      </Button>

      <Dialog open={showInviteDialog} onOpenChange={(o) => { if (!o) { setShowInviteDialog(false); setInviteLink(null); setCopied(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Invite {contractor.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Share this link with {contractor.name} so they can create their vendor profile on HomeBase.
            </p>
            {inviteLink && (
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              {contractor.phone && (
                <a href={`sms:${contractor.phone}?body=${encodeURIComponent(`Hey ${contractor.name}! I'd love for you to join HomeBase so I can easily connect with you for future projects. Sign up here: ${inviteLink}`)}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Text
                  </Button>
                </a>
              )}
              {contractor.email && (
                <a href={`mailto:${contractor.email}?subject=${encodeURIComponent("Join me on HomeBase!")}&body=${encodeURIComponent(`Hi ${contractor.name},\n\nI'd like to invite you to join HomeBase, a platform that connects service professionals with homeowners and real estate agents.\n\nSign up here: ${inviteLink}\n\nLooking forward to working with you!`)}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email
                  </Button>
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TeamMemberCard({ member, onRemove, isRemoving, onEdit }: { member: TeamMemberWithContractor; onRemove: () => void; isRemoving: boolean; onEdit: () => void }) {
  const c = member.contractor;
  const name = c?.name || "Unknown";

  const profileLink = c?.vendorUserId ? `/profile/${c.vendorUserId}` : null;
  const isPrivate = c && !c.vendorUserId;

  const photo = member.vendorProfilePhoto;
  const photoEl = (
    <div className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-muted border-2 border-border overflow-hidden shadow-sm transition-shadow ${profileLink ? "hover:shadow-md cursor-pointer" : ""}`}>
      {photo ? (
        <img
          src={photo.startsWith("data:") ? photo : `data:image/png;base64,${photo}`}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
          <UserIcon className="h-12 w-12 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );

  const nameEl = (
    <h3 className={`font-semibold text-sm mt-3 leading-tight ${profileLink ? "hover:text-primary cursor-pointer transition-colors" : ""}`}>{name}</h3>
  );

  return (
    <div className="flex flex-col items-center text-center group">
      {profileLink ? <Link href={profileLink}>{photoEl}</Link> : photoEl}
      {profileLink ? <Link href={profileLink}>{nameEl}</Link> : nameEl}
      <p className="text-xs text-primary/80 font-medium mt-0.5">
        {formatCategoryName(member.category || "other")}
      </p>
      {(c?.city || c?.state) && (
        <p className="text-xs text-muted-foreground mt-0.5">
          {[c?.city, c?.state].filter(Boolean).join(", ")}
        </p>
      )}
      <div className="flex items-center gap-1 mt-1">
        {c?.agentRating && (
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{c.agentRating}/5</span>
          </div>
        )}
        {c?.vendorUserId && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            <Shield className="h-2.5 w-2.5 mr-0.5" />
            Verified
          </Badge>
        )}
      </div>
      {member.notes && (
        <p className="text-[11px] text-muted-foreground italic mt-1 max-w-[140px] line-clamp-2">
          "{member.notes}"
        </p>
      )}
      <ContactActions contractor={c} onRemove={onRemove} isRemoving={isRemoving} />
      <div className="flex items-center gap-1 mt-1">
        {c?.website && (
          <a
            href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1 px-2">
              <Globe className="h-3 w-3" /> Website
            </Button>
          </a>
        )}
        {c?.yelpUrl && (
          <a href={c.yelpUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1 px-2">
              <Star className="h-3 w-3" /> Yelp
            </Button>
          </a>
        )}
      </div>
      <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-1 px-2 mt-0.5" onClick={onEdit}>
        <Pencil className="h-3 w-3" /> Edit
      </Button>
      {isPrivate && c && (
        <InviteToHomebaseButton contractor={c} />
      )}
    </div>
  );
}

interface VendorFormData {
  name: string;
  category: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  yelpUrl: string;
  googleMapsUrl: string;
  bbbUrl: string;
  notes: string;
}

const emptyVendorForm: VendorFormData = {
  name: "", category: "", phone: "", email: "", website: "",
  address: "", city: "", state: "", zipCode: "", description: "",
  yelpUrl: "", googleMapsUrl: "", bbbUrl: "", notes: "",
};

function VendorFormDialog({
  open,
  onOpenChange,
  editingMember,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingMember?: TeamMemberWithContractor | null;
}) {
  const { toast } = useToast();
  const isEdit = !!editingMember;
  const c = editingMember?.contractor;
  const canEditContractor = !isEdit || (c && !c.vendorUserId);

  const [form, setForm] = useState<VendorFormData>(emptyVendorForm);

  useEffect(() => {
    if (open && isEdit && c) {
      setForm({
        name: c.name || "",
        category: editingMember.category || c.category || "",
        phone: c.phone || "",
        email: c.email || "",
        website: c.website || "",
        address: c.address || "",
        city: c.city || "",
        state: c.state || "",
        zipCode: c.zipCode || "",
        description: c.description || "",
        yelpUrl: c.yelpUrl || "",
        googleMapsUrl: c.googleMapsUrl || "",
        bbbUrl: c.bbbUrl || "",
        notes: editingMember.notes || "",
      });
    } else if (open && !isEdit) {
      setForm(emptyVendorForm);
    }
  }, [open, editingMember?.id]);

  const setField = (field: keyof VendorFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const createMutation = useMutation({
    mutationFn: async () => {
      const contractorRes = await apiRequest("POST", "/api/contractors", {
        name: form.name,
        category: form.category || "other",
        phone: form.phone || null,
        email: form.email || null,
        website: form.website || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zipCode: form.zipCode || null,
        description: form.description || null,
        yelpUrl: form.yelpUrl || null,
        googleMapsUrl: form.googleMapsUrl || null,
        bbbUrl: form.bbbUrl || null,
      });
      const contractor = await contractorRes.json();
      await apiRequest("POST", "/api/my-team", {
        contractorId: contractor.id,
        category: form.category || "other",
        notes: form.notes || null,
      });
      return contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
      toast({ title: "Added to team", description: `${form.name} has been added to your team.` });
      setForm(emptyVendorForm);
      onOpenChange(false);
    },
    onError: () => toast({ title: "Failed to add vendor", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (canEditContractor && c) {
        await apiRequest("PATCH", `/api/contractors/${c.id}`, {
          name: form.name,
          category: form.category || "other",
          phone: form.phone || null,
          email: form.email || null,
          website: form.website || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zipCode: form.zipCode || null,
          description: form.description || null,
          yelpUrl: form.yelpUrl || null,
          googleMapsUrl: form.googleMapsUrl || null,
          bbbUrl: form.bbbUrl || null,
        });
      }
      if (editingMember) {
        await apiRequest("PATCH", `/api/my-team/${editingMember.id}`, {
          notes: form.notes || null,
          category: form.category || "other",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
      toast({ title: "Vendor updated", description: `${form.name} has been updated.` });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Failed to update vendor", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Vendor" : "Add a Vendor"}</DialogTitle>
        </DialogHeader>
        {canEditContractor ? (
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="links">Links & Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-3">
              <div>
                <Label className="text-sm">Name *</Label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Business or contact name" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Phone</Label>
                <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="(555) 123-4567" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Email</Label>
                <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="vendor@email.com" type="email" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Brief description of services..." rows={2} className="mt-1" />
              </div>
            </TabsContent>

            <TabsContent value="location" className="space-y-3 mt-3">
              <div>
                <Label className="text-sm">Street Address</Label>
                <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="123 Main St" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">City</Label>
                  <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="City" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">State</Label>
                  <Input value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="TX" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Zip Code</Label>
                <Input value={form.zipCode} onChange={(e) => setField("zipCode", e.target.value)} placeholder="76244" className="mt-1" />
              </div>
            </TabsContent>

            <TabsContent value="links" className="space-y-3 mt-3">
              <div>
                <Label className="text-sm">Website</Label>
                <Input value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="https://example.com" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Yelp Page</Label>
                <Input value={form.yelpUrl} onChange={(e) => setField("yelpUrl", e.target.value)} placeholder="https://yelp.com/biz/..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Google Maps / Business</Label>
                <Input value={form.googleMapsUrl} onChange={(e) => setField("googleMapsUrl", e.target.value)} placeholder="https://maps.google.com/..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">BBB Page</Label>
                <Input value={form.bbbUrl} onChange={(e) => setField("bbbUrl", e.target.value)} placeholder="https://bbb.org/..." className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Personal Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Your notes about this vendor..." rows={2} className="mt-1" />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">This vendor manages their own profile. You can update your category and personal notes.</p>
            <div>
              <Label className="text-sm">Category</Label>
              <Select value={form.category} onValueChange={(v) => setField("category", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {VENDOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Personal Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Your notes about this vendor..." rows={3} className="mt-1" />
            </div>
          </div>
        )}

        <Button
          className="w-full mt-2"
          onClick={() => isEdit ? updateMutation.mutate() : createMutation.mutate()}
          disabled={!form.name.trim() || isPending}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : isEdit ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {isEdit ? "Save Changes" : "Add to My Team"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function MyTeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMemberWithContractor | null>(null);

  const { data: teamMembers, isLoading } = useQuery<TeamMemberWithContractor[]>({
    queryKey: ["/api/my-team"],
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/my-team/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-team"] });
      toast({ title: "Removed from team", description: "Contractor removed from your team." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove contractor.", variant: "destructive" });
    },
  });

  const allMembers = teamMembers || [];

  const categories = Array.from(new Set(allMembers.map(m => m.category || "other"))).sort();

  const filteredMembers = activeCategory === "all"
    ? allMembers
    : allMembers.filter(m => (m.category || "other") === activeCategory);

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <Skeleton className="h-5 w-24 mx-auto" />
          <Skeleton className="h-8 w-56 mx-auto" />
        </div>
        <div className="flex justify-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <Skeleton className="h-28 w-28 rounded-full" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">My Team</p>
        <h1 className="text-2xl md:text-3xl font-bold">Your Home Team</h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
          Your preferred service providers for all home-related needs
        </p>
      </div>

      {allMembers.length > 0 && categories.length > 1 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All ({allMembers.length})
          </button>
          {categories.map((cat) => {
            const count = allMembers.filter(m => (m.category || "other") === cat).length;
            const Icon = CATEGORY_ICONS[cat] || Wrench;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {formatCategoryName(cat)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {allMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No team members yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md text-sm">
            Build your home team by adding your own vendors or browsing our marketplace.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setShowAddVendor(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
            <Link href="/marketplace">
              <Button variant="outline">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Pros
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-10">
            {filteredMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onRemove={() => removeMutation.mutate(member.id)}
                isRemoving={removeMutation.isPending}
                onEdit={() => setEditingMember(member)}
              />
            ))}
          </div>

          <div className="flex justify-center gap-3 mt-12">
            <Button onClick={() => setShowAddVendor(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
            <Link href="/marketplace">
              <Button variant="outline" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                Browse Pros
              </Button>
            </Link>
          </div>
        </>
      )}

      <VendorFormDialog open={showAddVendor} onOpenChange={setShowAddVendor} />
      <VendorFormDialog
        open={!!editingMember}
        onOpenChange={(open) => { if (!open) setEditingMember(null); }}
        editingMember={editingMember}
      />
    </div>
  );
}
