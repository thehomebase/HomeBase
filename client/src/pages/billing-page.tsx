import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, CheckCircle2, Clock, Gift, ExternalLink, Shield, Sparkles } from "lucide-react";
import type { ReferralCredit } from "@shared/schema";

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = new URLSearchParams(window.location.search);
  const isSuccess = searchParams.get('success') === 'true';
  const isSetupSuccess = searchParams.get('setup_success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';

  const { data: subscription, isLoading: subLoading } = useQuery<{ subscription: any; hasPaymentMethod: boolean }>({
    queryKey: ["/api/stripe/subscription"],
  });

  const { data: products, isLoading: productsLoading } = useQuery<{ products: any[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const { data: credits } = useQuery<ReferralCredit[]>({
    queryKey: ["/api/referral/credits"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout", { priceId });
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-setup-checkout");
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const activateCreditsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/activate-referral-credits");
      return await res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Credits Activated", description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/referral/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal");
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const pendingCredits = credits?.filter(c => c.status === 'pending') ?? [];
  const appliedCredits = credits?.filter(c => c.status === 'applied') ?? [];
  const hasPaymentMethod = subscription?.hasPaymentMethod ?? false;
  const currentSub = subscription?.subscription;
  const userRole = user?.role;

  const relevantProduct = products?.products?.find(p => {
    const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
    return meta?.role === userRole;
  });

  const formatPrice = (amount: number) => `$${(amount / 100).toFixed(2)}`;

  if (userRole !== 'agent' && userRole !== 'vendor') {
    return (
      <div className="container mx-auto p-6 max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">Billing</h1>
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground">Billing is available for agents and vendors.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">Manage your plan and payment method</p>
      </div>

      {isSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Subscription activated successfully! Welcome to HomeBase.
          </AlertDescription>
        </Alert>
      )}

      {isSetupSuccess && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Payment method added successfully! You can now activate your referral credits.
          </AlertDescription>
        </Alert>
      )}

      {isCanceled && (
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            Checkout was canceled. You can try again anytime.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : currentSub ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </Badge>
                <span className="font-medium capitalize">{currentSub.status}</span>
              </div>
              {currentSub.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Current period ends: {new Date(currentSub.current_period_end * 1000).toLocaleDateString()}
                </p>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => portalMutation.mutate()}
                  disabled={portalMutation.isPending}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {portalMutation.isPending ? "Opening..." : "Manage Subscription"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground">No active subscription</p>
              {productsLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : relevantProduct ? (
                <div className="border rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-lg">{relevantProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{relevantProduct.description}</p>
                  {relevantProduct.prices?.map((price: any) => (
                    <div key={price.id} className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {formatPrice(price.unit_amount)}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </span>
                      <Button
                        onClick={() => checkoutMutation.mutate(price.id)}
                        disabled={checkoutMutation.isPending}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {checkoutMutation.isPending ? "Loading..." : "Subscribe"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No plans are currently available. Check back soon.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingCredits.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Gift className="h-5 w-5" />
              Referral Credits Available
            </CardTitle>
            <CardDescription>
              You have {pendingCredits.length} pending referral credit{pendingCredits.length > 1 ? 's' : ''}.
              {!hasPaymentMethod
                ? " Add a payment method to activate them."
                : " Click below to activate your free month credit."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!hasPaymentMethod ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    To prevent abuse, we require a payment method on file before activating free month credits.
                    Your card won't be charged until after your free period ends.
                  </p>
                  <Button
                    onClick={() => setupMutation.mutate()}
                    disabled={setupMutation.isPending}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {setupMutation.isPending ? "Loading..." : "Add Payment Method"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Payment method is on file. Activate your credits to get your free month!
                  </p>
                  <Button
                    onClick={() => activateCreditsMutation.mutate()}
                    disabled={activateCreditsMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    {activateCreditsMutation.isPending ? "Activating..." : `Activate ${pendingCredits.length} Credit${pendingCredits.length > 1 ? 's' : ''}`}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {appliedCredits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Applied Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have {appliedCredits.length} applied referral credit{appliedCredits.length > 1 ? 's' : ''}.
            </p>
          </CardContent>
        </Card>
      )}

      {!currentSub && !hasPaymentMethod && pendingCredits.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Method
            </CardTitle>
            <CardDescription>
              Add a payment method to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {setupMutation.isPending ? "Loading..." : "Add Payment Method"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
