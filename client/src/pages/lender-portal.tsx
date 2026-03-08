import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { LenderTransaction } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
              Loan Pipeline
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your active loans and track progress
            </p>
          </div>
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
      </div>
    </main>
  );
}
