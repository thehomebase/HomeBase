import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, TrendingDown, Clock, Star, ChevronRight,
  Plus, Building2, ArrowLeft, Info, CheckCircle2, AlertCircle,
  Calculator, Award, Shield
} from "lucide-react";
import type { EstimateRequest, LenderEstimate } from "@shared/schema";

type EstimateRequestWithEstimates = EstimateRequest & {
  estimates: (LenderEstimate & { lenderName?: string; lenderCompany?: string })[];
};

const requestFormSchema = z.object({
  propertyPrice: z.number().min(10000, "Enter a valid property price"),
  downPayment: z.number().min(0, "Down payment must be positive"),
  loanType: z.string().min(1),
  loanTerm: z.number(),
  creditScoreRange: z.string().min(1, "Select a credit score range"),
  propertyZip: z.string().min(5, "Enter a valid ZIP code").max(10),
  propertyAddress: z.string().optional(),
});

const manualEstimateSchema = z.object({
  manualLenderName: z.string().min(1, "Enter the lender name"),
  interestRate: z.number().min(0.01).max(20),
  apr: z.number().min(0.01).max(25),
  points: z.number().min(0).max(10).optional(),
  rateLockDays: z.number().min(1).max(365).optional(),
  monthlyPrincipalInterest: z.number().min(1),
  monthlyTaxEstimate: z.number().min(0).optional(),
  monthlyInsuranceEstimate: z.number().min(0).optional(),
  monthlyPmi: z.number().min(0).optional(),
  monthlyHoa: z.number().min(0).optional(),
  totalMonthlyPayment: z.number().min(1),
  originationFee: z.number().min(0).optional(),
  underwritingFee: z.number().min(0).optional(),
  appraisalFee: z.number().min(0).optional(),
  creditReportFee: z.number().min(0).optional(),
  titleInsuranceFee: z.number().min(0).optional(),
  escrowPrepaid: z.number().min(0).optional(),
  otherFees: z.number().min(0).optional(),
  lenderCredits: z.number().min(0).optional(),
  totalClosingCosts: z.number().min(0),
});

