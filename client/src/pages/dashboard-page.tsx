import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Users, FileText, MessageSquare,
  Target, DollarSign, CalendarClock, ArrowRight, Plus, Send, Settings,
  X, Clock, AlertTriangle, Briefcase, Zap, CheckCircle2, Minus, Phone, Mail, TrendingUp as TrendUp, UserPlus
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const AGENT_WIDGETS = [
  { id: "pipeline", label: "Deal Pipeline" },
  { id: "stats", label: "Key Metrics" },
  { id: "communications", label: "Communications" },
  { id: "activity_chart", label: "Activity Chart (24h)" },
  { id: "leads", label: "Leads Overview" },
  { id: "deadlines", label: "Upcoming Deadlines" },
  { id: "recent", label: "Recent Activity" },
  { id: "quick_actions", label: "Quick Actions" },
];

const VENDOR_WIDGETS = [
  { id: "stats", label: "Key Metrics" },
  { id: "communications", label: "Communications" },
  { id: "bids", label: "Bids Overview" },
  { id: "quick_actions", label: "Quick Actions" },
];

const LENDER_WIDGETS = [
  { id: "stats", label: "Key Metrics" },
  { id: "communications", label: "Communications" },
  { id: "pipeline", label: "Loan Pipeline" },
  { id: "quick_actions", label: "Quick Actions" },
];

const CLIENT_WIDGETS = [
  { id: "stats", label: "Key Metrics" },
  { id: "transaction", label: "My Transaction" },
  { id: "quick_actions", label: "Quick Actions" },
];

function getWidgetsForRole(role: string) {
  switch (role) {
    case "agent": return AGENT_WIDGETS;
    case "vendor": return VENDOR_WIDGETS;
    case "lender": return LENDER_WIDGETS;
    case "client": return CLIENT_WIDGETS;
    default: return AGENT_WIDGETS;
  }
}

function getDefaultWidgetIds(role: string) {
  return getWidgetsForRole(role).map(w => w.id);
}

function formatCurrency(val: number) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> No change
    </span>
  );
  return value > 0 ? (
    <span className="flex items-center gap-0.5 text-xs text-emerald-600">
      <TrendingUp className="h-3 w-3" /> +{value}% from last month
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-xs text-red-500">
      <TrendingDown className="h-3 w-3" /> {value}% from last month
    </span>
  );
}

