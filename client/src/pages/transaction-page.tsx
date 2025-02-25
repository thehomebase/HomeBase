import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardCheck, FileText, UserPlus, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { type Transaction } from "@shared/schema";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const parsedId = id ? parseInt(id, 10) : null;

  const { data: transaction, isLoading } = useQuery<Transaction>({
    queryKey: ["/api/transactions", parsedId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/transactions/${parsedId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      return response.json();
    },
    enabled: !!parsedId && !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xl">Please log in to view this transaction.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-xl text-destructive">Transaction not found</p>
          <Link to="/transactions">
            <Button variant="outline" className="mt-4">
              Back to Transactions
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/transactions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {transaction.streetName}
          </h1>
          <p className="text-muted-foreground">
            {transaction.city}, {transaction.state} {transaction.zipCode}
          </p>
          <p className="text-sm text-muted-foreground">Transaction ID: {transaction.id}</p>
        </div>
      </div>

      <Card className="mb-6 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-lg capitalize">{transaction.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Type</p>
              <p className="text-lg capitalize">{transaction.type}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contract Price</p>
              <p className="text-lg">
                {transaction.contractPrice
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.contractPrice)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Contract Date</p>
              <p className="text-lg">
                {transaction.contractExecutionDate
                  ? new Date(transaction.contractExecutionDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Option Period Expiration</p>
              <p className="text-lg">
                {transaction.optionPeriodExpiration
                  ? new Date(transaction.optionPeriodExpiration).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Option Fee</p>
              <p className="text-lg">
                {transaction.optionFee
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.optionFee)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Earnest Money</p>
              <p className="text-lg">
                {transaction.earnestMoney
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.earnestMoney)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Down Payment</p>
              <p className="text-lg">
                {transaction.downPayment
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.downPayment)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Seller Concessions</p>
              <p className="text-lg">
                {transaction.sellerConcessions
                  ? new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(transaction.sellerConcessions)
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Closing Date</p>
              <p className="text-lg">
                {transaction.closingDate
                  ? new Date(transaction.closingDate).toLocaleDateString()
                  : 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">MLS Number</p>
              <p className="text-lg">{transaction.mlsNumber || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Financing</p>
              <p className="text-lg capitalize">{transaction.financing || 'Not set'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList>
          <TabsTrigger value="progress">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="contacts">
            <UserPlus className="h-4 w-4 mr-2" />
            Contacts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <ProgressChecklist transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentChecklist transactionId={parsedId} />
        </TabsContent>

        <TabsContent value="contacts">
          <TransactionContacts transactionId={parsedId} />
        </TabsContent>
      </Tabs>
    </main>
  );
}