function formatCurrency(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${cents.toLocaleString()}`;
}

function formatRate(rate: number | null | undefined): string {
  if (rate == null) return "—";
  return `${rate.toFixed(3)}%`;
}

function RequestForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof requestFormSchema>>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      propertyPrice: 0,
      downPayment: 0,
      loanType: "conventional",
      loanTerm: 30,
      creditScoreRange: "",
      propertyZip: "",
      propertyAddress: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestFormSchema>) => {
      const res = await apiRequest("POST", "/api/estimate-requests", {
        ...data,
        downPaymentPercent: data.propertyPrice > 0 ? (data.downPayment / data.propertyPrice) * 100 : 0,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Estimate request created", description: `${data.notifiedLenders} lender(s) notified` });
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-requests"] });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Failed to create request", variant: "destructive" });
    },
  });

  const price = form.watch("propertyPrice");
  const down = form.watch("downPayment");
  const downPct = price > 0 ? ((down / price) * 100).toFixed(1) : "0.0";
  const loanAmount = Math.max(price - down, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Request Lender Estimates
        </CardTitle>
        <CardDescription>
          Enter your property details and we'll connect you with up to 3 lenders for competitive quotes.
          Lender placement is influenced by subscription level, response rate, and ratings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="350000" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="downPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Down Payment ($) — {downPct}%</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="70000" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {loanAmount > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg text-sm">
                <span className="font-medium">Loan Amount:</span> {formatCurrency(loanAmount)}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="loanType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="conventional">Conventional</SelectItem>
                        <SelectItem value="fha">FHA</SelectItem>
                        <SelectItem value="va">VA</SelectItem>
                        <SelectItem value="usda">USDA</SelectItem>
                        <SelectItem value="jumbo">Jumbo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="loanTerm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Term</FormLabel>
                    <Select onValueChange={v => field.onChange(Number(v))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="15">15 Years</SelectItem>
                        <SelectItem value="20">20 Years</SelectItem>
                        <SelectItem value="30">30 Years</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditScoreRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Score Range</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="760+">Excellent (760+)</SelectItem>
                        <SelectItem value="720-759">Very Good (720-759)</SelectItem>
                        <SelectItem value="680-719">Good (680-719)</SelectItem>
                        <SelectItem value="640-679">Fair (640-679)</SelectItem>
                        <SelectItem value="580-639">Below Average (580-639)</SelectItem>
                        <SelectItem value="below-580">Poor (Below 580)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyZip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="76248" maxLength={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="propertyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Address (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, City, TX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Requesting..." : "Request Lender Estimates"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function ComparisonTable({ request }: { request: EstimateRequestWithEstimates }) {
  const { toast } = useToast();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [ratingEstimateId, setRatingEstimateId] = useState<number | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingReview, setRatingReview] = useState("");

  const estimates = request.estimates || [];
  const lowestMonthly = estimates.length > 0 ? Math.min(...estimates.map(e => e.totalMonthlyPayment)) : 0;
  const lowestClosing = estimates.length > 0 ? Math.min(...estimates.map(e => e.totalClosingCosts)) : 0;
  const lowestTotal5yr = estimates.filter(e => e.totalCost5yr).length > 0
    ? Math.min(...estimates.filter(e => e.totalCost5yr).map(e => e.totalCost5yr!))
    : 0;

  const manualForm = useForm<z.infer<typeof manualEstimateSchema>>({
    resolver: zodResolver(manualEstimateSchema),
    defaultValues: {
      manualLenderName: "",
      interestRate: 0,
      apr: 0,
      points: 0,
      rateLockDays: 30,
      monthlyPrincipalInterest: 0,
      monthlyTaxEstimate: 0,
      monthlyInsuranceEstimate: 0,
      monthlyPmi: 0,
      monthlyHoa: 0,
      totalMonthlyPayment: 0,
      originationFee: 0,
      underwritingFee: 0,
      appraisalFee: 0,
      creditReportFee: 0,
      titleInsuranceFee: 0,
      escrowPrepaid: 0,
      otherFees: 0,
      lenderCredits: 0,
      totalClosingCosts: 0,
    },
  });

  const submitManualMutation = useMutation({
    mutationFn: async (data: z.infer<typeof manualEstimateSchema>) => {
      const res = await apiRequest("POST", `/api/estimate-requests/${request.id}/estimates`, {
        ...data,
        isManualEntry: true,
        lenderUserId: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Manual estimate added" });
      setShowManualEntry(false);
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-requests", request.id] });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/lender-estimates/${ratingEstimateId}/rate`, {
        rating: ratingValue,
        review: ratingReview || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rating submitted" });
      setRatingEstimateId(null);
      setRatingReview("");
    },
  });

  const closeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/estimate-requests/${request.id}/close`);
    },
    onSuccess: () => {
      toast({ title: "Request closed" });
      queryClient.invalidateQueries({ queryKey: ["/api/estimate-requests"] });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">
                {request.propertyAddress || `ZIP ${request.propertyZip}`}
              </CardTitle>
              <CardDescription>
                {formatCurrency(request.propertyPrice)} • {formatCurrency(request.downPayment)} down •{" "}
                {request.loanType?.toUpperCase()} • {request.loanTerm} yr •{" "}
                Credit: {request.creditScoreRange}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant={request.status === "open" ? "default" : "secondary"}>
                {request.status === "open" ? "Accepting Estimates" : "Closed"}
              </Badge>
              {request.status === "open" && (
                <Button variant="outline" size="sm" onClick={() => closeMutation.mutate()}>
                  Close Request
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Waiting for Estimates</h3>
            <p className="text-muted-foreground mb-4">
              Lenders have been notified. Estimates typically arrive within 1-24 hours.
            </p>
            {request.status === "open" && (
              <Button variant="outline" onClick={() => setShowManualEntry(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your Own Lender's Numbers
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <CardContent className="pt-4">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">Lowest Monthly Payment</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">{formatCurrency(lowestMonthly)}/mo</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Lowest Closing Costs</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatCurrency(lowestClosing)}</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-4">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Lowest 5-Year Total Cost</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{formatCurrency(lowestTotal5yr || null)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold min-w-[200px]">Category</th>
                  {estimates.map((est, i) => (
                    <th key={est.id} className="text-right p-3 font-semibold min-w-[160px]">
                      <div className="flex flex-col items-end gap-1">
                        <span>{est.isManualEntry ? est.manualLenderName : (est.lenderName || `Lender ${i + 1}`)}</span>
                        {est.lenderCompany && <span className="text-xs text-muted-foreground font-normal">{est.lenderCompany}</span>}
                        {est.isManualEntry && <Badge variant="outline" className="text-xs">Manual</Badge>}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b bg-muted/30">
                  <td className="p-3 font-semibold" colSpan={estimates.length + 1}>Loan Terms</td>
                </tr>
                <CompRow label="Interest Rate" values={estimates.map(e => formatRate(e.interestRate))} highlights={estimates.map(e => e.interestRate === Math.min(...estimates.map(x => x.interestRate)))} />
                <CompRow label="APR" values={estimates.map(e => formatRate(e.apr))} highlights={estimates.map(e => e.apr === Math.min(...estimates.map(x => x.apr)))} />
                <CompRow label="Points" values={estimates.map(e => e.points != null ? `${e.points}` : "0")} />
                <CompRow label="Rate Lock" values={estimates.map(e => e.rateLockDays ? `${e.rateLockDays} days` : "—")} />

                <tr className="border-b bg-muted/30">
                  <td className="p-3 font-semibold" colSpan={estimates.length + 1}>Monthly Payment</td>
                </tr>
                <CompRow label="Principal & Interest" values={estimates.map(e => formatCurrency(e.monthlyPrincipalInterest))} />
                <CompRow label="Property Tax (est.)" values={estimates.map(e => formatCurrency(e.monthlyTaxEstimate))} />
                <CompRow label="Insurance (est.)" values={estimates.map(e => formatCurrency(e.monthlyInsuranceEstimate))} />
                <CompRow label="PMI/MIP" values={estimates.map(e => formatCurrency(e.monthlyPmi))} />
                <CompRow label="HOA" values={estimates.map(e => formatCurrency(e.monthlyHoa))} />
                <CompRow
                  label="Total Monthly"
                  values={estimates.map(e => formatCurrency(e.totalMonthlyPayment))}
                  highlights={estimates.map(e => e.totalMonthlyPayment === lowestMonthly)}
                  bold
                />

                <tr className="border-b bg-muted/30">
                  <td className="p-3 font-semibold" colSpan={estimates.length + 1}>Closing Costs</td>
                </tr>
                <CompRow label="Origination Fee" values={estimates.map(e => formatCurrency(e.originationFee))} />
                <CompRow label="Underwriting Fee" values={estimates.map(e => formatCurrency(e.underwritingFee))} />
                <CompRow label="Appraisal Fee" values={estimates.map(e => formatCurrency(e.appraisalFee))} />
                <CompRow label="Credit Report" values={estimates.map(e => formatCurrency(e.creditReportFee))} />
                <CompRow label="Title Insurance" values={estimates.map(e => formatCurrency(e.titleInsuranceFee))} />
                <CompRow label="Escrow/Prepaid" values={estimates.map(e => formatCurrency(e.escrowPrepaid))} />
                <CompRow label="Other Fees" values={estimates.map(e => formatCurrency(e.otherFees))} />
                <CompRow label="Lender Credits" values={estimates.map(e => e.lenderCredits ? `-${formatCurrency(e.lenderCredits)}` : "—")} />
                <CompRow
                  label="Total Closing Costs"
                  values={estimates.map(e => formatCurrency(e.totalClosingCosts))}
                  highlights={estimates.map(e => e.totalClosingCosts === lowestClosing)}
                  bold
                />

                <tr className="border-b bg-muted/30">
                  <td className="p-3 font-semibold" colSpan={estimates.length + 1}>Total Cost of Loan</td>
                </tr>
                <CompRow
                  label="5-Year Total Cost"
                  values={estimates.map(e => formatCurrency(e.totalCost5yr))}
                  highlights={estimates.map(e => lowestTotal5yr > 0 && e.totalCost5yr === lowestTotal5yr)}
                  bold
                />
                <CompRow
                  label="7-Year Total Cost"
                  values={estimates.map(e => formatCurrency(e.totalCost7yr))}
                  bold
                />
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            <span>Green highlighted values indicate the best option in each category.</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {estimates.filter(e => !e.isManualEntry).map(est => (
              <Button key={est.id} variant="outline" size="sm" onClick={() => setRatingEstimateId(est.id)}>
                <Star className="h-4 w-4 mr-1" />
                Rate {est.lenderName || "Lender"}
              </Button>
            ))}
            {request.status === "open" && estimates.length < (request.maxEstimates || 3) + 1 && (
              <Button variant="outline" size="sm" onClick={() => setShowManualEntry(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Your Lender
              </Button>
            )}
          </div>
        </>
      )}

      <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Your Lender's Estimate</DialogTitle>
          </DialogHeader>
          <Form {...manualForm}>
            <form onSubmit={manualForm.handleSubmit(data => submitManualMutation.mutate(data))} className="space-y-4">
              <FormField control={manualForm.control} name="manualLenderName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lender Name</FormLabel>
                  <FormControl><Input placeholder="e.g., Chase Bank" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField control={manualForm.control} name="interestRate" render={({ field }) => (
                  <FormItem><FormLabel>Rate (%)</FormLabel><FormControl><Input type="number" step="0.001" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={manualForm.control} name="apr" render={({ field }) => (
                  <FormItem><FormLabel>APR (%)</FormLabel><FormControl><Input type="number" step="0.001" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={manualForm.control} name="points" render={({ field }) => (
                  <FormItem><FormLabel>Points</FormLabel><FormControl><Input type="number" step="0.125" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={manualForm.control} name="rateLockDays" render={({ field }) => (
                  <FormItem><FormLabel>Lock (days)</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <h4 className="font-semibold text-sm pt-2">Monthly Payment Breakdown</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(["monthlyPrincipalInterest", "monthlyTaxEstimate", "monthlyInsuranceEstimate", "monthlyPmi", "monthlyHoa", "totalMonthlyPayment"] as const).map(name => (
                  <FormField key={name} control={manualForm.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{name.replace(/([A-Z])/g, ' $1').replace(/^monthly /, '').trim()}</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>

              <h4 className="font-semibold text-sm pt-2">Closing Costs</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(["originationFee", "underwritingFee", "appraisalFee", "creditReportFee", "titleInsuranceFee", "escrowPrepaid", "otherFees", "lenderCredits", "totalClosingCosts"] as const).map(name => (
                  <FormField key={name} control={manualForm.control} name={name} render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">{name.replace(/([A-Z])/g, ' $1').trim()}</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                    </FormItem>
                  )} />
                ))}
              </div>

              <DialogFooter>
                <Button type="submit" disabled={submitManualMutation.isPending}>
                  {submitManualMutation.isPending ? "Adding..." : "Add Estimate"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={ratingEstimateId !== null} onOpenChange={() => setRatingEstimateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate This Lender</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rating</Label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map(v => (
                  <Button key={v} variant="ghost" size="sm" onClick={() => setRatingValue(v)}>
                    <Star className={`h-6 w-6 ${v <= ratingValue ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Review (optional)</Label>
              <Textarea value={ratingReview} onChange={e => setRatingReview(e.target.value)} placeholder="How was your experience?" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => rateMutation.mutate()} disabled={rateMutation.isPending}>
              Submit Rating
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CompRow({ label, values, highlights, bold }: {
  label: string;
  values: string[];
  highlights?: boolean[];
  bold?: boolean;
}) {
  return (
    <tr className="border-b">
      <td className={`p-3 ${bold ? "font-semibold" : ""}`}>{label}</td>
      {values.map((val, i) => (
        <td key={i} className={`p-3 text-right ${bold ? "font-semibold" : ""} ${highlights?.[i] ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20" : ""}`}>
          {val}
        </td>
      ))}
    </tr>
  );
}

