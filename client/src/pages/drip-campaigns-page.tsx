import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Mail,
  MessageSquare,
  Bell,
  Play,
  Pause,
  XCircle,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Zap,
  Gift,
  Heart,
  Home,
  Sparkles,
  Clock,
  ArrowUp,
  ArrowDown,
  Send,
  UserPlus,
} from "lucide-react";
import type { DripCampaign, DripStep, DripEnrollment, ClientSpecialDate, Client } from "@shared/schema";

const METHOD_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  reminder: Bell,
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  lead_nurture: "Lead Nurture",
  post_close: "Post-Close",
  birthday: "Birthday",
  anniversary: "Anniversary",
  custom: "Custom",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  archived: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  canceled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const VARIABLE_HELPERS = [
  { var: "{{firstName}}", desc: "Client first name" },
  { var: "{{lastName}}", desc: "Client last name" },
  { var: "{{agentName}}", desc: "Agent name" },
  { var: "{{propertyAddress}}", desc: "Property address" },
];

export default function DripCampaignsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [expandedCampaign, setExpandedCampaign] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editStepDialogOpen, setEditStepDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [specialDateDialogOpen, setSpecialDateDialogOpen] = useState(false);
  const [editSpecialDateDialogOpen, setEditSpecialDateDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [editingStep, setEditingStep] = useState<DripStep | null>(null);
  const [editingDate, setEditingDate] = useState<ClientSpecialDate | null>(null);

  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", type: "custom" as string });
  const [newStep, setNewStep] = useState({ delayDays: 1, method: "email" as string, subject: "", content: "" });
  const [editStepData, setEditStepData] = useState({ delayDays: 1, method: "email" as string, subject: "", content: "" });
  const [enrollClientId, setEnrollClientId] = useState<string>("");
  const [newSpecialDate, setNewSpecialDate] = useState({ clientId: "", dateType: "birthday" as string, dateValue: "", year: "", label: "" });
  const [editDateData, setEditDateData] = useState({ dateType: "birthday" as string, dateValue: "", year: "", label: "" });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<DripCampaign[]>({
    queryKey: ["/api/drip/campaigns"],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<DripEnrollment[]>({
    queryKey: ["/api/drip/enrollments"],
  });

  const { data: specialDates, isLoading: datesLoading } = useQuery<ClientSpecialDate[]>({
    queryKey: ["/api/drip/special-dates"],
  });

  const { data: upcoming } = useQuery<{ specialDates: ClientSpecialDate[]; dueEnrollments: DripEnrollment[] }>({
    queryKey: ["/api/drip/upcoming"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const getCampaignSteps = (campaignId: number) => {
    return useQuery<{ campaign: DripCampaign; steps: DripStep[] }>({
      queryKey: ["/api/drip/campaigns", campaignId],
    });
  };

  const createCampaignMutation = useMutation({
    mutationFn: async (data: typeof newCampaign) => {
      const res = await apiRequest("POST", "/api/drip/campaigns", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns"] });
      setCreateDialogOpen(false);
      setNewCampaign({ name: "", description: "", type: "custom" });
      toast({ title: "Campaign created" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DripCampaign> }) => {
      const res = await apiRequest("PATCH", `/api/drip/campaigns/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns"] });
      toast({ title: "Campaign updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/drip/campaigns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns"] });
      setExpandedCampaign(null);
      toast({ title: "Campaign deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addStepMutation = useMutation({
    mutationFn: async ({ campaignId, data }: { campaignId: number; data: typeof newStep }) => {
      const res = await apiRequest("POST", `/api/drip/campaigns/${campaignId}/steps`, data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns", variables.campaignId] });
      setStepDialogOpen(false);
      setNewStep({ delayDays: 1, method: "email", subject: "", content: "" });
      toast({ title: "Step added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ campaignId, stepId, data }: { campaignId: number; stepId: number; data: Partial<DripStep> }) => {
      const res = await apiRequest("PATCH", `/api/drip/campaigns/${campaignId}/steps/${stepId}`, data);
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns", variables.campaignId] });
      setEditStepDialogOpen(false);
      setEditingStep(null);
      toast({ title: "Step updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: async ({ campaignId, stepId }: { campaignId: number; stepId: number }) => {
      await apiRequest("DELETE", `/api/drip/campaigns/${campaignId}/steps/${stepId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns", variables.campaignId] });
      toast({ title: "Step deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ campaignId, clientId }: { campaignId: number; clientId: number }) => {
      const res = await apiRequest("POST", `/api/drip/campaigns/${campaignId}/enroll`, { clientId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drip/upcoming"] });
      setEnrollDialogOpen(false);
      setEnrollClientId("");
      toast({ title: "Client enrolled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateEnrollmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { status: string } }) => {
      const res = await apiRequest("PATCH", `/api/drip/enrollments/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drip/upcoming"] });
      toast({ title: "Enrollment updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addSpecialDateMutation = useMutation({
    mutationFn: async (data: { clientId: number; dateType: string; dateValue: string; year?: number; label?: string }) => {
      const res = await apiRequest("POST", "/api/drip/special-dates", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/special-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drip/upcoming"] });
      setSpecialDateDialogOpen(false);
      setNewSpecialDate({ clientId: "", dateType: "birthday", dateValue: "", year: "", label: "" });
      toast({ title: "Special date added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateSpecialDateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { dateType: string; dateValue: string; year?: number | null; label?: string | null } }) => {
      const res = await apiRequest("PATCH", `/api/drip/special-dates/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/special-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drip/upcoming"] });
      setEditSpecialDateDialogOpen(false);
      setEditingDate(null);
      toast({ title: "Special date updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteSpecialDateMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/drip/special-dates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/special-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drip/upcoming"] });
      toast({ title: "Special date deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seedTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/drip/seed-templates");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drip/campaigns"] });
      toast({ title: "Templates loaded", description: "Premade campaign templates have been added." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getClientName = (clientId: number) => {
    const client = clients?.find(c => c.id === clientId);
    return client ? `${client.firstName} ${client.lastName}` : `Client #${clientId}`;
  };

  const getCampaignName = (campaignId: number) => {
    const campaign = campaigns?.find(c => c.id === campaignId);
    return campaign?.name ?? `Campaign #${campaignId}`;
  };

  const activeCampaignsCount = campaigns?.filter(c => c.status === "active").length ?? 0;
  const activeEnrollmentsCount = enrollments?.filter(e => e.status === "active").length ?? 0;
  const upcomingActionsCount = (upcoming?.dueEnrollments?.length ?? 0) + (upcoming?.specialDates?.length ?? 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Drip Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Automate client nurturing with scheduled outreach
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => seedTemplatesMutation.mutate()} disabled={seedTemplatesMutation.isPending}>
            <Sparkles className="h-4 w-4 mr-2" />
            {seedTemplatesMutation.isPending ? "Loading..." : "Seed Templates"}
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">{activeCampaignsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enrolled Clients</p>
                <p className="text-2xl font-bold">{activeEnrollmentsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Upcoming Actions</p>
                <p className="text-2xl font-bold">{upcomingActionsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="special-dates">Special Dates</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          {campaignsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            campaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                isExpanded={expandedCampaign === campaign.id}
                onToggle={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}
                onStatusChange={(status: string) => updateCampaignMutation.mutate({ id: campaign.id, data: { status: status as any } })}
                onDelete={() => deleteCampaignMutation.mutate(campaign.id)}
                onAddStep={() => { setSelectedCampaignId(campaign.id); setStepDialogOpen(true); }}
                onEditStep={(step) => { setSelectedCampaignId(campaign.id); setEditingStep(step); setEditStepData({ delayDays: step.delayDays, method: step.method, subject: step.subject ?? "", content: step.content }); setEditStepDialogOpen(true); }}
                onDeleteStep={(stepId) => deleteStepMutation.mutate({ campaignId: campaign.id, stepId })}
                onEnroll={() => { setSelectedCampaignId(campaign.id); setEnrollDialogOpen(true); }}
                enrollments={enrollments?.filter(e => e.campaignId === campaign.id) ?? []}
                getClientName={getClientName}
                onUpdateEnrollment={(id, status) => updateEnrollmentMutation.mutate({ id, data: { status } })}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground mb-4">No campaigns yet. Create one or load premade templates.</p>
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => seedTemplatesMutation.mutate()}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Seed Templates
                  </Button>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          {enrollmentsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : enrollments && enrollments.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Next Action</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map(enrollment => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">{getClientName(enrollment.clientId)}</TableCell>
                        <TableCell>{getCampaignName(enrollment.campaignId)}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[enrollment.status] ?? ""}>
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>Step {enrollment.currentStepIndex + 1}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {enrollment.nextActionAt
                            ? new Date(enrollment.nextActionAt).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {enrollment.status === "active" && (
                              <Button size="sm" variant="ghost" onClick={() => updateEnrollmentMutation.mutate({ id: enrollment.id, data: { status: "paused" } })}>
                                <Pause className="h-3 w-3" />
                              </Button>
                            )}
                            {enrollment.status === "paused" && (
                              <Button size="sm" variant="ghost" onClick={() => updateEnrollmentMutation.mutate({ id: enrollment.id, data: { status: "active" } })}>
                                <Play className="h-3 w-3" />
                              </Button>
                            )}
                            {(enrollment.status === "active" || enrollment.status === "paused") && (
                              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => updateEnrollmentMutation.mutate({ id: enrollment.id, data: { status: "canceled" } })}>
                                <XCircle className="h-3 w-3" />
                              </Button>
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
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">No enrollments yet. Enroll clients in a campaign to get started.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="special-dates" className="space-y-4">
          {upcoming && (upcoming.specialDates?.length ?? 0) > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Calendar className="h-5 w-5" />
                  Upcoming (Next 30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcoming.specialDates.map(sd => (
                    <div key={sd.id} className="flex items-center gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-950">
                      <DateTypeIcon dateType={sd.dateType} />
                      <div>
                        <p className="font-medium">{getClientName(sd.clientId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {sd.label || sd.dateType} — {sd.dateValue}
                          {sd.year && ` (${new Date().getFullYear() - sd.year} years)`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">All Special Dates</h3>
            <Button onClick={() => setSpecialDateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Date
            </Button>
          </div>

          {datesLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : specialDates && specialDates.length > 0 ? (
            <Card>
              <CardContent className="pt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {specialDates.map(sd => (
                      <TableRow key={sd.id}>
                        <TableCell className="font-medium">{getClientName(sd.clientId)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DateTypeIcon dateType={sd.dateType} />
                            <span className="capitalize">{sd.dateType.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell>{sd.dateValue}{sd.year ? ` (${sd.year})` : ""}</TableCell>
                        <TableCell className="text-muted-foreground">{sd.label || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditingDate(sd);
                              setEditDateData({ dateType: sd.dateType, dateValue: sd.dateValue, year: sd.year?.toString() ?? "", label: sd.label ?? "" });
                              setEditSpecialDateDialogOpen(true);
                            }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteSpecialDateMutation.mutate(sd.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
                <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground">No special dates yet. Add birthdays, anniversaries, and more.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>Set up a new drip campaign for client outreach.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="e.g., New Lead Follow-Up" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={newCampaign.description} onChange={e => setNewCampaign({ ...newCampaign, description: e.target.value })} placeholder="What does this campaign do?" />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newCampaign.type} onValueChange={v => setNewCampaign({ ...newCampaign, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_nurture">Lead Nurture</SelectItem>
                  <SelectItem value="post_close">Post-Close Follow-Up</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createCampaignMutation.mutate(newCampaign)} disabled={!newCampaign.name || createCampaignMutation.isPending}>
              {createCampaignMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Step</DialogTitle>
            <DialogDescription>Add a new step to the campaign sequence.</DialogDescription>
          </DialogHeader>
          <StepForm data={newStep} onChange={setNewStep} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedCampaignId && addStepMutation.mutate({ campaignId: selectedCampaignId, data: newStep })}
              disabled={!newStep.content || addStepMutation.isPending}
            >
              {addStepMutation.isPending ? "Adding..." : "Add Step"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editStepDialogOpen} onOpenChange={setEditStepDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Step</DialogTitle>
          </DialogHeader>
          <StepForm data={editStepData} onChange={setEditStepData} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStepDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedCampaignId && editingStep && updateStepMutation.mutate({
                campaignId: selectedCampaignId,
                stepId: editingStep.id,
                data: { delayDays: editStepData.delayDays, method: editStepData.method as "email" | "sms" | "reminder", subject: editStepData.subject, content: editStepData.content },
              })}
              disabled={updateStepMutation.isPending}
            >
              {updateStepMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll Client</DialogTitle>
            <DialogDescription>Select a client to enroll in this campaign.</DialogDescription>
          </DialogHeader>
          <div>
            <Label>Client</Label>
            <Select value={enrollClientId} onValueChange={setEnrollClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map(client => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => selectedCampaignId && enrollClientId && enrollMutation.mutate({ campaignId: selectedCampaignId, clientId: parseInt(enrollClientId) })}
              disabled={!enrollClientId || enrollMutation.isPending}
            >
              {enrollMutation.isPending ? "Enrolling..." : "Enroll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={specialDateDialogOpen} onOpenChange={setSpecialDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Special Date</DialogTitle>
            <DialogDescription>Track important dates for your clients.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client</Label>
              <Select value={newSpecialDate.clientId} onValueChange={v => setNewSpecialDate({ ...newSpecialDate, clientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={newSpecialDate.dateType} onValueChange={v => setNewSpecialDate({ ...newSpecialDate, dateType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="home_purchase">Home Purchase</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date (MM-DD)</Label>
              <Input value={newSpecialDate.dateValue} onChange={e => setNewSpecialDate({ ...newSpecialDate, dateValue: e.target.value })} placeholder="03-15" />
            </div>
            <div>
              <Label>Year (optional)</Label>
              <Input type="number" value={newSpecialDate.year} onChange={e => setNewSpecialDate({ ...newSpecialDate, year: e.target.value })} placeholder="e.g., 1990" />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input value={newSpecialDate.label} onChange={e => setNewSpecialDate({ ...newSpecialDate, label: e.target.value })} placeholder="e.g., Wedding Anniversary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSpecialDateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => addSpecialDateMutation.mutate({
                clientId: parseInt(newSpecialDate.clientId),
                dateType: newSpecialDate.dateType,
                dateValue: newSpecialDate.dateValue,
                year: newSpecialDate.year ? parseInt(newSpecialDate.year) : undefined,
                label: newSpecialDate.label || undefined,
              })}
              disabled={!newSpecialDate.clientId || !newSpecialDate.dateValue || addSpecialDateMutation.isPending}
            >
              {addSpecialDateMutation.isPending ? "Adding..." : "Add Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editSpecialDateDialogOpen} onOpenChange={setEditSpecialDateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Special Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={editDateData.dateType} onValueChange={v => setEditDateData({ ...editDateData, dateType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                  <SelectItem value="home_purchase">Home Purchase</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date (MM-DD)</Label>
              <Input value={editDateData.dateValue} onChange={e => setEditDateData({ ...editDateData, dateValue: e.target.value })} placeholder="03-15" />
            </div>
            <div>
              <Label>Year (optional)</Label>
              <Input type="number" value={editDateData.year} onChange={e => setEditDateData({ ...editDateData, year: e.target.value })} placeholder="e.g., 1990" />
            </div>
            <div>
              <Label>Label (optional)</Label>
              <Input value={editDateData.label} onChange={e => setEditDateData({ ...editDateData, label: e.target.value })} placeholder="e.g., Wedding Anniversary" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSpecialDateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => editingDate && updateSpecialDateMutation.mutate({
                id: editingDate.id,
                data: {
                  dateType: editDateData.dateType,
                  dateValue: editDateData.dateValue,
                  year: editDateData.year ? parseInt(editDateData.year) : null,
                  label: editDateData.label || null,
                },
              })}
              disabled={updateSpecialDateMutation.isPending}
            >
              {updateSpecialDateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepForm({ data, onChange }: { data: { delayDays: number; method: string; subject: string; content: string }; onChange: (d: typeof data) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Delay (days)</Label>
          <Input type="number" min={0} value={data.delayDays} onChange={e => onChange({ ...data, delayDays: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label>Method</Label>
          <Select value={data.method} onValueChange={v => onChange({ ...data, method: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">
                <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> Email</div>
              </SelectItem>
              <SelectItem value="sms">
                <div className="flex items-center gap-2"><MessageSquare className="h-3 w-3" /> SMS</div>
              </SelectItem>
              <SelectItem value="reminder">
                <div className="flex items-center gap-2"><Bell className="h-3 w-3" /> Reminder</div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {data.method === "email" && (
        <div>
          <Label>Subject</Label>
          <Input value={data.subject} onChange={e => onChange({ ...data, subject: e.target.value })} placeholder="Email subject line" />
        </div>
      )}
      <div>
        <Label>Content</Label>
        <Textarea
          value={data.content}
          onChange={e => onChange({ ...data, content: e.target.value })}
          placeholder="Message content..."
          rows={4}
        />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1">Available variables:</p>
        <div className="flex flex-wrap gap-1">
          {VARIABLE_HELPERS.map(v => (
            <Badge key={v.var} variant="outline" className="text-xs cursor-pointer hover:bg-accent" onClick={() => onChange({ ...data, content: data.content + v.var })}>
              {v.var}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function CampaignCard({
  campaign,
  isExpanded,
  onToggle,
  onStatusChange,
  onDelete,
  onAddStep,
  onEditStep,
  onDeleteStep,
  onEnroll,
  enrollments,
  getClientName,
  onUpdateEnrollment,
}: {
  campaign: DripCampaign;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onAddStep: () => void;
  onEditStep: (step: DripStep) => void;
  onDeleteStep: (stepId: number) => void;
  onEnroll: () => void;
  enrollments: DripEnrollment[];
  getClientName: (id: number) => string;
  onUpdateEnrollment: (id: number, status: string) => void;
}) {
  const { data: campaignDetail } = useQuery<{ campaign: DripCampaign; steps: DripStep[] }>({
    queryKey: ["/api/drip/campaigns", campaign.id],
    enabled: isExpanded,
  });

  const steps = campaignDetail?.steps ?? [];

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">{campaign.name}</CardTitle>
            <Badge className={STATUS_COLORS[campaign.status] ?? ""}>{campaign.status}</Badge>
            <Badge variant="outline">{CAMPAIGN_TYPE_LABELS[campaign.type] ?? campaign.type}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{steps.length} steps · {enrollments.length} enrolled</span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
        {campaign.description && (
          <CardDescription>{campaign.description}</CardDescription>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            {campaign.status !== "active" && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange("active")}>
                <Play className="h-3 w-3 mr-1" /> Activate
              </Button>
            )}
            {campaign.status === "active" && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange("paused")}>
                <Pause className="h-3 w-3 mr-1" /> Pause
              </Button>
            )}
            {campaign.status !== "archived" && (
              <Button size="sm" variant="outline" onClick={() => onStatusChange("archived")}>
                Archive
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>

          <Separator />

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Steps</h4>
              <Button size="sm" onClick={onAddStep}>
                <Plus className="h-3 w-3 mr-1" /> Add Step
              </Button>
            </div>
            {steps.length > 0 ? (
              <div className="space-y-2">
                {steps.sort((a, b) => a.stepOrder - b.stepOrder).map((step, idx) => {
                  const MethodIcon = METHOD_ICONS[step.method] ?? Bell;
                  return (
                    <div key={step.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <span className="text-sm font-mono text-muted-foreground w-6 text-center">{idx + 1}</span>
                      <MethodIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Day {step.delayDays}
                          </Badge>
                          <span className="text-sm capitalize">{step.method}</span>
                          {step.subject && <span className="text-sm text-muted-foreground truncate">— {step.subject}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{step.content}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => onEditStep(step)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onDeleteStep(step.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No steps yet. Add steps to define the campaign sequence.</p>
            )}
          </div>

          <Separator />

          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold">Enrolled Clients ({enrollments.length})</h4>
              <Button size="sm" onClick={onEnroll}>
                <UserPlus className="h-3 w-3 mr-1" /> Enroll Client
              </Button>
            </div>
            {enrollments.length > 0 ? (
              <div className="space-y-2">
                {enrollments.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{getClientName(e.clientId)}</span>
                      <Badge className={`text-xs ${STATUS_COLORS[e.status] ?? ""}`}>{e.status}</Badge>
                      <span className="text-xs text-muted-foreground">Step {e.currentStepIndex + 1}</span>
                    </div>
                    <div className="flex gap-1">
                      {e.status === "active" && (
                        <Button size="sm" variant="ghost" onClick={() => onUpdateEnrollment(e.id, "paused")}>
                          <Pause className="h-3 w-3" />
                        </Button>
                      )}
                      {e.status === "paused" && (
                        <Button size="sm" variant="ghost" onClick={() => onUpdateEnrollment(e.id, "active")}>
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                      {(e.status === "active" || e.status === "paused") && (
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => onUpdateEnrollment(e.id, "canceled")}>
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No clients enrolled yet.</p>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DateTypeIcon({ dateType }: { dateType: string }) {
  switch (dateType) {
    case "birthday":
      return <Gift className="h-4 w-4 text-pink-500" />;
    case "anniversary":
      return <Heart className="h-4 w-4 text-red-500" />;
    case "home_purchase":
      return <Home className="h-4 w-4 text-blue-500" />;
    default:
      return <Calendar className="h-4 w-4 text-gray-500" />;
  }
}
