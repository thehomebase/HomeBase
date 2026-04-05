import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTransactionLock } from "@/hooks/use-transaction-lock";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, FileText, UserPlus, Pencil, Upload, Clock, Landmark, RefreshCw, UserCheck, Lock, FileSignature, Star, Search, DollarSign, Plus, X, ChevronDown, ChevronUp, Bell, BellOff, Shield, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
    buyerAgentCompensation: "",
    listingAgentCommission: "",
    homeWarranty: "",
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
        buyerAgentCompensation: (transaction as any).buyerAgentCompensation?.toString() || "",
        listingAgentCommission: (transaction as any).listingAgentCommission?.toString() || "",
        homeWarranty: (transaction as any).homeWarranty?.toString() || "",
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
      const res = await fetch(`/api/commissions/transaction/${parsedId}`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!parsedId && isAgent,
  });

  useEffect(() => {
    if (commissionEntry) {
      setCommissionForm({
        commissionRate: commissionEntry.commissionRate?.toString() || "",
        commissionAmount: commissionEntry.commissionAmount ? String(commissionEntry.commissionAmount / 100) : "",
        brokerageSplitPercent: commissionEntry.brokerageSplitPercent?.toString() || "30",
        referralFeePercent: commissionEntry.referralFeePercent?.toString() || "0",
        notes: commissionEntry.notes || "",
        status: commissionEntry.status || "pending",
        paidDate: commissionEntry.paidDate ? commissionEntry.paidDate.split("T")[0] : "",
        expenses: (commissionEntry.expenses || []).map((e: any) => ({ ...e, amount: e.amount / 100 })),
      });
    } else if (transaction) {
      const txnCommission = transaction.type === "sell"
        ? (transaction as any).listingAgentCommission
        : (transaction as any).buyerAgentCompensation;
      if (txnCommission && txnCommission > 0) {
        const contractPrice = transaction.contractPrice || 0;
        const rate = contractPrice > 0 ? ((txnCommission / contractPrice) * 100).toFixed(2) : "";
        setCommissionForm(prev => ({
          ...prev,
          commissionAmount: txnCommission.toString(),
          commissionRate: rate,
        }));
      }
    }
  }, [commissionEntry, transaction]);

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
    const commissionDollars = parseFloat(commissionForm.commissionAmount || "0");
    saveCommissionMutation.mutate({
      commissionRate: commissionForm.commissionRate,
      commissionAmount: Math.round(commissionDollars * 100),
      brokerageSplitPercent: commissionForm.brokerageSplitPercent,
      referralFeePercent: commissionForm.referralFeePercent || "0",
      expenses: commissionForm.expenses.map(e => ({ description: e.description, amount: Math.round(e.amount * 100) })),
      notes: commissionForm.notes,
      status: commissionForm.status,
      paidDate: commissionForm.status === "paid" && commissionForm.paidDate ? commissionForm.paidDate : null,
    });
    if (commissionDollars > 0 && transaction) {
      const txnUpdate: Record<string, unknown> = {};
      const txnType = transaction.type;
      if (txnType === "sell") {
        txnUpdate.listingAgentCommission = Math.round(commissionDollars);
      } else {
        txnUpdate.buyerAgentCompensation = Math.round(commissionDollars);
      }
      apiRequest("PATCH", `/api/transactions/${parsedId}`, txnUpdate).then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
      });
    }
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
    if (editForm.buyerAgentCompensation !== "") {
      (updateData as any).buyerAgentCompensation = parseInt(editForm.buyerAgentCompensation);
    }
    if (editForm.listingAgentCommission !== "") {
      (updateData as any).listingAgentCommission = parseInt(editForm.listingAgentCommission);
    }
    if (editForm.homeWarranty !== "") {
      (updateData as any).homeWarranty = parseInt(editForm.homeWarranty);
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

    const newCommAmt = editForm.type === "sell"
      ? parseInt(editForm.listingAgentCommission || "0")
      : parseInt(editForm.buyerAgentCompensation || "0");
    if (newCommAmt > 0) {
      const contractPrice = parseInt(editForm.contractPrice || "0");
      const rate = contractPrice > 0 ? ((newCommAmt / contractPrice) * 100).toFixed(2) : commissionForm.commissionRate;
      setCommissionForm(prev => ({
        ...prev,
        commissionAmount: newCommAmt.toString(),
        commissionRate: rate,
      }));
      if (commissionEntry) {
        apiRequest("PATCH", `/api/commissions/${commissionEntry.id}`, {
          commissionRate: rate,
          commissionAmount: Math.round(newCommAmt * 100),
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/commissions/transaction", parsedId] });
        });
      }
    }
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
              <p className="text-sm font-medium text-muted-foreground">Buyer's Agent Compensation</p>
              <p className="text-base">
                {(transaction as any).buyerAgentCompensation != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format((transaction as any).buyerAgentCompensation)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Listing Agent Commission</p>
              <p className="text-base">
                {(transaction as any).listingAgentCommission != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format((transaction as any).listingAgentCommission)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Home Warranty</p>
              <p className="text-base">
                {(transaction as any).homeWarranty != null
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format((transaction as any).homeWarranty)
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
                {commissionEntry?.commissionAmount && (
                  <span className="text-sm text-muted-foreground ml-1">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(commissionEntry.commissionAmount / 100)}
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
                        setCommissionForm(prev => {
                          const autoAmount = rate && contractPrice ? ((parseFloat(rate) / 100) * contractPrice).toFixed(2) : prev.commissionAmount;
                          return { ...prev, commissionRate: rate, commissionAmount: autoAmount };
                        });
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
                      onChange={(e) => {
                        const amount = e.target.value;
                        const contractPrice = transaction?.contractPrice || 0;
                        setCommissionForm(prev => {
                          const autoRate = amount && contractPrice ? ((parseFloat(amount) / contractPrice) * 100).toFixed(2) : prev.commissionRate;
                          return { ...prev, commissionAmount: amount, commissionRate: autoRate };
                        });
                      }}
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
          <TabsTrigger value="compliance" className="shrink-0">
            <Shield className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="net-sheet" className="shrink-0">
            <DollarSign className="h-4 w-4 mr-2" />
            Net Sheet
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

        <TabsContent value="compliance">
          <ComplianceChecklist transactionId={parsedId} readOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value="net-sheet">
          {transaction && <TransactionNetSheet transaction={transaction} />}
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
              <Label htmlFor="buyerAgentCompensation">Buyer's Agent Compensation ($)</Label>
              <Input
                id="buyerAgentCompensation"
                type="number"
                value={editForm.buyerAgentCompensation}
                onChange={(e) => setEditForm({ ...editForm, buyerAgentCompensation: e.target.value })}
                placeholder="Enter buyer's agent compensation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="listingAgentCommission">Listing Agent Commission ($)</Label>
              <Input
                id="listingAgentCommission"
                type="number"
                value={editForm.listingAgentCommission}
                onChange={(e) => setEditForm({ ...editForm, listingAgentCommission: e.target.value })}
                placeholder="Enter listing agent commission"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeWarranty">Home Warranty ($)</Label>
              <Input
                id="homeWarranty"
                type="number"
                value={editForm.homeWarranty}
                onChange={(e) => setEditForm({ ...editForm, homeWarranty: e.target.value })}
                placeholder="Enter home warranty amount"
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
                  <AddressAutocomplete
                    id="streetName"
                    value={editForm.streetName}
                    onChange={(val) => setEditForm({ ...editForm, streetName: val })}
                    onAddressSelect={(addr) => setEditForm({
                      ...editForm,
                      streetName: addr.street,
                      city: addr.city,
                      state: addr.state,
                      zipCode: addr.zipCode
                    })}
                    placeholder="Start typing an address..."
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

function ComplianceChecklist({ transactionId, readOnly }: { transactionId: number; readOnly: boolean }) {
  const { toast } = useToast();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const { data: checklist, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/compliance-checklist", transactionId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/compliance-checklist/${transactionId}`);
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (items: any[]) => {
      await apiRequest("PATCH", `/api/compliance-checklist/${transactionId}`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/compliance-checklist", transactionId] });
    },
    onError: () => {
      toast({ title: "Failed to update", variant: "destructive" });
    },
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading compliance checklist...</div>;

  if (isError) return (
    <Card><CardContent className="p-8 text-center space-y-3">
      <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
      <p className="text-sm text-muted-foreground">Failed to load compliance checklist.</p>
      <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
    </CardContent></Card>
  );

  const items = checklist?.items || [];
  const phases = [...new Set(items.map((i: any) => i.phase))] as string[];
  const completedCount = items.filter((i: any) => i.completed).length;
  const requiredItems = items.filter((i: any) => i.required !== false);
  const requiredComplete = requiredItems.filter((i: any) => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const toggleItem = (itemId: string) => {
    if (readOnly) return;
    const updated = items.map((i: any) => i.id === itemId ? { ...i, completed: !i.completed } : i);
    updateMutation.mutate(updated);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Transaction Compliance</h3>
            </div>
            <Badge variant={progress === 100 ? "default" : "secondary"}>
              {completedCount}/{items.length} Complete
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{requiredComplete}/{requiredItems.length} required items complete</span>
            <span>{progress}%</span>
          </div>
        </CardContent>
      </Card>

      {phases.map(phase => {
        const phaseItems = items.filter((i: any) => i.phase === phase);
        const phaseComplete = phaseItems.filter((i: any) => i.completed).length;
        const isExpanded = expandedPhase === phase || expandedPhase === null;

        return (
          <Card key={phase}>
            <CardContent className="p-0">
              <button
                onClick={() => setExpandedPhase(isExpanded && expandedPhase !== null ? null : phase)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {phaseComplete === phaseItems.length ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">{phase}</span>
                  <Badge variant="outline" className="text-xs">{phaseComplete}/{phaseItems.length}</Badge>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {isExpanded && (
                <div className="px-4 pb-4 space-y-2">
                  {phaseItems.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <Checkbox
                        checked={item.completed}
                        onCheckedChange={() => toggleItem(item.id)}
                        disabled={readOnly}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                          {item.text}
                        </p>
                      </div>
                      {item.required !== false ? (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200 shrink-0">Required</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">If Applicable</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TransactionNetSheet({ transaction }: { transaction: any }) {
  const isSeller = transaction.type === 'sell';
  const contractPrice = transaction.contractPrice || 0;

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

  const [values, setValues] = useState(() => {
    if (isSeller) {
      return {
        salePrice: contractPrice,
        listingCommission: transaction.listingAgentCommission || Math.round(contractPrice * 0.03),
        buyerAgentCommission: transaction.buyerAgentCompensation || Math.round(contractPrice * 0.03),
        titlePolicy: Math.round(contractPrice * 0.006),
        escrowFees: 500,
        existingMortgage: 0,
        propertyTaxProration: Math.round(contractPrice * 0.02 / 12),
        hoaProration: 0,
        repairCredits: 0,
        homeWarranty: transaction.homeWarranty || 0,
        otherCredits: transaction.sellerConcessions || 0,
        miscFees: 250,
      };
    } else {
      return {
        purchasePrice: contractPrice,
        downPayment: transaction.downPayment || Math.round(contractPrice * 0.2),
        loanAmount: contractPrice - (transaction.downPayment || Math.round(contractPrice * 0.2)),
        closingCosts: Math.round(contractPrice * 0.025),
        prepaids: Math.round(contractPrice * 0.015),
        earnestMoney: transaction.earnestMoney || 0,
        optionFee: transaction.optionFee || 0,
        inspectionCost: 500,
        appraisalCost: 500,
        homeInsurance: Math.round(contractPrice * 0.004),
        titleInsurance: Math.round(contractPrice * 0.005),
        surveyFee: 500,
        otherFees: 0,
      };
    }
  });

  const updateVal = (key: string, val: number) => {
    setValues(prev => {
      const next = { ...prev, [key]: val };
      if (!isSeller && key === 'downPayment') {
        (next as any).loanAmount = (next as any).purchasePrice - val;
      }
      if (!isSeller && key === 'purchasePrice') {
        (next as any).loanAmount = val - (next as any).downPayment;
      }
      return next;
    });
  };

  let netAmount = 0;
  let totalDebits = 0;
  let totalCredits = 0;
  const lineItems: { label: string; amount: number; type: 'credit' | 'debit' | 'header' }[] = [];

  if (isSeller) {
    const v = values as any;
    totalCredits = v.salePrice;
    totalDebits = v.listingCommission + v.buyerAgentCommission + v.titlePolicy + v.escrowFees + v.existingMortgage +
      v.propertyTaxProration + v.hoaProration + v.repairCredits + v.homeWarranty + v.otherCredits + v.miscFees;
    netAmount = totalCredits - totalDebits;

    lineItems.push(
      { label: "Sale Price", amount: v.salePrice, type: 'credit' },
      { label: "Listing Agent Commission", amount: -v.listingCommission, type: 'debit' },
      { label: "Buyer Agent Commission", amount: -v.buyerAgentCommission, type: 'debit' },
      { label: "Title Policy", amount: -v.titlePolicy, type: 'debit' },
      { label: "Escrow / Closing Fees", amount: -v.escrowFees, type: 'debit' },
      { label: "Existing Mortgage Payoff", amount: -v.existingMortgage, type: 'debit' },
      { label: "Property Tax Proration", amount: -v.propertyTaxProration, type: 'debit' },
      { label: "HOA Proration", amount: -v.hoaProration, type: 'debit' },
      { label: "Repair Credits", amount: -v.repairCredits, type: 'debit' },
      { label: "Home Warranty", amount: -v.homeWarranty, type: 'debit' },
      { label: "Seller Concessions", amount: -v.otherCredits, type: 'debit' },
      { label: "Misc Fees", amount: -v.miscFees, type: 'debit' },
    );
  } else {
    const v = values as any;
    totalDebits = v.downPayment + v.closingCosts + v.prepaids + v.inspectionCost + v.appraisalCost +
      v.homeInsurance + v.titleInsurance + v.surveyFee + v.otherFees;
    totalCredits = v.earnestMoney + v.optionFee;
    netAmount = totalDebits - totalCredits;

    lineItems.push(
      { label: "Purchase Price", amount: v.purchasePrice, type: 'header' },
      { label: "Loan Amount", amount: v.loanAmount, type: 'header' },
      { label: "Down Payment", amount: v.downPayment, type: 'debit' },
      { label: "Closing Costs (est.)", amount: v.closingCosts, type: 'debit' },
      { label: "Prepaids (taxes, insurance escrow)", amount: v.prepaids, type: 'debit' },
      { label: "Inspection Cost", amount: v.inspectionCost, type: 'debit' },
      { label: "Appraisal Fee", amount: v.appraisalCost, type: 'debit' },
      { label: "Homeowner's Insurance (annual)", amount: v.homeInsurance, type: 'debit' },
      { label: "Title Insurance", amount: v.titleInsurance, type: 'debit' },
      { label: "Survey Fee", amount: v.surveyFee, type: 'debit' },
      { label: "Other Fees", amount: v.otherFees, type: 'debit' },
      { label: "Less: Earnest Money (already paid)", amount: -v.earnestMoney, type: 'credit' },
      { label: "Less: Option Fee (already paid)", amount: -v.optionFee, type: 'credit' },
    );
  }

  const InputRow = ({ label, field, isPercent }: { label: string; field: string; isPercent?: boolean }) => (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50">
      <label className="text-sm text-muted-foreground flex-1">{label}</label>
      <div className="flex items-center gap-1">
        {!isPercent && <span className="text-xs text-muted-foreground">$</span>}
        <Input
          type="number"
          className="w-28 h-8 text-right text-sm"
          value={(values as any)[field] || 0}
          onChange={(e) => updateVal(field, parseFloat(e.target.value) || 0)}
        />
        {isPercent && <span className="text-xs text-muted-foreground">%</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">{isSeller ? "Seller" : "Buyer"} Net Sheet</h3>
          </div>

          <div className="bg-primary/5 rounded-lg p-4 mb-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">
              {isSeller ? "Estimated Net Proceeds" : "Estimated Cash Needed at Closing"}
            </p>
            <p className={`text-3xl font-bold ${isSeller && netAmount < 0 ? "text-red-600" : "text-primary"}`}>
              {fmt(Math.abs(netAmount))}
            </p>
            {isSeller && netAmount < 0 && (
              <p className="text-xs text-red-600 mt-1 flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Seller would owe at closing
              </p>
            )}
          </div>

          {isSeller ? (
            <div className="space-y-0">
              <InputRow label="Sale Price" field="salePrice" />
              <InputRow label="Listing Agent Commission" field="listingCommission" />
              <InputRow label="Buyer Agent Commission" field="buyerAgentCommission" />
              <InputRow label="Title Policy" field="titlePolicy" />
              <InputRow label="Escrow / Closing Fees" field="escrowFees" />
              <InputRow label="Existing Mortgage Payoff" field="existingMortgage" />
              <InputRow label="Property Tax Proration" field="propertyTaxProration" />
              <InputRow label="HOA Proration" field="hoaProration" />
              <InputRow label="Repair Credits" field="repairCredits" />
              <InputRow label="Home Warranty" field="homeWarranty" />
              <InputRow label="Seller Concessions" field="otherCredits" />
              <InputRow label="Misc Fees" field="miscFees" />
            </div>
          ) : (
            <div className="space-y-0">
              <InputRow label="Purchase Price" field="purchasePrice" />
              <InputRow label="Down Payment" field="downPayment" />
              <InputRow label="Closing Costs (est.)" field="closingCosts" />
              <InputRow label="Prepaids (taxes, insurance escrow)" field="prepaids" />
              <InputRow label="Inspection Cost" field="inspectionCost" />
              <InputRow label="Appraisal Fee" field="appraisalCost" />
              <InputRow label="Homeowner's Insurance (annual)" field="homeInsurance" />
              <InputRow label="Title Insurance" field="titleInsurance" />
              <InputRow label="Survey Fee" field="surveyFee" />
              <InputRow label="Other Fees" field="otherFees" />
              <InputRow label="Earnest Money (credit)" field="earnestMoney" />
              <InputRow label="Option Fee (credit)" field="optionFee" />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold text-sm mb-3">Summary</h4>
          <div className="space-y-1.5">
            {lineItems.map((item, i) => (
              <div key={i} className={`flex justify-between text-sm py-1 ${
                item.type === 'header' ? 'font-medium border-b border-border/50' :
                item.type === 'credit' ? 'text-green-600' : ''
              }`}>
                <span className={item.amount < 0 ? 'text-red-600' : ''}>{item.label}</span>
                <span className={`font-mono ${item.amount < 0 ? 'text-red-600' : ''}`}>
                  {fmt(Math.abs(item.amount))}
                  {item.amount < 0 && item.type !== 'header' ? ' −' : ''}
                </span>
              </div>
            ))}
            <div className="border-t-2 border-primary pt-2 flex justify-between font-bold">
              <span>{isSeller ? "Est. Net Proceeds" : "Est. Cash at Closing"}</span>
              <span className={`font-mono ${isSeller && netAmount < 0 ? "text-red-600" : "text-primary"}`}>
                {fmt(Math.abs(netAmount))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center px-4">
        This is an estimate only. Actual amounts may vary. Consult with your title company for final figures.
      </p>
    </div>
  );
}