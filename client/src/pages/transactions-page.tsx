import { useAuth } from "@/hooks/use-auth";
import { useActingAs } from "@/App";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Toggle } from "@/components/ui/toggle";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Plus,
  List,
  LayoutGrid,
  Table2,
  Trash2,
  Moon,
  Sun,
  AlertTriangle,
  AlertCircle,
  ChevronRight,
  X,
  FileText,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TransactionTemplate } from "@shared/schema";
import { NavTabs } from "@/components/ui/nav-tabs";
import { KanbanBoard } from "@/components/kanban-board";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { TransactionTable } from "@/components/transaction-table";
import { Transaction as SchemaTransaction } from "@shared/schema";
import { Client } from "@shared/schema";

interface Transaction extends Omit<SchemaTransaction, "updatedAt"> {
  id: number;
  streetName: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  status: string;
  type: "buy" | "sell";
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
  streetName: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  zipCode: z.string().optional().default(""),
  accessCode: z.string().min(6, "Access code must be at least 6 characters"),
  type: z.enum(["buy", "sell"]),
  clientId: z.number().nullable(),
  secondaryClientId: z.number().nullable(),
}).superRefine((data, ctx) => {
  if (data.type === "sell") {
    if (!data.streetName || data.streetName.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Street name is required for listings", path: ["streetName"] });
    }
    if (!data.city || data.city.trim().length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required for listings", path: ["city"] });
    }
    if (!data.state || data.state.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required for listings", path: ["state"] });
    }
    if (!data.zipCode || data.zipCode.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "ZIP code is required for listings", path: ["zipCode"] });
    }
  }
});

