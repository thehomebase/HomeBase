
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CalculatorsPage() {
  const [mortgageInputs, setMortgageInputs] = useState({
    homePrice: "",
    downPayment: "",
    interestRate: "",
    loanTerm: "30"
  });

  const [rentInputs, setRentInputs] = useState({
    monthlyRent: "",
    homePrice: "",
    downPayment: "",
    interestRate: ""
  });

  const calculateMortgage = () => {
    const principal = Number(mortgageInputs.homePrice) - Number(mortgageInputs.downPayment);
    const monthlyRate = Number(mortgageInputs.interestRate) / 100 / 12;
    const numberOfPayments = Number(mortgageInputs.loanTerm) * 12;
    
    const monthlyPayment = 
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    return isNaN(monthlyPayment) ? 0 : monthlyPayment;
  };

  const calculateRentVsBuy = () => {
    const monthlyRent = Number(rentInputs.monthlyRent);
    const mortgage = calculateMortgage();
    const propertyTax = Number(rentInputs.homePrice) * 0.015 / 12; // Estimated
    const insurance = 1200 / 12; // Estimated annual insurance
    const maintenance = Number(rentInputs.homePrice) * 0.01 / 12; // Estimated 1% annual maintenance
    
    return {
      monthlyRent,
      monthlyOwnership: mortgage + propertyTax + insurance + maintenance
    };
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Financial Calculators</h1>
      
      <Tabs defaultValue="mortgage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mortgage">Mortgage Calculator</TabsTrigger>
          <TabsTrigger value="rent">Rent vs Buy</TabsTrigger>
        </TabsList>

        <TabsContent value="mortgage">
          <Card>
            <CardHeader>
              <CardTitle>Mortgage Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Home Price</label>
                  <Input
                    type="number"
                    value={mortgageInputs.homePrice}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, homePrice: e.target.value})}
                    placeholder="Enter home price"
                  />
                </div>
                <div>
                  <label className="text-sm">Down Payment</label>
                  <Input
                    type="number"
                    value={mortgageInputs.downPayment}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, downPayment: e.target.value})}
                    placeholder="Enter down payment"
                  />
                </div>
                <div>
                  <label className="text-sm">Interest Rate (%)</label>
                  <Input
                    type="number"
                    value={mortgageInputs.interestRate}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, interestRate: e.target.value})}
                    placeholder="Enter interest rate"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="text-sm">Loan Term (Years)</label>
                  <select 
                    className="w-full p-2 border rounded"
                    value={mortgageInputs.loanTerm}
                    onChange={(e) => setMortgageInputs({...mortgageInputs, loanTerm: e.target.value})}
                  >
                    <option value="30">30 Years</option>
                    <option value="15">15 Years</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-lg font-semibold">
                  Monthly Payment: ${calculateMortgage().toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rent">
          <Card>
            <CardHeader>
              <CardTitle>Rent vs Buy Calculator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">Monthly Rent</label>
                  <Input
                    type="number"
                    value={rentInputs.monthlyRent}
                    onChange={(e) => setRentInputs({...rentInputs, monthlyRent: e.target.value})}
                    placeholder="Enter monthly rent"
                  />
                </div>
                <div>
                  <label className="text-sm">Home Price</label>
                  <Input
                    type="number"
                    value={rentInputs.homePrice}
                    onChange={(e) => setRentInputs({...rentInputs, homePrice: e.target.value})}
                    placeholder="Enter home price"
                  />
                </div>
                <div>
                  <label className="text-sm">Down Payment</label>
                  <Input
                    type="number"
                    value={rentInputs.downPayment}
                    onChange={(e) => setRentInputs({...rentInputs, downPayment: e.target.value})}
                    placeholder="Enter down payment"
                  />
                </div>
                <div>
                  <label className="text-sm">Interest Rate (%)</label>
                  <Input
                    type="number"
                    value={rentInputs.interestRate}
                    onChange={(e) => setRentInputs({...rentInputs, interestRate: e.target.value})}
                    placeholder="Enter interest rate"
                    step="0.1"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                {calculateRentVsBuy().monthlyRent > 0 && (
                  <>
                    <p className="font-semibold">Monthly Rent: ${calculateRentVsBuy().monthlyRent.toFixed(2)}</p>
                    <p className="font-semibold">Monthly Cost of Ownership: ${calculateRentVsBuy().monthlyOwnership.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">*Includes estimated property tax, insurance, and maintenance</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
