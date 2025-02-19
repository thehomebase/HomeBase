import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend
} from "recharts";
import { format, parse, startOfYear, eachMonthOfInterval, endOfYear, getYear } from "date-fns";

interface MonthlyData {
  month: string;
  totalVolume: number;
  cumulativeVolume: number;
  transactionCount: number;
}

export default function DataPage() {
  const { user } = useAuth();

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
      return t.status === "closed" && getYear(closeDate) === currentYear;
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
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Sales Performance</h3>
        <div className="h-[400px] w-full">
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
    </main>
  );
}