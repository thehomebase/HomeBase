import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
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
import { Plus, List, LayoutGrid, Table2, Trash2, Moon, Sun } from "lucide-react";
import { NavTabs } from "@/components/ui/nav-tabs";
import { KanbanBoard } from "@/components/kanban-board";
import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TransactionTable } from "@/components/transaction-table";
import { Transaction as SchemaTransaction } from "@shared/schema";
import { Client } from "@shared/schema";

// Add proper type for client find operations
type ClientLookup = (client: Client) => boolean;

// Update the Transaction interface to include all required fields
interface Transaction extends Omit<SchemaTransaction, 'updatedAt'> {
  id: number;
  streetName: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  type: 'buy' | 'sell';
  participants: any[];
  contractPrice: number | null;
  clientId: number | null;
  secondaryClientId: number | null;
  client?: {
    firstName: string;
    lastName: string;
  } | null;
  secondaryClient?: {
    firstName: string;
    lastName: string;
  } | null;
  createdAt: string;
  year: number;
}

const createTransactionSchema = z.object({
  streetName: z.string().min(1, "Street name is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "ZIP code is required"),
  accessCode: z.string().min(6),
  type: z.enum(['buy', 'sell']),
  clientId: z.number().nullable(),
  secondaryClientId: z.number().nullable()
});

export default function TransactionsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [view, setView] = useState<'list' | 'board' | 'table'>('board');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>(new Date(new Date().getFullYear(), 0, 1).toISOString());
  const [endDate, setEndDate] = useState<string>("");

  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/clients");
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
    enabled: user?.role === "agent"
  });

  const form = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      streetName: "",
      city: "",
      state: "",
      zipCode: "",
      accessCode: "",
      type: "buy" as const,
      clientId: null as number | null,
      secondaryClientId: null as number | null
    },
  });

  const { data: transactions = [], refetch } = useQuery<Transaction[]>({
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
        status: 'prospect',
        participants: [],
        clientId: data.clientId || null,
        secondaryClientId: data.secondaryClientId || null,
        year: new Date().getFullYear()
      });
      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      refetch();
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create transaction",
        variant: "destructive",
      });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
  };

  const handleDeleteTransaction = (id: number) => {
    if (user?.role === "agent") {
      deleteTransactionMutation.mutate(id);
    }
  };

  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const transactionDate = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
    const yearMatch = selectedYear === null || transactionDate.getFullYear() === selectedYear;
    const startDateMatch = startDate === "" || transactionDate >= new Date(startDate);
    const endDateMatch = endDate === "" || transactionDate <= new Date(endDate);
    return yearMatch && startDateMatch && endDateMatch;
  });


  const isMobile = useIsMobile();

  return (
    <main className="flex-1 min-w-0 overflow-x-hidden px-4">
      <div className="sm:w-screen flex flex-wrap bg-background relative px-2 py-8">
        <div className="flex flex-col sm:flex-row flex-grow sm:items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold dark:text-white">Your Transactions</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg dark:bg-gray-800/50">
              <Toggle
                pressed={view === 'list'}
                onPressedChange={() => setView('list')}
                aria-label="List view"
                className="data-[state=on]:bg-foreground data-[state=on]:text-background hover:text-foreground dark:text-white dark:hover:text-white dark:data-[state=on]:text-black"
              >
                <List className="h-4" />
              </Toggle>
              <Toggle
                pressed={view === 'board'}
                onPressedChange={() => setView('board')}
                aria-label="Board view"
                className="data-[state=on]:bg-foreground data-[state=on]:text-background hover:text-foreground dark:text-white dark:hover:text-white dark:data-[state=on]:text-black"
              >
                <LayoutGrid className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={view === 'table'}
                onPressedChange={() => setView('table')}
                aria-label="Table view"
                className="data-[state=on]:bg-foreground data-[state=on]:text-background hover:text-foreground dark:text-white dark:hover:text-white dark:data-[state=on]:text-black"
              >
                <Table2 className="h-4 w-4" />
              </Toggle>
            </div>
            <Toggle
              pressed={theme === 'dark'}
              onPressedChange={toggleTheme}
              aria-label="Toggle theme"
              className=" hover:text-foreground dark:text-white dark:hover:text-white"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Toggle>
            <select
              className="w-20 h-9 px-2 rounded-md border text-base bg-background"
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">{new Date().getFullYear()}</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
        {user?.role === "agent" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full sm:flex-1 sm:max-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90 dark:text-primary dark:bg-white mb-0 mr-64">
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
                    name="streetName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter street name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter state" maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter ZIP code" maxLength={5} />
                        </FormControl>
                        <FormMessage />
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
                  {user?.role === "agent" && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Client</FormLabel>
                            <FormControl>
                              <select
                                className="w-full h-9 px-3 rounded-md border text-base bg-background"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              >
                                <option value="">Select primary client</option>
                                {clients.map((client: Client) => (
                                  <option key={client.id} value={client.id}>
                                    {client.firstName} {client.lastName}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="secondaryClientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Secondary Client</FormLabel>
                            <FormControl>
                              <select
                                className="w-full h-9 px-3 rounded-md border text-base bg-background"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              >
                                <option value="">Select secondary client</option>
                                {clients.map((client: Client) => (
                                  <option key={client.id} value={client.id}>
                                    {client.firstName} {client.lastName}
                                  </option>
                                ))}
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  <Button type="submit" className="w-full bg-primary text-white hover:bg-primary/90" disabled={createTransactionMutation.isPending}>
                    Create Transaction
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <div className="flex-1 w-full bg-background">
        {view === 'board' ? (
          <div className="min-w-0 py-4">
            <KanbanBoard
              transactions={filteredTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onTransactionClick={(id) => setLocation(`/transactions/${id}`)}
              clients={clients}
            />
          </div>
        ) : view === 'table' ? (
          <div className="px-4">
            <TransactionTable
              transactions={filteredTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onTransactionClick={(id) => setLocation(`/transactions/${id}`)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
            {filteredTransactions.map((transaction: Transaction) => (
              <Card
                key={transaction.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors relative dark:bg-gray-800 w-full min-w-0"
                onClick={() => setLocation(`/transactions/${transaction.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle
                    className="text-lg hover:underline dark:text-white truncate"
                    onClick={() => setLocation(`/transactions/${transaction.id}`)}
                  >
                    {transaction.streetName}
                  </CardTitle>
                  {user?.role === "agent" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTransaction(transaction.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground dark:text-gray-300 capitalize truncate">Status: {transaction.status.replace('_', ' ')}</p>
                  <p className="text-sm text-muted-foreground dark:text-gray-300 break-words">
                    Client: {clients.find((c: Client) => c.id === transaction.clientId)
                      ? `${clients.find((c: Client) => c.id === transaction.clientId)?.firstName} ${clients.find((c: Client) => c.id === transaction.clientId)?.lastName}`
                      : 'Not set'}
                  </p>
                  {transaction.secondaryClient && (
                    <p className="text-sm text-muted-foreground dark:text-gray-300 break-words">
                      Secondary Client: {transaction.secondaryClient.firstName} {transaction.secondaryClient.lastName}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground dark:text-gray-400">
                No transactions found. {user?.role === "agent" ? "Create one to get started!" : "Ask your agent for an access code to join a transaction."}
              </div>
            )}
          </div>
        )}
      </div>

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