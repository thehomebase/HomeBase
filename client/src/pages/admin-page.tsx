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
  XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
  BarChart, Bar,
} from "recharts";
import {
  Users, BarChart3, Shield, Flag, Megaphone, ClipboardList,
  CheckCircle, XCircle, Search, ExternalLink, Eye, TrendingUp,
  ArrowUpRight, ArrowDownRight, Target, FileText, UserPlus,
  MessageSquare, Send, Loader2, ChevronLeft, ChevronRight,
  DollarSign, CreditCard, Receipt, MapPin, Clock, Percent,
  Activity, Zap, Mail, Phone, PenTool, Home, Globe, AlertTriangle
} from "lucide-react";

const ROLE_COLORS: Record<string, string> = {
  agent: "#2563eb",
  broker: "#7c3aed",
  client: "#059669",
  vendor: "#ea580c",
  lender: "#d946ef",
  admin: "#dc2626",
  total: "#334155",
};

const PIE_SHADES = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#ea580c",
  "#d946ef",
  "#dc2626",
];

const USERS_PER_PAGE = 10;

function StatCard({ title, value, change, icon: Icon, subtitle }: {
  title: string; value: string | number; change?: number; icon: typeof Users; subtitle?: React.ReactNode;
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
  const [usersPage, setUsersPage] = useState(0);
  const [chartRoleFilter, setChartRoleFilter] = useState<string>("all");
  const [chartMode, setChartMode] = useState<"growth" | "cumulative">("growth");

  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useQuery<any>({ queryKey: ["/api/admin/stats"], enabled: isAdmin });
  const { data: apiUsage, isLoading: apiUsageLoading, isError: apiUsageError } = useQuery<any>({ queryKey: ["/api/admin/api-usage"], enabled: isAdmin });
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

  const updateAccountStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [usersQueryUrl] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Account status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update account status", variant: "destructive" });
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

  const { growthData: roleGrowthData, cumulativeData } = useMemo(() => {
    if (!stats?.roleGrowth || (stats.roleGrowth as any[]).length === 0)
      return { growthData: [], cumulativeData: [] };
    const months = new Set<string>();
    const roleMap = new Map<string, Map<string, number>>();
    (stats.roleGrowth as any[]).forEach((r: any) => {
      months.add(r.month);
      if (!roleMap.has(r.role)) roleMap.set(r.role, new Map());
      roleMap.get(r.role)!.set(r.month, Number(r.count));
    });
    const sortedMonths = Array.from(months).sort();
    const roleCumulatives = new Map<string, number>();
    roleMap.forEach((_, role) => roleCumulatives.set(role, 0));
    const gData: any[] = [];
    const cData: any[] = [];
    sortedMonths.forEach(m => {
      const gEntry: any = { month: m.slice(5) };
      const cEntry: any = { month: m.slice(5) };
      let monthTotal = 0;
      roleMap.forEach((counts, role) => {
        const val = counts.get(m) || 0;
        gEntry[role] = val;
        monthTotal += val;
        roleCumulatives.set(role, (roleCumulatives.get(role) || 0) + val);
        cEntry[role] = roleCumulatives.get(role);
      });
      gEntry.total = monthTotal;
      cEntry.totalToDate = Array.from(roleCumulatives.values()).reduce((a, b) => a + b, 0);
      gData.push(gEntry);
      cData.push(cEntry);
    });
    return { growthData: gData, cumulativeData: cData };
  }, [stats]);

  const activeChartData = chartMode === "growth" ? roleGrowthData : cumulativeData;

  const roleKeys = useMemo(() => {
    if (!stats?.roleGrowth) return [];
    return [...new Set((stats.roleGrowth as any[]).map((r: any) => r.role))];
  }, [stats]);

  const visibleRoleKeys = useMemo(() => {
    if (chartRoleFilter === "all") return roleKeys;
    return roleKeys.filter(r => r === chartRoleFilter);
  }, [roleKeys, chartRoleFilter]);

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
          <CardHeader className="pb-2 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                {chartMode === "growth" ? "New Users by Role" : "Total Users to Date"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === "growth" ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    onClick={() => setChartMode("growth")}
                  >
                    New
                  </button>
                  <button
                    className={`px-3 py-1 text-xs font-medium transition-colors ${chartMode === "cumulative" ? "bg-foreground text-background" : "hover:bg-muted"}`}
                    onClick={() => setChartMode("cumulative")}
                  >
                    Cumulative
                  </button>
                </div>
                <Select value={chartRoleFilter} onValueChange={setChartRoleFilter}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roleKeys.map((r: string) => (
                      <SelectItem key={r} value={r}>
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full inline-block" style={{ background: ROLE_COLORS[r] }} />
                          {r.charAt(0).toUpperCase() + r.slice(1)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={activeChartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                  <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey={chartMode === "growth" ? "total" : "totalToDate"}
                    name={chartMode === "growth" ? "Total New" : "Total Users"}
                    stroke={ROLE_COLORS.total}
                    strokeWidth={2.5}
                    strokeDasharray="6 3"
                    dot={{ r: 3 }}
                  />
                  {visibleRoleKeys.map((role: string, i: number) => (
                    <Line key={role} type="monotone" dataKey={role} name={role.charAt(0).toUpperCase() + role.slice(1)} stroke={ROLE_COLORS[role] || PIE_SHADES[i % PIE_SHADES.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">No growth data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Current Users by Role</CardTitle>
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
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-auto">
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
            <TabsTrigger value="financial"><DollarSign className="h-4 w-4 mr-1" />Financial</TabsTrigger>
            <TabsTrigger value="leads"><Activity className="h-4 w-4 mr-1" />Leads</TabsTrigger>
            <TabsTrigger value="geographic"><MapPin className="h-4 w-4 mr-1" />Geographic</TabsTrigger>
            <TabsTrigger value="api-usage"><Zap className="h-4 w-4 mr-1" />API Usage</TabsTrigger>
            <TabsTrigger value="messages"><MessageSquare className="h-4 w-4 mr-1" />Messages</TabsTrigger>
            <TabsTrigger value="audit"><ClipboardList className="h-4 w-4 mr-1" />Audit Log</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUsersPage(0); }} className="pl-9" />
            </div>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setUsersPage(0); }}>
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
          {(() => {
            const allUsers = usersData?.users || [];
            const totalCount = allUsers.length;
            const totalPages = Math.max(1, Math.ceil(totalCount / USERS_PER_PAGE));
            const pageUsers = allUsers.slice(usersPage * USERS_PER_PAGE, (usersPage + 1) * USERS_PER_PAGE);
            return (
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
                        <TableHead>Verification</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageUsers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                        </TableRow>
                      )}
                      {pageUsers.map((u: any) => (
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
                            <Badge variant={u.account_status === "suspended" ? "destructive" : u.account_status === "inactive" ? "secondary" : "outline"} className="text-[10px]">
                              {u.account_status || "active"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditUser(u)}>Edit</Button>
                              {(u.account_status || "active") === "active" ? (
                                <Select onValueChange={(v) => updateAccountStatusMutation.mutate({ id: u.id, status: v })}>
                                  <SelectTrigger className="h-8 w-[100px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="inactive">Deactivate</SelectItem>
                                    <SelectItem value="suspended">Suspend</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => updateAccountStatusMutation.mutate({ id: u.id, status: "active" })}>
                                  Activate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalCount > 0 && (
                  <div className="flex items-center justify-between p-3 border-t">
                    <span className="text-xs text-muted-foreground">
                      Showing {usersPage * USERS_PER_PAGE + 1}–{Math.min((usersPage + 1) * USERS_PER_PAGE, totalCount)} of {totalCount}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={usersPage === 0} onClick={() => setUsersPage(p => p - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs px-2">{usersPage + 1} / {totalPages}</span>
                      <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={usersPage >= totalPages - 1} onClick={() => setUsersPage(p => p + 1)}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })()}
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

        <TabsContent value="financial" className="space-y-4">
          {(() => {
            const fin = stats?.financial || {};
            const revenueData = (fin.monthlyRevenue || []).map((m: any) => ({
              month: m.month?.slice(5) || "",
              revenue: Number(m.revenue || 0) / 100,
              invoices: Number(m.invoice_count || 0),
            }));
            const subStatusData = (fin.subscriptionsByStatus || []).map((s: any) => ({
              name: (s.status || "unknown").charAt(0).toUpperCase() + (s.status || "unknown").slice(1),
              value: Number(s.count || 0),
            }));
            const SUB_COLORS = ["#059669", "#2563eb", "#ea580c", "#dc2626", "#7c3aed"];
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="MRR (Subscriptions)" value={`$${((fin.mrr || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={DollarSign} subtitle="per month" />
                  <StatCard title="Active Subscriptions" value={fin.activeSubscriptions || 0} icon={CreditCard} />
                  <StatCard title="Ad Revenue" value={`$${((fin.adRevenueCents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={Megaphone} subtitle="per month" />
                  <StatCard title="Lead Gen Revenue" value={`$${((fin.leadGenRevenue?.total || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} icon={TrendingUp} subtitle="per month" />
                </div>

                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Lead Generation Revenue Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Agents</p>
                        <p className="text-lg font-bold">${((fin.leadGenRevenue?.agents || 0) / 100).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Lenders</p>
                        <p className="text-lg font-bold">${((fin.leadGenRevenue?.lenders || 0) / 100).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Vendors</p>
                        <p className="text-lg font-bold">${((fin.leadGenRevenue?.vendors || 0) / 100).toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Monthly Revenue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={revenueData}>
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={50} tickFormatter={(v: number) => `$${v}`} />
                            <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]} />
                            <Bar dataKey="revenue" name="Revenue" fill="#059669" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No revenue data yet</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Subscriptions by Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {subStatusData.length > 0 ? (
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                              <Pie data={subStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                                {subStatusData.map((_: any, i: number) => (
                                  <Cell key={i} fill={SUB_COLORS[i % SUB_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2">
                            {subStatusData.map((s: any, i: number) => (
                              <div key={s.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ background: SUB_COLORS[i % SUB_COLORS.length] }} />
                                  <span>{s.name}</span>
                                </div>
                                <span className="font-medium">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No subscriptions yet</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Recent Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(fin.recentInvoices || []).length > 0 ? (
                      <div className="rounded-md overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Reason</TableHead>
                              <TableHead>Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(fin.recentInvoices as any[]).map((inv: any) => (
                              <TableRow key={inv.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{inv.customer_name || "—"}</p>
                                    <p className="text-xs text-muted-foreground">{inv.customer_email || ""}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">${((inv.amount_paid || 0) / 100).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant={inv.status === "paid" ? "default" : inv.status === "open" ? "secondary" : "outline"} className="text-[10px]">
                                    {inv.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{(inv.billing_reason || "").replace(/_/g, " ")}</TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {inv.created ? new Date(inv.created * 1000).toLocaleDateString() : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No invoices yet</p>
                        <p className="text-xs mt-1">Invoices will appear here once users subscribe via Stripe.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          {(() => {
            const li = stats?.leadInsights || {};
            const totalLeads = li.totalLeads || 0;
            const avgSeconds = li.avgResponseSeconds || 0;
            const avgMinutes = avgSeconds > 0 ? Math.round(avgSeconds / 60) : 0;
            const avgDisplay = avgMinutes >= 60
              ? `${Math.floor(avgMinutes / 60)}h ${avgMinutes % 60}m`
              : avgMinutes > 0 ? `${avgMinutes}m` : "—";
            const statusData = (li.byStatus || []).map((s: any) => ({
              name: (s.status || "new").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              value: Number(s.count || 0),
            }));
            const sourceData = (li.bySource || []).map((s: any) => ({
              name: (s.source || "direct").replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
              value: Number(s.count || 0),
            }));
            const SOURCE_COLORS = ["#2563eb", "#059669", "#ea580c", "#7c3aed", "#dc2626", "#d946ef", "#0891b2"];
            const STATUS_COLORS = ["#059669", "#2563eb", "#f59e0b", "#dc2626", "#7c3aed", "#64748b"];
            return (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="Total Leads" value={totalLeads} icon={Target} />
                  <StatCard title="Conversion Rate" value={`${li.conversionRate || 0}%`} icon={Percent} subtitle={`${li.convertedLeads || 0} converted`} />
                  <StatCard title="Avg Response Time" value={avgDisplay} icon={Clock} subtitle={`${li.respondedCount || 0} responded`} />
                  <StatCard title="Lead Sources" value={(li.bySource || []).length} icon={Activity} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Leads by Source</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {sourceData.length > 0 ? (
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                              <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                                {sourceData.map((_: any, i: number) => (
                                  <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2">
                            {sourceData.map((s: any, i: number) => (
                              <div key={s.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                                  <span>{s.name}</span>
                                </div>
                                <span className="font-medium">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No lead data yet</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Lead Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statusData.length > 0 ? (
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width="50%" height={200}>
                            <PieChart>
                              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                                {statusData.map((_: any, i: number) => (
                                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2">
                            {statusData.map((s: any, i: number) => (
                              <div key={s.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                                  <span>{s.name}</span>
                                </div>
                                <span className="font-medium">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No lead data yet</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {(li.byZipCode || []).length > 0 && (
                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Top Lead Zip Codes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(li.byZipCode as any[]).map((z: any) => {
                          const maxCount = Math.max(...(li.byZipCode as any[]).map((x: any) => Number(x.count)));
                          const pct = maxCount > 0 ? (Number(z.count) / maxCount) * 100 : 0;
                          return (
                            <div key={z.zip_code} className="flex items-center gap-3">
                              <span className="text-sm font-mono w-14 shrink-0">{z.zip_code}</span>
                              <div className="flex-1 bg-muted/30 rounded-full h-5 overflow-hidden">
                                <div className="h-full rounded-full bg-blue-500/70 flex items-center px-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                                  <span className="text-[10px] font-medium text-white">{z.count}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          {(() => {
            const geo = stats?.geographic || {};
            const stateData = (geo.transactionsByState || []).map((s: any) => ({
              name: s.state,
              value: Number(s.count || 0),
            }));
            const GEO_COLORS = ["#2563eb", "#059669", "#ea580c", "#7c3aed", "#dc2626", "#d946ef", "#0891b2", "#65a30d", "#c026d3", "#0d9488"];
            return (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Transactions by State</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stateData.length > 0 ? (
                        <div className="flex items-center gap-6">
                          <ResponsiveContainer width="50%" height={220}>
                            <PieChart>
                              <Pie data={stateData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                                {stateData.map((_: any, i: number) => (
                                  <Cell key={i} fill={GEO_COLORS[i % GEO_COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2">
                            {stateData.map((s: any, i: number) => (
                              <div key={s.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-3 w-3 rounded-full" style={{ background: GEO_COLORS[i % GEO_COLORS.length] }} />
                                  <span>{s.name}</span>
                                </div>
                                <span className="font-medium">{s.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No transaction location data yet</div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Most Active Transaction Zip Codes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(geo.transactionsByZip || []).length > 0 ? (
                        <div className="space-y-2">
                          {(geo.transactionsByZip as any[]).map((z: any) => {
                            const maxCount = Math.max(...(geo.transactionsByZip as any[]).map((x: any) => Number(x.count)));
                            const pct = maxCount > 0 ? (Number(z.count) / maxCount) * 100 : 0;
                            return (
                              <div key={z.zip_code} className="flex items-center gap-3">
                                <span className="text-sm font-mono w-14 shrink-0">{z.zip_code}</span>
                                <div className="flex-1 bg-muted/30 rounded-full h-5 overflow-hidden">
                                  <div className="h-full rounded-full bg-green-500/70 flex items-center px-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                                    <span className="text-[10px] font-medium text-white">{z.count}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No zip code data yet</div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Most Claimed Zip Codes (Lead Gen)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(geo.activeClaimedZips || []).length > 0 ? (
                      <div className="space-y-2">
                        {(geo.activeClaimedZips as any[]).map((z: any) => {
                          const maxCount = Math.max(...(geo.activeClaimedZips as any[]).map((x: any) => Number(x.total_claims)));
                          const pct = maxCount > 0 ? (Number(z.total_claims) / maxCount) * 100 : 0;
                          return (
                            <div key={z.zip_code} className="flex items-center gap-3">
                              <span className="text-sm font-mono w-14 shrink-0">{z.zip_code}</span>
                              <div className="flex-1 bg-muted/30 rounded-full h-5 overflow-hidden">
                                <div className="h-full rounded-full bg-purple-500/70 flex items-center px-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                                  <span className="text-[10px] font-medium text-white">{z.total_claims} claims</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No claimed zip codes yet</p>
                        <p className="text-xs mt-1">Zip codes will appear here once agents, lenders, or vendors claim them for lead generation.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        <TabsContent value="api-usage" className="space-y-4">
          {(() => {
            if (apiUsageLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading API usage data...</div>;
            if (apiUsageError || !apiUsage) return <div className="flex items-center justify-center py-12 text-muted-foreground"><AlertTriangle className="h-5 w-5 mr-2 text-red-500" />Failed to load API usage data. Please try again.</div>;
            const rc = apiUsage.rentcast || {};
            const tw = apiUsage.twilio || {};
            const gm = apiUsage.gmail || {};
            const sn = apiUsage.signnow || {};
            const ds = apiUsage.docusign || {};
            const period = apiUsage.period || {};

            const UsageGauge = ({ used, limit, label, color }: { used: number; limit: number; label: string; color: string }) => {
              const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
              const isWarning = pct >= 80;
              const isCritical = pct >= 95;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : ''}`}>
                      {used} / {limit}
                    </span>
                  </div>
                  <div className="h-3 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%`, background: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : color }} />
                  </div>
                  {isCritical && <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Approaching limit</p>}
                </div>
              );
            };

            const TrendBadge = ({ current, previous }: { current: number; previous: number }) => {
              if (previous === 0 && current === 0) return <span className="text-xs text-muted-foreground">No change</span>;
              if (previous === 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />New</span>;
              const diff = Math.round(((current - previous) / previous) * 100);
              if (diff > 0) return <span className="text-xs text-green-600 flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />+{diff}%</span>;
              if (diff < 0) return <span className="text-xs text-red-600 flex items-center gap-0.5"><ArrowDownRight className="h-3 w-3" />{diff}%</span>;
              return <span className="text-xs text-muted-foreground">Same</span>;
            };

            const commsDaily = [...(tw.dailyUsage || []), ...(gm.dailyUsage || [])].reduce((acc: any[], item: any) => {
              const day = String(item.day).split('T')[0];
              const existing = acc.find((d: any) => d.day === day);
              if (existing) {
                if (tw.dailyUsage?.includes(item)) existing.sms = Number(item.count);
                else existing.email = Number(item.count);
              } else {
                acc.push({
                  day,
                  sms: tw.dailyUsage?.includes(item) ? Number(item.count) : 0,
                  email: !tw.dailyUsage?.includes(item) ? Number(item.count) : 0,
                });
              }
              return acc;
            }, []).sort((a: any, b: any) => a.day.localeCompare(b.day));

            const esignDaily = (apiUsage.esignDaily || []).map((d: any) => ({
              day: String(d.day).split('T')[0],
              signnow: Number(d.signnow || 0),
              docusign: Number(d.docusign || 0),
            }));

            return (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">API Usage — {period.month} {period.year}</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard title="RentCast Calls" value={`${rc.callsUsed || 0}/${rc.callsLimit || 45}`} icon={Home} subtitle="Monthly limit" />
                  <StatCard title="SMS Sent" value={tw.smsThisMonth || 0} icon={Phone} subtitle={<TrendBadge current={tw.smsThisMonth || 0} previous={tw.smsLastMonth || 0} />} />
                  <StatCard title="Emails Sent" value={gm.emailsThisMonth || 0} icon={Mail} subtitle={<TrendBadge current={gm.emailsThisMonth || 0} previous={gm.emailsLastMonth || 0} />} />
                  <StatCard title="E-Signatures" value={(sn.totalThisMonth || 0) + (ds.totalThisMonth || 0)} icon={PenTool} subtitle={`SignNow: ${sn.totalThisMonth || 0} · DocuSign: ${ds.totalThisMonth || 0}`} />
                </div>

                <Card className="border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Home className="h-4 w-4" /> RentCast API
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UsageGauge used={rc.callsUsed || 0} limit={rc.callsLimit || 45} label="Monthly API Calls" color="#2563eb" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Resets on {rc.resetDate ? new Date(rc.resetDate).toLocaleDateString() : 'the 1st'}
                      {rc.lastUsed && ` · Last call: ${new Date(rc.lastUsed).toLocaleString()}`}
                    </p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" /> Twilio SMS & <Mail className="h-4 w-4" /> Gmail
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {commsDaily.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={commsDaily}>
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="sms" name="SMS" fill="#059669" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="email" name="Email" fill="#2563eb" radius={[3, 3, 0, 0]} />
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No communication data this month</div>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-muted-foreground text-xs">Gmail opens this month</p>
                          <p className="text-lg font-semibold">{gm.totalOpens || 0}</p>
                          <p className="text-xs text-muted-foreground">{gm.emailsOpened || 0} emails opened</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-muted-foreground text-xs">SMS vs Last Month</p>
                          <p className="text-lg font-semibold">{tw.smsThisMonth || 0}</p>
                          <TrendBadge current={tw.smsThisMonth || 0} previous={tw.smsLastMonth || 0} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        <PenTool className="h-4 w-4" /> E-Signature Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {esignDaily.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={esignDaily}>
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="signnow" name="SignNow" fill="#ea580c" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="docusign" name="DocuSign" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                            <Legend />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No e-signature activity this month</div>
                      )}
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        {(sn.actions || []).length > 0 && (
                          <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">SignNow Actions</p>
                            {(sn.actions as any[]).slice(0, 5).map((a: any) => (
                              <div key={a.action} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{String(a.action).replace(/_/g, ' ')}</span>
                                <span className="font-medium">{a.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(ds.actions || []).length > 0 && (
                          <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground font-medium">DocuSign Actions</p>
                            {(ds.actions as any[]).slice(0, 5).map((a: any) => (
                              <div key={a.action} className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{String(a.action).replace(/docusign_/g, '').replace(/_/g, ' ')}</span>
                                <span className="font-medium">{a.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(sn.actions || []).length === 0 && (ds.actions || []).length === 0 && (
                          <div className="col-span-2 text-center py-4 text-muted-foreground text-sm">No e-signature actions this month</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="border border-border/60 shadow-sm">
                    <CardContent className="pt-4 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                      <p className="text-2xl font-bold">{apiUsage.stripe?.totalEvents || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Stripe Events (All Time)</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/60 shadow-sm">
                    <CardContent className="pt-4 text-center">
                      <Globe className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">{apiUsage.webhooks?.totalConfigured || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Webhooks Configured</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-border/60 shadow-sm">
                    <CardContent className="pt-4 text-center">
                      <Mail className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">{gm.emailsOpened || 0} / {gm.emailsThisMonth || 0}</p>
                      <p className="text-xs text-muted-foreground mt-1">Email Open Rate</p>
                      {gm.emailsThisMonth > 0 && (
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          {Math.round((gm.emailsOpened / gm.emailsThisMonth) * 100)}%
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            );
          })()}
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