export default function LenderComparisonPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("new");
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);

  const { data: requests = [], isLoading } = useQuery<EstimateRequest[]>({
    queryKey: ["/api/estimate-requests"],
  });

  const { data: selectedRequest } = useQuery<EstimateRequestWithEstimates>({
    queryKey: ["/api/estimate-requests", selectedRequestId],
    enabled: !!selectedRequestId,
  });

  if (selectedRequest) {
    return (
      <div className="w-full px-4 sm:px-8 py-6 max-w-6xl mx-auto pb-24 md:pb-8">
        <Button variant="ghost" className="mb-4" onClick={() => setSelectedRequestId(null)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requests
        </Button>
        <ComparisonTable request={selectedRequest} />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-8 py-6 max-w-6xl mx-auto pb-24 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Compare Lender Estimates</h1>
        <p className="text-muted-foreground">
          Get competitive quotes from multiple lenders and compare them side-by-side.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="new">New Request</TabsTrigger>
          <TabsTrigger value="history">
            My Requests
            {requests.length > 0 && (
              <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <RequestForm onSuccess={() => setActiveTab("history")} />
        </TabsContent>

        <TabsContent value="history">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Requests Yet</h3>
                <p className="text-muted-foreground mb-4">Create your first estimate request to start comparing lenders.</p>
                <Button onClick={() => setActiveTab("new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {requests.map(req => (
                <Card key={req.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedRequestId(req.id)}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{req.propertyAddress || `ZIP ${req.propertyZip}`}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(req.propertyPrice)} • {req.loanType?.toUpperCase()} • {req.loanTerm} yr
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={req.status === "open" ? "default" : "secondary"}>
                          {req.status === "open" ? "Open" : "Closed"}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
