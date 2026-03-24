import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard, CheckCircle2, Clock, Gift, ExternalLink, Shield, Sparkles,
  Check, Zap, Users, BarChart3, FileText, MessageSquare, Map, Home,
  Phone, Mail, Star, ArrowRight, Crown, Building2, Briefcase, Eye, MousePointer
} from "lucide-react";
import type { ReferralCredit } from "@shared/schema";

const agentFeatures = [
  { icon: Briefcase, text: "Unlimited transactions" },
  { icon: Users, text: "Unlimited client management" },
  { icon: FileText, text: "TREC contract parsing & document tracking" },
  { icon: Map, text: "Interactive property map with route planning" },
  { icon: MessageSquare, text: "Encrypted private messaging" },
  { icon: Phone, text: "SMS communications via Twilio" },
  { icon: Mail, text: "Gmail integration & email tracking" },
  { icon: BarChart3, text: "Communication metrics dashboard" },
  { icon: Star, text: "Customizable dashboard with widgets" },
  { icon: Home, text: "HomeBase Pros marketplace access" },
  { icon: Users, text: "Drip campaigns & lead generation" },
  { icon: Gift, text: "Affiliate referral program" },
];

const vendorFeatures = [
  { icon: Building2, text: "Vendor portal with bid management" },
  { icon: FileText, text: "Inspection bid system with PDF parsing" },
  { icon: Users, text: "Contractor verification badges" },
  { icon: Map, text: "HomeBase Pros marketplace listing" },
  { icon: MessageSquare, text: "Encrypted private messaging" },
  { icon: BarChart3, text: "Communication metrics dashboard" },
  { icon: Star, text: "Vendor ratings & reviews" },
  { icon: Zap, text: "Zip code lead generation" },
  { icon: Phone, text: "Lead notifications via SMS & push" },
  { icon: Gift, text: "Affiliate referral program" },
];

const highlights = [
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "AES-256 encryption for all messages. Your data is protected with enterprise-grade security."
  },
  {
    icon: Zap,
    title: "Real-Time Notifications",
    description: "Instant SMS and push notifications for new leads, messages, and transaction updates."
  },
  {
    icon: BarChart3,
    title: "Powerful Analytics",
    description: "Track communications, monitor your pipeline, and measure performance with detailed dashboards."
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Connect with agents, lenders, vendors, and clients all in one centralized platform."
  },
];

