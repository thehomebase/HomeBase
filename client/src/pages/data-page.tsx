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
  ComposedChart
} from "recharts";
import { format, parse, startOfYear, eachMonthOfInterval, endOfYear } from "date-fns";

interface MonthlyData {
  month: string;
  totalVolume: number;
  cumulativeVolume: number;
}

export default function DataPage() {
  const { user } = useAuth();

  const { data: transactions = [], isLoading, error } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return response.json();
    },
    enabled: !!user,
    refetchInterval: 5000, // Refetch every 5 seconds
    staleTime: 1000, // Consider data stale after 1 second
    refetchOnWindowFocus: true, // Refetch when window regains focus
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
      cumulativeVolume: 0
    };
    return acc;
  }, {});

  // Process transactions to get monthly totals
  const monthlyData = transactions
    .filter(t => t.status === "closed" && t.closingDate && t.contractPrice)
    .reduce((acc, transaction) => {
      const date = transaction.closingDate ? new Date(transaction.closingDate) : null;
      if (!date || date.getFullYear() !== currentYear) return acc;

      const monthKey = format(date, 'MMM');
      if (acc[monthKey] && transaction.contractPrice) {
        acc[monthKey].totalVolume += transaction.contractPrice;
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
        cumulativeVolume: runningTotal
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

  const closedTransactions = transactions.filter(t => 
    t.status === "closed" && t.closingDate && t.contractPrice
  );

  if (!user || !closedTransactions.length) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">
            {closedTransactions.length === 0 
              ? "No closed transactions available."
              : "Loading transaction data..."}
          </p>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Sales Volume & Cumulative Total</h3>
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
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar 
                yAxisId="left"
                dataKey="totalVolume" 
                fill="hsl(var(--foreground))" 
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