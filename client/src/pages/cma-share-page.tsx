import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Home, Building2, TrendingUp, User, Mail, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CmaReport } from "@shared/schema";

interface CompData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  squareFootage: number;
  propertyType: string;
  yearBuilt?: number;
  daysOnMarket: number;
  pricePerSqft: number;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(price);
}

export default function CmaSharePage() {
  const [, params] = useRoute("/cma/share/:shareToken");
  const shareToken = params?.shareToken;

  const { data, isLoading, isError } = useQuery<{
    report: CmaReport;
    agent: { firstName: string; lastName: string; email: string } | null;
  }>({
    queryKey: ["/api/cma/share", shareToken],
    queryFn: async () => {
      const res = await fetch(`/api/cma/share/${shareToken}`);
      if (!res.ok) throw new Error("Report not found");
      return res.json();
    },
    enabled: !!shareToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Report Not Found</h2>
            <p className="text-muted-foreground text-center">This CMA report may have been deleted or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { report, agent } = data;
  const comps = (report.comps as CompData[]) || [];

  const prices = comps.map(c => c.price).sort((a, b) => a - b);
  const sqftPrices = comps.filter(c => c.pricePerSqft > 0).map(c => c.pricePerSqft);
  const analysis = comps.length > 0 ? {
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    median: prices.length % 2 === 0
      ? Math.round((prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2)
      : prices[Math.floor(prices.length / 2)],
    avgPricePerSqft: sqftPrices.length > 0 ? Math.round(sqftPrices.reduce((a, b) => a + b, 0) / sqftPrices.length) : 0,
    rangeLow: Math.round((prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]) * 0.95),
    rangeHigh: Math.round((prices.length % 2 === 0
      ? (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2
      : prices[Math.floor(prices.length / 2)]) * 1.05),
  } : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 print:p-4">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Comparative Market Analysis</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        <div className="print:block hidden text-center mb-6">
          <h1 className="text-2xl font-bold">Comparative Market Analysis</h1>
        </div>

        {agent && (
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">Prepared by {agent.firstName} {agent.lastName}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {agent.email}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Subject Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{report.subjectAddress}</h3>
                <p className="text-muted-foreground">{report.subjectCity}, {report.subjectState} {report.subjectZip}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {report.subjectPrice && (
                  <Badge variant="secondary" className="text-sm py-1 px-3">
                    {formatPrice(report.subjectPrice)}
                  </Badge>
                )}
                {report.subjectBeds && <span className="flex items-center gap-1 text-muted-foreground">{report.subjectBeds} Beds</span>}
                {report.subjectBaths && <span className="flex items-center gap-1 text-muted-foreground">{report.subjectBaths} Baths</span>}
                {report.subjectSqft && <span className="flex items-center gap-1 text-muted-foreground">{report.subjectSqft.toLocaleString()} Sqft</span>}
                {report.subjectYearBuilt && <span className="flex items-center gap-1 text-muted-foreground">Built {report.subjectYearBuilt}</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {comps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Comparable Properties ({comps.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2.5 font-medium">Address</th>
                      <th className="text-right px-3 py-2.5 font-medium">Price</th>
                      <th className="text-right px-3 py-2.5 font-medium">Sqft</th>
                      <th className="text-center px-3 py-2.5 font-medium">Beds/Baths</th>
                      <th className="text-right px-3 py-2.5 font-medium">$/Sqft</th>
                      <th className="text-center px-3 py-2.5 font-medium">DOM</th>
                      <th className="text-center px-3 py-2.5 font-medium">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((comp, i) => (
                      <tr key={i} className={`border-b last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{comp.address}</div>
                          <div className="text-xs text-muted-foreground">{comp.city}, {comp.state} {comp.zipCode}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{formatPrice(comp.price)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{comp.squareFootage > 0 ? comp.squareFootage.toLocaleString() : "—"}</td>
                        <td className="px-3 py-2.5 text-center">{comp.bedrooms}/{comp.bathrooms}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">{comp.pricePerSqft > 0 ? `$${comp.pricePerSqft}` : "—"}</td>
                        <td className="px-3 py-2.5 text-center">{comp.daysOnMarket}</td>
                        <td className="px-3 py-2.5 text-center">{comp.yearBuilt || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Price Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Average Price</p>
                  <p className="text-xl font-bold mt-1">{formatPrice(analysis.avg)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Median Price</p>
                  <p className="text-xl font-bold mt-1">{formatPrice(analysis.median)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg $/Sqft</p>
                  <p className="text-xl font-bold mt-1">{analysis.avgPricePerSqft > 0 ? `$${analysis.avgPricePerSqft}` : "N/A"}</p>
                </div>
                <div className="bg-primary/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Suggested Range</p>
                  <p className="text-lg font-bold mt-1">{formatPrice(analysis.rangeLow)} – {formatPrice(analysis.rangeHigh)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {report.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Agent Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground py-4 print:hidden">
          Generated on {new Date(report.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:p-4 { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}