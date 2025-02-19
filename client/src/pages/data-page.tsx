import { useState } from "react";
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
  Tooltip, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format, parse, startOfYear, eachMonthOfInterval, endOfYear, getYear } from "date-fns";

interface MonthlyData {
  month: string;
  totalVolume: number;
  cumulativeVolume: number;
  transactionCount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function DataPage() {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user && user.role === "agent",
  });

  // Get all months in current year
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date(currentYear, 0));
  const yearEnd = endOfYear(new Date(currentYear, 0));
  const allMonths = eachMonthOfInterval({ start: yearStart, end: yearEnd });

  // Initialize data for all months
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

  // Process transactions to get monthly totals
  const monthlyData = transactions
    .filter(t => {
      if (!t.closingDate || !t.contractPrice) return false;
      const closeDate = new Date(t.closingDate);
      const matchesStatus = !selectedStatus || t.status === selectedStatus;
      const matchesStartDate = !startDate || closeDate >= new Date(startDate);
      const matchesEndDate = !endDate || closeDate <= new Date(endDate);
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

  // Calculate cumulative totals and create sorted chart data
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

  // Example data for deal stages (you would need to calculate this from your transactions)
  const dealStagesData = [
    { name: 'Prospect', value: 4 },
    { name: 'Active Listing', value: 6 },
    { name: 'Live Listing', value: 3 },
    { name: 'Mutual Acceptance', value: 2 },
    { name: 'Closing in 1 Week', value: 1 }
  ];

  // Calculate activity data (you would need to adjust this based on your actual data)
  const activityData = [
    { month: 'Feb', meetings: 2, calls: 2 },
    { month: 'Mar', meetings: 1, calls: 0 },
    { month: 'Apr', meetings: 0, calls: 0 }
  ];

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
  const winRate = 65; // Example win rate - calculate from actual data

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
    <main className="w-screen lg:max-w-[calc(100vw-230px)] md:max-w-[calc(100vw-230px)] sm:max-w-[calc(100vw-70px)] xs:max-w-[calc(100vw-10px)] max-w-full container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h2 className="text-2xl font-bold">Sales Data Analysis</h2>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(new Date(startDate), 'PP') : 'Start Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate ? new Date(startDate) : undefined}
                onSelect={(date) => setStartDate(date ? date.toISOString() : '')}
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(new Date(endDate), 'PP') : 'End Date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate ? new Date(endDate) : undefined}
                onSelect={(date) => setEndDate(date ? date.toISOString() : '')}
              />
            </PopoverContent>
          </Popover>
          <select
            className="h-9 rounded-md border bg-background px-3"
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
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Sales Performance</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, bottom: 60, left: 70 }}>
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={60}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={formatCurrency}
                  label={{ 
                    value: 'Monthly Volume', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -60
                  }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={formatCurrency}
                  label={{ 
                    value: 'Cumulative Volume', 
                    angle: 90, 
                    position: 'insideRight',
                    offset: -70
                  }}
                />
                <Tooltip 
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
                  fill="hsl(var(--primary))" 
                  name="Monthly Volume"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumulativeVolume"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={false}
                  name="Cumulative Volume"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Deal Stages</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dealStagesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dealStagesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Activities Completed</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="meetings" name="Meetings" fill="#8884d8" />
                <Bar dataKey="calls" name="Calls" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Deal Progress</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealStagesData}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))">
                  {dealStagesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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