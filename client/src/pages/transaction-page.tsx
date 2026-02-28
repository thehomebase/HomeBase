import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, FileText, UserPlus, Pencil, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { type Transaction } from "@shared/schema";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";
import { ContractUpload } from "@/components/contract-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const parsedId = id ? parseInt(id, 10) : null;

  const [editForm, setEditForm] = useState({
    status: "",
    type: "",
    contractPrice: "",
    contractExecutionDate: "",
    optionPeriodExpiration: "",
    optionFee: "",
    earnestMoney: "",
    downPayment: "",
    sellerConcessions: "",
    closingDate: "",
    mlsNumber: "",
    financing: "",
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
        contractExecutionDate: formatDateForInput(transaction.contractExecutionDate),
        optionPeriodExpiration: formatDateForInput(transaction.optionPeriodExpiration),
        optionFee: transaction.optionFee?.toString() || "",
        earnestMoney: transaction.earnestMoney?.toString() || "",
        downPayment: transaction.downPayment?.toString() || "",
        sellerConcessions: transaction.sellerConcessions?.toString() || "",
        closingDate: formatDateForInput(transaction.closingDate),
        mlsNumber: transaction.mlsNumber || "",
        financing: transaction.financing || "",
      });
    }
  }, [transaction, isEditing]);

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

  const handleSave = () => {
    const updateData: Record<string, unknown> = {
      status: editForm.status,
      type: editForm.type,
      mlsNumber: editForm.mlsNumber || null,
      financing: editForm.financing || null,
    };

    if (editForm.contractPrice) {
      updateData.contractPrice = parseInt(editForm.contractPrice);
    }
    if (editForm.optionFee) {
      updateData.optionFee = parseInt(editForm.optionFee);
    }
    if (editForm.earnestMoney) {
      updateData.earnestMoney = parseInt(editForm.earnestMoney);
    }
    if (editForm.downPayment) {
      updateData.downPayment = parseInt(editForm.downPayment);
    }
    if (editForm.sellerConcessions) {
      updateData.sellerConcessions = parseInt(editForm.sellerConcessions);
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xl">Please log in to view this transaction.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
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
    <main className="w-full px-4 py-8 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {transaction.streetName}
          </h1>
          <p className="text-muted-foreground">
            {transaction.city}, {transaction.state} {transaction.zipCode}
          </p>
          <p className="text-sm text-muted-foreground">Transaction ID: {transaction.id}</p>
        </div>
      </div>

      <Card className="mb-6 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
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
                {transaction.contractPrice
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.contractPrice)
                  : 'Not set'}
              </p>
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
                {transaction.optionFee
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
                {transaction.earnestMoney
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
                {transaction.downPayment
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
                {transaction.sellerConcessions
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

      <Tabs defaultValue="progress" className="w-full">
        <TabsList>
          <TabsTrigger value="progress">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <UserPlus className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="contract-upload">
            <Upload className="h-4 w-4 mr-2" />
            Contract Upload
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <ProgressChecklist transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentChecklist transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="contacts">
          <TransactionContacts transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="contract-upload">
          {parsedId && transaction && (
            <ContractUpload transactionId={parsedId} transaction={transaction} />
          )}
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
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_contract">Under Contract</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
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