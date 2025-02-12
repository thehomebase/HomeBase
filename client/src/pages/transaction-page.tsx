import React from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ClipboardCheck, FileText, UserPlus, Pencil, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  phase?: string;
}

interface Transaction {
  id: number;
  address: string;
  status: string;
  contractPrice?: number;
  optionPeriodExpiration?: string;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
  contractExecutionDate?: string;
  mlsNumber?: string;
  financing?: string;
  checklist?: Array<ChecklistItem>;
  type: 'buy' | 'sell';
}

interface TransactionFormData {
  address?: string;
  contractPrice?: number;
  optionPeriodExpiration?: string;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
  contractExecutionDate?: string;
  mlsNumber?: string;
  financing?: string;
  status?: string;
}

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const parsedId = id ? parseInt(id, 10) : null;

  const [isEditing, setIsEditing] = React.useState(false);
  const form = useForm<TransactionFormData>();

  const { data: transaction, isError, isLoading } = useQuery({
    queryKey: ["/api/transactions", parsedId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/transactions/${parsedId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      return response.json();
    },
    enabled: !!parsedId && !!user,
  });

  const updateTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!parsedId || isNaN(parsedId)) {
        throw new Error("Invalid transaction ID");
      }

      const formatDate = (date: string | null | undefined) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        // Don't adjust timezone offset as we want to preserve the user's selected date
        return d.toISOString();
      };

      const formattedData = {
        ...data,
        closingDate: formatDate(data.closingDate),
        contractExecutionDate: formatDate(data.contractExecutionDate),
        optionPeriodExpiration: formatDate(data.optionPeriodExpiration)
      };

      const cleanData = Object.fromEntries(
        Object.entries(formattedData).filter(([_, value]) => value !== undefined && value !== '')
      );

      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, cleanData);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: (updatedData) => {
      // Update the cache immediately with the new data
      queryClient.setQueryData(["/api/transactions", parsedId], updatedData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update transaction",
        variant: "destructive",
      });
    }
  });

  React.useEffect(() => {
    if (transaction) {
      // Format dates to local date string for form display
      const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      form.reset({
        contractPrice: transaction.contractPrice,
        optionPeriodExpiration: formatDateForInput(transaction.optionPeriodExpiration),
        optionFee: transaction.optionFee,
        earnestMoney: transaction.earnestMoney,
        downPayment: transaction.downPayment,
        sellerConcessions: transaction.sellerConcessions,
        closingDate: formatDateForInput(transaction.closingDate),
        contractExecutionDate: formatDateForInput(transaction.contractExecutionDate),
        mlsNumber: transaction.mlsNumber,
        financing: transaction.financing,
        status: transaction.status
      });
    }
  }, [transaction, form]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-xl text-destructive">Please log in to access this page.</p>
          <Link href="/transactions">
            <Button variant="outline" className="mt-4">Back to Transactions</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!parsedId || isNaN(parsedId)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-xl text-destructive">Invalid transaction ID</p>
          <Link href="/transactions">
            <Button variant="outline" className="mt-4">Back to Transactions</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (isError || !transaction) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-xl text-destructive">Error loading transaction</p>
          <Link href="/transactions">
            <Button variant="outline" className="mt-4">Back to Transactions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const transactionType = transaction.type;
  const checklist = transaction.checklist || [];

  // Get all unique phases in order
  const phases = Array.from(new Set(checklist.map(item => item.phase)));

  // Find current phase (first phase with incomplete items)
  const currentPhase = phases.find(phase =>
    checklist.some(item => item.phase === phase && !item.completed)
  ) || phases[phases.length - 1];

  // Calculate progress
  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length || 1;
  const progress = Math.round((completedTasks / totalTasks) * 100);

  // Ensure consistent progress display
  const displayProgress = `${progress}% Complete`;

  return (
    <div>
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/transactions">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              {isEditing ? (
                <Input
                  type="text"
                  {...form.register("address")}
                  defaultValue={transaction.address}
                  className="text-2xl font-bold mb-1 w-full"
                />
              ) : (
                <h1 className="text-2xl font-bold">{transaction.address}</h1>
              )}
              <p className="text-muted-foreground">Transaction ID: {parsedId}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Transaction Summary</h3>
              {user.role === 'agent' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Details
                    </>
                  )}
                </Button>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Type</p>
                  <p className="font-medium capitalize">
                    {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contract Price</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...form.register("contractPrice")}
                      placeholder="Enter contract price"
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.contractPrice
                        ? `$${transaction.contractPrice.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Option Expiration Date</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      {...form.register("optionPeriodExpiration")}
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.optionPeriodExpiration
                        ? new Date(transaction.optionPeriodExpiration).toLocaleDateString('en-US')
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Option Fee</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...form.register("optionFee")}
                      placeholder="Enter option fee"
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.optionFee
                        ? `$${transaction.optionFee.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Earnest Money</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...form.register("earnestMoney")}
                      placeholder="Enter earnest money"
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.earnestMoney
                        ? `$${transaction.earnestMoney.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Down Payment</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...form.register("downPayment")}
                      placeholder="Enter down payment"
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.downPayment
                        ? `$${transaction.downPayment.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller Concessions</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...form.register("sellerConcessions")}
                      placeholder="Enter seller concessions"
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.sellerConcessions
                        ? `$${transaction.sellerConcessions.toLocaleString()}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closing Date</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      {...form.register("closingDate")}
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.closingDate
                        ? new Date(transaction.closingDate).toLocaleDateString('en-US')
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contract Execution Date</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      {...form.register("contractExecutionDate")}
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.contractExecutionDate
                        ? new Date(transaction.contractExecutionDate).toLocaleDateString('en-US')
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">MLS No.</p>
                  {isEditing ? (
                    <Input
                      type="text"
                      {...form.register("mlsNumber")}
                      placeholder="Enter MLS number"
                      className="w-full h-9 px-3 rounded-md border"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.mlsNumber || 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Financing</p>
                  {isEditing ? (
                    <select
                      className="w-full h-9 px-3 rounded-md border"
                      {...form.register("financing")}
                    >
                      <option value="">Select financing type</option>
                      <option value="FHA">FHA</option>
                      <option value="VA">VA</option>
                      <option value="Conventional">Conventional</option>
                      <option value="Cash">Cash</option>
                    </select>
                  ) : (
                    <p className="font-medium">
                      {transaction.financing || 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {isEditing ? (
                    <select
                      className="w-full h-9 px-3 rounded-md border"
                      {...form.register("status")}
                      onChange={(e) => {
                        form.setValue("status", e.target.value);
                        updateTransaction.mutate({ status: e.target.value });
                      }}
                    >
                      <option value="coming_soon">Coming Soon</option>
                      <option value="active">Active</option>
                      <option value="active_option">Active Option Contract</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  ) : (
                    <p className="font-medium capitalize">
                      {transaction.status === 'active_option'
                        ? 'Active Option Contract'
                        : transaction.status?.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="flex justify-end mt-4">
                  <Button
                    type="button"
                    onClick={form.handleSubmit((data) => {
                      const cleanData = Object.fromEntries(
                        Object.entries(data).filter(([_, v]) => v != null && v !== '')
                      );
                      updateTransaction.mutate(cleanData);
                      setIsEditing(false);
                    })}
                    disabled={updateTransaction.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-6">
            <Tabs defaultValue="progress">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="progress">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger value="contacts">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Contacts
                </TabsTrigger>
                <TabsTrigger value="documents">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents
                </TabsTrigger>
              </TabsList>
              <TabsContent value="progress" className="mt-6">
                <ProgressChecklist
                  transactionId={parsedId}
                  userRole={user.role || ""}
                  transactionType={transaction.type}
                />
              </TabsContent>
              <TabsContent value="contacts" className="mt-6">
                <TransactionContacts transactionId={parsedId} />
              </TabsContent>
              <TabsContent value="documents" className="mt-6">
                <DocumentChecklist transactionId={parsedId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


      </main>
    </div>
  );
}