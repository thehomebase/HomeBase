
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";

export default function CalculatorsPage() {
  const [mortgageInputs, setMortgageInputs] = useState({
    purchasePrice: 250000,
    downPayment: 12500,
    annualTaxes: 2500,
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
          <TabsTrigger value="rent">Rent vs Buy</TabsTrigger>
        </TabsList>

        <TabsContent value="mortgage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Annual Taxes ($)</label>
                  <Input
                    type="number"
                    value={mortgageInputs.annualTaxes}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, annualTaxes: Number(e.target.value)})}
                  />
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

            <div className="bg-black text-white p-8 rounded-lg">
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
          </div>
        </TabsContent>

        <TabsContent value="rent">
          {/* Existing rent vs buy calculator content */}
        </TabsContent>
      </Tabs>
    </main>
  );
}
