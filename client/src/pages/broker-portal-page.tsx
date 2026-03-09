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
  AlertTriangle, Info
} from "lucide-react";
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
                    <SelectItem value="commissions">Commissions</SelectItem>
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

export default function BrokerPortalPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Broker Portal</h1>
        <p className="text-muted-foreground">Manage your brokerage, monitor agent performance, and run competitions</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview" className="gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="competitions" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Competitions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
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