import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
  Bell, Plus, Pencil, Trash2, Repeat, Mail, MessageSquare, Smartphone, Calendar
} from "lucide-react";

interface ReminderData {
  id: number;
  agentId: number;
  clientId: number;
  type: string;
  title: string;
  message: string | null;
  reminderDate: string;
  recurring: boolean;
  channels: string[] | null;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
  client_first_name?: string;
  client_last_name?: string;
  client_email?: string;
  client_phone?: string;
}

interface ClientData {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  closing_anniversary: { label: "Closing Anniversary", color: "bg-purple-100 text-purple-800 border-purple-200" },
  birthday: { label: "Birthday", color: "bg-pink-100 text-pink-800 border-pink-200" },
  custom: { label: "Custom", color: "bg-blue-100 text-blue-800 border-blue-200" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

const emptyForm = {
  clientId: "",
  type: "custom",
  title: "",
  message: "",
  reminderDate: "",
  recurring: false,
  channels: [] as string[],
};

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [tab, setTab] = useState("upcoming");

  const { data: reminders = [], isLoading } = useQuery<ReminderData[]>({
    queryKey: ["/api/reminders"],
  });

  const { data: clients = [] } = useQuery<ClientData[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/reminders", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder created" });
      closeDialog();
    },
    onError: () => toast({ title: "Failed to create reminder", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: any }) => {
      await apiRequest("PATCH", `/api/reminders/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder updated" });
      closeDialog();
    },
    onError: () => toast({ title: "Failed to update reminder", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reminders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: "Reminder deleted" });
    },
    onError: () => toast({ title: "Failed to delete reminder", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/reminders/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function openCreate() {
    setForm({ ...emptyForm });
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(r: ReminderData) {
    setForm({
      clientId: String(r.clientId),
      type: r.type,
      title: r.title,
      message: r.message || "",
      reminderDate: r.reminderDate ? new Date(r.reminderDate).toISOString().split("T")[0] : "",
      recurring: !!r.recurring,
      channels: Array.isArray(r.channels) ? r.channels : [],
    });
    setEditingId(r.id);
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.clientId || !form.title || !form.reminderDate) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    const body = {
      clientId: Number(form.clientId),
      type: form.type,
      title: form.title,
      message: form.message || null,
      reminderDate: new Date(form.reminderDate).toISOString(),
      recurring: form.recurring,
      channels: form.channels,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, body });
    } else {
      createMutation.mutate(body);
    }
  }

  function toggleChannel(ch: string) {
    setForm(prev => ({
      ...prev,
      channels: prev.channels.includes(ch)
        ? prev.channels.filter(c => c !== ch)
        : [...prev.channels, ch],
    }));
  }

  const sorted = [...reminders].sort(
    (a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime()
  );

  const filtered = tab === "upcoming"
    ? sorted.filter(r => isUpcoming(r.reminderDate))
    : tab === "past"
    ? sorted.filter(r => !isUpcoming(r.reminderDate))
    : sorted;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Reminders</h1>
        </div>
        <Button onClick={openCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Reminder
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        {["upcoming", "past", "all"].map(t => (
          <TabsContent key={t} value={t}>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No {t === "all" ? "" : t} reminders found
              </Card>
            ) : (
              <div className="space-y-3">
                {filtered.map(r => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    onEdit={() => openEdit(r)}
                    onDelete={() => deleteMutation.mutate(r.id)}
                    onToggle={(active) => toggleMutation.mutate({ id: r.id, isActive: active })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Reminder" : "New Reminder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={v => setForm(p => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="closing_anniversary">Closing Anniversary</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>Reminder Date *</Label>
              <Input type="date" value={form.reminderDate} onChange={e => setForm(p => ({ ...p, reminderDate: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="recurring"
                checked={form.recurring}
                onCheckedChange={(v) => setForm(p => ({ ...p, recurring: !!v }))}
              />
              <Label htmlFor="recurring" className="cursor-pointer">Recurring (yearly)</Label>
            </div>
            <div>
              <Label className="mb-2 block">Channels</Label>
              <div className="flex gap-4">
                {[
                  { key: "sms", label: "SMS" },
                  { key: "email", label: "Email" },
                  { key: "message", label: "In-App Message" },
                ].map(ch => (
                  <div key={ch.key} className="flex items-center gap-1.5">
                    <Checkbox
                      id={`ch-${ch.key}`}
                      checked={form.channels.includes(ch.key)}
                      onCheckedChange={() => toggleChannel(ch.key)}
                    />
                    <Label htmlFor={`ch-${ch.key}`} className="cursor-pointer text-sm">{ch.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving..." : editingId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReminderCard({ reminder, onEdit, onDelete, onToggle }: {
  reminder: ReminderData;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
}) {
  const clientName = [reminder.client_first_name, reminder.client_last_name].filter(Boolean).join(" ") || "Unknown";
  const typeInfo = TYPE_CONFIG[reminder.type] || TYPE_CONFIG.custom;
  const channels = Array.isArray(reminder.channels) ? reminder.channels : [];
  const channelIcons: Record<string, any> = { sms: Smartphone, email: Mail, message: MessageSquare };

  return (
    <Card className={`p-4 ${!reminder.isActive ? "opacity-60" : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{clientName}</span>
            <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>
              {typeInfo.label}
            </Badge>
            {reminder.recurring && (
              <Repeat className="h-3.5 w-3.5 text-muted-foreground" title="Recurring" />
            )}
          </div>
          <p className="text-sm font-medium">{reminder.title}</p>
          {reminder.message && (
            <p className="text-xs text-muted-foreground line-clamp-1">{reminder.message}</p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(reminder.reminderDate)}
            </span>
            {channels.length > 0 && (
              <div className="flex items-center gap-1">
                {channels.map(ch => {
                  const Icon = channelIcons[ch];
                  return Icon ? (
                    <Badge key={ch} variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                      <Icon className="h-3 w-3" /> {ch}
                    </Badge>
                  ) : null;
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={!!reminder.isActive}
            onCheckedChange={onToggle}
            aria-label="Toggle active"
          />
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}