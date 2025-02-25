import React from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressChecklist } from "@/components/progress-checklist";
import { DocumentChecklist } from "@/components/document-checklist";
import { TransactionContacts } from "@/components/transaction-contacts";
import { ArrowLeft, Pencil, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";


interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  phase?: string;
}

interface Transaction {
  id: number;
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  address: string;
  status: string;
  contractPrice?: number;
  optionPeriodExpiration?: string;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
  contractExecutionDate?: string;
  mlsNumber?: string;
  financing?: string;
  checklist?: Array<ChecklistItem>;
  type: 'buy' | 'sell';
  client?: {
    firstName: string;
    lastName: string;
    id: number;
  };
  secondaryClient?: {
    firstName: string;
    lastName: string;
  };
  accessCode?: string;
}

interface TransactionFormData {
  streetName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  address?: string;
  contractPrice?: number;
  optionPeriodExpiration?: string;
  optionFee?: number;
  earnestMoney?: number;
  downPayment?: number;
  sellerConcessions?: number;
  closingDate?: string;
  contractExecutionDate?: string;
  mlsNumber?: string;
  financing?: string;
  status?: string;
  clientId?: number;
}

export default function TransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const parsedId = id ? parseInt(id, 10) : null;

  const [isEditing, setIsEditing] = React.useState(false);
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });
  const form = useForm<TransactionFormData>();

  const { data: transaction, isError, isLoading } = useQuery({
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

  const updateTransaction = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      if (!parsedId || isNaN(parsedId)) {
        throw new Error("Invalid transaction ID");
      }

      const formatDateForAPI = (dateStr: string | undefined) => {
        if (!dateStr) return null;
        try {
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return null;
          return date.toISOString();
        } catch (error) {
          console.error('Date formatting error:', error);
          return null;
        }
      };

      const formattedData = {
        streetName: data.streetName?.trim(),
        city: data.city?.trim(),
        state: data.state?.trim(),
        zipCode: data.zipCode?.trim(),
        address: data.address?.trim(),
        contractPrice: data.contractPrice ? Number(data.contractPrice) : null,
        optionPeriodExpiration: formatDateForAPI(data.optionPeriodExpiration),
        optionFee: data.optionFee ? Number(data.optionFee) : null,
        earnestMoney: data.earnestMoney ? Number(data.earnestMoney) : null,
        downPayment: data.downPayment ? Number(data.downPayment) : null,
        sellerConcessions: data.sellerConcessions ? Number(data.sellerConcessions) : null,
        closingDate: formatDateForAPI(data.closingDate),
        contractExecutionDate: formatDateForAPI(data.contractExecutionDate),
        mlsNumber: data.mlsNumber?.trim() || null,
        financing: data.financing || null,
        status: data.status || transaction?.status || 'prospect',
        clientId: data.clientId || null
      };

      const cleanData = Object.fromEntries(
        Object.entries(formattedData).filter(([_, value]) => value !== undefined)
      );

      const response = await apiRequest("PATCH", `/api/transactions/${parsedId}`, cleanData);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: (updatedData) => {
      queryClient.setQueryData(["/api/transactions", parsedId], updatedData);
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", parsedId] });
      console.log("Transaction updated successfully:", updatedData);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    },
    onError: (error) => {
      console.error('Transaction update error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update transaction",
        variant: "destructive",
      });
    }
  });

  React.useEffect(() => {
    if (transaction) {
      const formatDateForInput = (dateString: string | null | undefined) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      };

      form.reset({
        streetName: transaction.streetName,
        city: transaction.city,
        state: transaction.state,
        zipCode: transaction.zipCode,
        address: transaction.address,
        contractPrice: transaction.contractPrice,
        optionPeriodExpiration: formatDateForInput(transaction.optionPeriodExpiration),
        optionFee: transaction.optionFee,
        earnestMoney: transaction.earnestMoney,
        downPayment: transaction.downPayment,
        sellerConcessions: transaction.sellerConcessions,
        closingDate: formatDateForInput(transaction.closingDate),
        contractExecutionDate: formatDateForInput(transaction.contractExecutionDate),
        mlsNumber: transaction.mlsNumber,
        financing: transaction.financing,
        status: transaction.status,
        clientId: transaction.client?.id
      });
    }
  }, [transaction, form]);

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-xl text-destructive">Please log in to access this page.</p>
        <Link href="/transactions">
          <Button variant="outline" className="mt-4">Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  if (!parsedId || isNaN(parsedId)) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-xl text-destructive">Invalid transaction ID</p>
        <Link href="/transactions">
          <Button variant="outline" className="mt-4">Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !transaction) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-xl text-destructive">Error loading transaction</p>
        <Link href="/transactions">
          <Button variant="outline" className="mt-4">Back to Transactions</Button>
        </Link>
      </div>
    );
  }

  const fullAddress = `${transaction.streetName || ''}, ${transaction.city || ''}, ${transaction.state || ''} ${transaction.zipCode || ''}`;

  return (
    <div className="container mx-auto p-4">
      <header className="">
        <div className="w-full px-3 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center gap-4">
            <Link href="/transactions">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              {isEditing ? (
                <div className="grid gap-2">
                  <Input
                    type="text"
                    {...form.register("streetName")}
                    defaultValue={transaction.streetName}
                    placeholder="Street Name"
                    className="text-xl font-bold mb-1 w-full"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="text"
                      {...form.register("city")}
                      defaultValue={transaction.city}
                      placeholder="City"
                    />
                    <Input
                      type="text"
                      {...form.register("state")}
                      defaultValue={transaction.state}
                      placeholder="State"
                    />
                    <Input
                      type="text"
                      {...form.register("zipCode")}
                      defaultValue={transaction.zipCode}
                      placeholder="Zip Code"
                    />
                  </div>
                </div>
              ) : (
                <h1 className="text-2xl font-bold">{fullAddress}</h1>
              )}
              <p className="text-muted-foreground">Transaction ID: {parsedId}</p>
              <div className="text-muted-foreground">
                {transaction.client ? (
                  <p>Primary Client: {transaction.client.firstName} {transaction.client.lastName}</p>
                ) : null}
                {transaction.secondaryClient ? (
                  <p>Secondary Client: {transaction.secondaryClient.firstName} {transaction.secondaryClient.lastName}</p>
                ) : null}
              </div>
            </div>
            {user.role === 'agent' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Details
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="w-screen lg:max-w-[calc(100vw-230px)] md:max-w-[calc(100vw-230px)] sm:max-w-[calc(100vw-70px)] xs:max-w-[calc(100vw-10px)] pr-24 max-w-full">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Details</CardTitle>
              <CardDescription>Key information about this transaction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="contractPrice">Contract Price</Label>
                    <Input type="number" {...form.register("contractPrice")} />
                  </div>
                  <div>
                    <Label htmlFor="optionPeriodExpiration">Option Expiration Date</Label>
                    <Input type="date" {...form.register("optionPeriodExpiration")} />
                  </div>
                  <div>
                    <Label htmlFor="optionFee">Option Fee</Label>
                    <Input type="number" {...form.register("optionFee")} />
                  </div>
                  <div>
                    <Label htmlFor="earnestMoney">Earnest Money</Label>
                    <Input type="number" {...form.register("earnestMoney")} />
                  </div>
                  <div>
                    <Label htmlFor="downPayment">Down Payment</Label>
                    <Input type="number" {...form.register("downPayment")} />
                  </div>
                  <div>
                    <Label htmlFor="sellerConcessions">Seller Concessions</Label>
                    <Input type="number" {...form.register("sellerConcessions")} />
                  </div>
                  <div>
                    <Label htmlFor="closingDate">Closing Date</Label>
                    <Input type="date" {...form.register("closingDate")} />
                  </div>
                  <div>
                    <Label htmlFor="contractExecutionDate">Contract Execution Date</Label>
                    <Input type="date" {...form.register("contractExecutionDate")} />
                  </div>
                  <div>
                    <Label htmlFor="mlsNumber">MLS No.</Label>
                    <Input type="text" {...form.register("mlsNumber")} />
                  </div>
                  <div>
                    <Label htmlFor="financing">Financing</Label>
                    <select {...form.register("financing")}>
                      <option value="">Select financing type</option>
                      <option value="FHA">FHA</option>
                      <option value="VA">VA</option>
                      <option value="Conventional">Conventional</option>
                      <option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="clientId">Primary Client</Label>
                    <select {...form.register("clientId")}>
                      <option value="">Select client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <select {...form.register("status")}>
                      <option value="coming_soon">Coming Soon</option>
                      <option value="active">Active</option>
                      <option value="active_option">Active Option Contract</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                      <option value="withdrawn">Withdrawn</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  <Button type="button" onClick={form.handleSubmit(handleSubmit)}>Save Changes</Button>

                </>
              ) : (
                <>
                  <div>
                    <strong>Status:</strong> {transaction.status}
                  </div>
                  <div>
                    <strong>Contract Price:</strong>
                    {transaction.contractPrice
                      ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(transaction.contractPrice)
                      : "Not set"}
                  </div>
                  <div>
                    <strong>Access Code:</strong> {transaction.accessCode}
                  </div>
                  {transaction.closingDate && (
                    <div>
                      <strong>Closing Date:</strong>
                      {new Date(transaction.closingDate).toLocaleDateString()}
                    </div>
                  )}
                  {transaction.mlsNumber && (
                    <div>
                      <strong>MLS Number:</strong> {transaction.mlsNumber}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <TransactionContacts transaction={transaction} />

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress Checklist</CardTitle>
                <CardDescription>Track transaction milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <ProgressChecklist transactionId={transaction.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documents</CardTitle>
                <CardDescription>Manage transaction documents</CardDescription>
              </CardHeader>
              <CardContent>
                <DocumentChecklist transactionId={transaction.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}