import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardCheck, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ProgressChecklist } from '@/components/progress-checklist';
import { Chat } from '@/components/chat';
import type { Transaction } from '@shared/schema';

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  console.log("TransactionPage mounted, ID:", id);

  const { data: transaction, isError, error, isLoading } = useQuery<Transaction>({
    queryKey: ['/api/transactions', Number(id)],
    enabled: !!id && !!user?.id
  });

  console.log("Current transaction data:", transaction);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (isError || !transaction) {
    return (
      <div className="p-6">
        <Button onClick={() => setLocation('/')} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return Home
        </Button>
        <p className="mt-4">Unable to load transaction. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button onClick={() => setLocation('/')} variant="ghost" className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{transaction.address}</h1>
              <p className="text-sm text-muted-foreground">Transaction ID: {id}</p>
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
                  <Clock className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>
              <TabsContent value="progress" className="mt-6">
                <ProgressChecklist
                  transactionId={Number(id)}
                  userRole={user?.role || "client"}
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
      </main>
    </div>
  );
}