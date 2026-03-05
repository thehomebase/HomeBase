import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, FileText, Calendar, Target, Loader2, ShieldAlert } from "lucide-react";

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

const statusConfig: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  completed: { color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", icon: CheckCircle2 },
  on_track: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", icon: Clock },
  approaching: { color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", icon: Clock },
  warning: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", icon: AlertTriangle },
  overdue: { color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: ShieldAlert },
  not_set: { color: "text-muted-foreground", bg: "bg-muted/30", border: "border-muted", icon: Clock },
};

const riskBadgeConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  none: { variant: "secondary", label: "No Risk" },
  low: { variant: "outline", label: "Low Risk" },
  medium: { variant: "default", label: "Medium Risk" },
  high: { variant: "destructive", label: "High Risk" },
  critical: { variant: "destructive", label: "Critical" },
};

const overallRiskConfig: Record<string, { color: string; bg: string; border: string }> = {
  low: { color: "text-green-700 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800" },
  medium: { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800" },
  high: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800" },
  critical: { color: "text-red-700 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800" },
};

const categoryIcon: Record<string, typeof Calendar> = {
  milestone: Target,
  document: FileText,
  deadline: Calendar,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Not set";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TimelineNode({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const config = statusConfig[event.status] || statusConfig.not_set;
  const Icon = config.icon;
  const CategoryIcon = categoryIcon[event.category] || Calendar;
  const badge = riskBadgeConfig[event.riskLevel] || riskBadgeConfig.none;

  const dotColor =
    event.status === "completed" ? "bg-green-500" :
    event.status === "on_track" ? "bg-blue-500" :
    event.status === "approaching" ? "bg-yellow-500" :
    event.status === "warning" ? "bg-orange-500" :
    event.status === "overdue" ? "bg-red-500" :
    "bg-gray-400";

  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full ${dotColor} ring-4 ring-background z-10 shrink-0`} />
        {!isLast && (
          <div className="w-0.5 bg-border flex-1 min-h-[2rem]" />
        )}
      </div>

      <div className={`flex-1 pb-6 ${isLast ? "" : ""}`}>
        <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CategoryIcon className={`h-4 w-4 ${config.color} shrink-0`} />
              <h4 className="font-semibold text-sm">{event.event}</h4>
            </div>
            <div className="flex items-center gap-2">
              {event.riskLevel !== "none" && (
                <Badge variant={badge.variant} className="text-xs">
                  {badge.label}
                </Badge>
              )}
              {event.daysRemaining !== null && event.status !== "completed" && (
                <span className={`text-xs font-medium ${config.color}`}>
                  {event.daysRemaining < 0
                    ? `${Math.abs(event.daysRemaining)}d overdue`
                    : event.daysRemaining === 0
                    ? "Today"
                    : `${event.daysRemaining}d left`}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-start gap-2">
            <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
            <p className="text-sm text-muted-foreground">{event.message}</p>
          </div>

          {event.date && (
            <p className="text-xs text-muted-foreground mt-1.5 ml-5.5">
              {formatDate(event.date)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TransactionTimeline({ transactionId }: { transactionId: number | null }) {
  const { data: timeline, isLoading, error } = useQuery<TransactionTimeline>({
    queryKey: ["/api/transactions", transactionId, "timeline"],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/transactions/${transactionId}/timeline`);
      if (!response.ok) throw new Error("Failed to fetch timeline");
      return response.json();
    },
    enabled: !!transactionId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !timeline) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load timeline data.
        </CardContent>
      </Card>
    );
  }

  const alertEvents = timeline.events.filter(
    e => e.riskLevel === "high" || e.riskLevel === "critical"
  );

  const riskConfig = overallRiskConfig[timeline.overallRisk];

  return (
    <div className="space-y-6">
      <Card className={`border ${riskConfig.border}`}>
        <CardContent className={`py-4 ${riskConfig.bg}`}>
          <div className="flex items-center gap-3">
            {timeline.overallRisk === "low" ? (
              <CheckCircle2 className={`h-5 w-5 ${riskConfig.color}`} />
            ) : (
              <AlertTriangle className={`h-5 w-5 ${riskConfig.color}`} />
            )}
            <div>
              <p className={`font-semibold text-sm ${riskConfig.color} capitalize`}>
                Overall Risk: {timeline.overallRisk}
              </p>
              <p className="text-sm text-muted-foreground">{timeline.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {alertEvents.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Action Required ({alertEvents.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {alertEvents.map((event) => {
              const config = statusConfig[event.status];
              return (
                <Card key={event.id} className={`border-2 ${config.border}`}>
                  <CardContent className={`py-3 px-4 ${config.bg}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${config.color}`} />
                      <div>
                        <p className="text-sm font-semibold">{event.event}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{event.message}</p>
                        {event.date && (
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(event.date)}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No timeline events yet. Add key dates to your transaction to see the timeline.
            </p>
          ) : (
            <div className="relative">
              {timeline.events.map((event, index) => (
                <TimelineNode
                  key={event.id}
                  event={event}
                  isLast={index === timeline.events.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}