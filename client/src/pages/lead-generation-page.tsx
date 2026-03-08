import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Inbox,
  Mail,
  Phone,
  UserPlus,
} from "lucide-react";
import type { LeadZipCode, Lead } from "@shared/schema";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  assigned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const TYPE_LABELS: Record<string, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buyer & Seller",
};

export default function LeadGenerationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("leads");
  const [newZipCode, setNewZipCode] = useState("");

  const { data: zipCodes, isLoading: zipCodesLoading } = useQuery<LeadZipCode[]>({
    queryKey: ["/api/leads/zip-codes"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: stats } = useQuery<{ total: number; new: number; accepted: number; converted: number }>({
    queryKey: ["/api/leads/stats"],
  });

  const claimZipMutation = useMutation({
    mutationFn: async (zipCode: string) => {
      const res = await apiRequest("POST", "/api/leads/zip-codes", { zipCode });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-codes"] });
      setNewZipCode("");
      toast({ title: "Zip code claimed successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const unclaimZipMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/leads/zip-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-codes"] });
      toast({ title: "Zip code removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/stats"] });
      toast({ title: "Lead status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const totalLeads = stats?.total ?? 0;
  const newLeads = stats?.new ?? 0;
  const acceptedLeads = stats?.accepted ?? 0;
  const convertedLeads = stats?.converted ?? 0;
  const acceptanceRate = totalLeads > 0 ? Math.round((acceptedLeads / totalLeads) * 100) : 0;

  const handleClaimZip = () => {
    const trimmed = newZipCode.trim();
    if (!trimmed) return;
    if (!/^\d{5}$/.test(trimmed)) {
      toast({ title: "Invalid zip code", description: "Please enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    claimZipMutation.mutate(trimmed);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lead Generation</h1>
        <p className="text-muted-foreground mt-1">
          Claim zip codes and manage incoming leads
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <UserPlus className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-2xl font-bold">{newLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="text-2xl font-bold">{acceptedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Converted</p>
                <p className="text-2xl font-bold">{convertedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accept Rate</p>
                <p className="text-2xl font-bold">{acceptanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="leads">Incoming Leads</TabsTrigger>
          <TabsTrigger value="zip-codes">Zip Code Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          {leadsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : leads && leads.length > 0 ? (
            <Card>
              <CardContent className="pt-6 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Zip</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Timeframe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map(lead => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </span>
                            {lead.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.phone}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{lead.zipCode}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TYPE_LABELS[lead.type] ?? lead.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{lead.budget || "—"}</TableCell>
                        <TableCell className="text-sm">{lead.timeframe || "—"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[lead.status] ?? ""}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                          {lead.message || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(lead.status === "new" || lead.status === "assigned") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600"
                                  onClick={() => updateLeadStatusMutation.mutate({ id: lead.id, status: "accepted" })}
                                  disabled={updateLeadStatusMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => updateLeadStatusMutation.mutate({ id: lead.id, status: "rejected" })}
                                  disabled={updateLeadStatusMutation.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">No leads yet. Claim some zip codes to start receiving leads.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="zip-codes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Claim a Zip Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Enter 5-digit zip code"
                  value={newZipCode}
                  onChange={(e) => setNewZipCode(e.target.value)}
                  maxLength={5}
                  onKeyDown={(e) => e.key === "Enter" && handleClaimZip()}
                />
                <Button
                  onClick={handleClaimZip}
                  disabled={claimZipMutation.isPending || !newZipCode.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Claim
                </Button>
              </div>
            </CardContent>
          </Card>

          {zipCodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : zipCodes && zipCodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {zipCodes.map(zc => (
                <Card key={zc.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xl font-bold">{zc.zipCode}</p>
                          <Badge variant={zc.isActive ? "default" : "secondary"}>
                            {zc.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500"
                        onClick={() => unclaimZipMutation.mutate(zc.id)}
                        disabled={unclaimZipMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">
                  No zip codes claimed yet. Claim zip codes to start receiving leads from those areas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}