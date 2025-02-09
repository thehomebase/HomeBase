
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ClipboardCheck, MessageSquare } from "lucide-react";
import { ProgressChecklist } from "@/components/progress-checklist";
import { Chat } from "@/components/chat";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const parsedId = id ? parseInt(id, 10) : null;
  const isValidId = parsedId && !isNaN(parsedId);
  
  const queryClient = useQueryClient();
  
  const updateTransaction = useMutation({
    mutationFn: async (data: Partial<Transaction>) => {
      const response = await apiRequest(
        "PATCH",
        `/api/transactions/${parsedId}`,
        data
      );
      if (!response.ok) {
        throw new Error("Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
    },
  });

  const { data: transaction, isError, error } = useQuery({
    queryKey: ["/api/transactions", parsedId],
    queryFn: async () => {
      if (!isValidId) {
        throw new Error("Invalid transaction ID");
      }
      const response = await apiRequest("GET", `/api/transactions/${parsedId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      return response.json();
    },
    enabled: !!parsedId && !!user,
    retry: false
  });

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Link href="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="text-center text-destructive mt-4">
          Error: Unable to load transaction
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold">{transaction?.address}</h1>
              <p className="text-muted-foreground">Transaction ID: {id}</p>
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
                <TabsTrigger value="details">
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
              </TabsList>
              <TabsContent value="progress" className="mt-6">
                <ProgressChecklist
                  transactionId={Number(id)}
                  userRole={user?.role || ""}
                />
              </TabsContent>
              <TabsContent value="details" className="mt-6">
                <div className="space-y-4">
                  <form className="grid grid-cols-2 gap-4" onSubmit={(e) => {
                    e.preventDefault();
                    // Add submission logic here
                  }}>
                    <div className="space-y-2">
                      <Label htmlFor="contractPrice">Contract Price</Label>
                      <Input
                        id="contractPrice"
                        type="number"
                        defaultValue={transaction?.contractPrice}
                        placeholder="Enter contract price"
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="optionPeriod">Option Period (days)</Label>
                      <Input
                        id="optionPeriod"
                        type="number"
                        defaultValue={transaction?.optionPeriod}
                        placeholder="Enter option period"
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="optionFee">Option Fee</Label>
                      <Input
                        id="optionFee"
                        type="number"
                        defaultValue={transaction?.optionFee}
                        placeholder="Enter option fee"
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="earnestMoney">Earnest Money</Label>
                      <Input
                        id="earnestMoney"
                        type="number"
                        defaultValue={transaction?.earnestMoney}
                        placeholder="Enter earnest money"
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="downPayment">Down Payment</Label>
                      <Input
                        id="downPayment"
                        type="number"
                        defaultValue={transaction?.downPayment}
                        placeholder="Enter down payment"
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sellerConcessions">Seller Concessions</Label>
                      <Input
                        id="sellerConcessions"
                        type="number"
                        defaultValue={transaction?.sellerConcessions}
                        placeholder="Enter seller concessions"
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closingDate">Closing Date</Label>
                      <Input
                        id="closingDate"
                        type="date"
                        defaultValue={transaction?.closingDate}
                        disabled={user?.role !== 'agent'}
                      />
                    </div>
                    {user?.role === 'agent' && (
                      <div className="col-span-2 flex justify-end">
                        <Button type="submit">
                          Save Changes
                        </Button>
                      </div>
                    )}
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
