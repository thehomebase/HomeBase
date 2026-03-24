import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { LenderTransaction, LenderZipCode, LenderLead } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  DollarSign,
  TrendingUp,
  Clock,
  Building2,
  User,
  MapPin,
  Briefcase,
  PauseCircle,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  ClipboardList,
  SendHorizonal,
  Landmark,
  Trash2,
  Search,
  Inbox,
  Activity,
  Users,
  Lock,
  Target,
  Mail,
  Phone,
} from "lucide-react";

const LENDER_STAGES = [
  { id: "invited", title: "Invited", icon: SendHorizonal },
  { id: "under_contract", title: "Under Contract", icon: FileCheck },
  { id: "processing", title: "Processing", icon: ClipboardList },
  { id: "underwriting", title: "Underwriting", icon: ShieldCheck },
  { id: "conditions_clearing", title: "Conditions Clearing", icon: Clock },
  { id: "clear_to_close", title: "Clear to Close", icon: CheckCircle2 },
  { id: "closed", title: "Closed", icon: Landmark },
  { id: "on_hold", title: "On Hold", icon: PauseCircle },
] as const;

const LOAN_TYPES = [
  { value: "conventional", label: "Conventional" },
  { value: "fha", label: "FHA" },
  { value: "va", label: "VA" },
  { value: "usda", label: "USDA" },
  { value: "jumbo", label: "Jumbo" },
  { value: "other", label: "Other" },
];

const formatCurrency = (amount: number | null) => {
  if (!amount) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getDaysInStage = (updatedAt: string | Date | null) => {
  if (!updatedAt) return 0;
  const updated = new Date(updatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24));
};

const createLoanSchema = z.object({
  borrowerName: z.string().min(1, "Borrower name is required"),
  borrowerEmail: z.string().email("Invalid email").or(z.literal("")),
  borrowerPhone: z.string().optional(),
  propertyAddress: z.string().optional(),
  loanAmount: z.string().optional(),
  loanType: z.string().default("conventional"),
  interestRate: z.string().optional(),
  notes: z.string().optional(),
  agentTransactionId: z.string().optional(),
});

function LoanCard({ transaction }: { transaction: LenderTransaction }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: transaction.id,
  });
  const [, setLocation] = useLocation();

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const daysInStage = getDaysInStage(transaction.updatedAt);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 w-full cursor-move hover:shadow-md transition-shadow relative group bg-background border border-border"
      {...attributes}
      {...listeners}
    >
      <div
        className="flex flex-col gap-1.5"
        onClick={(e) => {
          e.preventDefault();
          setLocation(`/lender-transaction/${transaction.id}`);
        }}
      >
        <div className="font-medium text-sm truncate flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {transaction.borrowerName}
        </div>
        {transaction.propertyAddress && (
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            {transaction.propertyAddress}
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-primary">
            {formatCurrency(transaction.loanAmount)}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {transaction.loanType || "conventional"}
          </Badge>
        </div>
        {daysInStage > 0 && (
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {daysInStage}d in stage
          </div>
        )}
      </div>
    </Card>
  );
}

