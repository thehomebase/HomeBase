import { useState, useMemo } from "react";
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
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, parse, startOfYear, eachMonthOfInterval, endOfYear, getYear } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

// Define stage types and colors
type StageType = 'prospect' | 'activeListing' | 'liveListing' | 'mutualAcceptance' | 'closing';

interface StageConfig {
  name: string;
  value: number;
  type: StageType;
  lightColor: string;
  darkColor: string;
}

// Configure stages with consistent colors
const dealStagesData: StageConfig[] = [
  { name: 'Prospect', value: 4, type: 'prospect', lightColor: '#FB7185', darkColor: '#E14D62' },
  { name: 'Active Listing', value: 6, type: 'activeListing', lightColor: '#4ADE80', darkColor: '#22C55E' },
  { name: 'Live Listing', value: 3, type: 'liveListing', lightColor: '#FDE047', darkColor: '#FFD700' },
  { name: 'Mutual Acceptance', value: 2, type: 'mutualAcceptance', lightColor: '#38BDF8', darkColor: '#2196F3' },
  { name: 'Closing in 1 Week', value: 1, type: 'closing', lightColor: '#000000', darkColor: '#FFFFFF' }
];

// Custom legend component
const CustomLegend = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ul className="flex flex-wrap justify-center gap-4 mt-4">
      {dealStagesData.map((stage) => (
        <li key={stage.type} className="flex items-center gap-2">
          <div
            style={{ 
              backgroundColor: isDark ? stage.darkColor : stage.lightColor,
              transition: 'background-color 0.2s'
            }}
            className="w-3 h-3 rounded-sm"
          />
          <span className="text-sm text-foreground transition-colors duration-200">
            {stage.name}
          </span>
        </li>
      ))}
    </ul>
  );
};

// Activity data remains unchanged
const activityData = [
  { month: 'Feb', meetings: 2, calls: 2 },
  { month: 'Mar', meetings: 1, calls: 0 },
  { month: 'Apr', meetings: 0, calls: 0 }
];


interface MonthlyData {
  month: string;
  totalVolume: number;
  cumulativeVolume: number;
  transactionCount: number;
}


export default function DataPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Query transactions data
  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user && user.role === "agent",
  });

  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0));
  const yearEnd = endOfYear(new Date(currentYear, 0));
  const allMonths = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Process monthly data using useMemo
  const monthlyData = useMemo(() => {
    const initialData = allMonths.reduce<Record<string, MonthlyData>>((acc, date) => {
      const monthKey = format(date, 'MMM');
      acc[monthKey] = {
        month: monthKey,
        totalVolume: 0,
        cumulativeVolume: 0,
        transactionCount: 0
      };
      return acc;
    }, {});

    return (transactions || [])
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
      }, initialData);
  }, [transactions, selectedStatus, startDate, endDate, currentYear, allMonths]);

  // Convert monthly data to chart format and calculate cumulative volume
  const chartData = useMemo(() => {
    let runningTotal = 0;
    return Object.entries(monthlyData)
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
  }, [monthlyData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Calculate totals
  const totalTransactions = Object.values(monthlyData).reduce((sum, data) => sum + data.transactionCount, 0);
  const totalVolume = Object.values(monthlyData).reduce((sum, data) => sum + data.totalVolume, 0);
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

  return (
    <main className="container mx-auto px-4 py-8">
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
              <PieChart className="[&_path]:transition-colors [&_path]:duration-200">
                <Pie
                  data={dealStagesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  labelLine={!isMobile}
                >
                  {dealStagesData.map((entry) => (
                    <Cell
                      key={`cell-${entry.type}`}
                      fill={isDark ? entry.darkColor : entry.lightColor}
                      className="transition-colors duration-200"
                    />
                  ))}
                </Pie>
                <Legend content={<CustomLegend />} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
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
              <BarChart data={activityData}>
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
              <BarChart
                data={dealStagesData}
                className="[&_path]:transition-colors [&_path]:duration-200"
              >
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  stroke="currentColor"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis stroke="currentColor" tick={{ fill: "currentColor" }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    color: 'var(--foreground)'
                  }}
                />
                <Bar dataKey="value">
                  {dealStagesData.map((entry) => (
                    <Cell
                      key={`cell-${entry.type}`}
                      fill={isDark ? entry.darkColor : entry.lightColor}
                      className="transition-colors duration-200"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </main>
  );
}