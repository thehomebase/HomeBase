import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Calculator, Home, RefreshCw, DollarSign, TrendingUp, BookOpen, Mail, Check, X, ChevronDown, ChevronUp, Building2, Shield, Star, Landmark, Banknote, HelpCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDec(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function calcMonthlyPayment(principal: number, annualRate: number, years: number) {
  if (principal <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function ResultCard({ label, value, sub, dark }: { label: string; value: string; sub?: string; dark?: boolean }) {
  return (
    <div className={`rounded-xl p-5 ${dark ? "bg-foreground text-background" : "bg-muted/50 border"}`}>
      <div className="text-xs uppercase tracking-wider opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs opacity-60 mt-1">{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Label className="text-sm font-medium text-foreground">{children}</Label>;
}

function EmailResultsButton({ onEmail }: { onEmail: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    setSending(true);
    try {
      await onEmail();
      setSent(true);
      toast({ title: "Results sent!", description: "Check your email for your calculation results." });
      setTimeout(() => setSent(false), 3000);
    } catch {
      toast({ title: "Could not send", description: "Please try again later.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={handleSend} disabled={sending || sent}>
      {sent ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
      {sent ? "Sent!" : sending ? "Sending..." : "Email Results"}
    </Button>
  );
}

const PIE_COLORS = ["hsl(var(--primary))", "#64748b", "#94a3b8", "#cbd5e1"];

function MortgageCalculator() {
  const [inputs, setInputs] = useState({
    address: "",
    purchasePrice: 350000,
    downPaymentPct: 20,
    interestRate: 6.5,
    loanTerm: 30,
    taxRate: 1.2,
    annualInsurance: 1800,
    monthlyHOA: 0,
    pmi: 0,
  });

  const downPayment = Math.round(inputs.purchasePrice * inputs.downPaymentPct / 100);
  const loanAmount = inputs.purchasePrice - downPayment;
  const needsPMI = inputs.downPaymentPct < 20;

  const pmiMonthly = needsPMI ? Math.round(loanAmount * 0.005 / 12) : 0;

  const monthly = useMemo(() => {
    const pi = calcMonthlyPayment(loanAmount, inputs.interestRate, inputs.loanTerm);
    const taxes = (inputs.purchasePrice * inputs.taxRate / 100) / 12;
    const insurance = inputs.annualInsurance / 12;
    const hoa = inputs.monthlyHOA;
    const pmi = pmiMonthly;
    return { pi, taxes, insurance, hoa, pmi, total: pi + taxes + insurance + hoa + pmi };
  }, [inputs, loanAmount, pmiMonthly]);

  const pieData = [
    { name: "Principal & Interest", value: Math.round(monthly.pi) },
    { name: "Taxes", value: Math.round(monthly.taxes) },
    { name: "Insurance", value: Math.round(monthly.insurance) },
    ...(monthly.hoa > 0 ? [{ name: "HOA", value: monthly.hoa }] : []),
    ...(monthly.pmi > 0 ? [{ name: "PMI", value: monthly.pmi }] : []),
  ];

  const amortData = useMemo(() => {
    const r = inputs.interestRate / 100 / 12;
    const n = inputs.loanTerm * 12;
    const pmt = monthly.pi;
    const data = [];
    let balance = loanAmount;
    let totalInterest = 0;
    let totalPrincipal = 0;
    for (let year = 1; year <= inputs.loanTerm; year++) {
      for (let m = 0; m < 12; m++) {
        const intPmt = balance * r;
        const prinPmt = pmt - intPmt;
        totalInterest += intPmt;
        totalPrincipal += prinPmt;
        balance = Math.max(0, balance - prinPmt);
      }
      data.push({ year, balance: Math.round(balance), totalInterest: Math.round(totalInterest), equity: Math.round(downPayment + totalPrincipal) });
    }
    return data;
  }, [inputs, loanAmount, monthly.pi, downPayment]);

  const totalInterest = amortData.length > 0 ? amortData[amortData.length - 1].totalInterest : 0;

  const handleEmail = async () => {
    await apiRequest("POST", "/api/calculators/email-results", {
      type: "mortgage",
      results: {
        address: inputs.address || "Not specified",
        purchasePrice: inputs.purchasePrice,
        downPayment,
        downPaymentPct: inputs.downPaymentPct,
        loanAmount,
        interestRate: inputs.interestRate,
        loanTerm: inputs.loanTerm,
        monthlyPayment: monthly.total,
        principalAndInterest: monthly.pi,
        monthlyTaxes: monthly.taxes,
        monthlyInsurance: monthly.insurance,
        monthlyHOA: monthly.hoa,
        monthlyPMI: monthly.pmi,
        totalInterest,
      }
    });
  };

  const update = (field: string, val: number | string) => setInputs(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Mortgage Calculator</h2>
          <p className="text-sm text-muted-foreground">Estimate your monthly mortgage payment</p>
        </div>
        <EmailResultsButton onEmail={handleEmail} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-5">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <SectionLabel>Property Address (optional)</SectionLabel>
                <Input placeholder="e.g. 123 Main St, Dallas, TX 75201" value={inputs.address} onChange={e => update("address", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Purchase Price</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.purchasePrice} onChange={e => update("purchasePrice", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Down Payment ({inputs.downPaymentPct}% = {fmt(downPayment)})</SectionLabel>
                  <Slider value={[inputs.downPaymentPct]} onValueChange={v => update("downPaymentPct", v[0])} min={0} max={100} step={1} />
                  {needsPMI && <p className="text-xs text-amber-600">PMI required (under 20% down)</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Interest Rate ({inputs.interestRate}%)</SectionLabel>
                  <Slider value={[inputs.interestRate]} onValueChange={v => update("interestRate", v[0])} min={1} max={12} step={0.125} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Loan Term</SectionLabel>
                  <select className="w-full h-9 px-3 rounded-md border bg-background text-sm" value={inputs.loanTerm} onChange={e => update("loanTerm", Number(e.target.value))}>
                    <option value={30}>30 Years</option>
                    <option value={20}>20 Years</option>
                    <option value={15}>15 Years</option>
                    <option value={10}>10 Years</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Property Tax Rate ({inputs.taxRate}%)</SectionLabel>
                  <Slider value={[inputs.taxRate]} onValueChange={v => update("taxRate", v[0])} min={0} max={4} step={0.05} />
                  <p className="text-xs text-muted-foreground">{fmt(inputs.purchasePrice * inputs.taxRate / 100)}/yr</p>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Annual Insurance</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.annualInsurance} onChange={e => update("annualInsurance", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Monthly HOA</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.monthlyHOA} onChange={e => update("monthlyHOA", Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Amortization Schedule</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={amortData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: "Year", position: "insideBottom", offset: -3, fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={l => `Year ${l}`} />
                    <Area type="monotone" dataKey="equity" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} name="Equity" />
                    <Area type="monotone" dataKey="balance" stackId="2" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} name="Balance" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-foreground text-background p-6">
            <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Estimated Monthly Payment</div>
            <div className="text-4xl font-bold mb-4">{fmtDec(monthly.total)}</div>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="opacity-70">Principal & Interest</span><span>{fmtDec(monthly.pi)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Property Taxes</span><span>{fmtDec(monthly.taxes)}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Home Insurance</span><span>{fmtDec(monthly.insurance)}</span></div>
              {monthly.hoa > 0 && <div className="flex justify-between"><span className="opacity-70">HOA</span><span>{fmtDec(monthly.hoa)}</span></div>}
              {monthly.pmi > 0 && <div className="flex justify-between"><span className="opacity-70">PMI</span><span>{fmtDec(monthly.pmi)}</span></div>}
              <div className="border-t border-background/20 pt-2 flex justify-between font-semibold"><span>Total</span><span>{fmtDec(monthly.total)}</span></div>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Loan Amount" value={fmt(loanAmount)} />
            <ResultCard label="Down Payment" value={fmt(downPayment)} sub={`${inputs.downPaymentPct}%`} />
            <ResultCard label="Total Interest" value={fmt(totalInterest)} />
            <ResultCard label="Total Cost" value={fmt(inputs.purchasePrice + totalInterest)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AffordabilityCalculator() {
  const [inputs, setInputs] = useState({
    annualIncome: 85000,
    monthlyDebts: 500,
    downPaymentSaved: 50000,
    interestRate: 6.5,
    loanTerm: 30,
    taxRate: 1.2,
    insuranceRate: 0.5,
    dtiTarget: 36,
  });

  const monthlyIncome = inputs.annualIncome / 12;
  const maxMonthlyPayment = monthlyIncome * (inputs.dtiTarget / 100) - inputs.monthlyDebts;

  const maxHomePrice = useMemo(() => {
    if (maxMonthlyPayment <= 0) return 0;
    const monthlyTaxInsurance = (rate: number) => rate / 100 / 12;
    const r = inputs.interestRate / 100 / 12;
    const n = inputs.loanTerm * 12;
    const piRatio = r > 0 ? (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : 1 / n;

    let lo = 0, hi = 2000000;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      const loan = mid - inputs.downPaymentSaved;
      if (loan <= 0) { lo = mid; continue; }
      const pi = loan * piRatio;
      const tax = mid * monthlyTaxInsurance(inputs.taxRate);
      const ins = mid * monthlyTaxInsurance(inputs.insuranceRate);
      const total = pi + tax + ins;
      if (total < maxMonthlyPayment) lo = mid; else hi = mid;
    }
    return Math.round(lo);
  }, [inputs, maxMonthlyPayment]);

  const loanAmount = Math.max(0, maxHomePrice - inputs.downPaymentSaved);
  const estimatedPayment = calcMonthlyPayment(loanAmount, inputs.interestRate, inputs.loanTerm) +
    (maxHomePrice * inputs.taxRate / 100 / 12) +
    (maxHomePrice * inputs.insuranceRate / 100 / 12);

  const handleEmail = async () => {
    await apiRequest("POST", "/api/calculators/email-results", {
      type: "affordability",
      results: { annualIncome: inputs.annualIncome, monthlyDebts: inputs.monthlyDebts, downPaymentSaved: inputs.downPaymentSaved, maxHomePrice, maxMonthlyPayment, estimatedPayment, dtiTarget: inputs.dtiTarget }
    });
  };

  const update = (field: string, val: number) => setInputs(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Affordability Calculator</h2>
          <p className="text-sm text-muted-foreground">Find out how much home you can afford</p>
        </div>
        <EmailResultsButton onEmail={handleEmail} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Annual Household Income</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.annualIncome} onChange={e => update("annualIncome", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Monthly Debts (car, student loans, etc.)</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.monthlyDebts} onChange={e => update("monthlyDebts", Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Down Payment Saved</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.downPaymentSaved} onChange={e => update("downPaymentSaved", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Target DTI Ratio ({inputs.dtiTarget}%)</SectionLabel>
                  <Slider value={[inputs.dtiTarget]} onValueChange={v => update("dtiTarget", v[0])} min={20} max={50} step={1} />
                  <p className="text-xs text-muted-foreground">Lenders typically prefer 36% or below</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Interest Rate ({inputs.interestRate}%)</SectionLabel>
                  <Slider value={[inputs.interestRate]} onValueChange={v => update("interestRate", v[0])} min={1} max={12} step={0.125} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Loan Term</SectionLabel>
                  <select className="w-full h-9 px-3 rounded-md border bg-background text-sm" value={inputs.loanTerm} onChange={e => update("loanTerm", Number(e.target.value))}>
                    <option value={30}>30 Years</option>
                    <option value={20}>20 Years</option>
                    <option value={15}>15 Years</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Tax Rate ({inputs.taxRate}%)</SectionLabel>
                  <Slider value={[inputs.taxRate]} onValueChange={v => update("taxRate", v[0])} min={0} max={4} step={0.05} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-foreground text-background p-6 text-center">
            <div className="text-xs uppercase tracking-wider opacity-60 mb-1">You Can Afford Up To</div>
            <div className="text-4xl font-bold mb-2">{fmt(maxHomePrice)}</div>
            <div className="text-sm opacity-70">Estimated monthly payment: {fmtDec(estimatedPayment)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Max Monthly Payment" value={fmtDec(maxMonthlyPayment)} sub={`at ${inputs.dtiTarget}% DTI`} />
            <ResultCard label="Loan Amount" value={fmt(loanAmount)} />
            <ResultCard label="Monthly Income" value={fmtDec(monthlyIncome)} />
            <ResultCard label="Down Payment" value={fmt(inputs.downPaymentSaved)} sub={maxHomePrice > 0 ? `${(inputs.downPaymentSaved / maxHomePrice * 100).toFixed(1)}%` : ""} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RefinanceCalculator() {
  const [inputs, setInputs] = useState({
    currentBalance: 250000,
    currentRate: 7.0,
    currentTerm: 25,
    newRate: 5.5,
    newTerm: 30,
    closingCosts: 4000,
  });

  const currentPayment = calcMonthlyPayment(inputs.currentBalance, inputs.currentRate, inputs.currentTerm);
  const newPayment = calcMonthlyPayment(inputs.currentBalance, inputs.newRate, inputs.newTerm);
  const monthlySavings = currentPayment - newPayment;
  const breakEven = monthlySavings > 0 ? Math.ceil(inputs.closingCosts / monthlySavings) : 0;
  const currentTotalInterest = (currentPayment * inputs.currentTerm * 12) - inputs.currentBalance;
  const newTotalInterest = (newPayment * inputs.newTerm * 12) - inputs.currentBalance;
  const lifetimeSavings = currentTotalInterest - newTotalInterest - inputs.closingCosts;

  const handleEmail = async () => {
    await apiRequest("POST", "/api/calculators/email-results", {
      type: "refinance",
      results: { currentBalance: inputs.currentBalance, currentRate: inputs.currentRate, currentPayment, newRate: inputs.newRate, newPayment, monthlySavings, breakEven, lifetimeSavings, closingCosts: inputs.closingCosts }
    });
  };

  const update = (field: string, val: number) => setInputs(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Refinance Calculator</h2>
          <p className="text-sm text-muted-foreground">See if refinancing makes sense for you</p>
        </div>
        <EmailResultsButton onEmail={handleEmail} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Building2 className="h-4 w-4" /> Current Loan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <SectionLabel>Remaining Balance</SectionLabel>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="number" className="pl-9" value={inputs.currentBalance} onChange={e => update("currentBalance", Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <SectionLabel>Interest Rate ({inputs.currentRate}%)</SectionLabel>
                    <Slider value={[inputs.currentRate]} onValueChange={v => update("currentRate", v[0])} min={1} max={12} step={0.125} />
                  </div>
                  <div className="space-y-2">
                    <SectionLabel>Years Remaining</SectionLabel>
                    <Input type="number" value={inputs.currentTerm} onChange={e => update("currentTerm", Number(e.target.value))} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><RefreshCw className="h-4 w-4" /> New Loan</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <SectionLabel>New Rate ({inputs.newRate}%)</SectionLabel>
                    <Slider value={[inputs.newRate]} onValueChange={v => update("newRate", v[0])} min={1} max={12} step={0.125} />
                  </div>
                  <div className="space-y-2">
                    <SectionLabel>New Term</SectionLabel>
                    <select className="w-full h-9 px-3 rounded-md border bg-background text-sm" value={inputs.newTerm} onChange={e => update("newTerm", Number(e.target.value))}>
                      <option value={30}>30 Years</option>
                      <option value={20}>20 Years</option>
                      <option value={15}>15 Years</option>
                      <option value={10}>10 Years</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <SectionLabel>Closing Costs</SectionLabel>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="number" className="pl-9" value={inputs.closingCosts} onChange={e => update("closingCosts", Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={`rounded-xl p-6 ${monthlySavings > 0 ? "bg-foreground text-background" : "bg-muted/50 border"}`}>
            <div className="text-xs uppercase tracking-wider opacity-60 mb-1">Monthly Savings</div>
            <div className="text-4xl font-bold">{monthlySavings > 0 ? "+" : ""}{fmtDec(monthlySavings)}</div>
            <div className="text-sm opacity-70 mt-1">{monthlySavings > 0 ? `Break even in ${breakEven} months` : "Refinancing would increase your payment"}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Current Payment" value={fmtDec(currentPayment)} />
            <ResultCard label="New Payment" value={fmtDec(newPayment)} />
            <ResultCard label="Current Total Interest" value={fmt(currentTotalInterest)} />
            <ResultCard label="New Total Interest" value={fmt(newTotalInterest)} />
          </div>

          <ResultCard label="Lifetime Savings (incl. closing costs)" value={(lifetimeSavings > 0 ? "+" : "") + fmt(lifetimeSavings)} dark={lifetimeSavings > 0} />
        </div>
      </div>
    </div>
  );
}

function RentVsBuyCalculator() {
  const [inputs, setInputs] = useState({
    monthlyRent: 1800,
    annualRentIncrease: 3,
    homePrice: 350000,
    downPaymentPct: 20,
    interestRate: 6.5,
    loanTerm: 30,
    taxRate: 1.2,
    annualInsurance: 1800,
    maintenancePct: 1,
    homeAppreciation: 3,
    yearsToCompare: 10,
  });

  const downPayment = inputs.homePrice * inputs.downPaymentPct / 100;
  const loan = inputs.homePrice - downPayment;
  const monthlyPI = calcMonthlyPayment(loan, inputs.interestRate, inputs.loanTerm);
  const monthlyBuy = monthlyPI + (inputs.homePrice * inputs.taxRate / 100 / 12) + (inputs.annualInsurance / 12) + (inputs.homePrice * inputs.maintenancePct / 100 / 12);

  const chartData = useMemo(() => {
    const data = [];
    let totalRent = 0;
    let totalBuy = downPayment;
    let rent = inputs.monthlyRent;
    let homeVal = inputs.homePrice;
    let balance = loan;
    const r = inputs.interestRate / 100 / 12;

    for (let yr = 1; yr <= inputs.yearsToCompare; yr++) {
      for (let m = 0; m < 12; m++) {
        totalRent += rent;
        totalBuy += monthlyBuy;
        const intPmt = balance * r;
        const prinPmt = monthlyPI - intPmt;
        balance = Math.max(0, balance - prinPmt);
      }
      rent *= (1 + inputs.annualRentIncrease / 100);
      homeVal *= (1 + inputs.homeAppreciation / 100);
      const equity = homeVal - balance;
      data.push({ year: yr, rentCost: Math.round(totalRent), buyCost: Math.round(totalBuy), homeValue: Math.round(homeVal), equity: Math.round(Math.max(0, equity)) });
    }
    return data;
  }, [inputs, downPayment, loan, monthlyPI, monthlyBuy]);

  const finalData = chartData[chartData.length - 1];
  const buyAdvantage = finalData ? finalData.rentCost - finalData.buyCost + finalData.equity - downPayment : 0;

  const handleEmail = async () => {
    await apiRequest("POST", "/api/calculators/email-results", {
      type: "rent_vs_buy",
      results: { monthlyRent: inputs.monthlyRent, monthlyBuyPayment: monthlyBuy, homePrice: inputs.homePrice, yearsCompared: inputs.yearsToCompare, totalRentCost: finalData?.rentCost, totalBuyCost: finalData?.buyCost, homeEquity: finalData?.equity, buyAdvantage }
    });
  };

  const update = (field: string, val: number) => setInputs(p => ({ ...p, [field]: val }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Rent vs. Buy Calculator</h2>
          <p className="text-sm text-muted-foreground">Compare the costs of renting versus buying over time</p>
        </div>
        <EmailResultsButton onEmail={handleEmail} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Monthly Rent</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.monthlyRent} onChange={e => update("monthlyRent", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Annual Rent Increase ({inputs.annualRentIncrease}%)</SectionLabel>
                  <Slider value={[inputs.annualRentIncrease]} onValueChange={v => update("annualRentIncrease", v[0])} min={0} max={10} step={0.5} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Home Purchase Price</SectionLabel>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={inputs.homePrice} onChange={e => update("homePrice", Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SectionLabel>Down Payment ({inputs.downPaymentPct}%)</SectionLabel>
                  <Slider value={[inputs.downPaymentPct]} onValueChange={v => update("downPaymentPct", v[0])} min={0} max={100} step={1} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <SectionLabel>Interest Rate ({inputs.interestRate}%)</SectionLabel>
                  <Slider value={[inputs.interestRate]} onValueChange={v => update("interestRate", v[0])} min={1} max={12} step={0.125} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Home Appreciation ({inputs.homeAppreciation}%/yr)</SectionLabel>
                  <Slider value={[inputs.homeAppreciation]} onValueChange={v => update("homeAppreciation", v[0])} min={-5} max={10} step={0.5} />
                </div>
                <div className="space-y-2">
                  <SectionLabel>Years to Compare</SectionLabel>
                  <select className="w-full h-9 px-3 rounded-md border bg-background text-sm" value={inputs.yearsToCompare} onChange={e => update("yearsToCompare", Number(e.target.value))}>
                    {[5, 7, 10, 15, 20, 30].map(y => <option key={y} value={y}>{y} Years</option>)}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Cost Over Time</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: "Year", position: "insideBottom", offset: -3, fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} labelFormatter={l => `Year ${l}`} />
                    <Line type="monotone" dataKey="rentCost" stroke="#ef4444" strokeWidth={2} name="Total Rent Paid" dot={false} />
                    <Line type="monotone" dataKey="buyCost" stroke="hsl(var(--primary))" strokeWidth={2} name="Total Buy Cost" dot={false} />
                    <Line type="monotone" dataKey="homeValue" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" name="Home Value" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={`rounded-xl p-6 ${buyAdvantage > 0 ? "bg-foreground text-background" : "bg-muted/50 border"}`}>
            <div className="text-xs uppercase tracking-wider opacity-60 mb-1">{buyAdvantage > 0 ? "Buying Saves You" : "Renting Saves You"}</div>
            <div className="text-4xl font-bold">{fmt(Math.abs(buyAdvantage))}</div>
            <div className="text-sm opacity-70 mt-1">Over {inputs.yearsToCompare} years</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ResultCard label="Monthly Rent" value={fmtDec(inputs.monthlyRent)} sub="Starting" />
            <ResultCard label="Monthly Buy" value={fmtDec(monthlyBuy)} sub="PITI + Maint." />
          </div>
          {finalData && (
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Total Rent Paid" value={fmt(finalData.rentCost)} sub={`Over ${inputs.yearsToCompare} yrs`} />
              <ResultCard label="Total Buy Cost" value={fmt(finalData.buyCost)} />
              <ResultCard label="Home Value" value={fmt(finalData.homeValue)} sub={`at ${inputs.homeAppreciation}%/yr`} />
              <ResultCard label="Home Equity" value={fmt(finalData.equity)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FINANCING_OPTIONS = [
  {
    name: "Conventional Loan",
    icon: Landmark,
    color: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    tagColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    description: "Traditional mortgage not backed by a government agency. Most common loan type for borrowers with good credit.",
    downPayment: "3% - 20%+",
    creditScore: "620+ (ideal: 740+)",
    bestFor: "Buyers with strong credit and stable income",
    pros: ["No upfront mortgage insurance with 20% down", "Flexible terms (10-30 years)", "Can be used for primary, secondary, or investment properties", "Higher loan limits than FHA", "PMI can be removed at 80% LTV"],
    cons: ["Higher credit score requirements", "PMI required if less than 20% down", "Stricter debt-to-income requirements", "May need larger reserves"],
  },
  {
    name: "FHA Loan",
    icon: Shield,
    color: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
    tagColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    description: "Government-backed loan insured by the Federal Housing Administration. Designed for first-time and lower-income buyers.",
    downPayment: "3.5% (580+ score) or 10% (500-579)",
    creditScore: "500+ (580+ for 3.5% down)",
    bestFor: "First-time buyers, lower credit scores, smaller down payments",
    pros: ["Low down payment (3.5%)", "Lower credit score accepted", "More lenient DTI requirements", "Seller can contribute up to 6% of closing costs", "Assumable by future buyers"],
    cons: ["Mortgage insurance premium (MIP) for life of loan", "Upfront MIP of 1.75%", "Loan limits may be lower in some areas", "Property must meet FHA standards", "Primary residence only"],
  },
  {
    name: "VA Loan",
    icon: Star,
    color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    tagColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    description: "Exclusive benefit for eligible veterans, active-duty service members, and surviving spouses. Backed by the Department of Veterans Affairs.",
    downPayment: "0%",
    creditScore: "No VA minimum (lenders typically want 620+)",
    bestFor: "Veterans and active-duty military",
    pros: ["No down payment required", "No PMI/mortgage insurance", "Competitive interest rates", "No prepayment penalty", "Limited closing costs", "Assumable"],
    cons: ["VA funding fee (can be rolled into loan)", "Primary residence only", "Must meet VA eligibility requirements", "Property must meet VA appraisal standards", "Not all lenders offer VA loans"],
  },
  {
    name: "USDA Loan",
    icon: Home,
    color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
    tagColor: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    description: "Government-backed zero-down-payment mortgage for eligible rural and suburban homebuyers with moderate income.",
    downPayment: "0%",
    creditScore: "640+ (varies by lender)",
    bestFor: "Buyers in rural/suburban areas with moderate income",
    pros: ["No down payment", "Below-market interest rates", "Lower mortgage insurance than FHA", "Closing costs can be rolled in", "Seller can pay up to 6% closing costs"],
    cons: ["Geographic restrictions (rural/suburban only)", "Income limits apply", "Upfront guarantee fee of 1%", "Annual fee of 0.35%", "Primary residence only", "Longer processing times"],
  },
  {
    name: "Cash Purchase",
    icon: Banknote,
    color: "bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-800",
    tagColor: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
    description: "Purchasing a home outright without any financing. Strongest offer type in competitive markets.",
    downPayment: "100%",
    creditScore: "N/A",
    bestFor: "Buyers with sufficient liquid assets, investors",
    pros: ["No interest costs", "Strongest offer — sellers prefer cash", "Faster closing (no lender delays)", "No monthly mortgage payment", "No PMI or mortgage insurance", "Full equity immediately"],
    cons: ["Ties up significant capital", "Less liquid — money locked in property", "Miss out on mortgage interest tax deduction", "Opportunity cost vs. investing elsewhere", "May not be feasible for most buyers"],
  },
];

function FinancingGuide() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Financing Options Guide</h2>
        <p className="text-sm text-muted-foreground">Compare different types of home loans to find the best fit</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {FINANCING_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const isOpen = expanded === opt.name;
          return (
            <Card key={opt.name} className={`border ${opt.color} transition-all duration-200`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : opt.name)}>
                  <div className="rounded-lg bg-background border p-2.5 shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg">{opt.name}</h3>
                      {isOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge variant="outline" className={opt.tagColor}>Down: {opt.downPayment}</Badge>
                      <Badge variant="outline" className={opt.tagColor}>Credit: {opt.creditScore}</Badge>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-5 pt-5 border-t space-y-4">
                    <div className="rounded-lg bg-background/80 p-4">
                      <div className="text-sm font-medium mb-1 flex items-center gap-1.5"><HelpCircle className="h-3.5 w-3.5" /> Best For</div>
                      <p className="text-sm text-muted-foreground">{opt.bestFor}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium flex items-center gap-1.5 text-green-700 dark:text-green-400"><Check className="h-4 w-4" /> Advantages</div>
                        <ul className="space-y-1.5">
                          {opt.pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <Check className="h-3.5 w-3.5 mt-0.5 text-green-600 dark:text-green-400 shrink-0" />
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm font-medium flex items-center gap-1.5 text-red-700 dark:text-red-400"><X className="h-4 w-4" /> Considerations</div>
                        <ul className="space-y-1.5">
                          {opt.cons.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <X className="h-3.5 w-3.5 mt-0.5 text-red-500 dark:text-red-400 shrink-0" />
                              <span>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function CalculatorsPage() {
  return (
    <div className="w-full px-4 sm:px-8 py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Calculator className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Financial Calculators</h1>
        </div>
        <p className="text-sm text-muted-foreground">Plan your home purchase with our suite of financial tools</p>
      </header>

      <Tabs defaultValue="mortgage" className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="mortgage" className="flex-1 min-w-fit gap-1.5 text-xs sm:text-sm h-9">
            <Home className="h-3.5 w-3.5 hidden sm:inline" /> Mortgage
          </TabsTrigger>
          <TabsTrigger value="affordability" className="flex-1 min-w-fit gap-1.5 text-xs sm:text-sm h-9">
            <DollarSign className="h-3.5 w-3.5 hidden sm:inline" /> Affordability
          </TabsTrigger>
          <TabsTrigger value="refinance" className="flex-1 min-w-fit gap-1.5 text-xs sm:text-sm h-9">
            <RefreshCw className="h-3.5 w-3.5 hidden sm:inline" /> Refinance
          </TabsTrigger>
          <TabsTrigger value="rent" className="flex-1 min-w-fit gap-1.5 text-xs sm:text-sm h-9">
            <TrendingUp className="h-3.5 w-3.5 hidden sm:inline" /> Rent vs Buy
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex-1 min-w-fit gap-1.5 text-xs sm:text-sm h-9">
            <BookOpen className="h-3.5 w-3.5 hidden sm:inline" /> Financing Guide
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="mortgage"><MortgageCalculator /></TabsContent>
          <TabsContent value="affordability"><AffordabilityCalculator /></TabsContent>
          <TabsContent value="refinance"><RefinanceCalculator /></TabsContent>
          <TabsContent value="rent"><RentVsBuyCalculator /></TabsContent>
          <TabsContent value="guide"><FinancingGuide /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
