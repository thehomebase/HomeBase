import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, ClipboardCheck, Home, Clock } from "lucide-react";
import { useLocation } from "wouter";
import Chat from "@/components/chat";
import ProgressChecklist from "@/components/progress-checklist";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transaction, Checklist } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: transaction, isLoading: isLoadingTransaction, error } = useQuery<Transaction>({
    queryKey: [`/api/transactions/${id}`],
    enabled: !!id,
    retry: 1,
    onError: (error) => {
      console.error('Transaction fetch error:', error);
    }
  });

  const { data: checklist } = useQuery<Checklist>({
    queryKey: [`/api/checklists/${id}/${user?.role}`],
    enabled: !!id && !!user?.role,
  });

  if (isLoadingTransaction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive">Error Loading Transaction</h2>
          <p className="text-muted-foreground mt-2">{error.message}</p>
          <Button className="mt-4" onClick={() => setLocation("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Transaction Not Found</h2>
          <p className="text-muted-foreground mt-2">This transaction may have been deleted or you may not have access to it.</p>
          <Button className="mt-4" onClick={() => setLocation("/")}>
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-500/10 text-green-500';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Property Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Home className="h-6 w-6" />
                  {transaction.address}
                </h1>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(transaction.status)}>
                    {transaction.status}
                  </Badge>
                  {user?.role === "agent" && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                      Access Code: {transaction.accessCode}
                    </Badge>
                  )}
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Participants
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transaction Participants</DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="h-[300px] mt-4">
                    {transaction.participants.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No participants yet. Share the access code to add participants.
                      </p>
                    ) : (
                      transaction.participants.map((participant) => (
                        <div key={participant.userId} className="py-3 border-b last:border-0">
                          <p className="font-medium capitalize">{participant.role}</p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="progress">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="progress">
                      <ClipboardCheck className="h-4 w-4 mr-2" />
                      Progress
                    </TabsTrigger>
                    <TabsTrigger value="chat">
                      <Clock className="h-4 w-4 mr-2" />
                      Activity
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="progress" className="mt-6">
                    <ProgressChecklist 
                      transactionId={Number(id)}
                      checklist={checklist}
                      userRole={user?.role || ""}
                    />
                  </TabsContent>
                  <TabsContent value="chat" className="mt-6">
                    <Chat 
                      transactionId={Number(id)}
                      userId={user?.id || 0}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Property Address</h3>
                    <p className="mt-1">{transaction.address}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Status</h3>
                    <p className="mt-1 capitalize">{transaction.status}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground">Participants</h3>
                    <p className="mt-1">{transaction.participants.length} participant(s)</p>
                  </div>
                  {user?.role === "agent" && (
                    <div>
                      <h3 className="font-medium text-sm text-muted-foreground">Access Code</h3>
                      <p className="mt-1 font-mono">{transaction.accessCode}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}