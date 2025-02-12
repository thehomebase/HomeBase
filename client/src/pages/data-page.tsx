import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { type Transaction } from "@shared/schema";
import { ChartContainer } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

export default function DataPage() {
  const { user } = useAuth();

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  // Filter closed transactions and group by month
  const monthlyData = transactions
    .filter(t => t.status === "closed" && t.closingDate && t.contractPrice)
    .reduce((acc, transaction) => {
      const date = new Date(transaction.closingDate!);
      const monthKey = format(date, 'MMM yyyy');

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          prices: [],
          averagePrice: 0
        };
      }

      acc[monthKey].prices.push(transaction.contractPrice!);
      acc[monthKey].averagePrice = acc[monthKey].prices.reduce((a, b) => a + b, 0) / acc[monthKey].prices.length;

      return acc;
    }, {} as Record<string, { month: string; prices: number[]; averagePrice: number }>);

  const chartData = Object.values(monthlyData)
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
    .map(data => ({
      month: data.month,
      averagePrice: data.averagePrice
    }));

  if (!user || !transactions.length) {
    return (
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
        <Card className="p-6">
          <p className="text-center text-muted-foreground">No closed transactions available.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Closed Transaction Prices</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 60, left: 70 }}>
              <XAxis 
                dataKey="month" 
                angle={-45} 
                textAnchor="end" 
                height={60}
              />
              <YAxis 
                tickFormatter={(value) => 
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    notation: 'compact',
                    maximumFractionDigits: 1,
                  }).format(value)
                }
                label={{ 
                  value: 'Price', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: -60
                }}
              />
              <Tooltip 
                formatter={(value) => 
                  new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(value)
                }
              />
              <Bar 
                dataKey="averagePrice" 
                fill="#2563eb" 
                name="Transaction Price" 
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </main>
  );
}