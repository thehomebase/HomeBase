import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, parse, startOfYear, eachMonthOfInterval, endOfYear, getYear } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";

interface MonthlyData {
  month: string;
  totalVolume: number;
  cumulativeVolume: number;
  transactionCount: number;
}

const DEAL_STAGES = [
  { name: 'Prospect', value: 4 },
  { name: 'Active Listing', value: 6 },
  { name: 'Live Listing', value: 3 },
  { name: 'Mutual Acceptance', value: 2 },
  { name: 'Closing in 1 Week', value: 1 }
];

// Colors for light and dark themes
const themeColors = {
  light: {
    prospect: '#FB7185',
    activeListing: '#4ADE80', 
    liveListing: '#FDE047',
    mutualAcceptance: '#38BDF8',
    closing: '#000000'
  },
  dark: {
    prospect: '#E14D62',
    activeListing: '#22C55E',
    liveListing: '#FFD700',
    mutualAcceptance: '#2196F3',
    closing: '#FFFFFF'
  }
};

export default function DataPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { theme } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(theme === 'dark');

  // Add back the transactions query
  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user && user.role === "agent",
  });

  // Effect to track theme changes
  useEffect(() => {
    const isDark = theme === 'dark';
    setIsDarkMode(isDark);
    console.log('Theme changed:', { theme, isDark });
  }, [theme]);

  // Get color based on theme and stage index
  const getStageColor = (index: number) => {
    const colors = isDarkMode ? themeColors.dark : themeColors.light;
    switch(index) {
      case 0: return colors.prospect;
      case 1: return colors.activeListing;
      case 2: return colors.liveListing;
      case 3: return colors.mutualAcceptance;
      case 4: return colors.closing;
      default: return isDarkMode ? '#FFFFFF' : '#000000';
    }
  };

  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0));
  const yearEnd = endOfYear(new Date(currentYear, 0));
  const allMonths = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  const initialMonthlyData = allMonths.reduce<Record<string, MonthlyData>>((acc, date) => {
    const monthKey = format(date, 'MMM');
    acc[monthKey] = {
      month: monthKey,
      totalVolume: 0,
      cumulativeVolume: 0,
      transactionCount: 0
    };
    return acc;
  }, {});

  const monthlyData = transactions
    .filter(t => {
      if (!t.closingDate || !t.contractPrice) return false;
      const closeDate = new Date(t.closingDate);
      const matchesStatus = !selectedStatus || t.status === selectedStatus;
      const matchesStartDate = !startDate || closeDate >= startDate;
      const matchesEndDate = !endDate || closeDate <= endDate;
      return t.status === "closed" &&
             getYear(closeDate) === currentYear &&
             matchesStatus &&
             matchesStartDate &&
             matchesEndDate;
    })
    .reduce((acc, transaction) => {
      const date = new Date(transaction.closingDate!);
      const monthKey = format(date, 'MMM');

      if (acc[monthKey]) {
        acc[monthKey].totalVolume += transaction.contractPrice || 0;
        acc[monthKey].transactionCount += 1;
      }
      return acc;
    }, initialMonthlyData);

  let runningTotal = 0;
  const chartData = Object.entries(monthlyData)
    .sort((a, b) => {
      const monthA = parse(a[0], 'MMM', new Date());
      const monthB = parse(b[0], 'MMM', new Date());
      return monthA.getMonth() - monthB.getMonth();
    })
    .map(([month, data]) => {
      runningTotal += data.totalVolume;
      return {
        month,
        totalVolume: data.totalVolume,
        cumulativeVolume: runningTotal,
        transactionCount: data.transactionCount
      };
    });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const totalTransactions = chartData.reduce((sum, data) => sum + data.transactionCount, 0);
  const totalVolume = chartData.reduce((sum, data) => sum + data.totalVolume, 0);
  const averageDealSize = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  const winRate = 65;

  if (!user || user.role !== "agent") {
    return (
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            This page is only available to agents.
          </p>
        </Card>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Loading transaction data...</p>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
        <Card className="p-6">
          <p className="text-center text-destructive">Error loading transaction data</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="w-screen lg:max-w-[calc(100vw-230px)] md:max-w-[calc(100vw-230px)] sm:max-w-[calc(100vw-70px)] xs:max-w-[calc(100vw-10px)] max-w-full w-full ml-[5px] pr-20 sm:pr-12 relative container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-8">
        <h2 className="text-2xl font-bold">Sales Data Analysis</h2>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PP') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PP') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
              />
            </PopoverContent>
          </Popover>
          <select
            className="h-9 rounded-md border bg-background px-3 w-[180px]"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="prospect">Prospect</option>
            <option value="active">Active</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Volume</h3>
          <p className="text-2xl font-bold">{formatCurrency(totalVolume)}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Total Transactions</h3>
          <p className="text-2xl font-bold">{totalTransactions}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Average Deal Size</h3>
          <p className="text-2xl font-bold">{formatCurrency(averageDealSize)}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Win Rate</h3>
          <p className="text-2xl font-bold">{winRate}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Monthly Sales Performance</h3>
          <div className="h-[300px] sm:mx-3 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, bottom: isMobile ? 10 : -50, left: 10 }}
                className="[&_.recharts-text]:fill-foreground [&_.recharts-cartesian-axis-tick-value]:fill-foreground [&_.recharts-legend-item-text]:text-foreground"
              >
                <XAxis
                  dataKey="month"
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={formatCurrency}
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                  label={{
                    value: 'Monthly Volume',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 5,
                    dx: -10,
                    dy: 50,
                    style: { fill: "currentColor" }
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatCurrency}
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                  label={{
                    value: 'Cumulative Volume',
                    angle: 90,
                    position: 'insideRight',
                    offset: -90,
                    style: { fill: "currentColor" }
                  }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === "transactionCount") return [value, "Transactions"];
                    return [formatCurrency(value), name === "totalVolume" ? "Monthly Volume" : "Cumulative Volume"];
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="totalVolume"
                  fill="currentColor"
                  name="Monthly Volume"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativeVolume"
                  stroke="currentColor"
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative Volume"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Deal Stages</h3>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DEAL_STAGES}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  labelLine={!isMobile}
                >
                  {DEAL_STAGES.map((entry, index) => {
                    const color = getStageColor(index);
                    console.log(`Pie chart color for ${entry.name}:`, { isDarkMode, color });
                    return (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={color}
                      />
                    );
                  })}
                </Pie>
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  formatter={(value) => value}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Activities Completed</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData} className="[&_.recharts-bar-rectangle]:!fill-current">
                <XAxis dataKey="month" stroke="currentColor" tick={{ fill: "currentColor" }} />
                <YAxis stroke="currentColor" tick={{ fill: "currentColor" }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <Legend />
                <Bar dataKey="meetings" name="Meetings" fill="#4ADE80" />
                <Bar dataKey="calls" name="Calls" className="text-foreground" fill="currentColor" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Deal Progress</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEAL_STAGES}>
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  stroke="currentColor"
                  height={100}
                  tick={{
                    fill: "currentColor",
                    fontSize: 14
                  }}
                />
                <YAxis
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <Bar dataKey="value">
                  {DEAL_STAGES.map((entry, index) => {
                    const color = getStageColor(index);
                    console.log(`Bar chart color for ${entry.name}:`, { isDarkMode, color });
                    return (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={color}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </main>
  );
}

const activityData = [
  { month: 'Feb', meetings: 2, calls: 2 },
  { month: 'Mar', meetings: 1, calls: 0 },
  { month: 'Apr', meetings: 0, calls: 0 }
];