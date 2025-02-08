import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users } from "lucide-react";
import { useLocation } from "wouter";
import Chat from "@/components/chat";
import ProgressChecklist from "@/components/progress-checklist";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Transaction, Checklist } from "@shared/schema";

export default function TransactionPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: transaction, isLoading: isLoadingTransaction } = useQuery<Transaction>({
    queryKey: ["/api/transactions", id],
  });

  const { data: checklist } = useQuery<Checklist>({
    queryKey: ["/api/checklists", id, user?.role],
    enabled: !!user?.role,
  });

  if (isLoadingTransaction || !transaction) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

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
              <h1 className="text-xl font-bold">{transaction.address}</h1>
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
                <ScrollArea className="h-[300px]">
                  {transaction.participants.map((participant) => (
                    <div key={participant.userId} className="py-2 border-b last:border-0">
                      <p className="font-medium">{participant.role}</p>
                    </div>
                  ))}
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Tabs defaultValue="progress">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="progress">Progress</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
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

          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Transaction Details</h3>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Status:</span>{" "}
                    {transaction.status}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Access Code:</span>{" "}
                    {user?.role === "agent" ? transaction.accessCode : "********"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}