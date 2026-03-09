import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction, type Client, type Lead } from "@shared/schema";
import { Link } from "wouter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { format, startOfYear, eachMonthOfInterval, endOfYear, getYear } from "date-fns";
import {
  DollarSign,
  FileText,
  Users,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Clock,
  CheckCircle2,
  TrendingUp,
  Loader2,
} from "lucide-react";

interface CommissionSummary {
  total_deals: number;
  total_earned: number;
  total_pending: number;
  avg_per_deal: number;
  ytd_deals: number;
  ytd_earned: number;
  ytd_pending: number;
  monthly: { month: number; year: number; total: number; deals: number }[];
}

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
  unknown: "Unknown",
};

const SOURCE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#14b8a6", "#6366f1"];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const formatFullCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

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
  icon: typeof DollarSign;
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

const PIPELINE_STAGES = [
  { key: "prospect", label: "Prospect", shade: "bg-foreground/15" },
  { key: "active_listing_prep", label: "Active Listing Prep", shade: "bg-foreground/30" },
  { key: "live_listing", label: "Live Listing", shade: "bg-foreground/45" },
  { key: "active", label: "Active", shade: "bg-foreground/55" },
  { key: "under_contract", label: "Under Contract", shade: "bg-foreground/75" },
  { key: "closed", label: "Closed", shade: "bg-foreground" },
];

const PIE_SHADES = [
  "hsl(var(--foreground))",
  "hsl(var(--foreground) / 0.7)",
  "hsl(var(--foreground) / 0.5)",
  "hsl(var(--foreground) / 0.3)",
  "hsl(var(--foreground) / 0.15)",
];

