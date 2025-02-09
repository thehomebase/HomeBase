import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, Home } from "lucide-react";
import { useLocation } from "wouter";
import { Transaction } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  console.log("TransactionPage mounted, ID:", id);

  // Simplified query with default/fallback data
  const { data: transaction } = useQuery<Transaction>({
    queryKey: ["/api/transactions", id],
    enabled: !!id,
    placeholderData: {
      id: Number(id),
      address: '123 Easy Street',
      accessCode: '123456',
      status: 'active',
      agentId: 1,
      participants: []
    }
  });

  console.log("Current transaction data:", transaction);

  // Basic layout that will always render
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <Home className="h-6 w-6" />
                  {transaction?.address || 'Loading address...'}
                </CardTitle>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className={getStatusColor(transaction?.status || "pending")}>
                    {transaction?.status || 'pending'}
                  </Badge>
                  {user?.role === "agent" && (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500">
                      Access Code: {transaction?.accessCode}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p>Transaction ID: {id}</p>
                  <p>Status: {transaction?.status}</p>
                  <p>Participants: {transaction?.participants?.length || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transaction Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  View Participants
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-500/10 text-green-500";
    case "pending":
      return "bg-yellow-500/10 text-yellow-500";
    case "completed":
      return "bg-blue-500/10 text-blue-500";
    default:
      return "bg-gray-500/10 text-gray-500";
  }
};