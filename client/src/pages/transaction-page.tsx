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
import { ArrowLeft, ClipboardCheck, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { ProgressChecklist } from "@/components/progress-checklist";
import { Chat } from "@/components/chat";

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
  checklist?: Array<{ id: string; text: string; completed: boolean }>;
}

interface TransactionFormData {
  contractPrice?: number;
  optionPeriod?: number;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
}

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const parsedId = id ? parseInt(id, 10) : null;

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
      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, data);
      if (!response.ok) {
        throw new Error("Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    },
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
            <Tabs defaultValue="progress">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="progress">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Progress
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
                />
              </TabsContent>
              <TabsContent value="chat" className="mt-6">
                <Chat transactionId={parsedId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Contract Price</p>
                <p className="font-medium">
                  {transaction.contractPrice 
                    ? `$${transaction.contractPrice.toLocaleString()}` 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Option Period</p>
                <p className="font-medium">
                  {transaction.optionPeriod 
                    ? `${transaction.optionPeriod} days` 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Option Fee</p>
                <p className="font-medium">
                  {transaction.optionFee 
                    ? `$${transaction.optionFee.toLocaleString()}` 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Earnest Money</p>
                <p className="font-medium">
                  {transaction.earnestMoney 
                    ? `$${transaction.earnestMoney.toLocaleString()}` 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Down Payment</p>
                <p className="font-medium">
                  {transaction.downPayment 
                    ? `$${transaction.downPayment.toLocaleString()}` 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Seller Concessions</p>
                <p className="font-medium">
                  {transaction.sellerConcessions 
                    ? `$${transaction.sellerConcessions.toLocaleString()}` 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Closing Date</p>
                <p className="font-medium">
                  {transaction.closingDate 
                    ? new Date(transaction.closingDate).toLocaleDateString() 
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{transaction.status}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium">Progress</h4>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% Complete</p>
            </div>
          </CardContent>
        </Card>

        {user.role === 'agent' && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <form 
                className="grid grid-cols-2 gap-4" 
                onSubmit={form.handleSubmit((data) => updateTransaction.mutate(data))}
              >
                <div className="space-y-2">
                  <Label htmlFor="contractPrice">Contract Price</Label>
                  <Input
                    id="contractPrice"
                    type="number"
                    {...form.register("contractPrice")}
                    placeholder="Enter contract price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optionPeriod">Option Period (days)</Label>
                  <Input
                    id="optionPeriod"
                    type="number"
                    {...form.register("optionPeriod")}
                    placeholder="Enter option period"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="optionFee">Option Fee</Label>
                  <Input
                    id="optionFee"
                    type="number"
                    {...form.register("optionFee")}
                    placeholder="Enter option fee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="earnestMoney">Earnest Money</Label>
                  <Input
                    id="earnestMoney"
                    type="number"
                    {...form.register("earnestMoney")}
                    placeholder="Enter earnest money"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    {...form.register("downPayment")}
                    placeholder="Enter down payment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellerConcessions">Seller Concessions</Label>
                  <Input
                    id="sellerConcessions"
                    type="number"
                    {...form.register("sellerConcessions")}
                    placeholder="Enter seller concessions"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="closingDate">Closing Date</Label>
                  <Input
                    id="closingDate"
                    type="date"
                    {...form.register("closingDate")}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button type="submit" disabled={updateTransaction.isPending}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}