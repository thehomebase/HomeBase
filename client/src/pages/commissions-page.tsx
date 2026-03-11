import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Hash,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatUSD(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

interface CommissionEntry {
  id: number;
  transactionId: number;
  agentId: number;
  commissionRate: string;
  commissionAmount: number;
  brokerageSplitPercent: string;
  referralFeePercent: string | null;
  expenses: { description: string; amount: number }[] | null;
  notes: string | null;
  status: string;
  paidDate: string | null;
  createdAt: string;
  street_name: string;
  city: string;
  state: string;
  contract_price: number | null;
  transaction_status: string;
  closing_date: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
}

interface CommissionSummary {
  total_deals: number;
  total_earned: number;
  total_pending: number;
  avg_per_deal: number;
  ytd_deals: number;
  ytd_earned: number;
  ytd_pending: number;
  monthly: { month: number; year: number; total: number; deals: number }[];
}

function SummaryCards({ summary, isLoading }: { summary?: CommissionSummary; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Earned (YTD)",
      value: formatUSD(summary?.ytd_earned || 0),
      icon: DollarSign,
      accent: "text-emerald-600",
    },
    {
      label: "Pending Commissions",
      value: formatUSD(summary?.ytd_pending || 0),
      icon: Clock,
      accent: "text-amber-600",
    },
    {
      label: "Average per Deal",
      value: formatUSD(summary?.avg_per_deal || 0),
      icon: TrendingUp,
      accent: "text-blue-600",
    },
    {
      label: "Total Deals",
      value: summary?.total_deals || 0,
      icon: Hash,
      accent: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold tracking-tight">{c.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0`}>
                <c.icon className={`h-5 w-5 ${c.accent}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MonthlyChart({ monthly }: { monthly: { month: number; year: number; total: number; deals: number }[] }) {
  const chartData = monthly.map((m) => ({
    name: MONTH_NAMES[m.month - 1],
    amount: m.total / 100,
    deals: m.deals,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Monthly Earnings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
              />
              <Tooltip
                formatter={(value: number) =>
                  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
                }
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} name="Earnings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function netAmount(entry: CommissionEntry) {
  const commission = entry.commissionAmount || 0;
  const brokerageSplit = parseFloat(entry.brokerageSplitPercent || "0");
  const referralFee = parseFloat(entry.referralFeePercent || "0");
  const expensesTotal = (entry.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const afterBrokerage = commission * (1 - brokerageSplit / 100);
  const afterReferral = afterBrokerage * (1 - referralFee / 100);
  return afterReferral - expensesTotal;
}

function CommissionsTable({
  commissions,
  isLoading,
  onEdit,
  onDelete,
}: {
  commissions: CommissionEntry[];
  isLoading: boolean;
  onEdit: (c: CommissionEntry) => void;
  onDelete: (id: number) => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Property</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Contract Price</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-right">Brokerage Split</TableHead>
                <TableHead className="text-right">Net Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No commission entries yet
                  </TableCell>
                </TableRow>
              ) : (
                commissions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <div>{c.street_name}</div>
                      <div className="text-xs text-muted-foreground">{c.city}, {c.state}</div>
                    </TableCell>
                    <TableCell>
                      {c.client_first_name && c.client_last_name
                        ? `${c.client_first_name} ${c.client_last_name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.contract_price ? formatUSD(c.contract_price) : "—"}
                    </TableCell>
                    <TableCell className="text-right">{c.commissionRate}%</TableCell>
                    <TableCell className="text-right">{formatUSD(c.commissionAmount)}</TableCell>
                    <TableCell className="text-right">{c.brokerageSplitPercent}%</TableCell>
                    <TableCell className="text-right font-medium">{formatUSD(netAmount(c))}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "paid" ? "default" : "secondary"}
                        className={c.status === "paid" ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-amber-100 text-amber-800 hover:bg-amber-100"}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface ExpenseItem {
  description: string;
  amount: number;
}

function EditCommissionDialog({
  open,
  onOpenChange,
  commission,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commission: CommissionEntry | null;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [brokerageSplitPercent, setBrokerageSplitPercent] = useState("");
  const [referralFeePercent, setReferralFeePercent] = useState("");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const [paidDate, setPaidDate] = useState("");

  useState(() => {
    if (commission) {
      setCommissionRate(commission.commissionRate || "");
      setCommissionAmount(String((commission.commissionAmount || 0) / 100));
      setBrokerageSplitPercent(commission.brokerageSplitPercent || "");
      setReferralFeePercent(commission.referralFeePercent || "");
      setExpenses((commission.expenses || []).map(e => ({ ...e, amount: e.amount / 100 })));
      setNotes(commission.notes || "");
      setStatus(commission.status || "pending");
      setPaidDate(commission.paidDate ? commission.paidDate.split("T")[0] : "");
    }
  });

  const addExpense = () => setExpenses([...expenses, { description: "", amount: 0 }]);
  const removeExpense = (idx: number) => setExpenses(expenses.filter((_, i) => i !== idx));
  const updateExpense = (idx: number, field: string, value: string) => {
    const updated = [...expenses];
    if (field === "description") updated[idx].description = value;
    else updated[idx].amount = parseFloat(value) || 0;
    setExpenses(updated);
  };

  const handleSubmit = () => {
    onSave({
      commissionRate,
      commissionAmount: Math.round(parseFloat(commissionAmount) * 100),
      brokerageSplitPercent,
      referralFeePercent: referralFeePercent || "0",
      expenses: expenses.map(e => ({ description: e.description, amount: Math.round(e.amount * 100) })),
      notes,
      status,
      paidDate: status === "paid" && paidDate ? paidDate : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Commission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Commission Rate (%)</Label>
              <Input type="number" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
            </div>
            <div>
              <Label>Commission Amount ($)</Label>
              <Input type="number" step="0.01" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Brokerage Split (%)</Label>
              <Input type="number" step="0.01" value={brokerageSplitPercent} onChange={(e) => setBrokerageSplitPercent(e.target.value)} />
            </div>
            <div>
              <Label>Referral Fee (%)</Label>
              <Input type="number" step="0.01" value={referralFeePercent} onChange={(e) => setReferralFeePercent(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Expenses</Label>
              <Button variant="outline" size="sm" onClick={addExpense} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {expenses.map((exp, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  placeholder="Description"
                  value={exp.description}
                  onChange={(e) => updateExpense(idx, "description", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={exp.amount || ""}
                  onChange={(e) => updateExpense(idx, "amount", e.target.value)}
                  className="w-28"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeExpense(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === "paid" && (
              <div>
                <Label>Paid Date</Label>
                <Input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddCommissionDialog({
  open,
  onOpenChange,
  onSave,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isPending: boolean;
}) {
  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: open,
  });

  const [transactionId, setTransactionId] = useState("");
  const [commissionRate, setCommissionRate] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [brokerageSplitPercent, setBrokerageSplitPercent] = useState("30");
  const [referralFeePercent, setReferralFeePercent] = useState("0");
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [notes, setNotes] = useState("");

  const addExpense = () => setExpenses([...expenses, { description: "", amount: 0 }]);
  const removeExpense = (idx: number) => setExpenses(expenses.filter((_, i) => i !== idx));
  const updateExpense = (idx: number, field: string, value: string) => {
    const updated = [...expenses];
    if (field === "description") updated[idx].description = value;
    else updated[idx].amount = parseFloat(value) || 0;
    setExpenses(updated);
  };

  const handleSubmit = () => {
    if (!transactionId) return;
    onSave({
      transactionId: parseInt(transactionId),
      commissionRate,
      commissionAmount: Math.round(parseFloat(commissionAmount || "0") * 100),
      brokerageSplitPercent,
      referralFeePercent: referralFeePercent || "0",
      expenses: expenses.map(e => ({ description: e.description, amount: Math.round(e.amount * 100) })),
      notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Commission</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Transaction</Label>
            <Select value={transactionId} onValueChange={setTransactionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a transaction" />
              </SelectTrigger>
              <SelectContent>
                {transactions.map((t: any) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.streetName} — {t.city}, {t.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Commission Rate (%)</Label>
              <Input type="number" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
            </div>
            <div>
              <Label>Commission Amount ($)</Label>
              <Input type="number" step="0.01" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Brokerage Split (%)</Label>
              <Input type="number" step="0.01" value={brokerageSplitPercent} onChange={(e) => setBrokerageSplitPercent(e.target.value)} />
            </div>
            <div>
              <Label>Referral Fee (%)</Label>
              <Input type="number" step="0.01" value={referralFeePercent} onChange={(e) => setReferralFeePercent(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Expenses</Label>
              <Button variant="outline" size="sm" onClick={addExpense} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {expenses.map((exp, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  placeholder="Description"
                  value={exp.description}
                  onChange={(e) => updateExpense(idx, "description", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={exp.amount || ""}
                  onChange={(e) => updateExpense(idx, "amount", e.target.value)}
                  className="w-28"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeExpense(idx)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={isPending || !transactionId}>
            {isPending ? "Creating..." : "Add Commission"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CommissionsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [yearFilter, setYearFilter] = useState(String(currentYear));
  const [editingCommission, setEditingCommission] = useState<CommissionEntry | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: commissions = [], isLoading: commissionsLoading } = useQuery<CommissionEntry[]>({
    queryKey: ["/api/commissions"],
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<CommissionSummary>({
    queryKey: ["/api/commissions/summary"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/commissions", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/commissions"] });
      qc.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      setShowAddDialog(false);
      toast({ title: "Commission added" });
    },
    onError: () => {
      toast({ title: "Failed to add commission", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...body } = data;
      await apiRequest("PATCH", `/api/commissions/${id}`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/commissions"] });
      qc.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      setEditingCommission(null);
      toast({ title: "Commission updated" });
    },
    onError: () => {
      toast({ title: "Failed to update commission", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/commissions/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/commissions"] });
      qc.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      toast({ title: "Commission deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete commission", variant: "destructive" });
    },
  });

  const filteredCommissions = commissions.filter((c) => {
    if (yearFilter === "all") return true;
    const year = new Date(c.createdAt).getFullYear();
    return year === parseInt(yearFilter);
  });

  const filteredMonthly = (summary?.monthly || []).filter((m) => {
    if (yearFilter === "all") return true;
    return m.year === parseInt(yearFilter);
  });

  const years: string[] = ["all"];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(String(y));
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Commissions</h1>
          <p className="text-sm text-muted-foreground">Track your earnings and commission history</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  {y === "all" ? "All Years" : y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Commission
          </Button>
        </div>
      </div>

      <SummaryCards summary={summary} isLoading={summaryLoading} />

      {filteredMonthly.length > 0 && <MonthlyChart monthly={filteredMonthly} />}

      <CommissionsTable
        commissions={filteredCommissions}
        isLoading={commissionsLoading}
        onEdit={setEditingCommission}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <EditCommissionDialog
        open={!!editingCommission}
        onOpenChange={(open) => { if (!open) setEditingCommission(null); }}
        commission={editingCommission}
        onSave={(data) => updateMutation.mutate({ id: editingCommission!.id, ...data })}
        isPending={updateMutation.isPending}
      />

      <AddCommissionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />
    </div>
  );
}