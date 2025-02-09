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
import { ArrowLeft, ClipboardCheck, MessageSquare, UserPlus, Pencil, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { ProgressChecklist } from "@/components/progress-checklist";
import { Chat } from "@/components/chat";
import { TransactionContacts } from "@/components/transaction-contacts";

interface Transaction {
  id: number;
  address: string;
  status: string;
  contractPrice?: number;
  optionPeriod?: number;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
  contractExecutionDate?: string; // Added contract execution date
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
  type: 'buy' | 'sell';
}

interface TransactionFormData {
  contractPrice?: number;
  optionPeriod?: number;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
  contractExecutionDate?: string; // Added contract execution date
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

      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
      );

      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, cleanData);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: async (updatedData) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
      setIsEditing(false);

      const updatedTransaction = await queryClient.getQueryData(["/api/transactions", parsedId]);
      if (updatedTransaction) {
        form.reset({
          contractPrice: updatedTransaction.contractPrice || undefined,
          optionPeriod: updatedTransaction.optionPeriod || undefined,
          optionFee: updatedTransaction.optionFee || undefined,
          earnestMoney: updatedTransaction.earnestMoney || undefined,
          downPayment: updatedTransaction.downPayment || undefined,
          sellerConcessions: updatedTransaction.sellerConcessions || undefined,
          closingDate: updatedTransaction.closingDate || undefined,
          contractExecutionDate: updatedTransaction.contractExecutionDate || undefined,
          status: updatedTransaction.status || undefined,
        });
      }

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
      form.reset({
        contractPrice: transaction.contractPrice,
        optionPeriod: transaction.optionPeriod,
        optionFee: transaction.optionFee,
        earnestMoney: transaction.earnestMoney,
        downPayment: transaction.downPayment,
        sellerConcessions: transaction.sellerConcessions,
        closingDate: transaction.closingDate,
        contractExecutionDate: transaction.contractExecutionDate, // Added contract execution date
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

  const completedTasks = transaction.checklist?.filter(item => item.completed)?.length ?? 0;
  const totalTasks = transaction.checklist?.length ?? 1;
  const progress = Math.round((completedTasks / totalTasks) * 100);
  const currentPhase = transaction.checklist?.find(item => !item.completed)?.phase || 
    (transactionType === 'buy' ? "Pre-Offer" : "Pre-Listing Preparation");

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
              <h1 className="text-2xl font-bold">{transaction.address}</h1>
              <p className="text-muted-foreground">Transaction ID: {parsedId}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Current Phase</p>
                  <p className="font-medium">{currentPhase}</p>
                </div>
                {user.role === 'agent' && (
                <div className="flex justify-end">
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
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground">{progress}% Complete</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
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
                  <p className="text-sm text-muted-foreground">Option Period</p>
                  {isEditing ? (
                    <Input
                      type="number"
                      {...form.register("optionPeriod")}
                      placeholder="Enter option period"
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.optionPeriod 
                        ? `${transaction.optionPeriod} days` 
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
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.closingDate 
                        ? new Date(transaction.closingDate).toLocaleDateString() 
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contract Execution Date</p> {/* Added Contract Execution Date */}
                  {isEditing ? (
                    <Input
                      type="date"
                      {...form.register("contractExecutionDate")}
                    />
                  ) : (
                    <p className="font-medium">
                      {transaction.contractExecutionDate
                        ? new Date(transaction.contractExecutionDate).toLocaleDateString()
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {isEditing ? (
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={transaction.status}
                      {...form.register("status")}
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
                      updateTransaction.mutate(data);
                      setIsEditing(false);
                    })} 
                    disabled={updateTransaction.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium">Progress</h4>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% Complete</p>
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
                <TabsTrigger value="chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat
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
              <TabsContent value="chat" className="mt-6">
                <Chat transactionId={parsedId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


      </main>
    </div>
  );
}