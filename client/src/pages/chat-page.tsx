import { useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Chat } from "@/components/chat";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Transaction } from "@shared/schema";

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const transactionId = id ? parseInt(id) : null;

  const { data: transaction, isLoading: isLoadingTransaction } = useQuery<Transaction>({
    queryKey: ["/api/transactions", transactionId],
    queryFn: async () => {
      if (!transactionId) throw new Error("Transaction ID is required");
      const response = await apiRequest("GET", `/api/transactions/${transactionId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch transaction");
      }
      return response.json();
    },
    enabled: !!transactionId && !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xl">Please log in to access the chat.</p>
        </div>
      </div>
    );
  }

  if (!transactionId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xl">Invalid transaction ID.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Transaction Chat</h1>
          {transaction && (
            <p className="text-muted-foreground">
              {transaction.address}
            </p>
          )}
        </div>
      </div>

      {isLoadingTransaction ? (
        <div className="flex items-center justify-center h-[600px]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <Chat transactionId={transactionId} />
      )}
    </main>
  );
}