export default function DataPage() {
  const { user } = useAuth();
  const { data: transactions = [], isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
  });

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
  });

  const { data: commissionSummary, isLoading: commLoading } = useQuery<CommissionSummary>({
    queryKey: ["/api/commissions/summary"],
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
  });

  const { data: leadStats } = useQuery<{ total: number; sourceCounts: Record<string, number>; connectionRate: number; acceptanceRate: number }>({
    queryKey: ["/api/leads/stats"],
    enabled: !!user && (user.role === "agent" || user.role === "broker"),
  });

  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0));
  const yearEnd = endOfYear(new Date(currentYear, 0));
  const allMonths = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const stats = useMemo(() => {
    const closedThisYear = transactions.filter((t) => {
      if (t.status !== "closed" || !t.closingDate) return false;
      return getYear(new Date(t.closingDate)) === currentYear;
    });
    const closedLastYear = transactions.filter((t) => {
      if (t.status !== "closed" || !t.closingDate) return false;
      return getYear(new Date(t.closingDate)) === currentYear - 1;
    });

    const totalVolumeThisYear = closedThisYear.reduce(
      (s, t) => s + (t.contractPrice || 0),
      0
    );
    const totalVolumeLastYear = closedLastYear.reduce(
      (s, t) => s + (t.contractPrice || 0),
      0
    );
    const volumeChange =
      totalVolumeLastYear > 0
        ? Math.round(
            ((totalVolumeThisYear - totalVolumeLastYear) / totalVolumeLastYear) *
              100
          )
        : undefined;

    const totalDeals = closedThisYear.length;
    const lastYearDeals = closedLastYear.length;
    const dealsChange =
      lastYearDeals > 0
        ? Math.round(((totalDeals - lastYearDeals) / lastYearDeals) * 100)
        : undefined;

    const avgDealSize = totalDeals > 0 ? totalVolumeThisYear / totalDeals : 0;
    const lastYearAvg =
      lastYearDeals > 0 ? totalVolumeLastYear / lastYearDeals : 0;
    const avgChange =
      lastYearAvg > 0
        ? Math.round(((avgDealSize - lastYearAvg) / lastYearAvg) * 100)
        : undefined;

    const activeClients = clients.filter((c) => c.status === "active").length;

    return {
      totalVolume: totalVolumeThisYear,
      volumeChange,
      totalDeals,
      dealsChange,
      avgDealSize,
      avgChange,
      activeClients,
      totalClients: clients.length,
    };
  }, [transactions, clients, currentYear]);

  const monthlyChartData = useMemo(() => {
    const data = allMonths.map((date) => ({
      month: format(date, "MMM"),
      volume: 0,
      deals: 0,
      cumulative: 0,
    }));

    transactions
      .filter(
        (t) =>
          t.status === "closed" &&
          t.closingDate &&
          t.contractPrice &&
          getYear(new Date(t.closingDate)) === currentYear
      )
      .forEach((t) => {
        const monthIdx = new Date(t.closingDate!).getMonth();
        data[monthIdx].volume += t.contractPrice || 0;
        data[monthIdx].deals += 1;
      });

    let running = 0;
    data.forEach((d) => {
      running += d.volume;
      d.cumulative = running;
    });

    return data;
  }, [transactions, currentYear, allMonths]);

  const pipelineData = useMemo(() => {
    const counts: Record<string, number> = {};
    PIPELINE_STAGES.forEach((s) => (counts[s.key] = 0));
    transactions.forEach((t) => {
      const status = t.status || "prospect";
      if (counts[status] !== undefined) counts[status]++;
    });
    return PIPELINE_STAGES.map((s) => ({
      name: s.label,
      value: counts[s.key],
    }));
  }, [transactions]);

  const pipelineTotal = pipelineData.reduce((s, d) => s + d.value, 0);

  const typeBreakdown = useMemo(() => {
    const buy = transactions.filter((t) => t.type === "buy").length;
    const sell = transactions.filter(
      (t) => t.type === "sell" || t.type === "listing"
    ).length;
    const other = transactions.length - buy - sell;
    return [
      { name: "Buy-side", value: buy },
      { name: "Sell-side", value: sell },
      ...(other > 0 ? [{ name: "Other", value: other }] : []),
    ].filter((d) => d.value > 0);
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        const dateA = a.closingDate || a.updatedAt || "";
        const dateB = b.closingDate || b.updatedAt || "";
        return new Date(dateB as string).getTime() - new Date(dateA as string).getTime();
      })
      .slice(0, 5);
  }, [transactions]);

  const commissionChartData = useMemo(() => {
    if (!commissionSummary?.monthly) return [];
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return allMonths.map((date, i) => {
      const m = commissionSummary.monthly.find(
        (cm) => cm.month === i + 1 && cm.year === currentYear
      );
      return {
        month: monthNames[i],
        earned: m?.total || 0,
        deals: m?.deals || 0,
      };
    });
  }, [commissionSummary, currentYear, allMonths]);

  const isLoading = txLoading || clientsLoading || commLoading;

  if (!user || (user.role !== "agent" && user.role !== "broker")) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Dashboard</h2>
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
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      closed: "bg-foreground text-background",
      active: "bg-foreground/20 text-foreground",
      prospect: "bg-foreground/10 text-foreground",
      under_contract: "bg-foreground/40 text-foreground",
      active_listing_prep: "bg-foreground/15 text-foreground",
      live_listing: "bg-foreground/25 text-foreground",
    };
    return (
      <span
        className={`text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full ${
          styles[status] || styles["prospect"]
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <main className="container mx-auto px-4 py-6 pb-24 md:pb-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "MMMM d, yyyy")} &middot; {currentYear} Overview
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard
          title="Total Volume"
          value={formatCurrency(stats.totalVolume)}
          change={stats.volumeChange}
          icon={DollarSign}
          subtitle={`${currentYear} YTD`}
        />
        <StatCard
          title="Closed Deals"
          value={stats.totalDeals.toString()}
          change={stats.dealsChange}
          icon={FileText}
          subtitle={`${currentYear} YTD`}
        />
        <StatCard
          title="Avg Deal Size"
          value={formatCurrency(stats.avgDealSize)}
          change={stats.avgChange}
          icon={Target}
          subtitle="per transaction"
        />
        <StatCard
          title="Active Clients"
          value={stats.activeClients.toString()}
          icon={Users}
          subtitle={`of ${stats.totalClients} total`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Sales Performance</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly volume &amp; cumulative trend
              </p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
              {currentYear}
            </span>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={monthlyChartData}
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
                  yAxisId="left"
                  tickFormatter={formatCurrency}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={55}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatCurrency}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={55}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "deals") return [value, "Deals"];
                    return [
                      formatFullCurrency(value),
                      name === "volume" ? "Monthly Volume" : "Cumulative",
                    ];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="volume"
                  fill="hsl(var(--foreground))"
                  radius={[3, 3, 0, 0]}
                  name="volume"
                  opacity={0.85}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="cumulative"
                  opacity={0.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 border border-border/60 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Deal Pipeline</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pipelineTotal} total transactions
            </p>
          </div>
          <div className="space-y-3">
            {pipelineData.map((stage, i) => {
              const pct =
                pipelineTotal > 0
                  ? Math.round((stage.value / pipelineTotal) * 100)
                  : 0;
              return (
                <div key={stage.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium">{stage.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {stage.value}{" "}
                      <span className="text-[10px]">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${PIPELINE_STAGES[i].shade}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {typeBreakdown.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border/60">
              <h4 className="text-xs font-semibold mb-3">Transaction Type</h4>
              <div className="flex items-center justify-center">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {typeBreakdown.map((_, i) => (
                          <Cell key={i} fill={PIE_SHADES[i % PIE_SHADES.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ml-4 space-y-1.5">
                  {typeBreakdown.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: PIE_SHADES[i % PIE_SHADES.length] }}
                      />
                      <span className="text-xs">
                        {item.name}{" "}
                        <span className="text-muted-foreground font-medium">
                          {item.value}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Commission Earnings</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {commissionSummary
                  ? `${formatFullCurrency(commissionSummary.ytd_earned)} earned YTD`
                  : "No commission data yet"}
              </p>
            </div>
            {commissionSummary && commissionSummary.ytd_pending > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                <Clock className="h-3 w-3" />
                {formatFullCurrency(commissionSummary.ytd_pending)} pending
              </div>
            )}
          </div>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={commissionChartData}
                margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
              >
                <defs>
                  <linearGradient id="commGradient" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={formatCurrency}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={55}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number, name: string) => [
                    name === "earned" ? formatFullCurrency(value) : value,
                    name === "earned" ? "Earned" : "Deals",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="earned"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  fill="url(#commGradient)"
                  name="earned"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {commissionSummary && (
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border/60">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total Earned
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {formatFullCurrency(commissionSummary.total_earned)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Avg / Deal
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {formatFullCurrency(commissionSummary.avg_per_deal)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  YTD Deals
                </p>
                <p className="text-sm font-bold mt-0.5">
                  {commissionSummary.ytd_deals}
                </p>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5 border border-border/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Transactions</h3>
            <Link
              href="/transactions"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View All &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No transactions yet
              </p>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {tx.streetName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {tx.city}, {tx.state}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {tx.contractPrice ? (
                      <p className="text-xs font-semibold">
                        {formatCurrency(tx.contractPrice)}
                      </p>
                    ) : null}
                    <div className="mt-0.5">{statusBadge(tx.status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 border border-border/60 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold">Monthly Deal Volume</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Transactions closed per month
            </p>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
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
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [value, "Deals"]}
                />
                <Bar
                  dataKey="deals"
                  fill="hsl(var(--foreground))"
                  radius={[3, 3, 0, 0]}
                  opacity={0.8}
                />
              </BarChart>
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
                  Close Rate
                </span>
              </div>
              <p className="text-xl font-bold">
                {transactions.length > 0
                  ? Math.round(
                      (transactions.filter((t) => t.status === "closed").length /
                        transactions.length) *
                        100
                    )
                  : 0}
                %
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Active Deals
                </span>
              </div>
              <p className="text-xl font-bold">
                {
                  transactions.filter(
                    (t) => t.status !== "closed" && t.status !== "prospect"
                  ).length
                }
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Avg Price
                </span>
              </div>
              <p className="text-xl font-bold">
                {formatCurrency(
                  transactions.filter((t) => t.contractPrice).length > 0
                    ? transactions
                        .filter((t) => t.contractPrice)
                        .reduce((s, t) => s + (t.contractPrice || 0), 0) /
                        transactions.filter((t) => t.contractPrice).length
                    : 0
                )}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Prospects
                </span>
              </div>
              <p className="text-xl font-bold">
                {transactions.filter((t) => t.status === "prospect").length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {leadStats && leadStats.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Lead Sources</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={Object.entries(leadStats.sourceCounts || {}).map(([name, value]) => ({
                    name: SOURCE_LABELS[name] || name,
                    value,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {Object.keys(leadStats.sourceCounts || {}).map((_, i) => (
                    <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Lead Performance</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-2xl font-bold">{leadStats.total}</p>
                <p className="text-xs text-muted-foreground">Total Leads</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-2xl font-bold">{leadStats.acceptanceRate}%</p>
                <p className="text-xs text-muted-foreground">Acceptance Rate</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-2xl font-bold">{leadStats.connectionRate}%</p>
                <p className="text-xs text-muted-foreground">Connection Rate</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-2xl font-bold">{Object.keys(leadStats.sourceCounts || {}).length}</p>
                <p className="text-xs text-muted-foreground">Active Sources</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}
