import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTransactionLock } from "@/hooks/use-transaction-lock";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, FileText, UserPlus, Pencil, Upload, Clock, Landmark, RefreshCw, UserCheck, Lock, FileSignature, Star, Search, DollarSign, Plus, X, ChevronDown, ChevronUp, Bell, BellOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { type Transaction } from "@shared/schema";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";
import { ContractUpload } from "@/components/contract-upload";
import { TransactionTimeline } from "@/components/transaction-timeline";
import FirmaEditor from "@/components/firma-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const parsedId = id ? parseInt(id, 10) : null;

  const { isReadOnly, lockedBy } = useTransactionLock(parsedId);

  const [editForm, setEditForm] = useState({
    status: "",
    type: "",
    contractPrice: "",
    listDate: "",
    contractExecutionDate: "",
    optionPeriodExpiration: "",
    optionFee: "",
    earnestMoney: "",
    downPayment: "",
    sellerConcessions: "",
    closingDate: "",
    mlsNumber: "",
    financing: "",
    streetName: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const { data: transaction, isLoading, error } = useQuery<Transaction>({
    queryKey: ["/api/transactions", parsedId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/transactions/${parsedId}`);
      if (response.status === 404) {
        throw new Error("Transaction not found");
      }
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      return response.json();
    },
    enabled: !!parsedId && !!user,
    retry: false
  });

  const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (transaction && isEditing) {
      setEditForm({
        status: transaction.status || "",
        type: transaction.type || "",
        contractPrice: transaction.contractPrice?.toString() || "",
        listDate: formatDateForInput(transaction.listDate),
        contractExecutionDate: formatDateForInput(transaction.contractExecutionDate),
        optionPeriodExpiration: formatDateForInput(transaction.optionPeriodExpiration),
        optionFee: transaction.optionFee?.toString() || "",
        earnestMoney: transaction.earnestMoney?.toString() || "",
        downPayment: transaction.downPayment?.toString() || "",
        sellerConcessions: transaction.sellerConcessions?.toString() || "",
        closingDate: formatDateForInput(transaction.closingDate),
        mlsNumber: transaction.mlsNumber || "",
        financing: transaction.financing || "",
        streetName: transaction.streetName || "",
        city: transaction.city || "",
        state: transaction.state || "",
        zipCode: transaction.zipCode || "",
      });
    }
  }, [transaction, isEditing]);

  useEffect(() => {
    if (isReadOnly && isEditing) {
      setIsEditing(false);
    }
  }, [isReadOnly, isEditing]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Transaction>) => {
      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, data);
      if (!response.ok) {
        throw new Error("Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
      setIsEditing(false);
      toast({ title: "Transaction updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating transaction", description: error.message, variant: "destructive" });
    },
  });

  const isAgent = user?.role === 'agent' || user?.role === 'broker';
  const isOwner = isAgent && transaction?.agentId === user?.id;
  const [showInviteLender, setShowInviteLender] = useState(false);

  const toggleReviewMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, { requestClientReview: enabled });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
    },
  });
  const [selectedLenderId, setSelectedLenderId] = useState<string>("");
  const [showCommission, setShowCommission] = useState(false);
  const [commissionForm, setCommissionForm] = useState({
    commissionRate: "",
    commissionAmount: "",
    brokerageSplitPercent: "30",
    referralFeePercent: "0",
    notes: "",
    status: "pending",
    paidDate: "",
    expenses: [] as { description: string; amount: number }[],
  });

  const { data: commissionEntry } = useQuery<any>({
    queryKey: ["/api/commissions/transaction", parsedId],
    queryFn: async () => {
      const res = await fetch(`/api/commissions?transactionId=${parsedId}`);
      if (!res.ok) return null;
      const entries = await res.json();
      return entries.find((e: any) => e.transaction_id === parsedId || e.transactionId === parsedId) || null;
    },
    enabled: !!parsedId && isAgent,
  });

  useEffect(() => {
    if (commissionEntry) {
      const rate = commissionEntry.commission_rate ?? commissionEntry.commissionRate;
      const amount = commissionEntry.commission_amount ?? commissionEntry.commissionAmount;
      const brokSplit = commissionEntry.brokerage_split_percent ?? commissionEntry.brokerageSplitPercent;
      const refFee = commissionEntry.referral_fee_percent ?? commissionEntry.referralFeePercent;
      const paidD = commissionEntry.paid_date ?? commissionEntry.paidDate;
      setCommissionForm({
        commissionRate: rate?.toString() || "",
        commissionAmount: amount ? String(amount / 100) : "",
        brokerageSplitPercent: brokSplit?.toString() || "30",
        referralFeePercent: refFee?.toString() || "0",
        notes: commissionEntry.notes || "",
        status: commissionEntry.status || "pending",
        paidDate: paidD ? paidD.split("T")[0] : "",
        expenses: (commissionEntry.expenses || []).map((e: any) => ({ ...e, amount: e.amount / 100 })),
      });
    }
  }, [commissionEntry]);

  const saveCommissionMutation = useMutation({
    mutationFn: async (data: any) => {
      if (commissionEntry) {
        const res = await apiRequest("PATCH", `/api/commissions/${commissionEntry.id}`, data);
        if (!res.ok) throw new Error("Failed to update commission");
      } else {
        const res = await apiRequest("POST", "/api/commissions", { ...data, transactionId: parsedId });
        if (!res.ok) throw new Error("Failed to create commission");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/transaction", parsedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/summary"] });
      toast({ title: commissionEntry ? "Commission updated" : "Commission saved" });
    },
    onError: (err: Error) => {
      toast({ title: "Error saving commission", description: err.message, variant: "destructive" });
    },
  });

  const handleSaveCommission = () => {
    saveCommissionMutation.mutate({
      commissionRate: commissionForm.commissionRate,
      commissionAmount: Math.round(parseFloat(commissionForm.commissionAmount || "0") * 100),
      brokerageSplitPercent: commissionForm.brokerageSplitPercent,
      referralFeePercent: commissionForm.referralFeePercent || "0",
      expenses: commissionForm.expenses.map(e => ({ description: e.description, amount: Math.round(e.amount * 100) })),
      notes: commissionForm.notes,
      status: commissionForm.status,
      paidDate: commissionForm.status === "paid" && commissionForm.paidDate ? commissionForm.paidDate : null,
    });
  };

  const { data: lenderStatus } = useQuery<{
    linked: boolean;
    lenderName?: string;
    status?: string;
    loanType?: string;
    loanAmount?: number;
    interestRate?: number;
    checklistProgress?: number;
  }>({
    queryKey: ["/api/transactions", parsedId, "lender-status"],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${parsedId}/lender-status`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!parsedId && isAgent,
  });

  const { data: lenders } = useQuery<Array<{ id: number; first_name: string; last_name: string; email: string }>>({
    queryKey: ["/api/lenders"],
    enabled: isAgent && showInviteLender,
  });

  const inviteLenderMutation = useMutation({
    mutationFn: async (lenderId: number) => {
      const res = await apiRequest("POST", `/api/transactions/${parsedId}/invite-lender`, { lenderId });
      if (!res.ok) throw new Error("Failed to invite lender");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId, "lender-status"] });
      setShowInviteLender(false);
      toast({ title: "Lender invited successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error inviting lender", description: error.message, variant: "destructive" });
    },
  });

  const LENDER_STATUS_LABELS: Record<string, string> = {
    invited: "Invited",
    under_contract: "Under Contract",
    processing: "Processing",
    underwriting: "Underwriting",
    conditions_clearing: "Conditions Clearing",
    clear_to_close: "Clear to Close",
    closed: "Closed",
    on_hold: "On Hold",
  };

  const LENDER_STATUS_COLORS: Record<string, string> = {
    invited: "bg-blue-100 text-blue-800",
    under_contract: "bg-yellow-100 text-yellow-800",
    processing: "bg-orange-100 text-orange-800",
    underwriting: "bg-purple-100 text-purple-800",
    conditions_clearing: "bg-amber-100 text-amber-800",
    clear_to_close: "bg-green-100 text-green-800",
    closed: "bg-emerald-100 text-emerald-800",
    on_hold: "bg-gray-100 text-gray-800",
  };

  const BUYER_ADDRESS_STAGES = new Set(["offer_submitted", "under_contract", "closing"]);

  const handleSave = () => {
    const isBuyerEarlyStage = editForm.type === 'buy' && !BUYER_ADDRESS_STAGES.has(editForm.status);
    const updateData: Record<string, unknown> = {
      status: editForm.status,
      type: editForm.type,
      mlsNumber: editForm.mlsNumber || null,
      financing: editForm.financing || null,
    };

    if (isBuyerEarlyStage) {
      updateData.streetName = null;
      updateData.city = null;
      updateData.state = null;
      updateData.zipCode = null;
    } else {
      updateData.streetName = editForm.streetName?.trim() || null;
      updateData.city = editForm.city?.trim() || null;
      updateData.state = editForm.state?.trim() || null;
      updateData.zipCode = editForm.zipCode?.trim() || null;
    }

    if (editForm.contractPrice !== "") {
      updateData.contractPrice = parseInt(editForm.contractPrice);
    }
    if (editForm.optionFee !== "") {
      updateData.optionFee = parseInt(editForm.optionFee);
    }
    if (editForm.earnestMoney !== "") {
      updateData.earnestMoney = parseInt(editForm.earnestMoney);
    }
    if (editForm.downPayment !== "") {
      updateData.downPayment = parseInt(editForm.downPayment);
    }
    if (editForm.sellerConcessions !== "") {
      updateData.sellerConcessions = parseInt(editForm.sellerConcessions);
    }
    if (editForm.listDate) {
      updateData.listDate = new Date(editForm.listDate).toISOString();
    }
    if (editForm.contractExecutionDate) {
      updateData.contractExecutionDate = new Date(editForm.contractExecutionDate).toISOString();
    }
    if (editForm.optionPeriodExpiration) {
      updateData.optionPeriodExpiration = new Date(editForm.optionPeriodExpiration).toISOString();
    }
    if (editForm.closingDate) {
      updateData.closingDate = new Date(editForm.closingDate).toISOString();
    }

    updateMutation.mutate(updateData as Partial<Transaction>);
  };

  if (!user) {
    return (
      <div className="px-4 sm:px-8 py-6">
        <div className="text-center">
          <p className="text-xl">Please log in to view this transaction.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="px-4 sm:px-8 py-6">
        <div className="text-center">
          <p className="text-xl text-destructive">Transaction not found</p>
          <Link to="/transactions">
            <Button variant="outline" className="mt-4">
              Back to Transactions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full px-4 py-8 min-h-screen overflow-x-hidden">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          {(() => {
            const buyerAddressStages = new Set(["offer_submitted", "under_contract", "closing"]);
            const showAddress = transaction.type !== 'buy' || buyerAddressStages.has(transaction.status);
            const hasAddress = showAddress && transaction.streetName && transaction.streetName.trim();
            return (
              <>
                <h1 className="text-2xl font-bold">
                  {hasAddress ? transaction.streetName : (transaction.type === 'buy' ? 'Buyer Transaction' : `Transaction #${transaction.id}`)}
                </h1>
                {hasAddress && (transaction.city || transaction.state || transaction.zipCode) && (
                  <p className="text-muted-foreground">
                    {[transaction.city, transaction.state].filter(Boolean).join(', ')} {transaction.zipCode || ''}
                  </p>
                )}
                {transaction.type === 'buy' && !showAddress && (
                  <p className="text-sm text-muted-foreground italic">Address will appear once an offer is submitted</p>
                )}
                {transaction.type === 'buy' && showAddress && !transaction.streetName && (
                  <p className="text-sm text-muted-foreground italic">No property address set yet</p>
                )}
              </>
            );
          })()}
          <p className="text-sm text-muted-foreground">Transaction ID: {transaction.id}</p>
        </div>
      </div>

      {isReadOnly && lockedBy && (
        <Alert className="mb-4 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
          <Lock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <span className="font-medium">{lockedBy.name}</span> ({lockedBy.role}) is currently editing this transaction. You are in read-only mode.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-6 relative">
        {!isReadOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-base capitalize">{transaction.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-base capitalize">{transaction.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contract Price</p>
              <p className="text-base">
                {transaction.contractPrice != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.contractPrice)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">List Date</p>
              <p className="text-base">
                {transaction.listDate
                  ? new Date(transaction.listDate).toLocaleDateString()
                  : 'Not set'}
              </p>
              {transaction.listDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.floor((Date.now() - new Date(transaction.listDate).getTime()) / (1000 * 60 * 60 * 24))} days on market
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contract Date</p>
              <p className="text-base">
                {transaction.contractExecutionDate
                  ? new Date(transaction.contractExecutionDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Option Period Expiration</p>
              <p className="text-base">
                {transaction.optionPeriodExpiration
                  ? new Date(transaction.optionPeriodExpiration).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Option Fee</p>
              <p className="text-base">
                {transaction.optionFee != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.optionFee)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Earnest Money</p>
              <p className="text-base">
                {transaction.earnestMoney != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.earnestMoney)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Down Payment</p>
              <p className="text-base">
                {transaction.downPayment != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.downPayment)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Seller Concessions</p>
              <p className="text-base">
                {transaction.sellerConcessions != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.sellerConcessions)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Closing Date</p>
              <p className="text-base">
                {transaction.closingDate
                  ? new Date(transaction.closingDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">MLS Number</p>
              <p className="text-base">{transaction.mlsNumber || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Financing</p>
              <p className="text-base capitalize">{transaction.financing || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-semibold">Request Client Review on Close</p>
                  <p className="text-xs text-muted-foreground">
                    When this transaction closes, your client will be prompted to leave a review for you.
                  </p>
                </div>
              </div>
              <Switch
                checked={transaction.requestClientReview !== false}
                onCheckedChange={(checked) => toggleReviewMutation.mutate(checked)}
                disabled={toggleReviewMutation.isPending || isReadOnly}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {isAgent && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Lender</span>
              </div>
              {!lenderStatus?.linked && !isReadOnly && (
                <Button variant="outline" size="sm" onClick={() => setShowInviteLender(true)}>
                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                  Invite Lender
                </Button>
              )}
            </div>
            {lenderStatus?.linked ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {lenderStatus.lenderName}
                  </span>
                  <Badge className={LENDER_STATUS_COLORS[lenderStatus.status || 'invited']}>
                    {LENDER_STATUS_LABELS[lenderStatus.status || 'invited']}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {lenderStatus.loanType && <span className="capitalize">{lenderStatus.loanType}</span>}
                  {lenderStatus.loanAmount && <span>${(lenderStatus.loanAmount).toLocaleString()}</span>}
                  {lenderStatus.interestRate && <span>{lenderStatus.interestRate}%</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={lenderStatus.checklistProgress || 0} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground">{lenderStatus.checklistProgress || 0}%</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3" />
                  <span>Checklist items sync automatically with lender</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No lender linked to this transaction yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showInviteLender} onOpenChange={setShowInviteLender}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Lender</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Select a lender to link to this transaction. The lender will receive pre-populated loan details and a synced checklist.
            </p>
            <Select value={selectedLenderId} onValueChange={setSelectedLenderId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lender..." />
              </SelectTrigger>
              <SelectContent>
                {lenders?.map((l: any) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.first_name} {l.last_name} ({l.email})
                  </SelectItem>
                ))}
                {(!lenders || lenders.length === 0) && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No lenders registered yet. Have your lender create an account first.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteLender(false)}>Cancel</Button>
            <Button
              onClick={() => selectedLenderId && inviteLenderMutation.mutate(Number(selectedLenderId))}
              disabled={!selectedLenderId || inviteLenderMutation.isPending}
            >
              {inviteLenderMutation.isPending ? "Inviting..." : "Invite Lender"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAgent && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setShowCommission(!showCommission)}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">Commission</span>
                {commissionEntry && (
                  <Badge variant="secondary" className={commissionEntry.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {commissionEntry.status === "paid" ? "Paid" : "Pending"}
                  </Badge>
                )}
                {(commissionEntry?.commission_amount || commissionEntry?.commissionAmount) && (
                  <span className="text-sm text-muted-foreground ml-1">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((commissionEntry.commission_amount ?? commissionEntry.commissionAmount) / 100)}
                  </span>
                )}
              </div>
              {showCommission ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {showCommission && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Commission Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3.0"
                      value={commissionForm.commissionRate}
                      onChange={(e) => {
                        const rate = e.target.value;
                        const contractPrice = transaction?.contractPrice || 0;
                        const autoAmount = rate && contractPrice ? ((parseFloat(rate) / 100) * contractPrice).toFixed(2) : commissionForm.commissionAmount;
                        setCommissionForm({ ...commissionForm, commissionRate: rate, commissionAmount: autoAmount });
                      }}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Commission Amount ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 15000"
                      value={commissionForm.commissionAmount}
                      onChange={(e) => setCommissionForm({ ...commissionForm, commissionAmount: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Brokerage Split (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={commissionForm.brokerageSplitPercent}
                      onChange={(e) => setCommissionForm({ ...commissionForm, brokerageSplitPercent: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Referral Fee (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={commissionForm.referralFeePercent}
                      onChange={(e) => setCommissionForm({ ...commissionForm, referralFeePercent: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Expenses</Label>
                    {!isReadOnly && (
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCommissionForm({ ...commissionForm, expenses: [...commissionForm.expenses, { description: "", amount: 0 }] })}>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </Button>
                    )}
                  </div>
                  {commissionForm.expenses.map((exp, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <Input
                        placeholder="Description"
                        value={exp.description}
                        onChange={(e) => {
                          const updated = [...commissionForm.expenses];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          setCommissionForm({ ...commissionForm, expenses: updated });
                        }}
                        className="flex-1"
                        disabled={isReadOnly}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Amount"
                        value={exp.amount || ""}
                        onChange={(e) => {
                          const updated = [...commissionForm.expenses];
                          updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 };
                          setCommissionForm({ ...commissionForm, expenses: updated });
                        }}
                        className="w-28"
                        disabled={isReadOnly}
                      />
                      {!isReadOnly && (
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setCommissionForm({ ...commissionForm, expenses: commissionForm.expenses.filter((_, i) => i !== idx) })}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={commissionForm.notes}
                    onChange={(e) => setCommissionForm({ ...commissionForm, notes: e.target.value })}
                    rows={2}
                    disabled={isReadOnly}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={commissionForm.status}
                      onValueChange={(v) => setCommissionForm({ ...commissionForm, status: v })}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {commissionForm.status === "paid" && (
                    <div className="space-y-1">
                      <Label className="text-xs">Paid Date</Label>
                      <Input
                        type="date"
                        value={commissionForm.paidDate}
                        onChange={(e) => setCommissionForm({ ...commissionForm, paidDate: e.target.value })}
                        disabled={isReadOnly}
                      />
                    </div>
                  )}
                </div>

                {(() => {
                  const gross = parseFloat(commissionForm.commissionAmount || "0");
                  const brokSplit = parseFloat(commissionForm.brokerageSplitPercent || "0");
                  const refFee = parseFloat(commissionForm.referralFeePercent || "0");
                  const expTotal = commissionForm.expenses.reduce((s, e) => s + (e.amount || 0), 0);
                  const afterBrok = gross * (1 - brokSplit / 100);
                  const afterRef = afterBrok * (1 - refFee / 100);
                  const net = afterRef - expTotal;
                  return gross > 0 ? (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Gross Commission</span><span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(gross)}</span></div>
                      {brokSplit > 0 && <div className="flex justify-between"><span className="text-muted-foreground">After Brokerage ({brokSplit}%)</span><span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(afterBrok)}</span></div>}
                      {refFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">After Referral ({refFee}%)</span><span>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(afterRef)}</span></div>}
                      {expTotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Expenses</span><span className="text-destructive">-{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(expTotal)}</span></div>}
                      <div className="flex justify-between font-semibold border-t pt-1"><span>Net Commission</span><span className="text-emerald-600">{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(net)}</span></div>
                    </div>
                  ) : null;
                })()}

                {!isReadOnly && (
                  <Button className="w-full" onClick={handleSaveCommission} disabled={saveCommissionMutation.isPending}>
                    {saveCommissionMutation.isPending ? "Saving..." : (commissionEntry ? "Update Commission" : "Save Commission")}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ClientNotificationStatus transactionId={parsedId} />

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger value="progress" className="shrink-0">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="documents" className="shrink-0">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="contacts" className="shrink-0">
            <UserPlus className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="timeline" className="shrink-0">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="contract-upload" className="shrink-0">
            <Upload className="h-4 w-4 mr-2" />
            Contract Upload
          </TabsTrigger>
          <TabsTrigger value="signatures" className="shrink-0">
            <FileSignature className="h-4 w-4 mr-2" />
            Signatures
          </TabsTrigger>
          <TabsTrigger value="inspection" className="shrink-0" asChild>
            <Link href={`/transactions/${parsedId}/inspection`}>
              <Search className="h-4 w-4 mr-2" />
              Inspection
            </Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <ProgressChecklist transactionId={parsedId} readOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentChecklist transactionId={parsedId} readOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value="contacts">
          <TransactionContacts transactionId={parsedId} readOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value="timeline">
          <TransactionTimeline transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="contract-upload">
          {parsedId && transaction && (
            <ContractUpload transactionId={parsedId} transaction={transaction} readOnly={isReadOnly} />
          )}
        </TabsContent>

        <TabsContent value="signatures">
          <FirmaEditor transactionId={parsedId} />
        </TabsContent>
      </Tabs>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {transaction.type === 'buy' ? (
                    <>
                      <SelectItem value="qualified_buyer">Qualified Buyer</SelectItem>
                      <SelectItem value="active_search">Active Search</SelectItem>
                      <SelectItem value="offer_submitted">Offer Submitted</SelectItem>
                      <SelectItem value="under_contract">Under Contract</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="active_listing_prep">Active Listing Prep</SelectItem>
                      <SelectItem value="live_listing">Live Listing</SelectItem>
                      <SelectItem value="under_contract">Under Contract</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(value) => setEditForm({ ...editForm, type: value })}
              >
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractPrice">Contract Price ($)</Label>
              <Input
                id="contractPrice"
                type="number"
                value={editForm.contractPrice}
                onChange={(e) => setEditForm({ ...editForm, contractPrice: e.target.value })}
                placeholder="Enter contract price"
                data-testid="input-contract-price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="listDate">List Date</Label>
              <Input
                id="listDate"
                type="date"
                value={editForm.listDate}
                onChange={(e) => setEditForm({ ...editForm, listDate: e.target.value })}
                data-testid="input-list-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractExecutionDate">Contract Date</Label>
              <Input
                id="contractExecutionDate"
                type="date"
                value={editForm.contractExecutionDate}
                onChange={(e) => setEditForm({ ...editForm, contractExecutionDate: e.target.value })}
                data-testid="input-contract-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="optionPeriodExpiration">Option Period Expiration</Label>
              <Input
                id="optionPeriodExpiration"
                type="date"
                value={editForm.optionPeriodExpiration}
                onChange={(e) => setEditForm({ ...editForm, optionPeriodExpiration: e.target.value })}
                data-testid="input-option-period"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="optionFee">Option Fee ($)</Label>
              <Input
                id="optionFee"
                type="number"
                value={editForm.optionFee}
                onChange={(e) => setEditForm({ ...editForm, optionFee: e.target.value })}
                placeholder="Enter option fee"
                data-testid="input-option-fee"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="earnestMoney">Earnest Money ($)</Label>
              <Input
                id="earnestMoney"
                type="number"
                value={editForm.earnestMoney}
                onChange={(e) => setEditForm({ ...editForm, earnestMoney: e.target.value })}
                placeholder="Enter earnest money"
                data-testid="input-earnest-money"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPayment">Down Payment ($)</Label>
              <Input
                id="downPayment"
                type="number"
                value={editForm.downPayment}
                onChange={(e) => setEditForm({ ...editForm, downPayment: e.target.value })}
                placeholder="Enter down payment"
                data-testid="input-down-payment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellerConcessions">Seller Concessions ($)</Label>
              <Input
                id="sellerConcessions"
                type="number"
                value={editForm.sellerConcessions}
                onChange={(e) => setEditForm({ ...editForm, sellerConcessions: e.target.value })}
                placeholder="Enter seller concessions"
                data-testid="input-seller-concessions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closingDate">Closing Date</Label>
              <Input
                id="closingDate"
                type="date"
                value={editForm.closingDate}
                onChange={(e) => setEditForm({ ...editForm, closingDate: e.target.value })}
                data-testid="input-closing-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mlsNumber">MLS Number</Label>
              <Input
                id="mlsNumber"
                value={editForm.mlsNumber}
                onChange={(e) => setEditForm({ ...editForm, mlsNumber: e.target.value })}
                placeholder="Enter MLS number"
                data-testid="input-mls-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="financing">Financing</Label>
              <Select
                value={editForm.financing}
                onValueChange={(value) => setEditForm({ ...editForm, financing: value })}
              >
                <SelectTrigger data-testid="select-financing">
                  <SelectValue placeholder="Select financing type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="conventional">Conventional</SelectItem>
                  <SelectItem value="fha">FHA</SelectItem>
                  <SelectItem value="va">VA</SelectItem>
                  <SelectItem value="usda">USDA</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(editForm.type !== 'buy' || BUYER_ADDRESS_STAGES.has(editForm.status)) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="streetName">Street Name</Label>
                  <Input
                    id="streetName"
                    value={editForm.streetName}
                    onChange={(e) => setEditForm({ ...editForm, streetName: e.target.value })}
                    placeholder="Enter street name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={editForm.state}
                    onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                    placeholder="Enter state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={editForm.zipCode}
                    onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                    placeholder="Enter zip code"
                  />
                </div>
              </>
            )}
            {editForm.type === 'buy' && !BUYER_ADDRESS_STAGES.has(editForm.status) && (
              <div className="col-span-full rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Address fields will become available once the status reaches "Offer Submitted."
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-edit">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function ClientNotificationStatus({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const { data, isLoading } = useQuery<{
    clients: Array<{
      firstName: string;
      notificationsEnabled: boolean;
      channels: { inApp: boolean; email: boolean; sms: boolean; push: boolean } | null;
    }>;
  }>({
    queryKey: ['/api/transactions', transactionId, 'client-notification-status'],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}/client-notification-status`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    enabled: !!transactionId && (user?.role === 'agent' || user?.role === 'broker'),
  });

  if (isLoading || !data?.clients?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
      {data.clients.map((client, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {client.notificationsEnabled ? (
            <>
              <Bell className="h-3.5 w-3.5 text-green-600" />
              <span>{client.firstName}: notifications on</span>
              {client.channels && (
                <span className="text-xs">
                  ({[
                    client.channels.inApp && 'in-app',
                    client.channels.email && 'email',
                    client.channels.sms && 'SMS',
                    client.channels.push && 'push',
                  ].filter(Boolean).join(', ') || 'no channels'})
                </span>
              )}
            </>
          ) : (
            <>
              <BellOff className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{client.firstName}: notifications off</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}