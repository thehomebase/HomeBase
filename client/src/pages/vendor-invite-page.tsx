import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ArrowRight, Loader2 } from "lucide-react";

export default function VendorInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<{
    contractorName: string | null;
    invitedBy: string | null;
    hasReferral: boolean;
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/vendor-invite/${token}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid invite");
        return res.json();
      })
      .then((data) => {
        setInviteData(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">This invite link is no longer valid.</p>
            <Button className="mt-4" onClick={() => setLocation("/auth")}>
              Go to Sign Up
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">You're Invited to HomeBase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {inviteData.invitedBy && (
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{inviteData.invitedBy}</span> invited you to join HomeBase Pros
              {inviteData.contractorName && (
                <> for <span className="font-medium text-foreground">{inviteData.contractorName}</span></>
              )}
              .
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Join thousands of service professionals getting discovered by homeowners and real estate agents in your area.
          </p>
          <div className="space-y-2 text-left text-sm">
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">1</span>
              </div>
              <span>Create your free vendor profile</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">2</span>
              </div>
              <span>Get verified and listed in the marketplace</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">3</span>
              </div>
              <span>Start receiving leads from your area</span>
            </div>
          </div>
          <Button className="w-full gap-2" size="lg" onClick={() => setLocation("/auth?role=vendor")}>
            Get Started <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
