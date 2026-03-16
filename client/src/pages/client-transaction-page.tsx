import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Home, CalendarDays, DollarSign, FileText, Clock, CheckCircle2,
  AlertCircle, ExternalLink, ClipboardList, ChevronDown, ChevronUp,
  MessageSquare, Phone, Mail, User, Shield, MapPin, Timer,
  PenTool, AlertTriangle, PartyPopper, Users,
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

interface AgentInfo {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
  role: string;
}

interface ContactInfo {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  company: string;
}

interface PendingAction {
  type: "signature" | "checklist" | "deadline";
  title: string;
  priority: "high" | "medium" | "low";
  items?: any[];
  count?: number;
}

interface MyTransactionResponse {
  transaction: Transaction;
  documents: TransactionDocument[];
  checklist: Checklist | null;
  timeline: TransactionTimeline | null;
  agent: AgentInfo | null;
  contacts: ContactInfo[];
  pendingActions: PendingAction[];
}

const BUYER_STAGES = [
  { key: "qualified_buyer", label: "Qualified", icon: User },
  { key: "active_search", label: "Searching", icon: Home },
  { key: "offer_submitted", label: "Offer Made", icon: FileText },
  { key: "under_contract", label: "Under Contract", icon: Shield },
  { key: "closing", label: "Closing", icon: PartyPopper },
];

const SELLER_STAGES = [
  { key: "prospect", label: "Prospect", icon: User },
  { key: "active_listing_prep", label: "Prep", icon: ClipboardList },
  { key: "live_listing", label: "Listed", icon: Home },
  { key: "under_contract", label: "Under Contract", icon: Shield },
  { key: "closed", label: "Closed", icon: PartyPopper },
];

function getStagesForType(type: string) {
  return type === 'buy' ? BUYER_STAGES : SELLER_STAGES;
}

