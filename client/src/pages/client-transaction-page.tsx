import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  CalendarDays,
  DollarSign,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ClipboardList,
} from "lucide-react";
import type { Transaction, Document as TransactionDocument, Checklist } from "@shared/schema";

interface TimelineEvent {
  id: string;
  event: string;
  date: string | null;
  status: "completed" | "on_track" | "approaching" | "warning" | "overdue" | "not_set";
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  message: string;
  daysRemaining: number | null;
  category: "milestone" | "document" | "deadline";
}

interface TransactionTimeline {
  events: TimelineEvent[];
  overallRisk: "low" | "medium" | "high" | "critical";
  summary: string;
}

interface MyTransactionResponse {
  transaction: Transaction;
  documents: TransactionDocument[];
  checklist: Checklist | null;
  timeline: TransactionTimeline | null;
}

const STAGES = [
  { key: "prospect", label: "Prospect" },
  { key: "active_listing_prep", label: "Active Listing Prep" },
  { key: "active", label: "Live Listing" },
  { key: "under_contract", label: "Under Contract" },
  { key: "closed", label: "Closed" },
];

function getStageIndex(status: string): number {
  const idx = STAGES.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "Not set";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

function StageProgress({ status }: { status: string }) {
  const currentIndex = getStageIndex(status);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {STAGES.map((stage, i) => (
          <div key={stage.key} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i <= currentIndex
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-muted-foreground/30"
              }`}
            >
              {i < currentIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-[10px] sm:text-xs mt-1 text-center leading-tight ${
                i <= currentIndex
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-2 bg-muted rounded-full mt-1">
        <div
          className="absolute h-full bg-primary rounded-full transition-all"
          style={{
            width: `${(currentIndex / (STAGES.length - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    complete: { variant: "default", label: "Complete" },
    signed: { variant: "default", label: "Signed" },
    waiting_signatures: { variant: "destructive", label: "Awaiting Signature" },
    waiting_others: { variant: "secondary", label: "Waiting on Others" },
    not_applicable: { variant: "outline", label: "N/A" },
  };
  const config = variants[status] || { variant: "outline" as const, label: status.replace(/_/g, " ") };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function TimelineRiskBadge({ riskLevel }: { riskLevel: string }) {
  const colors: Record<string, string> = {
    none: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[riskLevel] || colors.none}`}>
      {riskLevel}
    </span>
  );
}

export default function ClientTransactionPage() {
  const { data, isLoading } = useQuery<MyTransactionResponse | null>({
    queryKey: ["/api/client/my-transaction"],
  });

  if (isLoading) {
    return (
      <div className="w-full px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data || !data.transaction) {
    return (
      <div className="w-full px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Transaction Found</h2>
              <p className="text-muted-foreground">
                You don't have an assigned transaction yet. Your agent will set one up for you.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { transaction, documents, checklist, timeline } = data;

  const checklistItems = checklist?.items || [];
  const completedItems = checklistItems.filter((item) => item.completed).length;
  const totalItems = checklistItems.length;
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const phases = checklistItems.reduce<Record<string, { total: number; completed: number }>>((acc, item) => {
    if (!acc[item.phase]) acc[item.phase] = { total: 0, completed: 0 };
    acc[item.phase].total++;
    if (item.completed) acc[item.phase].completed++;
    return acc;
  }, {});

  return (
    <main className="w-full px-4 py-8 min-h-screen space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="h-6 w-6" />
          {transaction.streetName}
        </h1>
        <p className="text-muted-foreground">
          {transaction.city}, {transaction.state} {transaction.zipCode}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <StageProgress status={transaction.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Key Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Contract Date</span>
              <span className="text-sm font-medium">{formatDate(transaction.contractExecutionDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Option Period Expires</span>
              <span className="text-sm font-medium">{formatDate(transaction.optionPeriodExpiration)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Closing Date</span>
              <span className="text-sm font-medium">{formatDate(transaction.closingDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Contract Price</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.contractPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Earnest Money</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.earnestMoney)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Option Fee</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.optionFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Down Payment</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.downPayment)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Seller Concessions</span>
              <span className="text-sm font-medium">{formatCurrency(transaction.sellerConcessions)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Financing</span>
              <span className="text-sm font-medium capitalize">{transaction.financing || "Not set"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalItems > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Checklist Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {completedItems} of {totalItems} items complete
                </span>
                <span className="text-sm font-semibold">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(phases).map(([phase, counts]) => (
                <div key={phase} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{phase}</span>
                  <Badge variant={counts.completed === counts.total ? "default" : "secondary"}>
                    {counts.completed}/{counts.total}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {documents && documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      {doc.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Due: {formatDate(doc.deadline)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <DocumentStatusBadge status={doc.status} />
                    {doc.signingUrl && (
                      <a
                        href={doc.signingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Sign
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {timeline && timeline.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timeline
            </CardTitle>
            {timeline.summary && (
              <p className="text-sm text-muted-foreground">{timeline.summary}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.events.map((event: TimelineEvent) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  <div className="mt-0.5">
                    {event.status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : event.status === "warning" || event.status === "overdue" ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{event.event}</span>
                      <TimelineRiskBadge riskLevel={event.riskLevel} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {event.message}
                    </p>
                    {event.date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(event.date)}
                        {event.daysRemaining !== null && event.daysRemaining > 0 && (
                          <> &middot; {event.daysRemaining} day{event.daysRemaining !== 1 ? "s" : ""} remaining</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}