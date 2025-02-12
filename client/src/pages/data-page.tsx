
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
    .filter(t => t.status === "closed" && t.closingDate)
    .reduce((acc, transaction) => {
      const date = new Date(transaction.closingDate!);
      const monthKey = format(date, 'MMM yyyy');
      const price = transaction.contractPrice || 0;

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          transactions: [],
          averagePrice: 0,
          totalPrice: 0,
          count: 0
        };
      }

      acc[monthKey].transactions.push({
        address: transaction.address,
        price: price
      });
      acc[monthKey].totalPrice += price;
      acc[monthKey].count += 1;
      acc[monthKey].averagePrice = acc[monthKey].totalPrice / acc[monthKey].count;
      
      return acc;
    }, {} as Record<string, {
      month: string;
      transactions: Array<{ address: string; price: number }>;
      averagePrice: number;
      totalPrice: number;
      count: number;
    }>);

  const chartData = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  if (!user || user.role !== 'agent') {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Sales Data Analysis</h2>
      <div className="grid gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Closed Transaction Prices</h3>
          <ChartContainer 
            className="h-[400px]" 
            config={{
              price: { color: "#2563eb" },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, bottom: 50, left: 70 }}>
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
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-4 shadow-lg">
                          <p className="font-semibold mb-2">{data.month}</p>
                          <p className="text-sm mb-1">Average Price: {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(data.averagePrice)}</p>
                          <p className="text-sm mb-2">Number of Sales: {data.count}</p>
                          <div className="border-t pt-2">
                            <p className="text-sm font-semibold mb-1">Transactions:</p>
                            {data.transactions.map((t, i) => (
                              <p key={i} className="text-xs">
                                {t.address}: {new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                }).format(t.price)}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="averagePrice" 
                  fill="var(--color-price)" 
                  name="Average Price"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>
    </main>
  );
}
