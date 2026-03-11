import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type LenderTransaction, type LenderChecklistMapping } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ClipboardCheck,
  FileText,
  MessageSquare,
  RefreshCw,
  ExternalLink,
  DollarSign,
  User,
  Home,
  Landmark,
} from "lucide-react";

const LENDER_STAGES = [
  { value: "invited", label: "Invited" },
  { value: "under_contract", label: "Under Contract" },
  { value: "processing", label: "Processing" },
  { value: "underwriting", label: "Underwriting" },
  { value: "conditions_clearing", label: "Conditions Clearing" },
  { value: "clear_to_close", label: "Clear to Close" },
  { value: "closed", label: "Closed" },
  { value: "on_hold", label: "On Hold" },
];

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    invited: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    under_contract: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
    processing: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    underwriting: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    conditions_clearing: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    clear_to_close: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    closed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  phase: string;
}

interface LenderChecklist {
  id: number;
  lenderTransactionId: number;
  items: ChecklistItem[];
  createdAt: string;
}

export default function LenderTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const parsedId = id ? parseInt(id, 10) : null;
  const [activePhase, setActivePhase] = useState<string>("Invited / Pre-Contract");
  const [notesText, setNotesText] = useState("");

  const { data: transaction, isLoading } = useQuery<LenderTransaction>({
    queryKey: ["/api/lender/transactions", parsedId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lender/transactions/${parsedId}`);
      if (!response.ok) throw new Error("Failed to fetch transaction");
      return response.json();
    },
    enabled: !!parsedId && !!user,
  });

  const { data: checklist } = useQuery<LenderChecklist>({
    queryKey: ["/api/lender/transactions", parsedId, "checklist"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lender/transactions/${parsedId}/checklist`);
      if (!response.ok) throw new Error("Failed to fetch checklist");
      return response.json();
    },
    enabled: !!parsedId && !!user,
  });

  const { data: mappings } = useQuery<LenderChecklistMapping[]>({
    queryKey: ["/api/lender/transactions", parsedId, "checklist", "mappings"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lender/transactions/${parsedId}/checklist/mappings`);
      if (!response.ok) throw new Error("Failed to fetch mappings");
      return response.json();
    },
    enabled: !!parsedId && !!user,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/lender/transactions/${parsedId}`, { status });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/transactions", parsedId] });
      queryClient.invalidateQueries({ queryKey: ["/api/lender/transactions"] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await apiRequest("PATCH", `/api/lender/transactions/${parsedId}`, { notes });
      if (!response.ok) throw new Error("Failed to update notes");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/transactions", parsedId] });
      toast({ title: "Notes saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (updatedItem: ChecklistItem) => {
      const currentItems = checklist?.items || [];
      const updatedItems = currentItems.map((item) =>
        item.id === updatedItem.id ? updatedItem : item
      );
      const response = await apiRequest("PATCH", `/api/lender/transactions/${parsedId}/checklist`, {
        items: updatedItems,
      });
      if (!response.ok) throw new Error("Failed to update checklist");
      return response.json();
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ["/api/lender/transactions", parsedId, "checklist"] });
      const previous = queryClient.getQueryData<LenderChecklist>(["/api/lender/transactions", parsedId, "checklist"]);
      if (previous) {
        queryClient.setQueryData<LenderChecklist>(
          ["/api/lender/transactions", parsedId, "checklist"],
          {
            ...previous,
            items: previous.items.map((item) => (item.id === newItem.id ? newItem : item)),
          }
        );
      }
      return { previous };
    },
    onError: (error, _, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/lender/transactions", parsedId, "checklist"], context.previous);
      }
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update", variant: "destructive" });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/lender/transactions", parsedId, "checklist"], data);
      toast({ title: "Progress updated" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lender/transactions", parsedId, "checklist"] });
    },
  });

  const mappedItemIds = new Set(mappings?.map((m) => m.lenderChecklistItemId) || []);
  const items = checklist?.items || [];
  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const phases = Array.from(new Set(items.map((i) => i.phase)));

  if (!user) {
    return (
      <div className="px-4 sm:px-8 py-6 text-center">
        <p className="text-xl">Please log in to view this transaction.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-4 sm:px-8 py-6 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="px-4 sm:px-8 py-6 text-center">
        <p className="text-xl text-destructive">Transaction not found</p>
        <Link to="/lender-portal">
          <Button variant="outline" className="mt-4">Back to Pipeline</Button>
        </Link>
      </div>
    );
  }

  const stageLabel = LENDER_STAGES.find((s) => s.value === transaction.status)?.label || transaction.status;

  return (
    <main className="w-full px-4 py-8 min-h-screen">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/lender-portal">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{transaction.borrowerName}</h1>
            <Badge className={getStatusColor(transaction.status)}>{stageLabel}</Badge>
          </div>
          <p className="text-muted-foreground">{transaction.propertyAddress || "No property address"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={transaction.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              {LENDER_STAGES.map((stage) => (
                <SelectItem key={stage.value} value={stage.value}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="checklist">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Checklist
          </TabsTrigger>
          <TabsTrigger value="notes">
            <MessageSquare className="h-4 w-4 mr-2" />
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Borrower Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p>{transaction.borrowerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p>{transaction.borrowerEmail || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{transaction.borrowerPhone || "Not provided"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Landmark className="h-5 w-5" />
                  Loan Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Loan Amount</p>
                  <p>
                    {transaction.loanAmount
                      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(transaction.loanAmount)
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Loan Type</p>
                  <p className="capitalize">{transaction.loanType || "Not set"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Interest Rate</p>
                  <p>{transaction.interestRate ? `${transaction.interestRate}%` : "Not set"}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Home className="h-5 w-5" />
                  Property
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Address</p>
                  <p>{transaction.propertyAddress || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge className={getStatusColor(transaction.status)}>{stageLabel}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Linked Agent Transaction
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {transaction.agentTransactionId ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Transaction ID</p>
                      <p>{transaction.agentTransactionId}</p>
                    </div>
                    <Link to={`/transactions/${transaction.agentTransactionId}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        View Agent Transaction
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No linked agent transaction</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg">Loan Progress</CardTitle>
              <Progress value={progress} className="h-2" />
              <div className="text-sm text-muted-foreground">{progress}% complete ({completedCount}/{items.length} items)</div>
              <div className="flex flex-col sm:flex-row gap-2 py-2">
                <select
                  value={activePhase}
                  onChange={(e) => setActivePhase(e.target.value)}
                  className="w-full sm:hidden p-2 rounded-md border bg-background text-sm"
                >
                  {phases.map((phase) => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
                <div className="hidden sm:flex gap-2 overflow-x-auto">
                  {phases.map((phase) => (
                    <button
                      key={phase}
                      onClick={() => setActivePhase(phase)}
                      className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                        activePhase === phase
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted-foreground/10"
                      }`}
                    >
                      {phase}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items
                  .filter((item) => item.phase === activePhase)
                  .map((item) => {
                    const isMapped = mappedItemIds.has(item.id);
                    return (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={item.id}
                          checked={item.completed}
                          onCheckedChange={(checked) => {
                            if (typeof checked === "boolean") {
                              updateChecklistMutation.mutate({ ...item, completed: checked });
                            }
                          }}
                          disabled={updateChecklistMutation.isPending}
                        />
                        <label
                          htmlFor={item.id}
                          className={`text-sm flex-1 cursor-pointer ${item.completed ? "line-through text-muted-foreground" : ""}`}
                        >
                          {item.text}
                        </label>
                        {isMapped && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <RefreshCw className="h-3 w-3" />
                            Synced
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                {items.filter((item) => item.phase === activePhase).length === 0 && (
                  <p className="text-muted-foreground text-sm">No items in this phase.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes & Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add notes about this loan transaction..."
                value={notesText || transaction.notes || ""}
                onChange={(e) => setNotesText(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => updateNotesMutation.mutate(notesText || "")}
                  disabled={updateNotesMutation.isPending}
                >
                  {updateNotesMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>
              {transaction.createdAt && (
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Transaction created: {new Date(transaction.createdAt).toLocaleDateString()}
                  </p>
                  {transaction.updatedAt && (
                    <p className="text-sm text-muted-foreground">
                      Last updated: {new Date(transaction.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
