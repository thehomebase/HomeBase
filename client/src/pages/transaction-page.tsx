
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ClipboardCheck, MessageSquare } from "lucide-react";
import { ProgressChecklist } from "@/components/progress-checklist";
import { Chat } from "@/components/chat";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const parsedId = id ? parseInt(id, 10) : null;
  const isValidId = parsedId && !isNaN(parsedId);
  
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Contract Price</p>
                      <p className="text-lg">${transaction?.contractPrice?.toLocaleString() || 'Not set'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Option Period</p>
                      <p className="text-lg">{transaction?.optionPeriod || 'Not set'} days</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Option Fee</p>
                      <p className="text-lg">${transaction?.optionFee?.toLocaleString() || 'Not set'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Earnest Money</p>
                      <p className="text-lg">${transaction?.earnestMoney?.toLocaleString() || 'Not set'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Down Payment</p>
                      <p className="text-lg">${transaction?.downPayment?.toLocaleString() || 'Not set'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Seller Concessions</p>
                      <p className="text-lg">${transaction?.sellerConcessions?.toLocaleString() || 'Not set'}</p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Closing Date</p>
                      <p className="text-lg">{transaction?.closingDate || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
