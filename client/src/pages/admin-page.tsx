import { useState } from "react";
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
  Users, BarChart3, Shield, Flag, Megaphone, ClipboardList,
  CheckCircle, XCircle, Search, ExternalLink, Eye
} from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [editUser, setEditUser] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectUserId, setRejectUserId] = useState<number | null>(null);

  if (user?.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data: stats } = useQuery({ queryKey: ["/api/admin/stats"] });
  const { data: usersData } = useQuery({
    queryKey: ["/api/admin/users", userSearch, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userSearch) params.set("search", userSearch);
      if (roleFilter && roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`, { credentials: "include" });
      return res.json();
    },
  });
  const { data: verifications } = useQuery({ queryKey: ["/api/admin/verifications"] });
  const { data: reports } = useQuery({ queryKey: ["/api/admin/reports"] });
  const { data: ads } = useQuery({ queryKey: ["/api/admin/ads"] });
  const { data: auditLog } = useQuery({ queryKey: ["/api/admin/audit-log"] });

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

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-600" },
    { label: "Transactions", value: stats?.totalTransactions || 0, icon: BarChart3, color: "text-green-600" },
    { label: "Pending Verifications", value: stats?.pendingVerifications || 0, icon: Shield, color: "text-amber-600" },
    { label: "Pending Reports", value: stats?.pendingReports || 0, icon: Flag, color: "text-red-600" },
    { label: "Active Ads", value: stats?.activeAds || 0, icon: Megaphone, color: "text-purple-600" },
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <span className="text-sm text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.usersByRole && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Users by Role</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(stats.usersByRole as any[]).map((r: any) => (
                <Badge key={r.role} variant="outline" className="text-sm py-1 px-3">
                  {r.role}: {r.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Users</TabsTrigger>
          <TabsTrigger value="verifications"><Shield className="h-4 w-4 mr-1" />Verifications</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="h-4 w-4 mr-1" />Reports</TabsTrigger>
          <TabsTrigger value="ads"><Megaphone className="h-4 w-4 mr-1" />Ads</TabsTrigger>
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
          <div className="rounded-md border overflow-auto">
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
                {(usersData?.users || []).map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.first_name} {u.last_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>{u.email_verified ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}</TableCell>
                    <TableCell><Badge variant={u.verification_status === "admin_verified" ? "default" : "secondary"}>{u.verification_status || "unverified"}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => setEditUser(u)}>Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-4">
          {(verifications as any[])?.length === 0 && <p className="text-muted-foreground text-center py-8">No pending verifications</p>}
          {(verifications as any[])?.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{v.first_name} {v.last_name}</p>
                    <p className="text-sm text-muted-foreground">{v.email} - {v.role}</p>
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
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{r.address || `Listing #${r.verified_listing_id}`}</p>
                    <p className="text-sm text-muted-foreground">Reported by: {r.first_name} {r.last_name}</p>
                    <p className="text-sm">{r.reason}</p>
                    <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status}</Badge>
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
          <div className="rounded-md border overflow-auto">
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
                    <TableCell>{a.first_name} {a.last_name}</TableCell>
                    <TableCell><Badge variant="outline">{a.type}</Badge></TableCell>
                    <TableCell>${((a.budget_cents || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>{a.impressions}</TableCell>
                    <TableCell>{a.clicks}</TableCell>
                    <TableCell><Badge variant={a.status === "active" ? "default" : a.status === "pending" ? "secondary" : "outline"}>{a.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {a.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => updateAd.mutate({ id: a.id, status: "active" })}>Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateAd.mutate({ id: a.id, status: "rejected" })}>Reject</Button>
                          </>
                        )}
                        {a.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => updateAd.mutate({ id: a.id, status: "paused" })}>Pause</Button>
                        )}
                        {a.status === "paused" && (
                          <Button size="sm" onClick={() => updateAd.mutate({ id: a.id, status: "active" })}>Resume</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="rounded-md border overflow-auto">
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
                    <TableCell className="text-xs">{entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}</TableCell>
                    <TableCell>{entry.first_name} {entry.last_name}</TableCell>
                    <TableCell><Badge variant="outline">{entry.action}</Badge></TableCell>
                    <TableCell>{entry.target_type} #{entry.target_id}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{entry.details ? JSON.stringify(entry.details) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
    </div>
  );
}
