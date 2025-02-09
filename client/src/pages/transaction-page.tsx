import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ClipboardCheck, Clock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { ProgressChecklist } from '@/components/progress-checklist';
import { Chat } from '@/components/chat';

export default function TransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: transaction, isError, isLoading } = useQuery({
    queryKey: ['transaction', id],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="p-6">
        <Button onClick={() => navigate('/')} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return Home
        </Button>
        <p className="mt-4">Unable to load transaction. Please try again.</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-6">
        <p>Transaction not found.</p>
        <Button onClick={() => navigate('/')} variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button onClick={() => navigate('/')} variant="ghost" className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="grid gap-6">
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
                  checklist={transaction?.checklist}
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
    </div>
  );
}