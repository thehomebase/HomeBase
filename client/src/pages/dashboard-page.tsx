import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Users, FileText, MessageSquare,
  Target, DollarSign, CalendarClock, ArrowRight, Plus, Send, Settings,
  X, Clock, AlertTriangle, Briefcase, Zap, CheckCircle2, Minus
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

const AGENT_WIDGETS = [
  { id: "pipeline", label: "Deal Pipeline" },
  { id: "stats", label: "Key Metrics" },
  { id: "activity_chart", label: "Activity Chart (24h)" },
  { id: "leads", label: "Leads Overview" },
  { id: "deadlines", label: "Upcoming Deadlines" },
  { id: "recent", label: "Recent Activity" },
  { id: "quick_actions", label: "Quick Actions" },
];

const VENDOR_WIDGETS = [
  { id: "stats", label: "Key Metrics" },
  { id: "bids", label: "Bids Overview" },
  { id: "quick_actions", label: "Quick Actions" },
];

const LENDER_WIDGETS = [
  { id: "stats", label: "Key Metrics" },
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

function ActivityChart({ data }: { data: { hour: number; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Activity</h3>
          <p className="text-xs text-muted-foreground">Messages & communications in the last 24 hours</p>
        </div>
        <div className="flex gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold">{data.reduce((s, d) => s + d.count, 0)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
          </div>
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
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(h) => `${h}:00`}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={20}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.count > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
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

function RecentActivityWidget({ activities }: { activities: any[] }) {
  const typeIcons: Record<string, any> = {
    transaction: Briefcase,
    lead: Target,
    message: MessageSquare,
  };
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Recent Activity</h3>
      </div>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">No recent activity</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a, i) => {
            const Icon = typeIcons[a.type] || Briefcase;
            return (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1 py-0">{a.detail}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(a.time).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
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

      {role === "agent" && (
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
              <RecentActivityWidget activities={dashData.recentActivity || []} />
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