function SaveTransactionAsTemplate({
  transactions,
  newTemplateName,
  setNewTemplateName,
}: {
  transactions: Transaction[];
  newTemplateName: string;
  setNewTemplateName: (v: string) => void;
}) {
  const { toast } = useToast();
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  const saveAsTemplateMutation = useMutation({
    mutationFn: async ({ transactionId, name }: { transactionId: number; name: string }) => {
      const response = await apiRequest("POST", `/api/transaction-templates/from-transaction/${transactionId}`, { name });
      if (!response.ok) throw new Error("Failed to save template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transaction-templates"] });
      toast({ title: "Success", description: "Transaction saved as template" });
      setNewTemplateName("");
      setSelectedTxId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-2">
      <select
        className="w-full h-9 px-3 rounded-md border text-sm bg-background"
        value={selectedTxId || ""}
        onChange={(e) => setSelectedTxId(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Select a transaction...</option>
        {transactions.map((tx) => (
          <option key={tx.id} value={tx.id}>
            {(() => {
              const BUYER_ADDRESS_STAGES = new Set(["offer_submitted", "under_contract", "closing"]);
              const showAddress = tx.type !== 'buy' || BUYER_ADDRESS_STAGES.has(tx.status);
              if (showAddress && tx.streetName) return `${tx.streetName} — ${tx.city}, ${tx.state}`;
              return `Transaction #${tx.id}`;
            })()}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Input
          placeholder="Template name"
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          className="flex-1"
        />
        <Button
          size="sm"
          disabled={!selectedTxId || !newTemplateName.trim() || saveAsTemplateMutation.isPending}
          onClick={() => {
            if (selectedTxId && newTemplateName.trim()) {
              saveAsTemplateMutation.mutate({ transactionId: selectedTxId, name: newTemplateName.trim() });
            }
          }}
        >
          {saveAsTemplateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { actingAs } = useActingAs();
  const { toast } = useToast();
  const [view, setView] = useState<"list" | "board" | "table">("board");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(
    localStorage.getItem('theme') === 'dark' ? "dark" : "light",
  );
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showNewTransactionDialog, setShowNewTransactionDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Handle initial authentication check
  useEffect(() => {
    if (!user) {
      console.log("No user found, waiting for auth state...");
      return; // Don't proceed with data fetching
    }
  }, [user]);

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      try {
        if (!user || (user.role !== "agent" && user.role !== "broker")) {
          return [];
        }
        const response = await apiRequest("GET", "/api/clients");
        return response.json();
      } catch (error) {
        console.error("Client fetch error:", error);
        return [];
      }
    },
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on failure
  });

  const effectiveYear = selectedYear ?? new Date().getFullYear();

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<
    Transaction[]
  >({
    queryKey: ["/api/transactions", actingAs?.id, effectiveYear],
    queryFn: async () => {
      try {
        if (!user) {
          return [];
        }
        const params = new URLSearchParams();
        if (actingAs) params.set("actingAs", String(actingAs.id));
        if (effectiveYear) params.set("year", String(effectiveYear));
        const qs = params.toString();
        const url = `/api/transactions${qs ? `?${qs}` : ""}`;
        const response = await apiRequest("GET", url);
        return response.json();
      } catch (error) {
        console.error("Transaction fetch error:", error);
        return [];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  interface AlertEvent {
    id: string;
    event: string;
    date: string | null;
    status: string;
    riskLevel: "none" | "low" | "medium" | "high" | "critical";
    message: string;
    daysRemaining: number | null;
    category: string;
  }

  interface TransactionAlert {
    transactionId: number;
    streetName: string;
    alerts: AlertEvent[];
  }

  const { data: alertsData = [], isLoading: alertsLoading } = useQuery<TransactionAlert[]>({
    queryKey: ["/api/alerts"],
    queryFn: async () => {
      try {
        if (!user || (user.role !== "agent" && user.role !== "broker")) return [];
        const response = await apiRequest("GET", "/api/alerts");
        return response.json();
      } catch {
        return [];
      }
    },
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<TransactionTemplate[]>({
    queryKey: ["/api/transaction-templates"],
    queryFn: async () => {
      try {
        if (!user || (user.role !== "agent" && user.role !== "broker")) return [];
        const response = await apiRequest("GET", "/api/transaction-templates");
        return response.json();
      } catch {
        return [];
      }
    },
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/transaction-templates/${id}`);
      if (!response.ok) throw new Error("Failed to delete template");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transaction-templates"] });
      toast({ title: "Success", description: "Template deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async ({ templateId, data }: { templateId: number; data: z.infer<typeof createTransactionSchema> }) => {
      const isBuyer = data.type === "buy";
      const response = await apiRequest("POST", `/api/transactions/from-template/${templateId}`, {
        streetName: data.streetName?.trim() || (isBuyer ? null : data.streetName),
        city: data.city?.trim() || (isBuyer ? null : data.city),
        state: data.state?.trim() || (isBuyer ? null : data.state),
        zipCode: data.zipCode?.trim() || (isBuyer ? null : data.zipCode),
        clientId: data.clientId || null,
        accessCode: data.accessCode,
      });
      if (!response.ok) throw new Error("Failed to create transaction from template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({ title: "Success", description: "Transaction created from template" });
      form.reset();
      setShowNewTransactionDialog(false);
      setSelectedTemplateId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create transaction from template", variant: "destructive" });
    },
  });

  const [alertsDismissed, setAlertsDismissed] = useState(false);

  const totalAlerts = alertsData.reduce((sum, t) => sum + t.alerts.length, 0);
  const criticalCount = alertsData.reduce((sum, t) => sum + t.alerts.filter(a => a.riskLevel === "critical").length, 0);
  const highCount = alertsData.reduce((sum, t) => sum + t.alerts.filter(a => a.riskLevel === "high").length, 0);
  const mediumCount = alertsData.reduce((sum, t) => sum + t.alerts.filter(a => a.riskLevel === "medium").length, 0);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createTransactionSchema>) => {
      const isBuyer = data.type === "buy";
      const response = await apiRequest("POST", "/api/transactions", {
        ...data,
        streetName: data.streetName?.trim() || (isBuyer ? null : data.streetName),
        city: data.city?.trim() || (isBuyer ? null : data.city),
        state: data.state?.trim() || (isBuyer ? null : data.state),
        zipCode: data.zipCode?.trim() || (isBuyer ? null : data.zipCode),
        agentId: user?.id,
        status: isBuyer ? "qualified_buyer" : "prospect",
        participants: [],
        clientId: data.clientId || null,
        secondaryClientId: data.secondaryClientId || null,
        year: new Date().getFullYear(),
      });
      if (!response.ok) {
        throw new Error("Failed to create transaction");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: "Transaction created successfully",
      });
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
        throw new Error("Failed to delete transaction");
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
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle("dark");
  };

  const handleDeleteTransaction = (id: number) => {
    if (user?.role === "agent" || user?.role === "broker") {
      setDeleteId(id);
    }
  };

  const filteredTransactions = transactions.filter(
    (transaction: Transaction) => {
      const transactionDate = transaction.createdAt
        ? new Date(transaction.createdAt)
        : new Date();
      const startDateMatch =
        startDate === "" || transactionDate >= new Date(startDate);
      const endDateMatch =
        endDate === "" || transactionDate <= new Date(endDate);
      return startDateMatch && endDateMatch;
    },
  );

  const isMobile = useIsMobile();

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
      secondaryClientId: null as number | null,
    },
  });

  return (
    <div className="flex-1 min-w-0 px-4 sm:px-8 overflow-x-hidden">
      <div className="w-full flex flex-wrap bg-background relative px-2 py-8">
        <div className="flex flex-col sm:flex-row w-full sm:items-center justify-between gap-2 mb-2">
          <h2 className="text-2xl font-bold">
            Your Transactions
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg">
              <Toggle
                pressed={view === "list"}
                onPressedChange={() => setView("list")}
                aria-label="List view"
                className="data-[state=on]:bg-foreground data-[state=on]:text-background hover:text-foreground"
              >
                <List className="h-4" />
              </Toggle>
              <Toggle
                pressed={view === "board"}
                onPressedChange={() => setView("board")}
                aria-label="Board view"
                className="data-[state=on]:bg-foreground data-[state=on]:text-background hover:text-foreground"
              >
                <LayoutGrid className="h-4 w-4" />
              </Toggle>
              <Toggle
                pressed={view === "table"}
                onPressedChange={() => setView("table")}
                aria-label="Table view"
                className="data-[state=on]:bg-foreground data-[state=on]:text-background hover:text-foreground"
              >
                <Table2 className="h-4 w-4" />
              </Toggle>
            </div>
            <Toggle
              pressed={theme === "dark"}
              onPressedChange={toggleTheme}
              aria-label="Toggle theme"
              className="hover:text-foreground"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Toggle>
            <select
              className="w-20 h-9 px-2 rounded-md border text-base bg-background"
              value={selectedYear || ""}
              onChange={(e) =>
                setSelectedYear(
                  e.target.value ? parseInt(e.target.value, 10) : null,
                )
              }
            >
              <option value="">{new Date().getFullYear()}</option>
              {Array.from(
                { length: 10 },
                (_, i) => new Date().getFullYear() - i,
              ).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {(user?.role === "agent" || user?.role === "broker") && (
              <>
              <Button
                variant="outline"
                size="sm"
                className="whitespace-nowrap"
                onClick={() => setShowTemplatesDialog(true)}
              >
                <FileText className="h-4 w-4 mr-1" />
                Templates
              </Button>
              <Dialog open={showNewTransactionDialog} onOpenChange={(open) => {
                setShowNewTransactionDialog(open);
                if (!open) setSelectedTemplateId(null);
              }}>
                <DialogTrigger asChild>
                  <Button className="whitespace-nowrap bg-primary text-primary-foreground hover:bg-primary/90 font-bold" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Transaction
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Transaction</DialogTitle>
                  </DialogHeader>
                  {templates.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From Template</label>
                      <select
                        className="w-full h-9 px-3 rounded-md border text-base bg-background"
                        value={selectedTemplateId || ""}
                        onChange={(e) => {
                          const id = e.target.value ? Number(e.target.value) : null;
                          setSelectedTemplateId(id);
                          if (id) {
                            const tmpl = templates.find(t => t.id === id);
                            if (tmpl) {
                              form.setValue("type", tmpl.type as "buy" | "sell");
                            }
                          }
                        }}
                      >
                        <option value="">Start from scratch</option>
                        {templates.map((tmpl) => (
                          <option key={tmpl.id} value={tmpl.id}>
                            {tmpl.name} ({tmpl.type})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit((data) => {
                        if (selectedTemplateId) {
                          createFromTemplateMutation.mutate({ templateId: selectedTemplateId, data });
                        } else {
                          createTransactionMutation.mutate(data);
                        }
                      })}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Transaction Type</FormLabel>
                            <FormControl>
                              <select
                                className="w-full h-9 px-3 rounded-md border text-base bg-background"
                                value={field.value}
                                onChange={(e) =>
                                  field.onChange(e.target.value as "buy" | "sell")
                                }
                              >
                                <option value="buy">Buy</option>
                                <option value="sell">Sell</option>
                              </select>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {(user?.role === "agent" || user?.role === "broker") && (
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  {form.watch("type") === "buy" ? "Buyer Client" : "Primary Client"}
                                  {form.watch("type") === "buy" && <span className="text-destructive ml-1">*</span>}
                                </FormLabel>
                                <FormControl>
                                  <select
                                    className={cn(
                                      "w-full h-9 px-3 rounded-md border text-base bg-background",
                                      form.watch("type") === "buy" && "ring-2 ring-primary/20 border-primary/50"
                                    )}
                                    value={field.value || ""}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      )
                                    }
                                  >
                                    <option value="">
                                      {form.watch("type") === "buy" ? "Select buyer client" : "Select primary client"}
                                    </option>
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
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      )
                                    }
                                  >
                                    <option value="">
                                      Select secondary client
                                    </option>
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
                      {form.watch("type") === "buy" && (
                        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2">
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Address fields will become available once the transaction reaches the "Offer Submitted" stage.
                          </p>
                        </div>
                      )}
                      {form.watch("type") !== "buy" && (
                        <>
                          <FormField
                            control={form.control}
                            name="streetName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Street Name
                                  <span className="text-destructive ml-1">*</span>
                                </FormLabel>
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
                                <FormLabel>
                                  City
                                  <span className="text-destructive ml-1">*</span>
                                </FormLabel>
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
                                <FormLabel>
                                  State
                                  <span className="text-destructive ml-1">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter state"
                                    maxLength={2}
                                  />
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
                                <FormLabel>
                                  ZIP Code
                                  <span className="text-destructive ml-1">*</span>
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Enter ZIP code"
                                    maxLength={5}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      <FormField
                        control={form.control}
                        name="accessCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Passkey</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="text"
                                placeholder="Enter passkey (min. 6 characters)"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full bg-primary text-white hover:bg-primary/90"
                        disabled={createTransactionMutation.isPending || createFromTemplateMutation.isPending}
                      >
                        {(createTransactionMutation.isPending || createFromTemplateMutation.isPending) && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        {selectedTemplateId ? "Create from Template" : "Create Transaction"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              </>
            )}
          </div>
        </div>
        
        {(user?.role === "agent" || user?.role === "broker") && !alertsDismissed && totalAlerts > 0 && (
          <div className="w-full mt-4">
            <div className={cn(
              "rounded-lg border p-4",
              criticalCount > 0 ? "border-red-500/50 bg-red-50 dark:bg-red-950/20" :
              highCount > 0 ? "border-orange-500/50 bg-orange-50 dark:bg-orange-950/20" :
              "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20"
            )}>
              <div className="flex flex-wrap items-start sm:items-center justify-between gap-2 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {criticalCount > 0 ? (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
                  )}
                  <span className="font-semibold text-sm">
                    {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""} across {alertsData.length} transaction{alertsData.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {criticalCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-300">
                        {criticalCount} overdue
                      </span>
                    )}
                    {highCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-300">
                        {highCount} urgent
                      </span>
                    )}
                    {mediumCount > 0 && (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-300">
                        {mediumCount} approaching
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAlertsDismissed(true)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {alertsData.map((txAlert) => (
                  <div
                    key={txAlert.transactionId}
                    className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2 cursor-pointer hover:bg-background/80 transition-colors"
                    onClick={() => setLocation(`/transactions/${txAlert.transactionId}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{txAlert.streetName || `Transaction #${txAlert.transactionId}`}</p>
                      <p className="text-muted-foreground text-xs truncate">
                        {txAlert.alerts.length} alert{txAlert.alerts.length !== 1 ? "s" : ""}:
                        {" "}{txAlert.alerts.map(a => a.message).join("; ")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="flex-1 w-full bg-background">
        {view === "board" ? (
          <div className="min-w-0 py-4">
            <KanbanBoard
              transactions={filteredTransactions}
              onDeleteTransaction={handleDeleteTransaction}
              onTransactionClick={(id) => setLocation(`/transactions/${id}`)}
              clients={clients}
            />
          </div>
        ) : view === "table" ? (
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
                className="cursor-pointer hover:bg-accent/50 transition-colors relative w-full min-w-0"
                onClick={() => setLocation(`/transactions/${transaction.id}`)}
              >
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle
                    className="text-lg hover:underline truncate"
                    onClick={() =>
                      setLocation(`/transactions/${transaction.id}`)
                    }
                  >
                    {(() => {
                      const BUYER_ADDRESS_STAGES = new Set(["offer_submitted", "under_contract", "closing"]);
                      const showAddress = transaction.type !== 'buy' || BUYER_ADDRESS_STAGES.has(transaction.status);
                      if (!showAddress) return transaction.client ? `${transaction.client.firstName} ${transaction.client.lastName}` : `Transaction #${transaction.id}`;
                      return transaction.streetName || (transaction.client ? `${transaction.client.firstName} ${transaction.client.lastName}` : `Transaction #${transaction.id}`);
                    })()}
                  </CardTitle>
                  {(user?.role === "agent" || user?.role === "broker") && (
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
                  <p className="text-sm text-muted-foreground capitalize">
                    Status: {transaction.status.replace("_", " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Client:{" "}
                    {transaction.client
                      ? `${transaction.client.firstName} ${transaction.client.lastName}`
                      : "Not set"}
                  </p>
                  {transaction.secondaryClient && (
                    <p className="text-sm text-muted-foreground">
                      Secondary Client: {transaction.secondaryClient.firstName}{" "}
                      {transaction.secondaryClient.lastName}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No transactions found.{" "}
                {(user?.role === "agent" || user?.role === "broker") ? (
                  <div className="mt-4">
                    <Button onClick={() => setShowNewTransactionDialog(true)}>
                      New Transaction
                    </Button>
                  </div>
                ) : (
                  "Ask your agent for an access code to join a transaction."
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone and all associated documents, signing links, notes, and checklist data will be permanently removed.
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

      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Transaction Templates
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {templatesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No templates saved yet. Save a transaction as a template from the transaction detail page.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2.5 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-sm truncate">{tmpl.name}</span>
                      <Badge variant={tmpl.type === "sell" ? "destructive" : "default"} className="shrink-0 text-[10px] px-1.5 py-0">
                        {tmpl.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      disabled={deleteTemplateMutation.isPending}
                      onClick={() => deleteTemplateMutation.mutate(tmpl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Save Transaction as Template</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Select a transaction and give it a name to save as a reusable template.
              </p>
              <SaveTransactionAsTemplate
                transactions={transactions}
                newTemplateName={newTemplateName}
                setNewTemplateName={setNewTemplateName}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}