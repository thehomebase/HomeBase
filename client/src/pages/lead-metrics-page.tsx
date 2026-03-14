import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { format } from "date-fns";
import {
  Target,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Zap,
  ArrowRight,
  Key,
  ExternalLink,
  Copy,
  ChevronDown,
  ChevronUp,
  BarChart3,
  UserPlus,
  XCircle,
  Timer,
  Webhook,
  Mail,
  Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SOURCE_LABELS: Record<string, string> = {
  lead_gen: "Lead Gen",
  open_house: "Open House",
  referral: "Referral",
  website: "Website",
  zillow: "Zillow",
  realtor_com: "Realtor.com",
  social_media: "Social Media",
  cold_call: "Cold Call",
  sign_call: "Sign Call",
  sphere: "Sphere of Influence",
  facebook: "Facebook Ads",
  google_ads: "Google Ads",
  zapier: "Zapier",
  webhook: "Webhook",
  unknown: "Unknown",
};

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1", "#84cc16", "#a855f7"];

interface LeadMetrics {
  summary: {
    total: number;
    new: number;
    accepted: number;
    converted: number;
    rejected: number;
    expired: number;
    acceptanceRate: number;
    connectionRate: number;
    contacted: number;
    connected: number;
    avgResponseTime: number;
    thisMonthLeads: number;
    monthChange?: number;
  };
  sourceCounts: Record<string, number>;
  sourcePerformance: {
    source: string;
    total: number;
    converted: number;
    accepted: number;
    rejected: number;
    conversionRate: number;
    avgResponseMs: number;
  }[];
  monthlyData: {
    month: string;
    monthNum: number;
    year: number;
    total: number;
    converted: number;
    accepted: number;
    rejected: number;
  }[];
  funnelData: {
    total: number;
    assigned: number;
    contacted: number;
    connected: number;
    accepted: number;
    converted: number;
  };
}

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  change?: number;
  icon: typeof Target;
  subtitle?: string;
}) {
  return (
    <Card className="p-5 flex flex-col justify-between gap-3 border border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="text-2xl md:text-3xl font-bold tracking-tight">{value}</p>
        <div className="flex items-center gap-2 mt-1">
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                change >= 0
                  ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50"
                  : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
              }`}
            >
              {change >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function formatResponseTime(ms: number): string {
  if (ms <= 0) return "N/A";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function ZapierGuide() {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const webhookUrl = `${window.location.origin}/api/v1/leads`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <Card className="p-5 border border-border/60 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center">
            <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold">Connect Your Lead Sources</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Centralize leads from Zillow, Facebook, your website &amp; more
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">1</span>
                </div>
                <span className="text-sm font-medium">Get Your API Key</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Go to your{" "}
                <Link href="/api-keys" className="text-primary underline font-medium">
                  API Keys page
                </Link>{" "}
                and create a new key. You'll use this to authenticate Zapier with HomeBase.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">2</span>
                </div>
                <span className="text-sm font-medium">Create a Zap</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                In Zapier, create a new Zap. Set your trigger to the lead source you want to connect (Zillow, Facebook Lead Ads, Google Ads, etc).
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400">3</span>
                </div>
                <span className="text-sm font-medium">Connect to HomeBase</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Set the action to "Webhooks by Zapier" → "POST". Use the HomeBase endpoint below and add your API key as a header.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-muted/10">
            <div className="flex items-center gap-2 mb-3">
              <Webhook className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Your Webhook Endpoint
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted/50 px-3 py-2 rounded-lg font-mono break-all">
                {webhookUrl}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(webhookUrl)}
                className="shrink-0"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-muted/10">
            <div className="flex items-center gap-2 mb-3">
              <Key className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Required Header
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted/50 px-3 py-2 rounded-lg font-mono">
                X-API-Key: your_api_key_here
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard("X-API-Key: ")}
                className="shrink-0"
                title="Copy header name"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-xl border bg-muted/10">
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                JSON Body Fields
              </span>
            </div>
            <pre className="text-xs bg-muted/50 px-3 py-2 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "firstName": "John",       ← required
  "lastName": "Doe",         ← required
  "email": "john@example.com",
  "phone": "555-123-4567",
  "zipCode": "75001",
  "source": "zillow",
  "notes": "Interested in 3BR homes"
}`}
            </pre>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Popular Integrations
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "Zillow", desc: "Auto-import Zillow leads", icon: "🏠" },
                { name: "Facebook Ads", desc: "Facebook Lead Ads", icon: "📘" },
                { name: "Google Ads", desc: "Google form submissions", icon: "🔍" },
                { name: "Your Website", desc: "Contact form leads", icon: "🌐" },
              ].map((integration) => (
                <div
                  key={integration.name}
                  className="p-3 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                >
                  <span className="text-lg">{integration.icon}</span>
                  <p className="text-xs font-medium mt-1">{integration.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{integration.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild size="sm">
              <Link href="/api-keys" className="flex items-center gap-2">
                <Key className="h-3.5 w-3.5" />
                Get Your API Key
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/integrations/zapier" className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5" />
                View Full Zapier Guide
              </Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};

export default function LeadMetricsPage() {
  const { user } = useAuth();

  const { data: metrics, isLoading, isError, refetch } = useQuery<LeadMetrics>({
    queryKey: ["/api/leads/metrics"],
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
  });

  if (!user || (user.role !== "agent" && user.role !== "broker")) {
    return (
      <main className="px-4 sm:px-8 py-6">
        <h2 className="text-2xl font-bold mb-8">Lead Metrics</h2>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            This page is only available to agents and brokers.
          </p>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="px-4 sm:px-8 py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="px-4 sm:px-8 py-6">
        <h2 className="text-2xl font-bold mb-4">Lead Metrics</h2>
        <Card className="p-8 border border-border/60 shadow-sm text-center">
          <div className="h-12 w-12 rounded-xl bg-red-50 dark:bg-red-950/50 flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Metrics</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Something went wrong while loading your lead data. Please try again.
          </p>
          <Button size="sm" onClick={() => refetch()}>
            Try Again
          </Button>
        </Card>
      </main>
    );
  }

  const m = metrics;
  const hasLeads = m && m.summary.total > 0;

  const pieData = m
    ? Object.entries(m.sourceCounts).map(([name, value]) => ({
        name: SOURCE_LABELS[name] || name,
        value,
      }))
    : [];

  const funnelSteps = m
    ? [
        { label: "Total Leads", value: m.funnelData.total, shade: "bg-foreground/15" },
        { label: "Assigned", value: m.funnelData.assigned, shade: "bg-foreground/25" },
        { label: "Contacted", value: m.funnelData.contacted, shade: "bg-foreground/40" },
        { label: "Connected", value: m.funnelData.connected, shade: "bg-foreground/55" },
        { label: "Accepted", value: m.funnelData.accepted, shade: "bg-foreground/70" },
        { label: "Converted", value: m.funnelData.converted, shade: "bg-foreground" },
      ]
    : [];

  return (
    <main className="px-4 sm:px-8 py-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lead Metrics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "MMMM d, yyyy")} &middot; Performance across all lead sources
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="hidden sm:flex">
          <Link href="/lead-gen" className="flex items-center gap-2">
            <ArrowRight className="h-3.5 w-3.5" />
            Lead Gen
          </Link>
        </Button>
      </div>

      <div className="space-y-6">
        <ZapierGuide />

        {!hasLeads ? (
          <Card className="p-8 border border-border/60 shadow-sm text-center">
            <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Leads Yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
              Once you start receiving leads from your claimed zip codes, Zapier integrations, or other sources, your metrics will appear here.
            </p>
            <Button asChild size="sm">
              <Link href="/lead-gen" className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5" />
                Set Up Lead Generation
              </Link>
            </Button>
          </Card>
        ) : m && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                title="Total Leads"
                value={m.summary.total.toString()}
                change={m.summary.monthChange}
                icon={Users}
                subtitle="all time"
              />
              <StatCard
                title="This Month"
                value={m.summary.thisMonthLeads.toString()}
                icon={UserPlus}
                subtitle="new leads"
              />
              <StatCard
                title="Acceptance Rate"
                value={`${m.summary.acceptanceRate}%`}
                icon={CheckCircle2}
                subtitle={`${m.summary.accepted + m.summary.converted} accepted`}
              />
              <StatCard
                title="Avg Response"
                value={formatResponseTime(m.summary.avgResponseTime)}
                icon={Timer}
                subtitle={`${m.summary.contacted} contacted`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 p-5 border border-border/60 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Lead Volume Trend</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Monthly leads over the last 12 months
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                    12 months
                  </span>
                </div>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={m.monthlyData}
                      margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
                    >
                      <defs>
                        <linearGradient id="leadFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        allowDecimals={false}
                        width={30}
                      />
                      <RechartsTooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number, name: string) => {
                          const labels: Record<string, string> = { total: "Total", converted: "Converted", accepted: "Accepted" };
                          return [value, labels[name] || name];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="hsl(var(--foreground))"
                        strokeWidth={2}
                        fill="url(#leadFill)"
                        name="total"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5 border border-border/60 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Conversion Funnel</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Lead progression stages
                  </p>
                </div>
                <div className="space-y-3">
                  {funnelSteps.map((step, i) => {
                    const pct = m.funnelData.total > 0
                      ? Math.round((step.value / m.funnelData.total) * 100)
                      : 0;
                    return (
                      <div key={step.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{step.label}</span>
                          <span className="font-semibold">{step.value}</span>
                        </div>
                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${step.shade}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 border border-border/60 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Leads by Source</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Where your leads come from
                  </p>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={85}
                        innerRadius={45}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ strokeWidth: 1 }}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card className="p-5 border border-border/60 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Quick Stats</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Key performance indicators
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Connection Rate
                      </span>
                    </div>
                    <p className="text-xl font-bold">{m.summary.connectionRate}%</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        New / Pending
                      </span>
                    </div>
                    <p className="text-xl font-bold">{m.summary.new}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Converted
                      </span>
                    </div>
                    <p className="text-xl font-bold">{m.summary.converted}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Active Sources
                      </span>
                    </div>
                    <p className="text-xl font-bold">{Object.keys(m.sourceCounts).length}</p>
                  </div>
                </div>
              </Card>
            </div>

            {m.sourcePerformance.length > 0 && (
              <Card className="p-5 border border-border/60 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Source Performance Breakdown</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Detailed metrics for each lead source
                  </p>
                </div>
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-5 py-2">Source</th>
                        <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-3 py-2">Total</th>
                        <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-3 py-2">Accepted</th>
                        <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-3 py-2">Converted</th>
                        <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-3 py-2">Rejected</th>
                        <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-3 py-2">Conversion</th>
                        <th className="text-center text-[10px] uppercase tracking-wide text-muted-foreground font-medium px-3 py-2">Avg Response</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.sourcePerformance.map((sp, i) => (
                        <tr key={sp.source} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }}
                              />
                              <span className="text-sm font-medium">
                                {SOURCE_LABELS[sp.source] || sp.source}
                              </span>
                            </div>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="text-sm font-semibold">{sp.total}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="text-sm">{sp.accepted}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="text-sm">{sp.converted}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="text-sm text-muted-foreground">{sp.rejected}</span>
                          </td>
                          <td className="text-center px-3 py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                sp.conversionRate >= 50
                                  ? "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                                  : sp.conversionRate >= 25
                                  ? "border-amber-300 text-amber-700 dark:text-amber-400"
                                  : ""
                              }`}
                            >
                              {sp.conversionRate}%
                            </Badge>
                          </td>
                          <td className="text-center px-3 py-3">
                            <span className="text-xs text-muted-foreground">
                              {formatResponseTime(sp.avgResponseMs)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 border border-border/60 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Monthly Conversions</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Accepted vs rejected leads by month
                  </p>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={m.monthlyData}
                      margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
                    >
                      <XAxis
                        dataKey="month"
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        allowDecimals={false}
                        width={30}
                      />
                      <RechartsTooltip contentStyle={tooltipStyle} />
                      <Bar
                        dataKey="accepted"
                        stackId="a"
                        fill="hsl(var(--foreground))"
                        radius={[0, 0, 0, 0]}
                        name="Accepted"
                        opacity={0.85}
                      />
                      <Bar
                        dataKey="converted"
                        stackId="a"
                        fill="hsl(var(--foreground))"
                        radius={[3, 3, 0, 0]}
                        name="Converted"
                        opacity={0.5}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-3 mt-2 pt-2 border-t justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--foreground))", opacity: 0.85 }} />
                    <span className="text-[10px] text-muted-foreground">Accepted</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--foreground))", opacity: 0.5 }} />
                    <span className="text-[10px] text-muted-foreground">Converted</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5 border border-border/60 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold">Lead Status Overview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Current distribution of all leads
                  </p>
                </div>
                <div className="space-y-3 mt-2">
                  {[
                    { label: "New / Assigned", value: m.summary.new, color: "bg-blue-500" },
                    { label: "Accepted", value: m.summary.accepted, color: "bg-emerald-500" },
                    { label: "Converted", value: m.summary.converted, color: "bg-purple-500" },
                    { label: "Rejected", value: m.summary.rejected, color: "bg-red-400" },
                    { label: "Expired", value: m.summary.expired, color: "bg-gray-400" },
                  ].map((item) => {
                    const pct = m.summary.total > 0
                      ? Math.round((item.value / m.summary.total) * 100)
                      : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${item.color}`} />
                        <span className="text-xs text-muted-foreground flex-1">{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                        <span className="text-[10px] text-muted-foreground w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
