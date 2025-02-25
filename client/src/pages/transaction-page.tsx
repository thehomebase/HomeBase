import * as React from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { ArrowLeft, Check, ClipboardCheck, Pencil, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";
import { UserPlus, FileText } from "lucide-react"; // Added imports for UserPlus and FileText

interface TransactionFormData {
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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
  clientId?: number | null; // Added clientId
}

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const parsedId = id ? parseInt(id, 10) : null;
  const [isEditing, setIsEditing] = React.useState(false);
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });
  const form = useForm<TransactionFormData>();

  const { data: transaction, isLoading, isError } = useQuery({
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
      if (!parsedId) throw new Error("Invalid transaction ID");
      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, data); // Changed to PATCH
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["/api/transactions", parsedId], updatedData);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Transaction update error:', error);
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
        streetName: transaction.streetName,
        city: transaction.city,
        state: transaction.state,
        zipCode: transaction.zipCode,
        contractPrice: transaction.contractPrice,
        optionPeriodExpiration: transaction.optionPeriodExpiration,
        optionFee: transaction.optionFee,
        earnestMoney: transaction.earnestMoney,
        downPayment: transaction.downPayment,
        sellerConcessions: transaction.sellerConcessions,
        closingDate: transaction.closingDate,
        contractExecutionDate: transaction.contractExecutionDate,
        mlsNumber: transaction.mlsNumber,
        financing: transaction.financing,
        status: transaction.status,
        clientId: transaction.clientId
      });
    }
  }, [transaction, form]);

  if (!user) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            Please log in to view this transaction.
          </p>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </main>
    );
  }

  if (isError || !transaction) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            Transaction not found.
          </p>
        </Card>
      </main>
    );
  }

  const transactionType = transaction.type;
  const checklist = transaction.checklist || [];

  const phases = Array.from(new Set(checklist.map(item => item.phase)));
  const currentPhase = phases.find(phase =>
    checklist.some(item => item.phase === phase && !item.completed)
  ) || phases[phases.length - 1];

  const completedTasks = checklist.filter(item => item.completed).length;
  const totalTasks = checklist.length || 1;
  const progress = Math.round((completedTasks / totalTasks) * 100);
  const displayProgress = `${progress}% Complete`;

  const handleSubmit = async (data: TransactionFormData) => {
    try {
      await updateTransaction.mutateAsync(data);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction. Please try again.",
        variant: "destructive"
      });
    }
  };


  return (
    <main>
      <header className="border-b">
        <div className="w-full px-3 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center gap-4">
            <Link href="/transactions">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              {isEditing ? (
                <div className="grid gap-2">
                  <Input
                    type="text"
                    {...form.register("streetName")}
                    defaultValue={transaction.streetName}
                    placeholder="Street Name"
                    className="text-xl font-bold mb-1 w-full"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="text"
                      {...form.register("city")}
                      defaultValue={transaction.city}
                      placeholder="City"
                    />
                    <Input
                      type="text"
                      {...form.register("state")}
                      defaultValue={transaction.state}
                      placeholder="State"
                    />
                    <Input
                      type="text"
                      {...form.register("zipCode")}
                      defaultValue={transaction.zipCode}
                      placeholder="Zip Code"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{transaction.streetName}</h1>
                  <p className="text-muted-foreground">
                    {transaction.city}, {transaction.state} {transaction.zipCode}
                  </p>
                </>
              )}
              <p className="text-muted-foreground">Transaction ID: {parsedId}</p>
            </div>
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
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Transaction Summary</CardTitle>
            {user.role === 'agent' && (
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit Details'}
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Transaction Type</p>
                  <p className="font-medium capitalize">
                    {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
                  </p>
                </div>
                {transaction.client && (
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Client</p>
                    <p className="font-medium">
                      {transaction.client.firstName} {transaction.client.lastName}
                    </p>
                  </div>
                )}
                {transaction.secondaryClient && (
                  <div>
                    <p className="text-sm text-muted-foreground">Secondary Client</p>
                    <p className="font-medium">
                      {transaction.secondaryClient.firstName} {transaction.secondaryClient.lastName}
                    </p>
                  </div>
                )}
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
                {/* ... rest of the transaction details from original code */}
                <div>
                  <p className="text-sm text-muted-foreground">Primary Client</p>
                  {isEditing ? (
                    <select
                      className="w-full h-9 px-3 rounded-md border bg-background"
                      value={form.getValues("clientId") || ""}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : null;
                        form.setValue("clientId", value);
                        handleSubmit(form.getValues());
                      }}
                    >
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium">
                      {clients?.find(c => c.id === transaction.clientId)
                        ? `${clients.find(c => c.id === transaction.clientId)?.firstName} ${clients.find(c => c.id === transaction.clientId)?.lastName}`
                        : 'Not set'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {isEditing ? (
                    <select
                      className="w-full h-9 px-3 rounded-md border"
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
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={updateTransaction.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            {/* ... rest of the transaction details from original code */}
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
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardContent className="p-6">
            <Tabs defaultValue="progress">
              <TabsList className="flex w-full flex-wrap sm:flex-nowrap gap-1 p-1 max-w-[100vw]">
                <TabsTrigger className="flex-1 min-w-20" value="progress">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Progress
                </TabsTrigger>
                <TabsTrigger className="flex-1 min-w-20" value="contacts">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Contacts
                </TabsTrigger>
                <TabsTrigger className="flex-1 min-w-20" value="documents">
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
      </div>
    </main>
  );
}