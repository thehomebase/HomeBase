
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { ChartContainer, ChartTooltipContent, ChartTooltip } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

export default function DataPage() {
  const { user } = useAuth();

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  // Filter for closed transactions and group by month
  const monthlyData = transactions
    .filter(t => t.status === "closed" && t.closingDate)
    .reduce((acc, transaction) => {
      const date = new Date(transaction.closingDate!);
      const monthKey = format(date, 'MMM yyyy');
      const price = transaction.contractPrice || 0;

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, totalPrice: 0, count: 0 };
      }
      acc[monthKey].totalPrice += price;
      acc[monthKey].count += 1;
      acc[monthKey].averagePrice = acc[monthKey].totalPrice / acc[monthKey].count;
      return acc;
    }, {} as Record<string, { month: string; totalPrice: number; count: number; averagePrice: number; }>);

  const chartData = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  if (!user || user.role !== 'agent') {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Sales Data</h2>
      <div className="grid gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Closed Transaction Prices</h3>
          <ChartContainer 
            className="h-[400px]" 
            config={{
              price: { color: "#2563eb" },
            }}
          >
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
              <XAxis dataKey="month" />
              <YAxis 
                tickFormatter={(value) => 
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value)
                }
              />
              <Bar dataKey="averagePrice" fill="var(--color-price)" name="Average Price" />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border rounded p-2">
                        <p className="font-semibold">{payload[0].payload.month}</p>
                        <p>Average Price: {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(payload[0].value)}</p>
                        <p>Number of Sales: {payload[0].payload.count}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>
    </main>
  );
}
