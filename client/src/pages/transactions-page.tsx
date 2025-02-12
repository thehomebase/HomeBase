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
import { Plus, List, LayoutGrid, Trash2, Moon, Sun } from "lucide-react";
import { NavTabs } from "@/components/ui/nav-tabs";
import { KanbanBoard } from "@/components/kanban-board";
import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

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
      return response.json();
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

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <img 
            src={theme === 'dark' ? '/attached_assets/homebaselogowhite.png' : '/homebaselogo.png'} 
            alt="Homebase Logo" 
            className="h-8"
          />
          <h2 className="text-2xl font-bold dark:text-white">Your Transactions</h2>
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <Toggle
              pressed={view === 'list'}
              onPressedChange={() => setView('list')}
              aria-label="List view"
              className="data-[state=on]:bg-background text-foreground dark:text-white"
            >
              <List className="h-4 w-4" />
            </Toggle>
            <Toggle
              pressed={view === 'board'}
              onPressedChange={() => setView('board')}
              aria-label="Board view"
              className="data-[state=on]:bg-background text-foreground dark:text-white"
            >
              <LayoutGrid className="h-4 w-4" />
            </Toggle>
          </div>
          <Toggle
            pressed={theme === 'dark'}
            onPressedChange={toggleTheme}
            aria-label="Toggle theme"
            className="ml-2 text-foreground dark:text-white"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Toggle>
        </div>
        {user?.role === "agent" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="text-foreground dark:text-white">
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
                              className={`${field.value === 'buy' ? 'bg-green-500 hover:bg-green-600' : ''} dark:text-white`}
                              onClick={() => field.onChange('buy')}
                            >
                              Buy
                            </Button>
                            <Button
                              type="button"
                              variant={field.value === 'sell' ? 'default' : 'outline'}
                              className={`${field.value === 'sell' ? 'bg-red-500 hover:bg-red-600' : ''} dark:text-white`}
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
                  <Button type="submit" className="w-full text-foreground dark:text-white" disabled={createTransactionMutation.isPending}>
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
              className="cursor-pointer hover:bg-accent/50 transition-colors relative dark:bg-gray-800" 
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle 
                  className="text-lg hover:underline dark:text-white"
                  onClick={() => setLocation(`/transactions/${transaction.id}`)}
                >
                  {transaction.address}
                </CardTitle>
                {user?.role === "agent" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(transaction.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground dark:text-gray-300">Status: {transaction.status}</p>
                <p className="text-sm text-muted-foreground dark:text-gray-300">
                  Participants: {transaction.participants.length}
                </p>
                {transaction.client && (
                  <p className="text-sm text-muted-foreground dark:text-gray-300">
                    Client: {transaction.client.firstName} {transaction.client.lastName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {transactions.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground dark:text-gray-400">
              No transactions found. {user?.role === "agent" ? "Create one to get started!" : "Ask your agent for an access code to join a transaction."}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteTransactionMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}