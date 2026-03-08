import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  DollarSign,
  Shield,
  AlertTriangle,
  Search,
  Lock,
} from "lucide-react";
import type { Lead } from "@shared/schema";

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

interface ZipCodeData {
  id: number;
  agentId: number;
  zipCode: string;
  isActive: boolean;
  monthlyRate: number;
  createdAt: string;
  currentAgents: number;
  maxAgents: number;
  isFreeSlot: boolean;
}

interface ZipCodesResponse {
  zipCodes: ZipCodeData[];
  freeZipsUsed: number;
  freeZipsTotal: number;
  maxAgentsPerZip: number;
}

interface ZipPricing {
  zipCode: string;
  currentAgents: number;
  maxAgents: number;
  spotsRemaining: number;
  isFull: boolean;
  alreadyClaimed: boolean;
  freeZipsUsed: number;
  freeZipsTotal: number;
  hasFreeSlots: boolean;
  zipEligibleForFree: boolean;
  isFreeSlot: boolean;
  monthlyRate: number;
  monthlyRateDisplay: string;
}

export default function LeadGenerationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("leads");
  const [newZipCode, setNewZipCode] = useState("");
  const [previewZip, setPreviewZip] = useState("");

  const { data: zipData, isLoading: zipCodesLoading } = useQuery<ZipCodesResponse>({
    queryKey: ["/api/leads/zip-codes"],
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const { data: stats } = useQuery<{ total: number; new: number; accepted: number; converted: number }>({
    queryKey: ["/api/leads/stats"],
  });

  const { data: pricing, isLoading: pricingLoading } = useQuery<ZipPricing>({
    queryKey: ["/api/leads/zip-pricing", previewZip],
    queryFn: async () => {
      const res = await fetch(`/api/leads/zip-pricing/${previewZip}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
    enabled: /^\d{5}$/.test(previewZip),
  });

  const claimZipMutation = useMutation({
    mutationFn: async (zipCode: string) => {
      const res = await apiRequest("POST", "/api/leads/zip-codes", { zipCode });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-pricing"] });
      setNewZipCode("");
      setPreviewZip("");
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
      queryClient.invalidateQueries({ queryKey: ["/api/leads/zip-pricing"] });
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

  const zipCodes = zipData?.zipCodes ?? [];
  const freeZipsUsed = zipData?.freeZipsUsed ?? 0;
  const freeZipsTotal = zipData?.freeZipsTotal ?? 3;

  const handleZipInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setNewZipCode(cleaned);
    if (cleaned.length === 5) {
      setPreviewZip(cleaned);
    } else {
      setPreviewZip("");
    }
  };

  const handleClaimZip = () => {
    const trimmed = newZipCode.trim();
    if (!trimmed) return;
    if (!/^\d{5}$/.test(trimmed)) {
      toast({ title: "Invalid zip code", description: "Please enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    claimZipMutation.mutate(trimmed);
  };

  const competitionLevel = (count: number, max: number) => {
    const ratio = count / max;
    if (ratio === 0) return { label: "No competition", color: "text-green-600", bg: "bg-green-500" };
    if (ratio < 0.4) return { label: "Low competition", color: "text-green-600", bg: "bg-green-500" };
    if (ratio < 0.6) return { label: "Medium competition", color: "text-yellow-600", bg: "bg-yellow-500" };
    if (ratio < 0.8) return { label: "High competition", color: "text-orange-600", bg: "bg-orange-500" };
    return { label: "Very high", color: "text-red-600", bg: "bg-red-500" };
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl space-y-6 overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Lead Generation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Claim zip codes and manage incoming leads
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl sm:text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-xl sm:text-2xl font-bold">{newLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accepted</p>
                <p className="text-xl sm:text-2xl font-bold">{acceptedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Converted</p>
                <p className="text-xl sm:text-2xl font-bold">{convertedLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Accept Rate</p>
                <p className="text-xl sm:text-2xl font-bold">{acceptanceRate}%</p>
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
                      <TableHead className="hidden sm:table-cell">Budget</TableHead>
                      <TableHead className="hidden sm:table-cell">Timeframe</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Message</TableHead>
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
                        <TableCell className="text-sm hidden sm:table-cell">{lead.budget || "—"}</TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{lead.timeframe || "—"}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[lead.status] ?? ""}>{lead.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground hidden md:table-cell">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Free Zip Codes</p>
                    <p className="text-xs text-muted-foreground">Included with Agent Plan</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={(freeZipsUsed / freeZipsTotal) * 100} className="flex-1 h-2" />
                  <span className="text-sm font-medium whitespace-nowrap">{freeZipsUsed}/{freeZipsTotal} used</span>
                </div>
                {freeZipsUsed < freeZipsTotal && (
                  <p className="text-xs text-green-600 mt-2">{freeZipsTotal - freeZipsUsed} free slot{freeZipsTotal - freeZipsUsed !== 1 ? "s" : ""} remaining</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Max Per Zip Code</p>
                    <p className="text-xs text-muted-foreground">Limited spots per area</p>
                  </div>
                </div>
                <p className="text-2xl font-bold">{zipData?.maxAgentsPerZip ?? 5} agents</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Tiered Pricing</p>
                    <p className="text-xs text-muted-foreground">Competitive zips</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Free slots require 3+ open spots. Competitive zips start at <span className="font-semibold text-foreground">$10/mo</span></p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Claim a Zip Code
              </CardTitle>
              <CardDescription>
                Enter a zip code to check availability and pricing before claiming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 max-w-md">
                <Input
                  placeholder="Enter 5-digit zip code"
                  value={newZipCode}
                  onChange={(e) => handleZipInput(e.target.value)}
                  maxLength={5}
                  onKeyDown={(e) => e.key === "Enter" && pricing && !pricing.isFull && !pricing.alreadyClaimed && handleClaimZip()}
                />
              </div>

              {previewZip && (
                <div className="max-w-md">
                  {pricingLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : pricing ? (
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          <span className="text-lg font-bold">{pricing.zipCode}</span>
                        </div>
                        {pricing.alreadyClaimed ? (
                          <Badge variant="secondary">Already Claimed</Badge>
                        ) : pricing.isFull ? (
                          <Badge variant="destructive" className="gap-1">
                            <Lock className="h-3 w-3" /> Full
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={competitionLevel(pricing.currentAgents, pricing.maxAgents).color}>
                            {competitionLevel(pricing.currentAgents, pricing.maxAgents).label}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Agents in this zip</span>
                          <span className="font-medium">{pricing.currentAgents}/{pricing.maxAgents}</span>
                        </div>
                        <Progress
                          value={(pricing.currentAgents / pricing.maxAgents) * 100}
                          className="h-2"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">Your cost</p>
                          <p className="text-lg font-bold">
                            {pricing.isFreeSlot ? (
                              <span className="text-green-600">Free</span>
                            ) : (
                              pricing.monthlyRateDisplay
                            )}
                          </p>
                          {pricing.isFreeSlot && (
                            <p className="text-xs text-muted-foreground">
                              Using free slot ({pricing.freeZipsUsed + 1} of {pricing.freeZipsTotal})
                            </p>
                          )}
                        </div>
                        {!pricing.alreadyClaimed && !pricing.isFull && (
                          <Button
                            onClick={handleClaimZip}
                            disabled={claimZipMutation.isPending}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Claim
                          </Button>
                        )}
                      </div>

                      {!pricing.isFreeSlot && !pricing.alreadyClaimed && !pricing.isFull && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>
                            {pricing.hasFreeSlots && !pricing.zipEligibleForFree
                              ? `This zip code has too much competition for a free slot (needs 3+ open spots). You can claim it for ${pricing.monthlyRateDisplay}, or pick a less competitive zip to use your free slot.`
                              : `You've used all ${pricing.freeZipsTotal} free slots. This zip will cost ${pricing.monthlyRateDisplay}. Price is based on competition level.`
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          {zipCodesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : zipCodes.length > 0 ? (
            <>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Your Claimed Zip Codes ({zipCodes.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {zipCodes.map(zc => {
                  const comp = competitionLevel(zc.currentAgents, zc.maxAgents);
                  return (
                    <Card key={zc.id} className="relative">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xl font-bold">{zc.zipCode}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant={zc.isActive ? "default" : "secondary"} className="text-[10px]">
                                  {zc.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {zc.isFreeSlot ? (
                                  <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
                                    Free
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">
                                    ${(zc.monthlyRate / 100).toFixed(0)}/mo
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 shrink-0"
                            onClick={() => unclaimZipMutation.mutate(zc.id)}
                            disabled={unclaimZipMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`${comp.color} font-medium`}>
                              <Users className="h-3 w-3 inline mr-1" />
                              {zc.currentAgents}/{zc.maxAgents} agents
                            </span>
                            <span className="text-muted-foreground">{comp.label}</span>
                          </div>
                          <Progress
                            value={(zc.currentAgents / zc.maxAgents) * 100}
                            className="h-1.5"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">
                  No zip codes claimed yet. Enter a zip code above to check availability and pricing.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
