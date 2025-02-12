
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

  const monthlyData = transactions.reduce((acc, transaction) => {
    if (transaction.closingDate) {
      const date = new Date(transaction.closingDate);
      const monthKey = format(date, 'MMM yyyy');
      const price = transaction.price || 0;
      const commission = price * 0.03; // Assuming 3% commission

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, volume: 0, commission: 0 };
      }
      acc[monthKey].volume += price;
      acc[monthKey].commission += commission;
    }
    return acc;
  }, {} as Record<string, { month: string; volume: number; commission: number; }>);

  const chartData = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  if (!user || user.role !== 'agent') {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold mb-8">Performance Data</h2>
      <div className="grid gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Sales Volume</h3>
          <ChartContainer 
            className="h-[400px]" 
            config={{
              volume: { color: "#2563eb" },
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
              <Bar dataKey="volume" fill="var(--color-volume)" />
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Commission</h3>
          <ChartContainer 
            className="h-[400px]" 
            config={{
              commission: { color: "#16a34a" },
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
              <Bar dataKey="commission" fill="var(--color-commission)" />
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>
    </main>
  );
}
