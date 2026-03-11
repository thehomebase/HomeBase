import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Gift, Link2, Share2, Users, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { ReferralCode, ReferralCredit } from "@shared/schema";

export default function ReferralPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralCode, isLoading: codeLoading } = useQuery<ReferralCode>({
    queryKey: ["/api/referral/my-code"],
    retry: false,
  });

  const { data: credits, isLoading: creditsLoading } = useQuery<ReferralCredit[]>({
    queryKey: ["/api/referral/credits"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/referral/generate");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/my-code"] });
      toast({ title: "Referral code generated!", description: "Share your code with other agents." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode.code}`
    : "";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral info copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingCount = credits?.filter(c => c.status === "pending").length ?? 0;
  const appliedCount = credits?.filter(c => c.status === "applied").length ?? 0;
  const totalCredits = credits?.length ?? 0;

  const statusIcon = (status: string) => {
    switch (status) {
      case "applied":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "expired":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "applied":
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Applied</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Pending</Badge>;
      case "expired":
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral Program</h1>
        <p className="text-muted-foreground mt-1">
          Invite agents and vendors to HomeBase. When they sign up and add a payment method, you both get a free month.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Referrals</p>
                <p className="text-2xl font-bold">{totalCredits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Applied</p>
                <p className="text-2xl font-bold">{appliedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share this code with agents or vendors. When they sign up and add a payment method, you both get a free month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {codeLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : referralCode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={referralCode.code}
                  className="font-mono text-lg tracking-wider"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(referralCode.code)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={referralLink}
                  className="text-sm text-muted-foreground"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(referralLink)}
                >
                  <Link2 className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "Join HomeBase",
                      text: `Use my referral code ${referralCode.code} to sign up for HomeBase and we both get a free month!`,
                      url: referralLink,
                    });
                  } else {
                    copyToClipboard(
                      `Join HomeBase with my referral code: ${referralCode.code}\n${referralLink}`
                    );
                  }
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Referral Link
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground mb-4">
                You haven't generated a referral code yet.
              </p>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <Gift className="h-4 w-4 mr-2" />
                {generateMutation.isPending ? "Generating..." : "Generate Referral Code"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credits Earned</CardTitle>
          <CardDescription>
            Track your referral credits and their status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : credits && credits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credits.map((credit) => (
                  <TableRow key={credit.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {credit.type === "referrer" ? "You Referred" : "You Were Referred"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusIcon(credit.status)}
                        {statusBadge(credit.status)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {credit.createdAt
                        ? new Date(credit.createdAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {credit.appliedAt
                        ? new Date(credit.appliedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No credits yet. Share your referral code to start earning!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}