import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

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
    <main className="w-full">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold">Financial Calculators</h1>
        </div>
      </header>
      <div className="w-full mx-auto border p-6">
      <Tabs defaultValue="mortgage" className="w-full">
        <TabsList className="w-full flex flex-wrap gap-1">
          <TabsTrigger value="mortgage" className="flex-1 h-10 text-sm sm:text-base">Mortgage</TabsTrigger>
          <TabsTrigger value="refinance" className="flex-1 h-10 text-sm sm:text-base">Refinance</TabsTrigger>
          <TabsTrigger value="rent" className="flex-1 h-10 text-sm sm:text-base">Rent vs Buy</TabsTrigger>
        </TabsList>

        <TabsContent value="mortgage" className="w-full overflow-visible px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <div className="space-y-6 w-full">
              <div className="space-y-4">
                <label className="text-sm font-medium">Purchase Price</label>
                <Input
                  type="number"
                  value={mortgageInputs.purchasePrice}
                  onChange={(e) => setMortgageInputs({...mortgageInputs, purchasePrice: Number(e.target.value)})}
                  placeholder="Enter purchase price"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Down Payment (${mortgageInputs.downPayment})</label>
                <Slider
                  value={[mortgageInputs.downPayment / mortgageInputs.purchasePrice * 100]}
                  onValueChange={(value) => setMortgageInputs({
                    ...mortgageInputs,
                    downPayment: Math.round(mortgageInputs.purchasePrice * value[0] / 100)
                  })}
                  max={100}
                  step={1}
                />
                <div className="text-sm text-muted-foreground">{(mortgageInputs.downPayment / mortgageInputs.purchasePrice * 100).toFixed(1)}%</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Interest Rate ({mortgageInputs.interestRate}%)</label>
                <Slider
                  value={[mortgageInputs.interestRate]}
                  onValueChange={(value) => setMortgageInputs({...mortgageInputs, interestRate: value[0]})}
                  max={10}
                  step={0.1}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Loan Term</label>
                  <select 
                    className="w-full h-9 px-3 rounded-md border mt-2 dark:text-white bg-background"
                    value={mortgageInputs.loanTerm}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, loanTerm: e.target.value})}
                  >
                    <option value="30">30 Years</option>
                    <option value="15">15 Years</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Annual Tax Rate ({mortgageInputs.taxRate}%)</label>
                  <Slider
                    value={[mortgageInputs.taxRate]}
                    onValueChange={(value) => setMortgageInputs({
                      ...mortgageInputs,
                      taxRate: value[0],
                      annualTaxes: Math.round(mortgageInputs.purchasePrice * value[0] / 100)
                    })}
                    max={3}
                    step={0.1}
                  />
                  <div className="text-sm text-muted-foreground">Annual Tax: ${mortgageInputs.annualTaxes.toLocaleString()}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Annual Insurance ($)</label>
                  <Input
                    type="number"
                    value={mortgageInputs.annualInsurance}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, annualInsurance: Number(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Monthly HOA ($)</label>
                <Input
                  type="number"
                  value={mortgageInputs.monthlyHOA}
                  onChange={(e) => setMortgageInputs({...mortgageInputs, monthlyHOA: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="bg-black text-white p-6 lg:p-8 rounded-lg h-fit">
              <div className="text-center mb-8">
                <div className="text-5xl font-bold">${monthlyPayment.total.toFixed(2)}</div>
                <div className="text-sm opacity-80 mt-2">MONTHLY PAYMENT</div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <div>Principal & Interest</div>
                  <div>${monthlyPayment.principal.toFixed(2)}</div>
                </div>
                <div className="flex justify-between">
                  <div>Monthly Taxes</div>
                  <div>${monthlyPayment.taxes.toFixed(2)}</div>
                </div>
                <div className="flex justify-between">
                  <div>Monthly HOA</div>
                  <div>${monthlyPayment.hoa.toFixed(2)}</div>
                </div>
                <div className="flex justify-between">
                  <div>Monthly Insurance</div>
                  <div>${monthlyPayment.insurance.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="bg-background border rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Amortization Schedule</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={Array.from({length: Number(mortgageInputs.loanTerm) * 12}, (_, i) => {
                      const month = i + 1;
                      const principal = mortgageInputs.purchasePrice - mortgageInputs.downPayment;
                      const monthlyRate = mortgageInputs.interestRate / 100 / 12;
                      const payment = monthlyPayment.principal;

                      let remainingBalance = principal * Math.pow(1 + monthlyRate, month) - 
                        (payment * (Math.pow(1 + monthlyRate, month) - 1)) / monthlyRate;

                      let totalInterest = (payment * month) - (principal - remainingBalance);

                      return {
                        month,
                        balance: Math.max(0, remainingBalance),
                        totalInterest: Math.max(0, totalInterest)
                      };
                    })}
                    margin={{ top: 20, right: 30, left: 70, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`}
                      label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft', offset: -60 }}
                    />
                    <Tooltip 
                      formatter={(value: number) => `$${value.toFixed(2)}`}
                      labelFormatter={(label) => `Month ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#000000" 
                      name="Remaining Balance"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalInterest" 
                      stroke="#16a34a" 
                      name="Total Interest Paid"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="refinance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
            <div className="space-y-6 w-full">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Current Loan</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Loan Balance ($)</label>
                    <Input
                      type="number"
                      value={refinanceInputs.currentBalance}
                      onChange={(e) => setRefinanceInputs({...refinanceInputs, currentBalance: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Monthly Payment ($)</label>
                    <Input
                      type="number"
                      value={refinanceInputs.currentPayment}
                      onChange={(e) => setRefinanceInputs({...refinanceInputs, currentPayment: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Interest Rate (%)</label>
                    <Input
                      type="number"
                      value={refinanceInputs.currentRate}
                      onChange={(e) => setRefinanceInputs({...refinanceInputs, currentRate: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">New Loan</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Term (Years)</label>
                    <select 
                      className="w-full h-9 px-3 rounded-md border mt-2 dark:text-white bg-background"
                      value={refinanceInputs.newTerm}
                      onChange={(e) => setRefinanceInputs({...refinanceInputs, newTerm: Number(e.target.value)})}
                    >
                      <option value="30">30 Years</option>
                      <option value="20">20 Years</option>
                      <option value="15">15 Years</option>
                      <option value="10">10 Years</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Interest Rate (%)</label>
                    <Input
                      type="number"
                      value={refinanceInputs.newRate}
                      onChange={(e) => setRefinanceInputs({...refinanceInputs, newRate: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Closing Costs ($)</label>
                    <Input
                      type="number"
                      value={refinanceInputs.closingCosts}
                      onChange={(e) => setRefinanceInputs({...refinanceInputs, closingCosts: Number(e.target.value)})}
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <div className="bg-background border p-6 rounded-lg">
                <p className="text-foreground text-sm leading-relaxed">
                  Refinancing ${(refinanceInputs.currentBalance/1000).toFixed(0)}k at {refinanceInputs.newRate}% over {refinanceInputs.newTerm}y will 
                  {calculateMonthlySavings() > 0 ? ' decrease ' : ' increase '} 
                  monthly payments by ${Math.abs(calculateMonthlySavings()).toFixed(0)}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-card p-6 rounded-lg border">
                  <h4 className="text-foreground text-lg font-semibold mb-4">Current Loan</h4>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between text-foreground">
                      <span>Monthly Payment</span>
                      <span>${refinanceInputs.currentPayment.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-foreground">
                      <span>Interest Rate</span>
                      <span>{refinanceInputs.currentRate}%</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-foreground">
                      <span>Total Interest</span>
                      <span>${((refinanceInputs.currentPayment * refinanceInputs.newTerm * 12 - refinanceInputs.currentBalance)/1000).toFixed(0)}k</span>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-6 rounded-lg border">
                  <h4 className="text-foreground text-lg font-semibold mb-4">Refinanced Loan</h4>
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between text-foreground">
                      <span>Monthly Payment</span>
                      <span className="text-emerald-500">${calculateNewPayment().toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-foreground">
                      <span>Interest Rate</span>
                      <span className="text-emerald-500">{refinanceInputs.newRate}%</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between text-foreground">
                      <span>Total Interest</span>
                      <span className="text-emerald-500">${((calculateNewPayment() * refinanceInputs.newTerm * 12 - refinanceInputs.currentBalance)/1000).toFixed(0)}k</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-black text-white p-6 rounded-lg">
                <div className="space-y-4 text-center">
                  <div className="space-y-1">
                    <div>Monthly Savings</div>
                    <div className="text-2xl font-bold text-emerald-400">${calculateMonthlySavings().toFixed(2)}</div>
                  </div>
                  <div className="space-y-1">
                    <div>Break-even Period</div>
                    <div>{calculateBreakEven()} months</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rent">
          {/* Existing rent vs buy calculator content */}
        </TabsContent>
      </Tabs>
      </div>
    </main>
  );
}