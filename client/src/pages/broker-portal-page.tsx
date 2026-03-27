import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import {
  Users, TrendingUp, TrendingDown, DollarSign, Briefcase, Target,
  Bell, Trophy, Send, Plus, ArrowUpRight, ArrowDownRight, Minus,
  Phone, Mail, MessageSquare, Calendar, Award, Crown, Medal,
  ChevronUp, ChevronDown, ChevronsUpDown, CheckCircle2, Clock,
  AlertTriangle, Info, MapPin, ArrowRight, UserCheck, RefreshCw,
  Armchair, UserPlus, UserMinus, X, BarChart3, Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, Legend } from "recharts";
import { useToast } from "@/hooks/use-toast";
import type { BrokerNotification, SalesCompetition } from "@shared/schema";

function formatCurrency(val: number) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="h-3 w-3" /> No change
    </span>
  );
  return value > 0 ? (
    <span className="flex items-center gap-0.5 text-xs text-emerald-600">
      <TrendingUp className="h-3 w-3" /> +{value}{suffix}
    </span>
  ) : (
    <span className="flex items-center gap-0.5 text-xs text-red-500">
      <TrendingDown className="h-3 w-3" /> {value}{suffix}
    </span>
  );
}

function MetricCard({ icon: Icon, label, value, trend, accent }: {
  icon: any;
  label: string;
  value: string | number;
  trend?: number;
  accent?: string;
}) {
  return (
    <Card className={`p-5 relative overflow-hidden border-l-4 ${accent || "border-l-primary"}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {trend !== undefined && <TrendIndicator value={trend} />}
        </div>
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function OverviewTab() {
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data: agents = [], isLoading: agentsLoading } = useQuery<any[]>({
    queryKey: ["/api/broker/agents"],
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery<any>({
    queryKey: ["/api/broker/metrics"],
  });

  const isLoading = agentsLoading || metricsLoading;

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedAgents = [...agents].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (sortField === "name") {
      aVal = `${a.firstName} ${a.lastName}`;
      bVal = `${b.firstName} ${b.lastName}`;
    }
    if (typeof aVal === "string") {
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === "asc" ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />;
  };

  const activityData = metrics?.dailyActivity || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          icon={Users}
          label="Total Agents"
          value={metrics?.totalAgents || 0}
          accent="border-l-blue-500"
        />
        <MetricCard
          icon={Briefcase}
          label="Active Deals"
          value={metrics?.activeDeals || 0}
          trend={metrics?.dealsTrend}
          accent="border-l-amber-500"
        />
        <MetricCard
          icon={DollarSign}
          label="Pipeline Value"
          value={formatCurrency(metrics?.pipelineValue || 0)}
          trend={metrics?.pipelineTrend}
          accent="border-l-emerald-500"
        />
        <MetricCard
          icon={Target}
          label="Total Clients"
          value={metrics?.totalClients || 0}
          trend={metrics?.clientsTrend}
          accent="border-l-purple-500"
        />
        <MetricCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${metrics?.conversionRate || 0}%`}
          trend={metrics?.conversionTrend}
          accent="border-l-rose-500"
        />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Activity Overview</h3>
            <p className="text-sm text-muted-foreground">Daily communications across all agents</p>
          </div>
        </div>
        {activityData.length > 0 ? (
          <>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="calls" stackId="a" fill="#6366f1" maxBarSize={24} name="Calls" />
                  <Bar dataKey="emails" stackId="a" fill="#3b82f6" maxBarSize={24} name="Emails" />
                  <Bar dataKey="texts" stackId="a" fill="#10b981" maxBarSize={24} name="Texts" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t justify-center">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#6366f1" }} /><span className="text-xs text-muted-foreground">Calls</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#3b82f6" }} /><span className="text-xs text-muted-foreground">Emails</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "#10b981" }} /><span className="text-xs text-muted-foreground">Texts</span></div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No activity data available yet</p>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Agent Performance</h3>
            <p className="text-sm text-muted-foreground">{agents.length} agents in your brokerage</p>
          </div>
        </div>
        {agents.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                    <span className="flex items-center">Agent <SortIcon field="name" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("transactions")}>
                    <span className="flex items-center justify-end">Deals <SortIcon field="transactions" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("clients")}>
                    <span className="flex items-center justify-end">Clients <SortIcon field="clients" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("pipelineValue")}>
                    <span className="flex items-center justify-end">Pipeline <SortIcon field="pipelineValue" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("communications")}>
                    <span className="flex items-center justify-end">Activity <SortIcon field="communications" /></span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {agent.firstName?.[0]}{agent.lastName?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.firstName} {agent.lastName}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{agent.transactions || 0}</TableCell>
                    <TableCell className="text-right">{agent.clients || 0}</TableCell>
                    <TableCell className="text-right">{formatCurrency(agent.pipelineValue || 0)}</TableCell>
                    <TableCell className="text-right">{agent.communications || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No agents in your brokerage yet</p>
        )}
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");

  const { data: notifications = [], isLoading } = useQuery<(BrokerNotification & { readCount: number })[]>({
    queryKey: ["/api/broker/notifications"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; message: string; priority: string }) => {
      const res = await apiRequest("POST", "/api/broker/notifications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/notifications"] });
      setTitle("");
      setMessage("");
      setPriority("normal");
      toast({ title: "Notification sent", description: "Your notification has been sent to all agents." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    createMutation.mutate({ title, message, priority });
  };

  const priorityIcon = (p: string) => {
    switch (p) {
      case "urgent": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "info": return <Info className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const priorityBadge = (p: string) => {
    switch (p) {
      case "urgent": return <Badge variant="destructive" className="text-[10px]">Urgent</Badge>;
      case "info": return <Badge variant="secondary" className="text-[10px]">Info</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">Normal</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-5 lg:col-span-1">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Send className="h-4 w-4" /> Send Notification
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notif-title">Title</Label>
            <Input
              id="notif-title"
              placeholder="Notification title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notif-message">Message</Label>
            <Textarea
              id="notif-message"
              placeholder="Write your message to all agents..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={createMutation.isPending || !title.trim() || !message.trim()}>
            <Send className="h-4 w-4" />
            {createMutation.isPending ? "Sending..." : "Send to All Agents"}
          </Button>
        </form>
      </Card>

      <Card className="p-5 lg:col-span-2">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4" /> Sent Notifications
        </h3>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No notifications sent yet</p>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    {priorityIcon(n.priority)}
                    <h4 className="font-medium text-sm">{n.title}</h4>
                    {priorityBadge(n.priority)}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <CheckCircle2 className="h-3 w-3" />
                    {n.readCount} read
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(n.createdAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CompetitionsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [metric, setMetric] = useState("total_activity");
  const [prize, setPrize] = useState("");

  const { data: competitions = [], isLoading } = useQuery<SalesCompetition[]>({
    queryKey: ["/api/broker/competitions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/broker/competitions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/competitions"] });
      setShowForm(false);
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setMetric("total_activity");
      setPrize("");
      toast({ title: "Competition created", description: "Your sales competition has been created." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    createMutation.mutate({
      name,
      description,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      metric,
      prize,
      status: new Date(startDate) <= new Date() ? "active" : "upcoming",
    });
  };

  const activeCompetitions = competitions.filter(c => c.status === "active");
  const upcomingCompetitions = competitions.filter(c => c.status === "upcoming");
  const completedCompetitions = competitions.filter(c => c.status === "completed");

  const metricLabels: Record<string, string> = {
    calls: "Most Calls",
    emails: "Most Emails",
    texts: "Most Texts",
    conversions: "Most Conversions",
    commissions: "Highest Commissions",
    total_activity: "Total Activity",
    deals_closed: "Deals Closed",
    volume_closed: "Volume Closed",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Sales Competitions</h3>
          <p className="text-sm text-muted-foreground">Motivate your team with friendly competition</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New Competition"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Competition Name</Label>
                <Input placeholder="e.g., March Madness Sales Sprint" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prize</Label>
                <Input placeholder="e.g., $500 bonus" value={prize} onChange={(e) => setPrize(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the competition rules..." rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={metric} onValueChange={setMetric}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calls">Calls</SelectItem>
                    <SelectItem value="emails">Emails</SelectItem>
                    <SelectItem value="texts">Texts</SelectItem>
                    <SelectItem value="conversions">Conversions</SelectItem>
                    <SelectItem value="commissions">Commissions (GCI)</SelectItem>
                    <SelectItem value="deals_closed">Deals Closed</SelectItem>
                    <SelectItem value="volume_closed">Volume Closed ($)</SelectItem>
                    <SelectItem value="total_activity">Total Activity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={createMutation.isPending || !name.trim() || !startDate || !endDate} className="gap-2">
              <Trophy className="h-4 w-4" />
              {createMutation.isPending ? "Creating..." : "Create Competition"}
            </Button>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : (
        <>
          {activeCompetitions.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Active Competitions
              </h4>
              {activeCompetitions.map(comp => (
                <CompetitionCard key={comp.id} competition={comp} metricLabels={metricLabels} />
              ))}
            </div>
          )}

          {upcomingCompetitions.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-3 w-3" /> Upcoming
              </h4>
              {upcomingCompetitions.map(comp => (
                <CompetitionCard key={comp.id} competition={comp} metricLabels={metricLabels} />
              ))}
            </div>
          )}

          {completedCompetitions.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </h4>
              {completedCompetitions.map(comp => (
                <CompetitionCard key={comp.id} competition={comp} metricLabels={metricLabels} />
              ))}
            </div>
          )}

          {competitions.length === 0 && (
            <Card className="p-12 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No Competitions Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first sales competition to motivate your team</p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Create Competition
              </Button>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function CompetitionCard({ competition, metricLabels }: { competition: SalesCompetition; metricLabels: Record<string, string> }) {
  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/broker/competitions", competition.id, "leaderboard"],
    queryFn: async () => {
      const res = await fetch(`/api/broker/competitions/${competition.id}/leaderboard`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    upcoming: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const rankIcons = [Crown, Medal, Award];
  const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  const daysLeft = Math.max(0, Math.ceil((new Date(competition.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h4 className="font-semibold">{competition.name}</h4>
            <Badge className={`text-[10px] border ${statusColors[competition.status] || statusColors.upcoming}`}>
              {competition.status}
            </Badge>
          </div>
          {competition.description && (
            <p className="text-sm text-muted-foreground">{competition.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(competition.startDate).toLocaleDateString([], { month: "short", day: "numeric" })} — {new Date(competition.endDate).toLocaleDateString([], { month: "short", day: "numeric" })}
            </span>
            <span>Metric: {metricLabels[competition.metric] || competition.metric}</span>
            {competition.status === "active" && (
              <span className="font-medium text-emerald-600">{daysLeft} days left</span>
            )}
          </div>
        </div>
        {competition.prize && (
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">Prize</p>
            <p className="font-semibold text-sm">{competition.prize}</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : leaderboard.length > 0 ? (
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-1.5 text-xs text-muted-foreground font-medium">
            <span className="w-8 text-center">#</span>
            <span className="flex-1">Agent</span>
            <span className="w-20 text-right">Score</span>
          </div>
          {leaderboard.map((entry, i) => {
            const RankIcon = i < 3 ? rankIcons[i] : null;
            return (
              <div
                key={entry.agentId || i}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${i === 0 ? "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800" : "hover:bg-muted/50"}`}
              >
                <span className="w-8 text-center font-bold text-sm">
                  {RankIcon ? (
                    <RankIcon className={`h-5 w-5 mx-auto ${rankColors[i]}`} />
                  ) : (
                    <span className="text-muted-foreground">{i + 1}</span>
                  )}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {entry.firstName?.[0]}{entry.lastName?.[0]}
                  </div>
                  <span className="text-sm font-medium">{entry.firstName} {entry.lastName}</span>
                </div>
                <span className="w-20 text-right font-bold text-sm">{entry.score || 0}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No leaderboard data yet</p>
      )}
    </Card>
  );
}

function LeadRoutingTab() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reassigningId, setReassigningId] = useState<number | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>("");

  const { data: leads = [], isLoading: leadsLoading } = useQuery<any[]>({
    queryKey: ["/api/broker/leads"],
  });

  const { data: agents = [] } = useQuery<any[]>({
    queryKey: ["/api/broker/agents"],
  });

  const reassignMutation = useMutation({
    mutationFn: async ({ leadId, agentId }: { leadId: number; agentId: number }) => {
      const res = await apiRequest("POST", `/api/broker/leads/${leadId}/reassign`, { agentId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/broker/leads"] });
      setReassigningId(null);
      setSelectedAgent("");
      toast({ title: "Lead reassigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to reassign lead", description: error.message, variant: "destructive" });
    },
  });

  const filteredLeads = statusFilter === "all" ? leads : leads.filter(l => l.status === statusFilter);

  const statusCounts = {
    all: leads.length,
    new: leads.filter(l => l.status === "new").length,
    assigned: leads.filter(l => l.status === "assigned").length,
    accepted: leads.filter(l => l.status === "accepted").length,
    converted: leads.filter(l => l.status === "converted").length,
    rejected: leads.filter(l => l.status === "rejected").length,
  };

  const statusBadgeColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700 border-blue-200",
    assigned: "bg-amber-100 text-amber-700 border-amber-200",
    accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
    converted: "bg-purple-100 text-purple-700 border-purple-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  if (leadsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card
            key={status}
            className={`p-3 cursor-pointer transition-all ${statusFilter === status ? "ring-2 ring-primary" : "hover:shadow-md"}`}
            onClick={() => setStatusFilter(status)}
          >
            <p className="text-xs font-medium text-muted-foreground capitalize">{status === "all" ? "All Leads" : status}</p>
            <p className="text-2xl font-bold">{count}</p>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 ? (
        <Card className="p-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leads found</h3>
          <p className="text-muted-foreground">
            {statusFilter === "all"
              ? "No leads have been generated for your brokerage agents yet."
              : `No leads with "${statusFilter}" status.`}
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Zip</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="font-medium">{lead.first_name} {lead.last_name}</div>
                      {lead.message && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{lead.message}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{lead.email}</div>
                      {lead.phone && <div className="text-xs text-muted-foreground">{lead.phone}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{lead.zip_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{lead.type}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{lead.budget || "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${statusBadgeColors[lead.status] || ""}`}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {lead.agent_first_name ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{lead.agent_first_name} {lead.agent_last_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {reassigningId === lead.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                              <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent: any) => (
                                <SelectItem key={agent.id} value={String(agent.id)}>
                                  {agent.firstName} {agent.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            className="h-8"
                            disabled={!selectedAgent || reassignMutation.isPending}
                            onClick={() => reassignMutation.mutate({ leadId: lead.id, agentId: Number(selectedAgent) })}
                          >
                            {reassignMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => { setReassigningId(null); setSelectedAgent(""); }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => setReassigningId(lead.id)}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" />
                          Route
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function TeamSeatsTab() {
  const { toast } = useToast();
  const [seatCount, setSeatCount] = useState(5);
  const [agentEmail, setAgentEmail] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  const { data: seatData, isLoading } = useQuery<{ plan: any; assignments: any[]; usedSeats: number }>({
    queryKey: ["/api/broker/seats"],
  });

  const { data: brokerAgents } = useQuery<any[]>({ queryKey: ["/api/broker/agents"] });

  const createPlan = useMutation({
    mutationFn: (totalSeats: number) => apiRequest("POST", "/api/broker/seats", { totalSeats }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/broker/seats"] }); toast({ title: "Seat plan created" }); setShowSetup(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateSeats = useMutation({
    mutationFn: (totalSeats: number) => apiRequest("PATCH", "/api/broker/seats", { totalSeats }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/broker/seats"] }); toast({ title: "Seats updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignAgent = useMutation({
    mutationFn: (agentUserId: number) => apiRequest("POST", "/api/broker/seats/assign", { agentUserId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/broker/seats"] }); setAgentEmail(""); toast({ title: "Agent assigned to seat" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeAgent = useMutation({
    mutationFn: (agentId: number) => apiRequest("DELETE", `/api/broker/seats/remove/${agentId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/broker/seats"] }); toast({ title: "Agent removed from seat" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;

  const plan = seatData?.plan;
  const assignments = seatData?.assignments || [];
  const usedSeats = seatData?.usedSeats || 0;

  if (!plan) {
    return (
      <Card className="p-8 text-center">
        <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Team Seat Licensing</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          Purchase seats for your agents instead of them paying individually. Save money and manage your entire brokerage's subscriptions in one place.
        </p>
        <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-sm mx-auto">
          <div className="text-3xl font-bold text-primary">$39<span className="text-base font-normal text-muted-foreground">/seat/month</span></div>
          <p className="text-xs text-muted-foreground mt-1">vs $49/month per individual agent subscription</p>
        </div>
        {!showSetup ? (
          <Button onClick={() => setShowSetup(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" /> Set Up Team Seats
          </Button>
        ) : (
          <div className="flex items-end gap-3 justify-center">
            <div>
              <Label className="text-sm">Number of seats</Label>
              <Input type="number" min={1} max={100} value={seatCount} onChange={e => setSeatCount(Number(e.target.value))} className="w-24" />
            </div>
            <div className="text-sm text-muted-foreground pb-2">=</div>
            <div className="text-lg font-bold pb-1">${((seatCount * 3900) / 100).toFixed(0)}/mo</div>
            <Button onClick={() => createPlan.mutate(seatCount)} disabled={createPlan.isPending}>
              {createPlan.isPending ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  const availableAgents = (brokerAgents || []).filter(
    (a: any) => !assignments.find((s: any) => s.agentUserId === a.id)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Seats Used</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{usedSeats} / {plan.totalSeats}</div>
          <div className="w-full bg-muted rounded-full h-2 mt-2">
            <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${(usedSeats / plan.totalSeats) * 100}%` }} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Per Seat Cost</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">${(plan.pricePerSeatCents / 100).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          <p className="text-xs text-muted-foreground mt-1">Save $10/agent vs individual plans</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Monthly Total</span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">${((plan.totalSeats * plan.pricePerSeatCents) / 100).toFixed(0)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
          <p className="text-xs text-muted-foreground mt-1">For {plan.totalSeats} seats</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Manage Seat Count</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => { if (plan.totalSeats > usedSeats) updateSeats.mutate(plan.totalSeats - 1); }} disabled={plan.totalSeats <= usedSeats}>
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-lg font-bold w-12 text-center">{plan.totalSeats}</span>
          <Button variant="outline" size="icon" onClick={() => updateSeats.mutate(plan.totalSeats + 1)}>
            <Plus className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">seats</span>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Assign Agent to Seat</h3>
        {availableAgents.length > 0 ? (
          <div className="flex gap-3">
            <Select value={agentEmail} onValueChange={setAgentEmail}>
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select an agent..." />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.map((agent: any) => (
                  <SelectItem key={agent.id} value={String(agent.id)}>
                    {agent.firstName} {agent.lastName} ({agent.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { if (agentEmail) assignAgent.mutate(Number(agentEmail)); }} disabled={!agentEmail || assignAgent.isPending}>
              <UserPlus className="h-4 w-4 mr-2" /> Assign
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">All your brokerage agents are already assigned seats, or no agents found.</p>
        )}
      </Card>

      {assignments.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Assigned Agents ({assignments.length})</h3>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.agentName}</TableCell>
                    <TableCell>{a.agentEmail}</TableCell>
                    <TableCell>{a.assignedAt ? new Date(a.assignedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeAgent.mutate(a.agentUserId)} disabled={removeAgent.isPending}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [sortBy, setSortBy] = useState<'closedVolume' | 'closedDeals' | 'estimatedGCI' | 'totalActivity'>('closedVolume');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/broker/ytd-leaderboard"],
  });

  const { data: drilldown, isLoading: drilldownLoading } = useQuery<any>({
    queryKey: ["/api/broker/agent", selectedAgentId, "drilldown"],
    queryFn: async () => {
      const res = await fetch(`/api/broker/agent/${selectedAgentId}/drilldown`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedAgentId,
  });

  const sorted = [...leaderboard].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  const rankIcons = [Crown, Medal, Award];
  const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  const stageLabels: Record<string, string> = {
    prospect: 'Prospect', qualified_buyer: 'Qualified Buyer', active_search: 'Active Search',
    active_listing_prep: 'Listing Prep', live_listing: 'Live Listing', offer_submitted: 'Offer Submitted',
    under_contract: 'Under Contract', closing: 'Closing', closed: 'Closed',
  };

  if (isLoading) return <div className="space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-500" /> YTD Top Producers</h3>
          <p className="text-sm text-muted-foreground">Year-to-date performance rankings — click an agent for details</p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="closedVolume">Volume Closed</SelectItem>
            <SelectItem value="closedDeals">Deals Closed</SelectItem>
            <SelectItem value="estimatedGCI">Est. GCI</SelectItem>
            <SelectItem value="totalActivity">Activity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-12 text-center">
          <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold text-lg mb-1">No Agent Data Yet</h3>
          <p className="text-sm text-muted-foreground">Add agents to your brokerage to see the leaderboard</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((entry, i) => {
            const RankIcon = i < 3 ? rankIcons[i] : null;
            return (
              <Card
                key={entry.agentId}
                className={`cursor-pointer transition-all hover:shadow-md ${i === 0 ? "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10 dark:border-yellow-800" : ""}`}
                onClick={() => setSelectedAgentId(entry.agentId)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="w-10 text-center shrink-0">
                    {RankIcon ? (
                      <RankIcon className={`h-6 w-6 mx-auto ${rankColors[i]}`} />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{i + 1}</span>
                    )}
                  </div>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {entry.firstName?.[0]}{entry.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{entry.firstName} {entry.lastName}</p>
                    <p className="text-xs text-muted-foreground">{entry.email}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-right shrink-0">
                    <div>
                      <p className="text-xs text-muted-foreground">Volume</p>
                      <p className={`font-bold text-sm ${sortBy === 'closedVolume' ? 'text-primary' : ''}`}>{formatCurrency(entry.closedVolume)}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Deals</p>
                      <p className={`font-bold text-sm ${sortBy === 'closedDeals' ? 'text-primary' : ''}`}>{entry.closedDeals}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">GCI</p>
                      <p className={`font-bold text-sm ${sortBy === 'estimatedGCI' ? 'text-primary' : ''}`}>{formatCurrency(entry.estimatedGCI)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active</p>
                      <p className="font-bold text-sm">{entry.activeDeals}</p>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedAgentId} onOpenChange={(open) => { if (!open) setSelectedAgentId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {drilldownLoading ? (
            <div className="space-y-4 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : drilldown ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {drilldown.agent.firstName?.[0]}{drilldown.agent.lastName?.[0]}
                  </div>
                  <div>
                    <p>{drilldown.agent.firstName} {drilldown.agent.lastName}</p>
                    <p className="text-sm text-muted-foreground font-normal">{drilldown.agent.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">YTD Volume</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(drilldown.ytdClosedVolume)}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">YTD Deals</p>
                  <p className="text-lg font-bold">{drilldown.ytdClosedDeals}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Est. GCI</p>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(drilldown.ytdGCI)}</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-lg font-bold">{drilldown.conversionRate}%</p>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-2">Last 30 Days Activity</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> Calls</span><span className="font-medium">{drilldown.last30Days.calls}</span></div>
                    <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> Emails</span><span className="font-medium">{drilldown.last30Days.emails}</span></div>
                    <div className="flex justify-between text-sm"><span className="flex items-center gap-1.5"><MessageSquare className="h-3 w-3" /> Texts</span><span className="font-medium">{drilldown.last30Days.texts}</span></div>
                  </div>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground mb-2">Portfolio</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm"><span>Total Deals</span><span className="font-medium">{drilldown.totalDeals}</span></div>
                    <div className="flex justify-between text-sm"><span>Closed</span><span className="font-medium">{drilldown.closedDeals}</span></div>
                    <div className="flex justify-between text-sm"><span>Clients</span><span className="font-medium">{drilldown.totalClients}</span></div>
                  </div>
                </Card>
              </div>

              {drilldown.recentTransactions?.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Recent Transactions</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {drilldown.recentTransactions.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tx.address || `Transaction #${tx.id}`}</p>
                          <p className="text-xs text-muted-foreground">{tx.type === 'buy' ? 'Buyer' : 'Seller'}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <Badge variant="outline" className="text-xs">{stageLabels[tx.status] || tx.status}</Badge>
                          {tx.contractPrice > 0 && <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(tx.contractPrice)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-center text-muted-foreground py-8">Agent not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnalyticsTab() {
  const { data: analytics, isLoading } = useQuery<any>({
    queryKey: ["/api/broker/analytics"],
  });

  const STAGE_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>;

  const stats = analytics?.closedStats || { deals: 0, volume: 0, gci: 0 };
  const stageData = analytics?.stageBreakdown || [];
  const monthlyData = analytics?.monthlyVolume || [];
  const pendingVolume = analytics?.pendingVolume || 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Brokerage Analytics</h3>
        <p className="text-sm text-muted-foreground">Year-to-date performance and pipeline breakdown</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={DollarSign} label="YTD Closed Volume" value={formatCurrency(stats.volume)} accent="border-l-emerald-500" />
        <MetricCard icon={Target} label="YTD Deals Closed" value={stats.deals} accent="border-l-blue-500" />
        <MetricCard icon={TrendingUp} label="Est. GCI" value={formatCurrency(stats.gci)} accent="border-l-purple-500" />
        <MetricCard icon={Clock} label="Pending Volume" value={formatCurrency(pendingVolume)} accent="border-l-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h4 className="font-semibold mb-4">Pipeline by Stage</h4>
          {stageData.length > 0 ? (
            <>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stageData}
                      dataKey="count"
                      nameKey="stage"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ stage, count }) => `${stage}: ${count}`}
                      labelLine={false}
                    >
                      {stageData.map((_: any, i: number) => (
                        <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {stageData.map((s: any, i: number) => (
                  <div key={s.stage} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
                      <span>{s.stage}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{s.count} deals</span>
                      <span className="text-muted-foreground ml-2">{formatCurrency(s.volume)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No transaction data</p>
          )}
        </Card>

        <Card className="p-5">
          <h4 className="font-semibold mb-4">Monthly Closed Volume (YTD)</h4>
          {monthlyData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} name="Volume" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No closed deals this year</p>
          )}

          {monthlyData.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg. per month</span>
                <span className="font-medium">{formatCurrency(stats.volume / (monthlyData.length || 1))}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Avg. deals/month</span>
                <span className="font-medium">{(stats.deals / (monthlyData.length || 1)).toFixed(1)}</span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function BrokerPortalPage() {
  const { user } = useAuth();

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Broker Portal</h1>
        <p className="text-muted-foreground">Manage your brokerage, monitor agent performance, and run competitions</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg max-w-3xl">
          <TabsTrigger value="overview" className="gap-2 flex-1 min-w-fit">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="gap-2 flex-1 min-w-fit">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 flex-1 min-w-fit">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="seats" className="gap-2 flex-1 min-w-fit">
            <Armchair className="h-4 w-4" />
            <span className="hidden sm:inline">Team Seats</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2 flex-1 min-w-fit">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 flex-1 min-w-fit">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="competitions" className="gap-2 flex-1 min-w-fit">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Competitions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="leaderboard">
          <LeaderboardTab />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab />
        </TabsContent>

        <TabsContent value="seats">
          <TeamSeatsTab />
        </TabsContent>

        <TabsContent value="leads">
          <LeadRoutingTab />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="competitions">
          <CompetitionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}