function LenderColumn({
  stage,
  title,
  icon: Icon,
  transactions,
}: {
  stage: string;
  title: string;
  icon: typeof SendHorizonal;
  transactions: LenderTransaction[];
}) {
  const { setNodeRef } = useDroppable({ id: stage });

  return (
    <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-2 flex-1 border border-border min-w-[180px]">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="font-semibold text-xs">{title}</h3>
        </div>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
          {transactions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {transactions.map((tx) => (
          <LoanCard key={tx.id} transaction={tx} />
        ))}
      </div>
    </div>
  );
}

export default function LenderPortal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [showNewLoanDialog, setShowNewLoanDialog] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localTransactions, setLocalTransactions] = useState<LenderTransaction[]>([]);

  const { data: transactions = [], isLoading } = useQuery<LenderTransaction[]>({
    queryKey: ["/api/lender/transactions"],
    enabled: !!user,
  });

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/lender/transactions/${id}`, { status });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/transactions"] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      setLocalTransactions(transactions);
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createLoanSchema>) => {
      const payload: Record<string, unknown> = {
        lenderId: user?.id,
        borrowerName: data.borrowerName,
        borrowerEmail: data.borrowerEmail || null,
        borrowerPhone: data.borrowerPhone || null,
        propertyAddress: data.propertyAddress || null,
        loanAmount: data.loanAmount ? parseInt(data.loanAmount) : null,
        loanType: data.loanType || "conventional",
        interestRate: data.interestRate ? parseFloat(data.interestRate) : null,
        notes: data.notes || null,
        status: "invited",
      };
      if (data.agentTransactionId) {
        payload.agentTransactionId = parseInt(data.agentTransactionId);
      }
      const res = await apiRequest("POST", "/api/lender/transactions", payload);
      if (!res.ok) throw new Error("Failed to create loan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/transactions"] });
      toast({ title: "Loan created successfully" });
      setShowNewLoanDialog(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create loan", variant: "destructive" });
    },
  });

  const form = useForm({
    resolver: zodResolver(createLoanSchema),
    defaultValues: {
      borrowerName: "",
      borrowerEmail: "",
      borrowerPhone: "",
      propertyAddress: "",
      loanAmount: "",
      loanType: "conventional",
      interestRate: "",
      notes: "",
      agentTransactionId: "",
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const draggedId = Number(active.id);
    const newStatus = over.id.toString();
    const currentTx = localTransactions.find((t) => t.id === draggedId);
    if (!currentTx || currentTx.status === newStatus) return;
    setLocalTransactions((prev) =>
      prev.map((t) => (t.id === draggedId ? { ...t, status: newStatus } : t))
    );
    updateStatusMutation.mutate({ id: draggedId, status: newStatus });
  };

  const activeTransaction = activeId
    ? localTransactions.find((t) => t.id === activeId)
    : null;

  const activeLoans = localTransactions.filter(
    (t) => t.status !== "closed" && t.status !== "on_hold"
  );
  const pipelineValue = activeLoans.reduce((sum, t) => sum + (t.loanAmount || 0), 0);

  if (isLoading) {
    return (
      <main className="flex-1 min-w-0 px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 px-4 overflow-x-hidden">
      <div className="w-full py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Lender Portal
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage loans and generate leads
            </p>
          </div>
        </div>

        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Loan Pipeline
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5">
              <Target className="h-4 w-4" />
              Lead Generation
            </TabsTrigger>
            <TabsTrigger value="estimates" className="gap-1.5">
              <SendHorizonal className="h-4 w-4" />
              Rate Quotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-6 mt-4">
          <div className="flex justify-end">
          <Dialog open={showNewLoanDialog} onOpenChange={setShowNewLoanDialog}>
            <DialogTrigger asChild>
              <Button className="whitespace-nowrap">
                <Plus className="h-4 w-4 mr-1" />
                New Loan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Loan</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => createLoanMutation.mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="borrowerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Borrower Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John & Jane Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="borrowerEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Borrower Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="email@example.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="borrowerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Borrower Phone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="propertyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123 Main St, City, ST 12345" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="loanAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loan Amount</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" placeholder="350000" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="loanType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Loan Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {LOAN_TYPES.map((lt) => (
                                <SelectItem key={lt.value} value={lt.value}>
                                  {lt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="interestRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rate (%)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.125" placeholder="6.5" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="agentTransactionId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Linked Agent Transaction ID (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="Transaction #" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Additional notes..." rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createLoanMutation.isPending}
                  >
                    {createLoanMutation.isPending ? "Creating..." : "Create Loan"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeLoans.length}</div>
              <p className="text-xs text-muted-foreground">
                {localTransactions.length} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(pipelineValue)}</div>
              <p className="text-xs text-muted-foreground">Active loans total</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Processing</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {localTransactions.filter((t) => t.status === "processing" || t.status === "underwriting").length}
              </div>
              <p className="text-xs text-muted-foreground">Processing & underwriting</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {localTransactions.filter((t) => t.status === "closed").length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully funded</p>
            </CardContent>
          </Card>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="w-full min-w-0">
            <div
              className={`${
                isMobile
                  ? "flex flex-col w-full"
                  : "grid grid-cols-8 w-full"
              } gap-3 pb-4`}
            >
              {LENDER_STAGES.map((stage) => (
                <LenderColumn
                  key={stage.id}
                  stage={stage.id}
                  title={stage.title}
                  icon={stage.icon}
                  transactions={localTransactions.filter((t) => t.status === stage.id)}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeId && activeTransaction ? (
              <Card className="p-3 w-[200px] shadow-lg cursor-grabbing bg-background border">
                <div className="font-medium text-sm truncate">
                  {activeTransaction.borrowerName}
                </div>
                <div className="text-xs text-primary">
                  {formatCurrency(activeTransaction.loanAmount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {activeTransaction.loanType || "conventional"}
                </div>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
          </TabsContent>

          <TabsContent value="leads" className="mt-4">
            <LenderLeadGenTab />
          </TabsContent>

          <TabsContent value="estimates" className="mt-4">
            <LenderEstimateTab />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

interface LenderZipPricing {
  zipCode: string;
  currentLenders: number;
  maxLenders: number;
  spotsRemaining: number;
  isFull: boolean;
  alreadyClaimed: boolean;
  currentRate: number;
  rateIfJoined: number;
  currentRateDisplay: string;
  rateIfJoinedDisplay: string;
  tierSchedule: { lenders: number; rate: number; rateDisplay: string }[];
  leadActivity?: { last30: number; last60: number; last90: number };
  noLeadsNoCharge?: boolean;
}

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  assigned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function LenderLeadGenTab() {
  const { toast } = useToast();
  const [newZipCode, setNewZipCode] = useState("");
  const [previewZip, setPreviewZip] = useState("");

  const { data: zipData, isLoading: zipsLoading } = useQuery<{
    zipCodes: LenderZipCode[];
    maxLendersPerZip: number;
    tierRates: Record<string, number>;
  }>({
    queryKey: ["/api/lender-leads/zip-codes"],
  });

  const { data: leads = [], isLoading: leadsLoading } = useQuery<LenderLead[]>({
    queryKey: ["/api/lender/leads"],
  });

  const { data: pricing, isLoading: pricingLoading } = useQuery<LenderZipPricing>({
    queryKey: ["/api/lender-leads/zip-pricing", previewZip],
    queryFn: async () => {
      const res = await fetch(`/api/lender-leads/zip-pricing/${previewZip}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
    enabled: /^\d{5}$/.test(previewZip),
  });

  const claimMutation = useMutation({
    mutationFn: async (zipCode: string) => {
      const res = await apiRequest("POST", "/api/lender-leads/zip-codes", { zipCode });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender-leads/zip-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lender-leads/zip-pricing"] });
      setNewZipCode("");
      setPreviewZip("");
      toast({ title: "Zip code claimed!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to claim zip code", description: error.message, variant: "destructive" });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/lender-leads/zip-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender-leads/zip-codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lender-leads/zip-pricing"] });
      toast({ title: "Zip code released" });
    },
    onError: () => {
      toast({ title: "Failed to release zip code", variant: "destructive" });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/lender/leads/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/leads"] });
      toast({ title: "Lead status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update lead", description: error.message, variant: "destructive" });
    },
  });

  const handleZipInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 5);
    setNewZipCode(cleaned);
    if (cleaned.length === 5) {
      setPreviewZip(cleaned);
    } else {
      setPreviewZip("");
    }
  };

  const zipCodes = zipData?.zipCodes ?? [];
  const tierRates = zipData?.tierRates ?? {};
  const totalMonthlyRate = zipCodes.reduce((sum, zc) => sum + (zc.monthlyRate || 0), 0);
  const newLeads = leads.filter(l => l.status === "new" || l.status === "assigned");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Zip Codes</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{zipCodes.length}</div>
            <p className="text-xs text-muted-foreground">Coverage areas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMonthlyRate === 0 ? "Free" : `$${(totalMonthlyRate / 100).toFixed(0)}`}
            </div>
            <p className="text-xs text-muted-foreground">Across all zip codes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Leads</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{newLeads.length}</div>
            <p className="text-xs text-muted-foreground">{leads.length} total received</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" /> Add Zip Code
          </CardTitle>
          <CardDescription>
            Claim zip codes to receive mortgage leads. Pricing is based on how many lenders are in each zip code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 max-w-md">
            <Input
              placeholder="Enter 5-digit zip code"
              value={newZipCode}
              onChange={(e) => handleZipInput(e.target.value)}
              maxLength={5}
              className="flex-1"
            />
            <Button
              onClick={() => claimMutation.mutate(previewZip)}
              disabled={!pricing || pricing.isFull || pricing.alreadyClaimed || claimMutation.isPending}
            >
              {claimMutation.isPending ? "Claiming..." : "Claim"}
            </Button>
          </div>

          {previewZip && (
            <div className="max-w-md">
              {pricingLoading ? (
                <Skeleton className="h-40 w-full" />
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
                      <Badge variant="outline">
                        {pricing.spotsRemaining} spot{pricing.spotsRemaining !== 1 ? "s" : ""} left
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Lenders in this zip</span>
                      <span className="font-medium">{pricing.currentLenders}/{pricing.maxLenders}</span>
                    </div>
                    <Progress value={(pricing.currentLenders / pricing.maxLenders) * 100} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your rate if you join</span>
                    <span className="font-semibold text-base">
                      {pricing.rateIfJoined === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        pricing.rateIfJoinedDisplay
                      )}
                    </span>
                  </div>

                  <div className="border rounded-md p-3 bg-muted/30">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tier Pricing</p>
                    <div className="space-y-1">
                      {pricing.tierSchedule.map((tier) => (
                        <div key={tier.lenders} className="flex items-center justify-between text-xs">
                          <span className={pricing.currentLenders + (pricing.alreadyClaimed ? 0 : 1) === tier.lenders ? "font-bold" : "text-muted-foreground"}>
                            {tier.lenders} lender{tier.lenders !== 1 ? "s" : ""}
                          </span>
                          <span className={pricing.currentLenders + (pricing.alreadyClaimed ? 0 : 1) === tier.lenders ? "font-bold" : "text-muted-foreground"}>
                            {tier.rateDisplay}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">All lenders in a zip share the same rate. Rates adjust automatically as lenders join or leave.</p>
                  </div>

                  {pricing.leadActivity && (
                    <div className="border rounded-md p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead Activity</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-lg font-bold">{pricing.leadActivity.last30}</p>
                          <p className="text-[10px] text-muted-foreground">30 Days</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{pricing.leadActivity.last60}</p>
                          <p className="text-[10px] text-muted-foreground">60 Days</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{pricing.leadActivity.last90}</p>
                          <p className="text-[10px] text-muted-foreground">90 Days</p>
                        </div>
                      </div>
                      {pricing.leadActivity.last90 === 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">No leads recorded yet in this area</p>
                      )}
                    </div>
                  )}

                  {pricing.noLeadsNoCharge && (
                    <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-2.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-green-700 dark:text-green-300">
                        <span className="font-semibold">No Leads, No Charge:</span> Zero leads in a billing cycle = no charge that month.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Zip Codes ({zipCodes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {zipsLoading ? (
            <Skeleton className="h-32" />
          ) : zipCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No zip codes claimed yet. Add one above to start receiving leads.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {zipCodes.map((zc) => (
                <div key={zc.id} className="rounded-lg border p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-bold text-lg">{zc.zipCode}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {(zc.monthlyRate || 0) === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span>${((zc.monthlyRate || 0) / 100).toFixed(0)}/mo</span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => releaseMutation.mutate(zc.id)}
                    disabled={releaseMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5" /> Your Leads ({leads.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <Skeleton className="h-32" />
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>No leads received yet. Claim zip codes above to start receiving mortgage leads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Zip</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 text-sm">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{lead.zipCode}</TableCell>
                      <TableCell className="capitalize">{lead.loanType}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${LEAD_STATUS_COLORS[lead.status] || ""}`}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        {(lead.status === "new" || lead.status === "assigned") && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 h-7 text-xs"
                              onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "accepted" })}
                              disabled={updateLeadMutation.isPending}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive h-7 text-xs"
                              onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "rejected" })}
                              disabled={updateLeadMutation.isPending}
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                        {lead.status === "accepted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600 hover:text-purple-700 h-7 text-xs"
                            onClick={() => updateLeadMutation.mutate({ id: lead.id, status: "converted" })}
                            disabled={updateLeadMutation.isPending}
                          >
                            Mark Converted
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LenderEstimateTab() {
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showServiceAreas, setShowServiceAreas] = useState(false);
  const [newZip, setNewZip] = useState("");

  const { data: estimateRequests, isLoading: loadingRequests } = useQuery<any[]>({
    queryKey: ["/api/lender/estimate-requests"],
  });

  const { data: serviceAreas, isLoading: loadingAreas } = useQuery<any[]>({
    queryKey: ["/api/lender/service-areas"],
  });

  const { data: rankingStats } = useQuery<any>({
    queryKey: ["/api/lender/ranking-stats"],
  });

  const updateServiceAreasMutation = useMutation({
    mutationFn: async (zipCodes: string[]) => {
      const res = await apiRequest("PUT", "/api/lender/service-areas", { zipCodes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/service-areas"] });
      toast({ title: "Service areas updated" });
    },
    onError: () => {
      toast({ title: "Failed to update service areas", variant: "destructive" });
    },
  });

  const submitEstimateMutation = useMutation({
    mutationFn: async ({ requestId, data }: { requestId: number; data: any }) => {
      const res = await apiRequest("POST", `/api/estimate-requests/${requestId}/estimates`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/estimate-requests"] });
      setSelectedRequest(null);
      toast({ title: "Rate quote submitted successfully" });
    },
    onError: (err: any) => {
      toast({ title: err?.message || "Failed to submit estimate", variant: "destructive" });
    },
  });

  const addZip = () => {
    if (!/^\d{5}$/.test(newZip)) {
      toast({ title: "Enter a valid 5-digit zip code", variant: "destructive" });
      return;
    }
    const existing = (serviceAreas || []).map((a: any) => a.zipCode);
    if (existing.includes(newZip)) {
      toast({ title: "Zip code already added", variant: "destructive" });
      return;
    }
    updateServiceAreasMutation.mutate([...existing, newZip]);
    setNewZip("");
  };

  const removeZip = (zip: string) => {
    const existing = (serviceAreas || []).map((a: any) => a.zipCode);
    updateServiceAreasMutation.mutate(existing.filter((z: string) => z !== zip));
  };

  const pendingRequests = (estimateRequests || []).filter((r: any) => !r.hasResponded && r.status === "open");
  const respondedRequests = (estimateRequests || []).filter((r: any) => r.hasResponded);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold mt-1">{pendingRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Responded</span>
            </div>
            <p className="text-2xl font-bold mt-1">{respondedRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Response Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {rankingStats?.responseRate ? `${(rankingStats.responseRate * 100).toFixed(0)}%` : "N/A"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Service Areas</span>
            </div>
            <p className="text-2xl font-bold mt-1">{(serviceAreas || []).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Service Areas</CardTitle>
            <CardDescription>Zip codes where you'll receive rate quote requests</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowServiceAreas(!showServiceAreas)}>
            {showServiceAreas ? "Hide" : "Manage"}
          </Button>
        </CardHeader>
        {showServiceAreas && (
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter zip code"
                value={newZip}
                onChange={(e) => setNewZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                className="w-40"
                onKeyDown={(e) => e.key === "Enter" && addZip()}
              />
              <Button onClick={addZip} disabled={updateServiceAreasMutation.isPending} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            {loadingAreas ? (
              <div className="flex gap-2 flex-wrap">
                {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-20" />)}
              </div>
            ) : (serviceAreas || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No service areas configured. Add zip codes to receive rate quote requests.</p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {(serviceAreas || []).map((area: any) => (
                  <Badge key={area.id} variant="secondary" className="gap-1 px-3 py-1.5">
                    {area.zipCode}
                    <button onClick={() => removeZip(area.zipCode)} className="ml-1 hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Rate Quote Requests</CardTitle>
          <CardDescription>Buyers looking for rate quotes in your service areas</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRequests ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No pending requests</p>
              <p className="text-sm">Add service area zip codes to start receiving rate quote requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req: any) => (
                <div key={req.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{req.propertyZip}</Badge>
                      <span className="font-medium">${Number(req.propertyPrice).toLocaleString()}</span>
                      <Badge variant="secondary">{req.loanType}</Badge>
                      <Badge variant="secondary">{req.loanTerm}yr</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Down: ${Number(req.downPayment).toLocaleString()} ({req.downPaymentPercent ? `${req.downPaymentPercent}%` : "N/A"})
                      {req.creditScoreRange && ` • Credit: ${req.creditScoreRange}`}
                      {req.propertyAddress && ` • ${req.propertyAddress}`}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requested {new Date(req.createdAt).toLocaleDateString()}
                      {req.expiresAt && ` • Expires ${new Date(req.expiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setSelectedRequest(req)}>
                    <SendHorizonal className="h-4 w-4 mr-1" />
                    Submit Quote
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {respondedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submitted Rate Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {respondedRequests.map((req: any) => (
                <div key={req.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-75">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{req.propertyZip}</Badge>
                      <span className="font-medium">${Number(req.propertyPrice).toLocaleString()}</span>
                      <Badge variant="secondary">{req.loanType}</Badge>
                      <Badge>{req.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Responded {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Submitted
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRequest && (
        <EstimateSubmitDialog
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onSubmit={(data) => submitEstimateMutation.mutate({ requestId: selectedRequest.id, data })}
          isPending={submitEstimateMutation.isPending}
        />
      )}
    </div>
  );
}

function EstimateSubmitDialog({
  request,
  onClose,
  onSubmit,
  isPending,
}: {
  request: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const loanAmount = request.propertyPrice - request.downPayment;

  const estimateForm = useForm({
    resolver: zodResolver(
      z.object({
        interestRate: z.coerce.number().min(0.01).max(20),
        apr: z.coerce.number().min(0.01).max(25),
        points: z.coerce.number().min(0).max(5).default(0),
        rateLockDays: z.coerce.number().min(0).max(365).default(30),
        monthlyPrincipalInterest: z.coerce.number().min(1),
        monthlyTaxEstimate: z.coerce.number().min(0).default(0),
        monthlyInsuranceEstimate: z.coerce.number().min(0).default(0),
        monthlyPmi: z.coerce.number().min(0).default(0),
        monthlyHoa: z.coerce.number().min(0).default(0),
        originationFee: z.coerce.number().min(0).default(0),
        underwritingFee: z.coerce.number().min(0).default(0),
        appraisalFee: z.coerce.number().min(0).default(0),
        creditReportFee: z.coerce.number().min(0).default(0),
        titleInsuranceFee: z.coerce.number().min(0).default(0),
        escrowPrepaid: z.coerce.number().min(0).default(0),
        otherFees: z.coerce.number().min(0).default(0),
        lenderCredits: z.coerce.number().min(0).default(0),
        notes: z.string().optional(),
      })
    ),
    defaultValues: {
      interestRate: 0,
      apr: 0,
      points: 0,
      rateLockDays: 30,
      monthlyPrincipalInterest: 0,
      monthlyTaxEstimate: 0,
      monthlyInsuranceEstimate: 0,
      monthlyPmi: 0,
      monthlyHoa: 0,
      originationFee: 0,
      underwritingFee: 0,
      appraisalFee: 0,
      creditReportFee: 0,
      titleInsuranceFee: 0,
      escrowPrepaid: 0,
      otherFees: 0,
      lenderCredits: 0,
      notes: "",
    },
  });

  const watchedValues = estimateForm.watch();
  const totalMonthly = (watchedValues.monthlyPrincipalInterest || 0) +
    (watchedValues.monthlyTaxEstimate || 0) + (watchedValues.monthlyInsuranceEstimate || 0) +
    (watchedValues.monthlyPmi || 0) + (watchedValues.monthlyHoa || 0);
  const totalClosing = (watchedValues.originationFee || 0) + (watchedValues.underwritingFee || 0) +
    (watchedValues.appraisalFee || 0) + (watchedValues.creditReportFee || 0) +
    (watchedValues.titleInsuranceFee || 0) + (watchedValues.escrowPrepaid || 0) +
    (watchedValues.otherFees || 0) - (watchedValues.lenderCredits || 0);

  const handleSubmit = (values: any) => {
    onSubmit({
      ...values,
      totalMonthlyPayment: totalMonthly,
      totalClosingCosts: totalClosing,
      totalCost5yr: totalClosing + totalMonthly * 60,
      totalCost7yr: totalClosing + totalMonthly * 84,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Rate Quote</DialogTitle>
        </DialogHeader>
        <div className="bg-muted/50 rounded-lg p-3 mb-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span>Property Price</span>
            <span className="font-medium">${Number(request.propertyPrice).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Loan Amount</span>
            <span className="font-medium">${loanAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Loan Type</span>
            <span className="font-medium">{request.loanType} • {request.loanTerm}yr</span>
          </div>
          {request.creditScoreRange && (
            <div className="flex justify-between">
              <span>Credit Range</span>
              <span className="font-medium">{request.creditScoreRange}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-2 border-t border-background/20">
            This is a preliminary, non-binding rate quote — not an official CFPB Loan Estimate.
          </p>
        </div>

        <Form {...estimateForm}>
          <form onSubmit={estimateForm.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField control={estimateForm.control} name="interestRate" render={({ field }) => (
                <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input type="number" step="0.001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={estimateForm.control} name="apr" render={({ field }) => (
                <FormItem><FormLabel>APR (%)</FormLabel><FormControl><Input type="number" step="0.001" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={estimateForm.control} name="points" render={({ field }) => (
                <FormItem><FormLabel>Points</FormLabel><FormControl><Input type="number" step="0.125" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={estimateForm.control} name="rateLockDays" render={({ field }) => (
                <FormItem><FormLabel>Rate Lock (days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Monthly Payment Breakdown</h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={estimateForm.control} name="monthlyPrincipalInterest" render={({ field }) => (
                  <FormItem><FormLabel>Principal & Interest ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="monthlyTaxEstimate" render={({ field }) => (
                  <FormItem><FormLabel>Property Tax ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="monthlyInsuranceEstimate" render={({ field }) => (
                  <FormItem><FormLabel>Homeowner Insurance ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="monthlyPmi" render={({ field }) => (
                  <FormItem><FormLabel>PMI ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="monthlyHoa" render={({ field }) => (
                  <FormItem><FormLabel>HOA ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="mt-2 text-sm font-medium text-right">
                Total Monthly: ${totalMonthly.toLocaleString()}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3">Closing Costs</h4>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={estimateForm.control} name="originationFee" render={({ field }) => (
                  <FormItem><FormLabel>Origination ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="underwritingFee" render={({ field }) => (
                  <FormItem><FormLabel>Underwriting ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="appraisalFee" render={({ field }) => (
                  <FormItem><FormLabel>Appraisal ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="creditReportFee" render={({ field }) => (
                  <FormItem><FormLabel>Credit Report ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="titleInsuranceFee" render={({ field }) => (
                  <FormItem><FormLabel>Title Insurance ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="escrowPrepaid" render={({ field }) => (
                  <FormItem><FormLabel>Escrow Prepaid ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="otherFees" render={({ field }) => (
                  <FormItem><FormLabel>Other Fees ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={estimateForm.control} name="lenderCredits" render={({ field }) => (
                  <FormItem><FormLabel>Lender Credits ($)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="mt-2 text-sm font-medium text-right">
                Total Closing Costs: ${totalClosing.toLocaleString()}
              </div>
            </div>

            <FormField control={estimateForm.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl><Textarea placeholder="Any special programs, conditions, or details for the buyer..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between font-medium">
                <span>5-Year Total Cost</span>
                <span>${(totalClosing + totalMonthly * 60).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>7-Year Total Cost</span>
                <span>${(totalClosing + totalMonthly * 84).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Submitting..." : "Submit Rate Quote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
