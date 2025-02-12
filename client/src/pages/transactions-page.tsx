import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Toggle } from "@/components/ui/toggle";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Plus, List, LayoutGrid } from "lucide-react";
import { NavTabs } from "@/components/ui/nav-tabs";
import { KanbanBoard } from "@/components/kanban-board";
import { useState } from "react";

interface Transaction {
  id: number;
  address: string;
  status: string;
  type: 'buy' | 'sell';
  participants: any[];
  contractPrice: number | null;
  clientId: number | null;
  client?: {
    firstName: string;
    lastName: string;
  } | null;
}

const createTransactionSchema = z.object({
  address: z.string().min(1),
  accessCode: z.string().min(6),
  type: z.enum(['buy', 'sell'])
});

export default function TransactionsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'board'>('board');

  const form = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: { 
      address: "", 
      accessCode: "", 
      type: "buy" as const 
    },
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/transactions");
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      return data;
    },
    enabled: !!user,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createTransactionSchema>) => {
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        agentId: user?.id,
        status: "prospect",
        participants: [],
      });
      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Your Transactions</h2>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Toggle
              pressed={view === 'list'}
              onPressedChange={() => setView('list')}
              aria-label="List view"
              className="data-[state=on]:bg-background"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={view === 'board'}
              onPressedChange={() => setView('board')}
              aria-label="Board view"
              className="data-[state=on]:bg-background"
            >
              <LayoutGrid className="h-4 w-4" />
            </Toggle>
          </div>
        </div>
        {user?.role === "agent" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Transaction</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createTransactionMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Address</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter property address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transaction Type</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-4">
                            <Button
                              type="button"
                              variant={field.value === 'buy' ? 'default' : 'outline'}
                              className={field.value === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''}
                              onClick={() => field.onChange('buy')}
                            >
                              Buy
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === 'sell' ? 'default' : 'outline'}
                              className={field.value === 'sell' ? 'bg-red-500 hover:bg-red-600' : ''}
                              onClick={() => field.onChange('sell')}
                            >
                              Sell
                            </Button>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accessCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passkey</FormLabel>
                        <FormControl>
                          <Input {...field} type="text" placeholder="Enter passkey (min. 6 characters)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createTransactionMutation.isPending}>
                    Create Transaction
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {view === 'board' ? (
        <KanbanBoard transactions={transactions} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {transactions.map((transaction) => (
            <Card 
              key={transaction.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors" 
              onClick={() => setLocation(`/transactions/${transaction.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{transaction.address}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Status: {transaction.status}</p>
                <p className="text-sm text-muted-foreground">
                  Participants: {transaction.participants.length}
                </p>
                {transaction.client && (
                  <p className="text-sm text-muted-foreground">
                    Client: {transaction.client.firstName} {transaction.client.lastName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {transactions.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No transactions found. {user?.role === "agent" ? "Create one to get started!" : "Ask your agent for an access code to join a transaction."}
            </div>
          )}
        </div>
      )}
    </main>
  );
}