function VendorPremiumSection() {
  const { toast } = useToast();

  const { data: premium, isLoading } = useQuery<any>({
    queryKey: ["/api/vendor/premium"],
  });

  const createPremium = useMutation({
    mutationFn: (tier: string) => apiRequest("POST", "/api/vendor/premium", { tier, categories: [], zipCodes: [] }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vendor/premium"] }); toast({ title: "Premium placement activated!" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelPremium = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vendor/premium/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vendor/premium"] }); toast({ title: "Premium placement cancelled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <Skeleton className="h-40 w-full mb-8" />;

  return (
    <div className="mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Boost Your Visibility</h2>
        <p className="text-muted-foreground">Stand out in the HomeBase Pros marketplace with premium placement</p>
      </div>

      {premium ? (
        <Card className="ring-2 ring-amber-400/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {premium.tier === "spotlight" ? "Spotlight" : "Featured"} Placement
                  </h3>
                  <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0">Active</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => cancelPremium.mutate(premium.id)} disabled={cancelPremium.isPending}>
                Cancel
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{(premium.impressions || 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Impressions</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <MousePointer className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <div className="text-lg font-bold">{(premium.clicks || 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Clicks</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-5 w-5 text-amber-500" />
                <h3 className="font-semibold">Featured</h3>
              </div>
              <div className="text-3xl font-bold mb-1">$39<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <p className="text-sm text-muted-foreground mb-4">Appear at the top of marketplace search results with a Featured badge</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Featured badge on your listing</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Priority placement in results</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Performance analytics</li>
              </ul>
              <Button className="w-full" onClick={() => createPremium.mutate("featured")} disabled={createPremium.isPending}>
                {createPremium.isPending ? "Activating..." : "Get Featured"}
              </Button>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow ring-2 ring-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Spotlight</h3>
                <Badge variant="secondary" className="text-xs">Best Value</Badge>
              </div>
              <div className="text-3xl font-bold mb-1">$79<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <p className="text-sm text-muted-foreground mb-4">Maximum visibility with premium placement and highlighted listing</p>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Everything in Featured</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Highlighted card with gold border</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Top of all category results</li>
              </ul>
              <Button className="w-full" onClick={() => createPremium.mutate("spotlight")} disabled={createPremium.isPending}>
                {createPremium.isPending ? "Activating..." : "Get Spotlight"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const searchParams = new URLSearchParams(window.location.search);
  const isSuccess = searchParams.get('success') === 'true';
  const isSetupSuccess = searchParams.get('setup_success') === 'true';
  const isCanceled = searchParams.get('canceled') === 'true';

  const { data: subscription, isLoading: subLoading } = useQuery<{ subscription: any; hasPaymentMethod: boolean; trialActive?: boolean; trialDaysLeft?: number; trialEndsAt?: string }>({
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

  const { data: seatCheck } = useQuery<{ onSeat: boolean; brokerName?: string }>({
    queryKey: ["/api/broker/seats/check"],
    enabled: user?.role === "agent",
  });

  const pendingCredits = credits?.filter(c => c.status === 'pending') ?? [];
  const appliedCredits = credits?.filter(c => c.status === 'applied') ?? [];
  const hasPaymentMethod = subscription?.hasPaymentMethod ?? false;
  const currentSub = subscription?.subscription;
  const userRole = user?.role;

  const safeParseMeta = (m: any) => {
    if (!m) return {};
    if (typeof m === 'object') return m;
    try { return JSON.parse(m); } catch { return {}; }
  };

  const allProducts = products?.products ?? [];
  const agentProduct = allProducts.find(p => safeParseMeta(p.metadata)?.role === 'agent');
  const vendorProduct = allProducts.find(p => safeParseMeta(p.metadata)?.role === 'vendor');

  const formatPrice = (amount: number) => (amount / 100).toFixed(0);
  const formatPriceCents = (amount: number) => (amount / 100).toFixed(2);

  const isCurrentPlan = (product: any) => {
    return safeParseMeta(product?.metadata)?.role === userRole && currentSub;
  };

  if (userRole !== 'agent' && userRole !== 'vendor') {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-2xl font-bold mb-4">Billing</h1>
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {(isSuccess || isSetupSuccess || isCanceled) && (
        <div className="px-4 sm:px-8 pt-4">
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
        </div>
      )}

      {seatCheck?.onSeat && (
        <div className="px-4 sm:px-8 pt-4">
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <p className="font-medium mb-1">
                Your subscription is covered by your broker{seatCheck.brokerName ? ` (${seatCheck.brokerName})` : ""}. You have full platform access at no cost to you.
              </p>
              {currentSub && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2 pt-2 border-t border-green-200 dark:border-green-700">
                  <p className="text-sm">
                    You still have an active personal subscription. Since your broker is covering your access, you can cancel it to avoid being charged.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    className="gap-1.5 shrink-0 border-green-300 text-green-800 hover:bg-green-100 dark:border-green-600 dark:text-green-200 dark:hover:bg-green-900"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {portalMutation.isPending ? "Opening..." : "Cancel Personal Subscription"}
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className={`px-4 sm:px-8 ${isMobile ? "pt-6 pb-24" : "py-12"}`}>
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs font-medium tracking-wider uppercase">
            Pricing
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-3">
            Plans that grow with your business
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Everything you need to manage transactions, nurture client relationships, and grow your real estate business.
          </p>
        </div>

        {subscription?.trialActive && (
          <div className="mb-8">
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <CardContent className="p-6">
                <div className={`flex ${isMobile ? "flex-col gap-4" : "items-center justify-between"}`}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">Free Trial Active</h3>
                        <Badge className="border-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {subscription.trialDaysLeft} {subscription.trialDaysLeft === 1 ? "day" : "days"} left
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You have full access to all features. {subscription.trialEndsAt ? `Your first charge will be on ${new Date(subscription.trialEndsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.` : ""} You can cancel anytime from this page.
                      </p>
                    </div>
                  </div>
                  {currentSub && (
                    <Button
                      variant="outline"
                      onClick={() => portalMutation.mutate()}
                      disabled={portalMutation.isPending}
                      className="gap-2 shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {portalMutation.isPending ? "Opening..." : "Manage Subscription"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentSub && (
          <div className="mb-8">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className={`flex ${isMobile ? "flex-col gap-4" : "items-center justify-between"}`}>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Crown className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">Active Subscription</h3>
                        <Badge className={`border-0 ${
                          currentSub.status === 'active' || currentSub.status === 'trialing'
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : currentSub.status === 'past_due'
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}>
                          {currentSub.status === 'trialing' ? 'Trial' : currentSub.status?.charAt(0).toUpperCase() + currentSub.status?.slice(1).replace('_', ' ')}
                        </Badge>
                      </div>
                      {currentSub.current_period_end && (
                        <p className="text-sm text-muted-foreground">
                          Current period ends {new Date(currentSub.current_period_end * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {portalMutation.isPending ? "Opening..." : "Manage Subscription"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={`grid gap-6 mb-16 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          {subLoading || productsLoading ? (
            <>
              <Skeleton className="h-[500px] rounded-xl" />
              <Skeleton className="h-[500px] rounded-xl" />
            </>
          ) : (
            <>
              <PlanCard
                name="Agent Plan"
                description="For real estate agents who want to streamline their business"
                product={agentProduct}
                features={agentFeatures}
                isCurrent={userRole === 'agent' && !!currentSub}
                isRelevant={userRole === 'agent'}
                isFirstTime={!currentSub && !subscription?.trialEndsAt}
                formatPrice={formatPrice}
                formatPriceCents={formatPriceCents}
                onSubscribe={(priceId) => checkoutMutation.mutate(priceId)}
                isSubscribing={checkoutMutation.isPending}
                accentColor="primary"
                icon={Briefcase}
                isMobile={isMobile}
              />
              <PlanCard
                name="Vendor Plan"
                description="For home service vendors and contractors"
                product={vendorProduct}
                features={vendorFeatures}
                isCurrent={userRole === 'vendor' && !!currentSub}
                isRelevant={userRole === 'vendor'}
                isFirstTime={!currentSub && !subscription?.trialEndsAt}
                formatPrice={formatPrice}
                formatPriceCents={formatPriceCents}
                onSubscribe={(priceId) => checkoutMutation.mutate(priceId)}
                isSubscribing={checkoutMutation.isPending}
                accentColor="primary"
                icon={Building2}
                isMobile={isMobile}
              />
            </>
          )}
        </div>

        {pendingCredits.length > 0 && (
          <div className="mb-12">
            <Card className="border-amber-200 dark:border-amber-800 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
              <CardContent className="p-6">
                <div className={`flex ${isMobile ? "flex-col gap-4" : "items-start justify-between"}`}>
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center shrink-0">
                      <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        {pendingCredits.length} Referral Credit{pendingCredits.length > 1 ? 's' : ''} Available
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {!hasPaymentMethod
                          ? "Add a payment method to activate your free month credits. Your card won't be charged until after your free period ends."
                          : "You have credits ready to activate. Click the button to get your free month!"}
                      </p>
                    </div>
                  </div>
                  {!hasPaymentMethod ? (
                    <Button
                      onClick={() => setupMutation.mutate()}
                      disabled={setupMutation.isPending}
                      className="shrink-0 gap-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      {setupMutation.isPending ? "Loading..." : "Add Payment Method"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => activateCreditsMutation.mutate()}
                      disabled={activateCreditsMutation.isPending}
                      className="shrink-0 gap-2 bg-amber-600 hover:bg-amber-700"
                    >
                      <Gift className="h-4 w-4" />
                      {activateCreditsMutation.isPending ? "Activating..." : `Activate Credit${pendingCredits.length > 1 ? 's' : ''}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {appliedCredits.length > 0 && (
          <div className="mb-12">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Applied Credits</h3>
                    <p className="text-sm text-muted-foreground">
                      {appliedCredits.length} referral credit{appliedCredits.length > 1 ? 's' : ''} applied to your account.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!currentSub && !hasPaymentMethod && pendingCredits.length === 0 && (
          <div className="mb-12">
            <Card>
              <CardContent className="p-6">
                <div className={`flex ${isMobile ? "flex-col gap-4" : "items-center justify-between"}`}>
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Payment Method</h3>
                      <p className="text-sm text-muted-foreground">Add a payment method to your account</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setupMutation.mutate()}
                    disabled={setupMutation.isPending}
                    className="gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    {setupMutation.isPending ? "Loading..." : "Add Payment Method"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Why choose HomeBase?</h2>
            <p className="text-muted-foreground">Built specifically for real estate professionals</p>
          </div>
          <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-4"}`}>
            {highlights.map((item) => (
              <Card key={item.title} className="border bg-card hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Compare plans</h2>
            <p className="text-muted-foreground">See what's included in each plan</p>
          </div>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-4 font-semibold min-w-[200px]">Feature</th>
                    <th className="text-center p-4 font-semibold min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>Agent Plan</span>
                        <span className="text-2xl font-bold">${agentProduct?.prices?.[0] ? formatPrice(agentProduct.prices[0].unit_amount) : '49'}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                      </div>
                    </th>
                    <th className="text-center p-4 font-semibold min-w-[140px]">
                      <div className="flex flex-col items-center gap-1">
                        <span>Vendor Plan</span>
                        <span className="text-2xl font-bold">${vendorProduct?.prices?.[0] ? formatPrice(vendorProduct.prices[0].unit_amount) : '29'}<span className="text-sm font-normal text-muted-foreground">/mo</span></span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="p-4 text-sm">{row.feature}</td>
                      <td className="p-4 text-center">
                        {row.agent ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {row.vendor ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {userRole === "vendor" && (
          <VendorPremiumSection />
        )}

        <div className="text-center py-12">
          <div className="max-w-lg mx-auto">
            <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              {!currentSub && !subscription?.trialEndsAt
                ? "Start your 7-day free trial today. Cancel anytime — you won't be charged until your trial ends."
                : "Join thousands of real estate professionals who trust HomeBase to manage their business."}
            </p>
            {!currentSub && (
              <Button
                size="lg"
                className="gap-2 px-8"
                onClick={() => {
                  const product = userRole === 'agent' ? agentProduct : vendorProduct;
                  if (product?.prices?.[0]) checkoutMutation.mutate(product.prices[0].id);
                }}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? "Loading..." : !subscription?.trialEndsAt ? "Start Free Trial" : "Subscribe Now"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const comparisonRows = [
  { feature: "Transaction management", agent: true, vendor: false },
  { feature: "Client management & CRM", agent: true, vendor: false },
  { feature: "Contract parsing & document tracking", agent: true, vendor: false },
  { feature: "Interactive property map", agent: true, vendor: false },
  { feature: "Encrypted private messaging", agent: true, vendor: true },
  { feature: "Communication metrics dashboard", agent: true, vendor: true },
  { feature: "SMS communications", agent: true, vendor: false },
  { feature: "Gmail integration", agent: true, vendor: false },
  { feature: "Customizable dashboard", agent: true, vendor: true },
  { feature: "Drip campaigns", agent: true, vendor: false },
  { feature: "Lead generation", agent: true, vendor: true },
  { feature: "Vendor portal & bid management", agent: false, vendor: true },
  { feature: "Inspection bid system", agent: false, vendor: true },
  { feature: "Contractor verification badges", agent: false, vendor: true },
  { feature: "HomeBase Pros marketplace", agent: true, vendor: true },
  { feature: "Vendor ratings & reviews", agent: false, vendor: true },
  { feature: "Referral program", agent: true, vendor: true },
  { feature: "Calendar & scheduling", agent: true, vendor: false },
  { feature: "Mobile app (PWA)", agent: true, vendor: true },
];

function PlanCard({
  name,
  description,
  product,
  features,
  isCurrent,
  isRelevant,
  isFirstTime,
  formatPrice,
  formatPriceCents,
  onSubscribe,
  isSubscribing,
  accentColor,
  icon: Icon,
  isMobile,
}: {
  name: string;
  description: string;
  product: any;
  features: { icon: any; text: string }[];
  isCurrent: boolean;
  isRelevant: boolean;
  isFirstTime?: boolean;
  formatPrice: (n: number) => string;
  formatPriceCents: (n: number) => string;
  onSubscribe: (priceId: string) => void;
  isSubscribing: boolean;
  accentColor: string;
  icon: any;
  isMobile?: boolean;
}) {
  const price = product?.prices?.[0];
  const priceAmount = price?.unit_amount;

  return (
    <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${isRelevant ? "border-primary shadow-md ring-1 ring-primary/20" : "border"}`}>
      {isRelevant && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
      )}
      <CardContent className="p-0">
        <div className={`p-6 ${isMobile ? "pb-4" : "p-8 pb-6"}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${isRelevant ? "bg-primary/10" : "bg-muted"}`}>
              <Icon className={`h-5 w-5 ${isRelevant ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="font-bold text-lg">{name}</h3>
              {isRelevant && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Your plan</Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-6">{description}</p>

          <div className="mb-6">
            {priceAmount ? (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">${formatPrice(priceAmount)}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">—</span>
              </div>
            )}
          </div>

          {isCurrent ? (
            <Button variant="outline" className="w-full gap-2" disabled>
              <CheckCircle2 className="h-4 w-4" />
              Current Plan
            </Button>
          ) : isRelevant && price ? (
            <div className="space-y-2">
              <Button
                className="w-full gap-2"
                onClick={() => onSubscribe(price.id)}
                disabled={isSubscribing}
              >
                <Sparkles className="h-4 w-4" />
                {isSubscribing ? "Loading..." : isFirstTime ? "Start 7-Day Free Trial" : `Get ${name}`}
              </Button>
              {isFirstTime && (
                <p className="text-xs text-center text-muted-foreground">
                  Cancel anytime during your trial — you won't be charged
                </p>
              )}
            </div>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              {isRelevant ? "No price available" : "Not available for your role"}
            </Button>
          )}
        </div>

        <div className="border-t bg-muted/30 p-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">What's included</p>
          {features.map((feature) => (
            <div key={feature.text} className="flex items-start gap-3">
              <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span className="text-sm">{feature.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
