import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardCheck, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ProgressChecklist } from '@/components/progress-checklist';
import { Chat } from '@/components/chat';
import { apiRequest } from '@/lib/queryClient';
import type { Transaction } from '@shared/schema';

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const parsedId = id ? parseInt(id, 10) : null;

  const { data: transaction, isError, isLoading } = useQuery<Transaction>({
    queryKey: ['/api/transactions', parsedId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/transactions/${parsedId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch transaction');
      }
      return response.json();
    },
    enabled: !!parsedId && !!user?.id,
    retry: false
  });

  if (!parsedId || isNaN(parsedId)) {
    return (
      <div className="p-6">
        <Button onClick={() => setLocation('/')} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return Home
        </Button>
        <p className="mt-4 text-destructive">Invalid transaction ID</p>
      </div>
    );
  }

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
        <p className="mt-4 text-destructive">Unable to load transaction. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button onClick={() => setLocation('/')} variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="text-right">
              <h1 className="text-2xl font-bold">{transaction.address}</h1>
              <p className="text-sm text-muted-foreground">Transaction #{parsedId}</p>
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
                  userRole={user?.role || ""}
                />
              </TabsContent>
              <TabsContent value="chat" className="mt-6">
                {transaction && (
                  <Chat transactionId={parsedId} />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}