function getStageIndex(status: string, type: string): number {
  const stages = getStagesForType(type);
  const idx = stages.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function formatCurrency(value: number | null | undefined): string {
  if (!value) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(date);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function ClosingCountdown({ closingDate }: { closingDate: Date | string | null | undefined }) {
  const days = daysUntil(closingDate);
  if (days === null) return null;

  if (days < 0) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
          <PartyPopper className="h-5 w-5" />
          <span className="font-semibold">Transaction Complete!</span>
        </div>
      </div>
    );
  }

  const urgency = days <= 3 ? "text-red-600 dark:text-red-400" : days <= 7 ? "text-amber-600 dark:text-amber-400" : days <= 14 ? "text-blue-600 dark:text-blue-400" : "text-primary";
  const bgUrgency = days <= 3 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : days <= 7 ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" : "bg-primary/5 border-primary/20";

  return (
    <div className={`rounded-2xl border-2 ${bgUrgency} p-6 text-center`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Days Until Closing</p>
      <p className={`text-5xl md:text-6xl font-bold tracking-tight ${urgency}`}>{days}</p>
      <p className="text-sm text-muted-foreground mt-1">{formatDate(closingDate)}</p>
    </div>
  );
}

function StageTracker({ status, type }: { status: string; type: string }) {
  const stages = getStagesForType(type);
  const currentIndex = getStageIndex(status, type);

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {stages.map((stage, i) => {
          const StageIcon = stage.icon;
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={stage.key} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
              <div
                className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 text-white shadow-md shadow-green-500/30"
                    : isCurrent
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/40 ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <StageIcon className="h-5 w-5" />}
              </div>
              <span className={`text-[10px] md:text-xs mt-2 text-center leading-tight font-medium ${
                isCompleted ? "text-green-600 dark:text-green-400" : isCurrent ? "text-primary" : "text-muted-foreground"
              }`}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="absolute top-5 md:top-6 left-[10%] right-[10%] h-1 bg-muted rounded-full -z-0">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${(currentIndex / (stages.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

function ActionCard({ action }: { action: PendingAction }) {
  const isHigh = action.priority === "high";
  const bgColor = isHigh
    ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
    : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800";
  const iconColor = isHigh ? "text-red-500" : "text-amber-500";

  const Icon = action.type === "signature" ? PenTool : action.type === "deadline" ? AlertTriangle : ClipboardList;

  return (
    <div className={`rounded-xl border ${bgColor} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`${iconColor} mt-0.5`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{action.title}</p>
          {action.type === "signature" && action.items && (
            <div className="mt-2 space-y-1.5">
              {action.items.map((item: any) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                >
                  <PenTool className="h-3.5 w-3.5" />
                  {item.name}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ))}
            </div>
          )}
          {action.type === "deadline" && action.items && (
            <div className="mt-2 space-y-1">
              {action.items.map((item: any, idx: number) => (
                <p key={idx} className="text-xs text-muted-foreground">
                  {item.event} — <span className={item.status === "overdue" ? "text-red-600 font-medium" : "text-amber-600"}>
                    {item.daysRemaining !== null ? (item.daysRemaining < 0 ? `${Math.abs(item.daysRemaining)} days overdue` : `${item.daysRemaining} day${item.daysRemaining !== 1 ? 's' : ''} left`) : ""}
                  </span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const statusConfig: Record<string, { dot: string; line: string }> = {
    completed: { dot: "bg-green-500 ring-green-500/30", line: "bg-green-500" },
    on_track: { dot: "bg-blue-500 ring-blue-500/30", line: "bg-muted" },
    approaching: { dot: "bg-amber-500 ring-amber-500/30 animate-pulse", line: "bg-muted" },
    warning: { dot: "bg-orange-500 ring-orange-500/30 animate-pulse", line: "bg-muted" },
    overdue: { dot: "bg-red-500 ring-red-500/30 animate-pulse", line: "bg-muted" },
    not_set: { dot: "bg-muted-foreground/30 ring-muted/50", line: "bg-muted" },
  };

  const config = statusConfig[event.status] || statusConfig.not_set;
  const CategoryIcon = event.category === "milestone" ? CheckCircle2 : event.category === "document" ? FileText : Timer;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full ring-4 ${config.dot} flex-shrink-0`} />
        {!isLast && <div className={`w-0.5 flex-1 mt-1 ${config.line}`} />}
      </div>
      <div className={`pb-6 flex-1 min-w-0 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <CategoryIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{event.event}</span>
          {event.status === "overdue" && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
          {event.status === "warning" && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Attention</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
        {event.date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(event.date)}
            {event.daysRemaining !== null && event.daysRemaining > 0 && (
              <span className="ml-1 font-medium text-primary">({event.daysRemaining}d remaining)</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ClientTransactionPage() {
  const [showAllDocs, setShowAllDocs] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  const { data, isLoading, isError } = useQuery<MyTransactionResponse | null>({
    queryKey: ["/api/client/my-transaction"],
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We couldn't load your transaction details. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.transaction) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Home className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to HomeBase</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your agent hasn't linked you to a transaction yet. Once they do, you'll be able to track every step of your journey right here.
          </p>
        </div>
      </div>
    );
  }

  const { transaction, documents, checklist, timeline, agent, contacts, pendingActions } = data;
  const checklistItems = checklist?.items || [];
  const completedItems = checklistItems.filter((item: any) => item.completed).length;
  const totalItems = checklistItems.length;
  const completionPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const completeDocs = documents.filter(d => d.status === "complete" || d.status === "signed");
  const pendingDocs = documents.filter(d => d.status !== "complete" && d.status !== "signed" && d.status !== "not_applicable");
  const visibleDocs = showAllDocs ? documents : [...pendingDocs, ...completeDocs].slice(0, 5);

  const timelineEvents = timeline?.events || [];
  const visibleTimeline = showAllTimeline ? timelineEvents : timelineEvents.slice(0, 6);

  return (
    <main className="w-full max-w-3xl mx-auto px-4 py-6 min-h-screen space-y-6 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{transaction.streetName}</h1>
          <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
            <MapPin className="h-3.5 w-3.5" />
            {transaction.city}, {transaction.state} {transaction.zipCode}
          </p>
        </div>
        <Badge variant="outline" className="capitalize text-xs mt-1">
          {transaction.type === "buy" ? "Buying" : "Selling"}
        </Badge>
      </div>

      <StageTracker status={transaction.status} type={transaction.type} />

      <ClosingCountdown closingDate={transaction.closingDate} />

      {pendingActions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Action Required
          </h2>
          {pendingActions.map((action, i) => (
            <ActionCard key={i} action={action} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-muted/40 p-4 text-center">
          <CalendarDays className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] uppercase text-muted-foreground">Contract Date</p>
          <p className="text-sm font-semibold mt-0.5">{formatDate(transaction.contractExecutionDate)}</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-4 text-center">
          <Timer className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] uppercase text-muted-foreground">Option Expires</p>
          <p className="text-sm font-semibold mt-0.5">{formatDate(transaction.optionPeriodExpiration)}</p>
          {(() => {
            const d = daysUntil(transaction.optionPeriodExpiration);
            if (d !== null && d > 0 && d <= 7) return <p className="text-[10px] text-amber-600 font-medium">{d} days left</p>;
            if (d !== null && d <= 0) return <p className="text-[10px] text-green-600 font-medium">Passed</p>;
            return null;
          })()}
        </div>
        <div className="rounded-xl bg-muted/40 p-4 text-center">
          <Home className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] uppercase text-muted-foreground">Closing Date</p>
          <p className="text-sm font-semibold mt-0.5">{formatDate(transaction.closingDate)}</p>
        </div>
        <div className="rounded-xl bg-muted/40 p-4 text-center">
          <DollarSign className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <p className="text-[10px] uppercase text-muted-foreground">Contract Price</p>
          <p className="text-sm font-semibold mt-0.5">{formatCurrency(transaction.contractPrice)}</p>
        </div>
      </div>

      {totalItems > 0 && (
        <Card className="border border-border/60 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Progress</span>
              </div>
              <span className="text-sm font-bold text-primary">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-3 rounded-full" />
            <p className="text-xs text-muted-foreground mt-2">{completedItems} of {totalItems} items complete</p>
          </CardContent>
        </Card>
      )}

      {documents.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" /> Documents
              </span>
              <Badge variant="secondary" className="text-xs">
                {completeDocs.length}/{documents.length} complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleDocs.map((doc) => {
              const needsSignature = doc.status === "waiting_signatures" && doc.signingUrl;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    needsSignature ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {doc.status === "complete" || doc.status === "signed" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : needsSignature ? (
                      <PenTool className="h-4 w-4 text-primary flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      {doc.deadline && (
                        <p className="text-[11px] text-muted-foreground">Due {formatDate(doc.deadline)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {needsSignature ? (
                      <a
                        href={doc.signingUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-medium hover:bg-primary/90 transition-colors"
                      >
                        <PenTool className="h-3 w-3" /> Sign Now
                      </a>
                    ) : (
                      <Badge
                        variant={doc.status === "complete" || doc.status === "signed" ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {(doc.status || "pending").replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
            {documents.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowAllDocs(!showAllDocs)}>
                {showAllDocs ? <><ChevronUp className="h-3 w-3 mr-1" /> Show Less</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show All {documents.length} Documents</>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {timelineEvents.length > 0 && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Transaction Timeline
            </CardTitle>
            {timeline?.summary && (
              <p className="text-xs text-muted-foreground">{timeline.summary}</p>
            )}
          </CardHeader>
          <CardContent>
            <div>
              {visibleTimeline.map((event, i) => (
                <TimelineStep key={event.id} event={event} isLast={i === visibleTimeline.length - 1} />
              ))}
            </div>
            {timelineEvents.length > 6 && (
              <Button variant="ghost" size="sm" className="w-full text-xs mt-2" onClick={() => setShowAllTimeline(!showAllTimeline)}>
                {showAllTimeline ? <><ChevronUp className="h-3 w-3 mr-1" /> Show Less</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show All {timelineEvents.length} Events</>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <button
        onClick={() => setShowFinancials(!showFinancials)}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <DollarSign className="h-4 w-4" /> Financial Details
        </span>
        {showFinancials ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {showFinancials && (
        <Card className="border border-border/60 shadow-sm -mt-3">
          <CardContent className="pt-4 space-y-3">
            {[
              { label: "Contract Price", value: formatCurrency(transaction.contractPrice) },
              { label: "Earnest Money", value: formatCurrency(transaction.earnestMoney) },
              { label: "Option Fee", value: formatCurrency(transaction.optionFee) },
              { label: "Down Payment", value: formatCurrency(transaction.downPayment) },
              { label: "Seller Concessions", value: formatCurrency(transaction.sellerConcessions) },
              { label: "Financing", value: transaction.financing ? transaction.financing.charAt(0).toUpperCase() + transaction.financing.slice(1) : "Not set" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(agent || contacts.length > 0) && (
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" /> Your Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agent && (
              <div className="flex items-center gap-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {agent.profilePhoto ? (
                    <img src={agent.profilePhoto} alt={agent.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{agent.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">Your {agent.role}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Link href="/messages">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </Link>
                  {agent.phone && (
                    <a href={`tel:${agent.phone}`}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {agent.email && (
                    <a href={`mailto:${agent.email}`}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{(contact.role || "").replace(/_/g, " ")}{contact.company ? ` at ${contact.company}` : ""}</p>
                </div>
                <div className="flex gap-1">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pb-4">
        <Link href="/messages" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <MessageSquare className="h-4 w-4" /> Message Agent
          </Button>
        </Link>
        <Link href="/marketplace" className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Users className="h-4 w-4" /> Find Pros
          </Button>
        </Link>
      </div>
    </main>
  );
}
