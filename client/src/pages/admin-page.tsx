import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import {
  Users, BarChart3, Shield, Flag, Megaphone, ClipboardList,
  CheckCircle, XCircle, Search, ExternalLink, Eye, TrendingUp,
  ArrowUpRight, ArrowDownRight, Target, FileText, UserPlus,
  MessageSquare, Send, Loader2
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  agent: "hsl(var(--foreground))",
  broker: "hsl(var(--foreground) / 0.7)",
  client: "hsl(var(--foreground) / 0.5)",
  vendor: "hsl(var(--foreground) / 0.35)",
  lender: "hsl(var(--foreground) / 0.2)",
  admin: "hsl(var(--foreground) / 0.1)",
};

const PIE_SHADES = [
  "hsl(var(--foreground))",
  "hsl(var(--foreground) / 0.7)",
  "hsl(var(--foreground) / 0.5)",
  "hsl(var(--foreground) / 0.35)",
  "hsl(var(--foreground) / 0.2)",
  "hsl(var(--foreground) / 0.1)",
];

function StatCard({ title, value, change, icon: Icon, subtitle }: {
  title: string; value: string | number; change?: number; icon: typeof Users; subtitle?: string;
}) {
  return (
    <Card className="p-5 flex flex-col justify-between gap-3 border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
              change >= 0
                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50"
                : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
            }`}>
              {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}%
            </span>
          )}
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
    </Card>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectUserId, setRejectUserId] = useState<number | null>(null);
  const [adNotes, setAdNotes] = useState<Record<number, string>>({});
  const [replyTo, setReplyTo] = useState<any>(null);
  const [replyText, setReplyText] = useState("");

  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/admin/stats"], enabled: isAdmin });
  const usersQueryUrl = (() => {
    const params = new URLSearchParams();
    if (userSearch) params.set("search", userSearch);
    if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
    const qs = params.toString();
    return qs ? `/api/admin/users?${qs}` : "/api/admin/users";
  })();
  const { data: usersData } = useQuery<any>({
    queryKey: [usersQueryUrl],
    enabled: isAdmin,
  });
  const { data: verifications } = useQuery({ queryKey: ["/api/admin/verifications"], enabled: isAdmin });
  const { data: reports } = useQuery({ queryKey: ["/api/admin/reports"], enabled: isAdmin });
  const { data: ads } = useQuery({ queryKey: ["/api/admin/ads"], enabled: isAdmin });
  const { data: auditLog } = useQuery({ queryKey: ["/api/admin/audit-log"], enabled: isAdmin });
  const { data: adminMessages = [] } = useQuery<any[]>({ queryKey: ["/api/admin/messages"], enabled: isAdmin });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditUser(null);
      toast({ title: "User updated" });
    },
  });

  const approveVerification = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest("POST", `/api/admin/verifications/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Verification approved" });
    },
  });

  const rejectVerification = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason: string }) => {
      await apiRequest("POST", `/api/admin/verifications/${userId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/verifications"] });
      setRejectUserId(null);
      setRejectReason("");
      toast({ title: "Verification rejected" });
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/reports/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({ title: "Report updated" });
    },
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status?: string; adminNotes?: string }) => {
      await apiRequest("PATCH", `/api/admin/ads/${id}`, { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Ad updated" });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: number; content: string }) => {
      await apiRequest("POST", `/api/admin/messages/${messageId}/reply`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      setReplyTo(null);
      setReplyText("");
      toast({ title: "Reply sent" });
    },
  });

  const roleData = useMemo(() => {
    if (!stats?.usersByRole) return [];
    return (stats.usersByRole as any[]).map((r: any) => ({
      name: r.role.charAt(0).toUpperCase() + r.role.slice(1),
      value: Number(r.count),
    }));
  }, [stats]);

  const txStatusData = useMemo(() => {
    if (!stats?.transactionsByStatus) return [];
    return (stats.transactionsByStatus as any[]).map((t: any) => ({
      name: t.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      value: Number(t.count),
    }));
  }, [stats]);

  const growthData = useMemo(() => {
    if (!stats?.userGrowth) return [];
    const userMap = new Map((stats.userGrowth as any[]).map((u: any) => [u.month, Number(u.count)]));
    const txMap = new Map((stats.txGrowth as any[] || []).map((t: any) => [t.month, Number(t.count)]));
    const allMonths = new Set([...userMap.keys(), ...txMap.keys()]);
    return Array.from(allMonths).sort().map(m => ({
      month: m.slice(5),
      users: userMap.get(m) || 0,
      transactions: txMap.get(m) || 0,
    }));
  }, [stats]);

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingCount = (verifications as any[])?.length || 0;
  const pendingReportsCount = (reports as any[])?.filter((r: any) => r.status === "pending").length || 0;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform overview and management</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={stats?.totalUsers || 0} change={stats?.userChange} icon={Users} subtitle="this month" />
        <StatCard title="Transactions" value={stats?.totalTransactions || 0} change={stats?.txChange} icon={FileText} subtitle="this month" />
        <StatCard title="Total Clients" value={stats?.totalClients || 0} icon={Target} />
        <StatCard title="Total Leads" value={stats?.totalLeads || 0} icon={TrendingUp} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Pending Verifications" value={stats?.pendingVerifications || 0} icon={Shield} />
        <StatCard title="Pending Reports" value={stats?.pendingReports || 0} icon={Flag} />
        <StatCard title="Active Ads" value={stats?.activeAds || 0} icon={Megaphone} />
        <StatCard title="Pending Ads" value={stats?.pendingAds || 0} icon={Megaphone} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">User & Transaction Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {growthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={growthData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Area type="monotone" dataKey="users" name="Users" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground) / 0.15)" strokeWidth={2} />
                  <Area type="monotone" dataKey="transactions" name="Transactions" stroke="hsl(var(--foreground) / 0.5)" fill="hsl(var(--foreground) / 0.08)" strokeWidth={2} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Users by Role</CardTitle>
          </CardHeader>
          <CardContent>
            {roleData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie data={roleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                      {roleData.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_SHADES[i % PIE_SHADES.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {roleData.map((r: any, i: number) => (
                    <div key={r.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ background: PIE_SHADES[i % PIE_SHADES.length] }} />
                        <span>{r.name}</span>
                      </div>
                      <span className="font-medium">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {txStatusData.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Transactions by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={txStatusData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120} />
                <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="value" name="Count" fill="hsl(var(--foreground) / 0.6)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(stats?.recentSignups as any[])?.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Recent Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(stats.recentSignups as any[]).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-xs font-medium">
                      {(u.first_name?.[0] || "")}{(u.last_name?.[0] || "")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">{u.role}</Badge>
                    
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="verifications" className="relative">
            <Shield className="h-4 w-4 mr-1" />Verifications
            {pendingCount > 0 && <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full h-4 w-4 inline-flex items-center justify-center">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="reports" className="relative">
            <Flag className="h-4 w-4 mr-1" />Reports
            {pendingReportsCount > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 inline-flex items-center justify-center">{pendingReportsCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="ads"><Megaphone className="h-4 w-4 mr-1" />Ads</TabsTrigger>
          <TabsTrigger value="messages"><MessageSquare className="h-4 w-4 mr-1" />Messages</TabsTrigger>
          <TabsTrigger value="audit"><ClipboardList className="h-4 w-4 mr-1" />Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="broker">Broker</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="lender">Lender</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Card className="border border-border/60 shadow-sm">
            <div className="rounded-md overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(usersData?.users || []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                    </TableRow>
                  )}
                  {(usersData?.users || []).map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-muted-foreground">{u.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-muted/50 flex items-center justify-center text-[10px] font-medium shrink-0">
                            {(u.first_name?.[0] || "")}{(u.last_name?.[0] || "")}
                          </div>
                          <span className="font-medium">{u.first_name} {u.last_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell>{u.email_verified ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4 text-red-400" />}</TableCell>
                      <TableCell><Badge variant={u.verification_status === "admin_verified" ? "default" : "secondary"} className="text-[10px]">{u.verification_status || "unverified"}</Badge></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setEditUser(u)}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {usersData?.total > 0 && (
              <div className="p-3 border-t text-xs text-muted-foreground">
                Showing {usersData.users?.length || 0} of {usersData.total} users
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          {(verifications as any[])?.length === 0 && <p className="text-muted-foreground text-center py-8">No pending verifications</p>}
          {(verifications as any[])?.map((v: any) => (
            <Card key={v.id} className="border border-border/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{v.first_name} {v.last_name}</p>
                    <p className="text-sm text-muted-foreground">{v.email} — {v.role}</p>
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {v.license_number && <span>License: {v.license_number} ({v.license_state})</span>}
                      {v.brokerage_name && <span>Brokerage: {v.brokerage_name}</span>}
                      {v.name_match_score != null && <span>Name Match: {Math.round(v.name_match_score * 100)}%</span>}
                    </div>
                    {v.lookup_url && (
                      <a href={v.lookup_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" /> Verify License
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveVerification.mutate(v.id)} disabled={approveVerification.isPending}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectUserId(v.id)}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {(reports as any[])?.length === 0 && <p className="text-muted-foreground text-center py-8">No reports</p>}
          {(reports as any[])?.map((r: any) => (
            <Card key={r.id} className="border border-border/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{r.address || `Listing #${r.verified_listing_id}`}</p>
                    <p className="text-sm text-muted-foreground">Reported by: {r.first_name} {r.last_name}</p>
                    <p className="text-sm mt-1">{r.reason}</p>
                    <Badge variant={r.status === "pending" ? "destructive" : "secondary"} className="mt-1">{r.status}</Badge>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateReport.mutate({ id: r.id, status: "reviewed" })}>
                        <Eye className="h-4 w-4 mr-1" /> Mark Reviewed
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateReport.mutate({ id: r.id, status: "dismissed" })}>
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ads" className="space-y-4">
          {(ads as any[])?.length === 0 && <p className="text-muted-foreground text-center py-8">No ads</p>}
          <Card className="border border-border/60 shadow-sm">
            <div className="rounded-md overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Advertiser</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ads as any[])?.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="text-muted-foreground">{a.first_name} {a.last_name}</TableCell>
                      <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                      <TableCell>${((a.budget_cents || 0) / 100).toFixed(2)}/mo</TableCell>
                      <TableCell>{(a.impressions || 0).toLocaleString()}</TableCell>
                      <TableCell>{(a.clicks || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={a.status === "active" ? "default" : a.status === "pending" ? "secondary" : a.status === "rejected" ? "destructive" : "outline"}>{a.status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {a.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => updateAd.mutate({ id: a.id, status: "active" })} disabled={updateAd.isPending}>Approve</Button>
                              <Button size="sm" variant="destructive" onClick={() => updateAd.mutate({ id: a.id, status: "rejected", adminNotes: adNotes[a.id] || "Rejected by admin" })} disabled={updateAd.isPending}>Reject</Button>
                            </>
                          )}
                          {a.status === "active" && (
                            <Button size="sm" variant="outline" onClick={() => updateAd.mutate({ id: a.id, status: "paused" })} disabled={updateAd.isPending}>Pause</Button>
                          )}
                          {a.status === "paused" && (
                            <Button size="sm" onClick={() => updateAd.mutate({ id: a.id, status: "active" })} disabled={updateAd.isPending}>Resume</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {adminMessages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages from users yet</p>
              <p className="text-xs mt-1">When users contact support, their messages will appear here.</p>
            </div>
          )}
          {adminMessages.map((msg: any) => (
            <Card key={msg.id} className="border border-border/60 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center text-xs font-medium shrink-0">
                      {(msg.first_name?.[0] || "")}{(msg.last_name?.[0] || "")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{msg.first_name} {msg.last_name}</p>
                      <p className="text-xs text-muted-foreground">{msg.email} — <Badge variant="outline" className="text-[10px] py-0">{msg.role}</Badge></p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{msg.created_at ? new Date(msg.created_at).toLocaleString() : ""}</span>
                </div>
                <div className="text-sm bg-muted/30 rounded-lg p-3">
                  <p className="font-medium text-xs text-muted-foreground mb-1">{msg.subject || "General Inquiry"}</p>
                  <p>{msg.content}</p>
                </div>
                {msg.admin_reply && (
                  <div className="text-sm bg-primary/5 rounded-lg p-3 border-l-2 border-primary/30 ml-4">
                    <p className="font-medium text-xs text-primary/70 mb-1">Admin Reply</p>
                    <p>{msg.admin_reply}</p>
                  </div>
                )}
                {!msg.admin_reply && (
                  <Button size="sm" variant="outline" onClick={() => setReplyTo(msg)}>
                    <Send className="h-3 w-3 mr-1" /> Reply
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card className="border border-border/60 shadow-sm">
            <div className="rounded-md overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(auditLog as any[])?.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}</TableCell>
                      <TableCell>{entry.first_name} {entry.last_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{entry.action}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{entry.target_type} #{entry.target_id}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{entry.details ? JSON.stringify(entry.details) : ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {editUser && (
        <Dialog open onOpenChange={() => setEditUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit User: {editUser.first_name} {editUser.last_name}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Role</label>
                <Select value={editUser.role} onValueChange={(v) => setEditUser({ ...editUser, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="broker">Broker</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                    <SelectItem value="lender">Lender</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Verification Status</label>
                <Select value={editUser.verification_status || "unverified"} onValueChange={(v) => setEditUser({ ...editUser, verification_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="license_verified">License Verified</SelectItem>
                    <SelectItem value="stripe_verified">Stripe Verified</SelectItem>
                    <SelectItem value="broker_verified">Broker Verified</SelectItem>
                    <SelectItem value="admin_verified">Admin Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button onClick={() => updateUserMutation.mutate({ id: editUser.id, data: { role: editUser.role, verificationStatus: editUser.verification_status } })} disabled={updateUserMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {rejectUserId && (
        <Dialog open onOpenChange={() => { setRejectUserId(null); setRejectReason(""); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reject Verification</DialogTitle></DialogHeader>
            <Textarea placeholder="Reason for rejection (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectUserId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => rejectVerification.mutate({ userId: rejectUserId, reason: rejectReason })} disabled={rejectVerification.isPending}>
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {replyTo && (
        <Dialog open onOpenChange={() => { setReplyTo(null); setReplyText(""); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Reply to {replyTo.first_name} {replyTo.last_name}</DialogTitle></DialogHeader>
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <p className="font-medium text-xs text-muted-foreground mb-1">{replyTo.subject || "General Inquiry"}</p>
              <p>{replyTo.content}</p>
            </div>
            <Textarea placeholder="Type your reply..." value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplyTo(null)}>Cancel</Button>
              <Button onClick={() => replyMutation.mutate({ messageId: replyTo.id, content: replyText })} disabled={!replyText.trim() || replyMutation.isPending}>
                <Send className="h-4 w-4 mr-1" /> Send Reply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
