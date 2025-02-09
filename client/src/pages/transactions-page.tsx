import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import { NavTabs } from "@/components/ui/nav-tabs";

interface Transaction {
  id: number;
  address: string;
  status: string;
  participants: any[];
}

const createTransactionSchema = z.object({
  address: z.string().min(1),
  accessCode: z.string().min(6),
});

export default function TransactionsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const form = useForm({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: { address: "", accessCode: "" },
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createTransactionSchema>) => {
      await apiRequest("POST", "/api/transactions", {
        ...data,
        agentId: user?.id,
        status: "active",
        participants: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
    },
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Your Transactions</h2>
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
                          <Input {...field} />
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
                        <FormLabel>Access Code</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Min. 6 characters" />
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {transactions.map((transaction) => (
          <Card 
            key={transaction.id} 
            className="cursor-pointer hover:bg-accent/50 transition-colors" 
            onClick={() => setLocation(`/transaction/${transaction.id}`)}
          >
            <CardHeader>
              <CardTitle className="text-lg">{transaction.address}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Status: {transaction.status}</p>
              <p className="text-sm text-muted-foreground">
                Participants: {transaction.participants.length}
              </p>
            </CardContent>
          </Card>
        ))}

        {transactions.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No transactions found. {user?.role === "agent" ? "Create one to get started!" : "Ask your agent for an access code to join a transaction."}
          </div>
        )}
      </div>
    </main>
  );
}