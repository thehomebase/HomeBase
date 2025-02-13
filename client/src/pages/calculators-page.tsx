import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

// Placeholder components and function - Replace with actual Recharts implementation
const RechartsPrimitive = { ComposedChart: ({ children, data }) => <div>{children} Data: {JSON.stringify(data)}</div>, CartesianGrid: () => null, XAxis: ({ children }) => <div>{children}</div>, YAxis: ({ children }) => <div>{children}</div>, Tooltip: ({ content }) => <div>{content}</div>, Legend: ({ content }) => <div>{content}</div>, Bar: () => null, Line: () => null };
const ChartContainer = ({ children, config }) => <div style={{ border: "1px solid #ccc" }}>{children}</div>;
const ChartTooltipContent = () => <div>Tooltip</div>;
const ChartLegendContent = () => <div>Legend</div>;

const generateAmortizationData = () => {
  // Placeholder data - Replace with actual amortization calculation
  return [
    { year: 1, principal: 10000, interest: 5000, balance: 100000 },
    { year: 2, principal: 12000, interest: 4000, balance: 88000 },
    { year: 3, principal: 14000, interest: 3000, balance: 74000 },
    { year: 4, principal: 16000, interest: 2000, balance: 58000 },
    { year: 5, principal: 18000, interest: 1000, balance: 40000 },
  ];
};

export default function CalculatorsPage() {
  const [refinanceInputs, setRefinanceInputs] = useState({
    currentBalance: 200000,
    currentPayment: 1200,
    currentRate: 5,
    newTerm: 30,
    newRate: 4,
    closingCosts: 3000
  });

  const calculateNewPayment = () => {
    const p = refinanceInputs.currentBalance;
    const r = refinanceInputs.newRate / 100 / 12;
    const n = refinanceInputs.newTerm * 12;
    return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const calculateMonthlySavings = () => {
    return Math.max(0, refinanceInputs.currentPayment - calculateNewPayment());
  };

  const calculateInterestSavings = () => {
    const currentTotalCost = refinanceInputs.currentPayment * (refinanceInputs.newTerm * 12);
    const newTotalCost = calculateNewPayment() * (refinanceInputs.newTerm * 12);
    return currentTotalCost - newTotalCost - refinanceInputs.closingCosts;
  };

  const calculateBreakEven = () => {
    const monthlySavings = calculateMonthlySavings();
    return monthlySavings > 0 ? Math.ceil(refinanceInputs.closingCosts / monthlySavings) : 0;
  };

  const [mortgageInputs, setMortgageInputs] = useState({
    purchasePrice: 250000,
    downPayment: 12500,
    annualTaxes: 2500,
    taxRate: 1,
    interestRate: 5,
    loanTerm: "30",
    annualInsurance: 600,
    monthlyHOA: 50
  });

  const [monthlyPayment, setMonthlyPayment] = useState({
    total: 0,
    principal: 0,
    taxes: 0,
    insurance: 0,
    hoa: 50
  });

  useEffect(() => {
    const principal = mortgageInputs.purchasePrice - mortgageInputs.downPayment;
    const monthlyRate = mortgageInputs.interestRate / 100 / 12;
    const numberOfPayments = Number(mortgageInputs.loanTerm) * 12;

    const monthlyPrincipal = 
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

    const monthlyTaxes = mortgageInputs.annualTaxes / 12;
    const monthlyInsurance = mortgageInputs.annualInsurance / 12;

    setMonthlyPayment({
      principal: monthlyPrincipal,
      taxes: monthlyTaxes,
      insurance: monthlyInsurance,
      hoa: mortgageInputs.monthlyHOA,
      total: monthlyPrincipal + monthlyTaxes + monthlyInsurance + mortgageInputs.monthlyHOA
    });
  }, [mortgageInputs]);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Financial Calculators</h1>

      <Tabs defaultValue="mortgage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mortgage">Mortgage Calculator</TabsTrigger>
          <TabsTrigger value="refinance">Refinance Calculator</TabsTrigger>
          <TabsTrigger value="rent">Rent vs Buy</TabsTrigger>
        </TabsList>

        <TabsContent value="mortgage">
          {/* Mortgage Calculator Content */}
        </TabsContent>

        <TabsContent value="refinance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Refinancing Inputs */}
            <div className="space-y-6">
              <Card className="p-6">
                {/* Current Loan Inputs */}
              </Card>

              <Card className="p-6">
                {/* New Loan Inputs */}
              </Card>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border">
                {/* Refinancing Summary */}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Current vs Refinanced Loan Summary */}
              </div>

              <div className="space-y-6">
                <div className="bg-black text-white p-6 rounded-lg">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Monthly Savings</span>
                      <span className="text-2xl font-bold text-emerald-400">${calculateMonthlySavings().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Break-even Period</span>
                      <span>{calculateBreakEven()} months</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <h4 className="text-lg font-semibold mb-4">Amortization Schedule</h4>
                  <ChartContainer
                    className="h-[300px]"
                    config={{
                      balance: { color: "#000000" },
                      principal: { color: "#4f46e5" },
                      interest: { color: "#fbbf24" }
                    }}
                  >
                    <RechartsPrimitive.ComposedChart data={generateAmortizationData()}>
                      <RechartsPrimitive.CartesianGrid strokeDasharray="3 3" />
                      <RechartsPrimitive.XAxis dataKey="year" />
                      <RechartsPrimitive.YAxis width={80} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                      <RechartsPrimitive.Tooltip content={<ChartTooltipContent />} />
                      <RechartsPrimitive.Legend content={<ChartLegendContent />} />
                      <RechartsPrimitive.Bar dataKey="principal" stackId="a" fill="var(--color-principal)" />
                      <RechartsPrimitive.Bar dataKey="interest" stackId="a" fill="var(--color-interest)" />
                      <RechartsPrimitive.Line type="monotone" dataKey="balance" stroke="var(--color-balance)" />
                    </RechartsPrimitive.ComposedChart>
                  </ChartContainer>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rent">
          {/* Rent vs Buy Calculator Content */}
        </TabsContent>
      </Tabs>
    </main>
  );
}