function StatCard({ icon: Icon, label, value, subValue, change, accent }: {
  icon: any;
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  accent?: string;
}) {
  return (
    <Card className={`p-4 relative overflow-hidden border-l-4 ${accent || "border-l-primary"}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          {change !== undefined && <ChangeIndicator value={change} />}
        </div>
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function ActivityChart({ data }: { data: { hour: number; messages: number; sms: number; emails: number }[] }) {
  const total = data.reduce((s, d) => s + d.messages + d.sms + d.emails, 0);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Activity</h3>
          <p className="text-xs text-muted-foreground">Messages & communications in the last 24 hours</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
        </div>
      </div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(h) => `${h}:00`}
              interval={3}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              labelFormatter={(h) => `${h}:00`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            />
            <Bar dataKey="messages" stackId="a" fill="#6366f1" maxBarSize={20} name="Messages" />
            <Bar dataKey="sms" stackId="a" fill="#3b82f6" maxBarSize={20} name="SMS" />
            <Bar dataKey="emails" stackId="a" fill="#10b981" maxBarSize={20} name="Emails" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-3 pt-3 border-t justify-center">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#6366f1" }} /><span className="text-xs text-muted-foreground">Messages</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#3b82f6" }} /><span className="text-xs text-muted-foreground">SMS</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }} /><span className="text-xs text-muted-foreground">Emails</span></div>
      </div>
    </Card>
  );
}

interface Conversation {
  userId: number;
  firstName: string;
  lastName: string;
  role: string;
  unreadCount: number;
}

function CommunicationsWidget() {
  const [contactId, setContactId] = useState<string>("all");

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/private-messages/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/private-messages/conversations");
      return res.json();
    },
  });

  const metricsUrl = contactId !== "all"
    ? `/api/communications/metrics?contactId=${contactId}`
    : "/api/communications/metrics";

  const { data: metrics, isLoading } = useQuery<any>({
    queryKey: ["/api/communications/metrics", contactId],
    queryFn: async () => {
      const res = await apiRequest("GET", metricsUrl);
      return res.json();
    },
  });

  const hourly = metrics?.hourlyActivity || [];
  const totalToday = hourly.reduce((s: number, h: any) => s + (h.messages || 0) + (h.sms || 0) + (h.emails || 0), 0);
  const isFiltered = contactId !== "all";
  const selectedContact = conversations.find(c => c.userId === Number(contactId));

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Communications</h3>
        </div>
        <Link href="/messages">
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">FILTER BY</div>
        <Select value={contactId} onValueChange={setContactId}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All Contacts (Total)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts (Total)</SelectItem>
            {conversations.map(c => (
              <SelectItem key={c.userId} value={String(c.userId)}>
                {c.firstName} {c.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : metrics ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-muted/40 border">
              <div className="flex items-center gap-1.5 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-xs font-medium text-muted-foreground">Messages</span>
              </div>
              <p className="text-2xl font-bold">{metrics.privateMessages?.total || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Today: {metrics.privateMessages?.today || 0}  Week: {metrics.privateMessages?.thisWeek || 0}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 border">
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">SMS Sent</span>
              </div>
              <p className="text-2xl font-bold">{metrics.sms?.total || 0}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Today: {metrics.sms?.today || 0}  Week: {metrics.sms?.thisWeek || 0}
              </p>
            </div>
            {!isFiltered && (
              <div className="p-3 rounded-lg bg-muted/40 border">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-muted-foreground">Emails</span>
                </div>
                <p className="text-2xl font-bold">{metrics.email?.total || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Today: {metrics.email?.today || 0}  Week: {metrics.email?.thisWeek || 0}
                </p>
              </div>
            )}
            <div className="p-3 rounded-lg bg-muted/40 border">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendUp className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium text-muted-foreground">All-Time</span>
              </div>
              <p className="text-2xl font-bold">
                {(metrics.privateMessages?.total || 0) + (metrics.sms?.total || 0) + (metrics.email?.total || 0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Msgs: {metrics.privateMessages?.total || 0}  SMS: {metrics.sms?.total || 0}
                {!isFiltered && `  Emails: ${metrics.email?.total || 0}`}
              </p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold">Activity</p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedContact ? `${selectedContact.firstName} ${selectedContact.lastName} — ` : ""}Hourly breakdown today
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{totalToday}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Today</p>
              </div>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(h) => `${h}:00`}
                    interval={3}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(h) => `${h}:00`}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="messages" stackId="a" fill="#6366f1" maxBarSize={20} name="Messages" />
                  <Bar dataKey="sms" stackId="a" fill="#3b82f6" maxBarSize={20} name="SMS" />
                  <Bar dataKey="emails" stackId="a" fill="#10b981" maxBarSize={20} name="Emails" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-2 pt-2 border-t justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#6366f1" }} /><span className="text-xs text-muted-foreground">Messages</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#3b82f6" }} /><span className="text-xs text-muted-foreground">SMS</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }} /><span className="text-xs text-muted-foreground">Emails</span></div>
            </div>
          </div>
        </>
      ) : null}
    </Card>
  );
}

function PipelineWidget({ stages }: { stages: Record<string, number> }) {
  const stageOrder = ["prospect", "active_listing_prep", "live_listing", "under_contract", "closed"];
  const stageLabels: Record<string, string> = {
    prospect: "Prospect",
    active_listing_prep: "Listing Prep",
    live_listing: "Live Listing",
    under_contract: "Under Contract",
    closed: "Closed",
  };
  const stageColors: Record<string, string> = {
    prospect: "bg-slate-400",
    active_listing_prep: "bg-blue-400",
    live_listing: "bg-amber-400",
    under_contract: "bg-emerald-400",
    closed: "bg-green-600",
  };
  const total = Object.values(stages).reduce((s, v) => s + v, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Deal Pipeline</h3>
        <Link href="/transactions">
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      {total === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
      ) : (
        <>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {stageOrder.map(stage => {
              const count = stages[stage] || 0;
              if (count === 0) return null;
              return (
                <div
                  key={stage}
                  className={`${stageColors[stage]} transition-all`}
                  style={{ width: `${(count / total) * 100}%` }}
                  title={`${stageLabels[stage]}: ${count}`}
                />
              );
            })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {stageOrder.map(stage => (
              <div key={stage} className="text-center p-2 rounded-lg bg-muted/40">
                <p className="text-lg font-bold">{stages[stage] || 0}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{stageLabels[stage]}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

function DeadlinesWidget({ deadlines }: { deadlines: any[] }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="h-4 w-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Upcoming Deadlines</h3>
      </div>
      {deadlines.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No upcoming deadlines</p>
      ) : (
        <div className="space-y-2">
          {deadlines.map((d, i) => (
            <Link key={i} href={`/transactions/${d.transactionId}`}>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.transactionStreet}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium">
                    {new Date(d.deadline).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentActivityWidget() {
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: ['/api/notifications/list', { limit: 15 }],
    refetchInterval: 30000,
  });

  const typeIcons: Record<string, { icon: any; color: string }> = {
    lead_new: { icon: Target, color: 'text-emerald-500' },
    message_new: { icon: MessageSquare, color: 'text-blue-500' },
    document_updated: { icon: FileText, color: 'text-amber-500' },
    bid_received: { icon: Briefcase, color: 'text-purple-500' },
    transaction_update: { icon: ArrowRight, color: 'text-primary' },
    client_invited: { icon: UserPlus, color: 'text-teal-500' },
    reminder: { icon: Clock, color: 'text-orange-500' },
    general: { icon: Zap, color: 'text-muted-foreground' },
  };

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Recent Activity</h3>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No recent activity</p>
      ) : (
        <div className="space-y-1">
          {notifications.slice(0, 10).map((n: any) => {
            const config = typeIcons[n.type] || typeIcons.general;
            const Icon = config.icon;
            return (
              <div key={n.id} className={`flex items-center gap-3 p-2 rounded-md ${!n.read ? 'bg-primary/5' : ''}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${!n.read ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Icon className={`h-4 w-4 ${!n.read ? config.color : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${!n.read ? 'font-semibold' : 'font-medium'}`}>{n.title}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate">{n.message}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LeadsWidget({ leads }: { leads: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-500" />
          <h3 className="font-semibold text-sm">Leads</h3>
        </div>
        <Link href="/lead-gen">
          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
            View All <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/40">
          <p className="text-2xl font-bold">{leads.new}</p>
          <p className="text-[10px] text-muted-foreground">New</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/40">
          <p className="text-2xl font-bold">{leads.total}</p>
          <p className="text-[10px] text-muted-foreground">Total</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/40">
          <p className="text-2xl font-bold">{leads.converted}</p>
          <p className="text-[10px] text-muted-foreground">Converted</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/40">
          <p className="text-2xl font-bold">{leads.conversionRate}%</p>
          <p className="text-[10px] text-muted-foreground">Conv. Rate</p>
        </div>
      </div>
    </Card>
  );
}

function QuickActionsWidget({ role }: { role: string }) {
  const agentActions = [
    { label: "New Transaction", href: "/transactions", icon: Plus },
    { label: "Add Client", href: "/clients", icon: Users },
    { label: "Send Message", href: "/messages", icon: Send },
    { label: "View Calendar", href: "/calendar", icon: CalendarClock },
  ];
  const vendorActions = [
    { label: "View Leads", href: "/vendor", icon: Target },
    { label: "Messages", href: "/messages", icon: Send },
    { label: "Marketplace", href: "/marketplace", icon: Briefcase },
  ];
  const lenderActions = [
    { label: "Loan Pipeline", href: "/lender-portal", icon: FileText },
    { label: "Messages", href: "/messages", icon: Send },
  ];
  const clientActions = [
    { label: "My Transaction", href: "/my-transaction", icon: FileText },
    { label: "Messages", href: "/messages", icon: Send },
    { label: "Property Search", href: "/property-search", icon: Target },
  ];

  const actions = role === "vendor" ? vendorActions
    : role === "lender" ? lenderActions
    : role === "client" ? clientActions
    : agentActions;

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {actions.map(a => (
          <Link key={a.href} href={a.href}>
            <Button variant="outline" className="w-full h-auto py-3 flex-col gap-1.5">
              <a.icon className="h-5 w-5" />
              <span className="text-xs">{a.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function SettingsDialog({ role, enabledWidgets, onSave }: {
  role: string;
  enabledWidgets: string[];
  onSave: (widgets: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(enabledWidgets);
  const available = getWidgetsForRole(role);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setSelected(enabledWidgets); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Customize</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Choose which widgets appear on your dashboard.</p>
          {available.map(w => (
            <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <Label htmlFor={`widget-${w.id}`} className="text-sm font-medium cursor-pointer">{w.label}</Label>
              <Switch
                id={`widget-${w.id}`}
                checked={selected.includes(w.id)}
                onCheckedChange={() => toggle(w.id)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => { onSave(selected); setOpen(false); }}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PendingInvitationsBanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingInvitations = [] } = useQuery<any[]>({
    queryKey: ["/api/client-invitations/pending"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const acceptMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", `/api/client-invitations/${token}/accept`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to accept invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-invitations/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Invitation Accepted", description: "You are now linked to your agent." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", `/api/client-invitations/${token}/decline`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to decline invitation");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-invitations/pending"] });
      toast({ title: "Invitation Declined" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (pendingInvitations.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {pendingInvitations.map((inv: any) => (
        <Card key={inv.id} className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Agent Invitation</p>
                <p className="text-sm text-muted-foreground">
                  <strong>{inv.agentName}</strong> has invited you to connect as their client on HomeBase.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineMutation.mutate(inv.token)}
                disabled={declineMutation.isPending || acceptMutation.isPending}
              >
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => acceptMutation.mutate(inv.token)}
                disabled={acceptMutation.isPending || declineMutation.isPending}
              >
                {acceptMutation.isPending ? "Accepting..." : "Accept"}
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role || "agent";

  const { data: dashData, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard");
      return res.json();
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: prefs } = useQuery<any>({
    queryKey: ["/api/dashboard/preferences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/dashboard/preferences");
      return res.json();
    },
    enabled: !!user,
  });

  const prefsMutation = useMutation({
    mutationFn: async (widgets: string[]) => {
      const res = await apiRequest("PATCH", "/api/dashboard/preferences", { widgets });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/preferences"] });
    },
  });

  const enabledWidgets = prefs?.widgets?.length > 0 ? prefs.widgets : getDefaultWidgetIds(role);
  const isWidgetVisible = (id: string) => enabledWidgets.includes(id);

  if (isLoading || !dashData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.firstName}
          </p>
        </div>
        <SettingsDialog
          role={role}
          enabledWidgets={enabledWidgets}
          onSave={(widgets) => prefsMutation.mutate(widgets)}
        />
      </div>

      <PendingInvitationsBanner />

      {(role === "agent" || role === "broker") && (
        <>
          {isWidgetVisible("stats") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                icon={Briefcase}
                label="Active Deals"
                value={dashData.transactions?.active || 0}
                subValue={`${dashData.transactions?.closingThisMonth || 0} closing this month`}
                accent="border-l-blue-500"
              />
              <StatCard
                icon={DollarSign}
                label="Pipeline Value"
                value={formatCurrency(dashData.transactions?.pipelineValue || 0)}
                subValue={`${dashData.transactions?.closed || 0} closed total`}
                change={dashData.transactions?.closedChangePercent}
                accent="border-l-emerald-500"
              />
              <StatCard
                icon={Users}
                label="Total Clients"
                value={dashData.clients?.total || 0}
                subValue={`${dashData.clients?.newThisMonth || 0} new this month`}
                change={dashData.clients?.changePercent}
                accent="border-l-purple-500"
              />
              <StatCard
                icon={MessageSquare}
                label="Unread Messages"
                value={dashData.unreadMessages || 0}
                accent="border-l-amber-500"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {isWidgetVisible("pipeline") && (
              <PipelineWidget stages={dashData.transactions?.stages || {}} />
            )}
            {isWidgetVisible("leads") && (
              <LeadsWidget leads={dashData.leads || { new: 0, total: 0, converted: 0, conversionRate: 0 }} />
            )}
          </div>

          {isWidgetVisible("communications") && (
            <div className="mb-6">
              <CommunicationsWidget />
            </div>
          )}

          {isWidgetVisible("activity_chart") && dashData.activityChart && (
            <div className="mb-6">
              <ActivityChart data={dashData.activityChart} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {isWidgetVisible("deadlines") && (
              <DeadlinesWidget deadlines={dashData.upcomingDeadlines || []} />
            )}
            {isWidgetVisible("recent") && (
              <RecentActivityWidget />
            )}
          </div>

          {isWidgetVisible("quick_actions") && (
            <QuickActionsWidget role="agent" />
          )}
        </>
      )}

      {role === "vendor" && (
        <>
          {isWidgetVisible("stats") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={Briefcase}
                label="Pending Bids"
                value={dashData.bids?.pending || 0}
                accent="border-l-blue-500"
              />
              <StatCard
                icon={CheckCircle2}
                label="Accepted Bids"
                value={dashData.bids?.accepted || 0}
                subValue={`${dashData.bids?.total || 0} total bids`}
                accent="border-l-emerald-500"
              />
              <StatCard
                icon={MessageSquare}
                label="Unread Messages"
                value={dashData.unreadMessages || 0}
                accent="border-l-amber-500"
              />
            </div>
          )}
          {isWidgetVisible("communications") && (
            <div className="mb-6">
              <CommunicationsWidget />
            </div>
          )}
          {isWidgetVisible("bids") && dashData.leads && (
            <Card className="p-4 mb-6">
              <h3 className="font-semibold text-sm mb-3">Leads</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-2xl font-bold">{dashData.leads.new}</p>
                  <p className="text-xs text-muted-foreground">New Leads</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/40">
                  <p className="text-2xl font-bold">{dashData.leads.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
          )}
          {isWidgetVisible("quick_actions") && <QuickActionsWidget role="vendor" />}
        </>
      )}

      {role === "lender" && (
        <>
          {isWidgetVisible("stats") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={FileText}
                label="Loans in Pipeline"
                value={dashData.pipeline?.total || 0}
                accent="border-l-blue-500"
              />
              <StatCard
                icon={MessageSquare}
                label="Unread Messages"
                value={dashData.unreadMessages || 0}
                accent="border-l-amber-500"
              />
            </div>
          )}
          {isWidgetVisible("communications") && (
            <div className="mb-6">
              <CommunicationsWidget />
            </div>
          )}
          {isWidgetVisible("pipeline") && dashData.pipeline?.stages && (
            <Card className="p-4 mb-6">
              <h3 className="font-semibold text-sm mb-3">Loan Stages</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(dashData.pipeline.stages).map(([stage, count]) => (
                  <div key={stage} className="text-center p-2 rounded-lg bg-muted/40">
                    <p className="text-lg font-bold">{count as number}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{stage.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {isWidgetVisible("quick_actions") && <QuickActionsWidget role="lender" />}
        </>
      )}

      {role === "client" && (
        <>
          {isWidgetVisible("stats") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <StatCard
                icon={MessageSquare}
                label="Unread Messages"
                value={dashData.unreadMessages || 0}
                accent="border-l-amber-500"
              />
              {dashData.transaction && (
                <StatCard
                  icon={FileText}
                  label="Pending Documents"
                  value={dashData.pendingDocuments || 0}
                  accent="border-l-blue-500"
                />
              )}
            </div>
          )}
          {isWidgetVisible("transaction") && dashData.transaction && (
            <Card className="p-4 mb-6">
              <h3 className="font-semibold text-sm mb-3">My Transaction</h3>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-medium">{dashData.transaction.streetName}</p>
                  <Badge variant="outline" className="text-xs mt-1 capitalize">{dashData.transaction.status?.replace(/_/g, " ")}</Badge>
                </div>
                {dashData.transaction.closingDate && (
                  <div className="text-right ml-auto">
                    <p className="text-xs text-muted-foreground">Closing</p>
                    <p className="text-sm font-medium">
                      {new Date(dashData.transaction.closingDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
              <Link href="/my-transaction">
                <Button variant="outline" size="sm" className="mt-3 gap-1">
                  View Details <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </Card>
          )}
          {isWidgetVisible("quick_actions") && <QuickActionsWidget role="client" />}
        </>
      )}
    </div>
  );
}
