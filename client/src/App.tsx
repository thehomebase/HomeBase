import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "./components/ui/sidebar";
import { Switch, Route, Link } from "wouter";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import TransactionsPage from "@/pages/transactions-page";
import ClientsPage from "@/pages/clients-page";
import TransactionPage from "@/pages/transaction-page";
import CalendarPage from "@/pages/calendar-page";
import DataPage from "./pages/data-page";
import PrivacyPolicyPage from "@/pages/privacy-policy-page";
import TermsPage from "@/pages/terms-page";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Logo } from "@/components/ui/logo";
import { NavTabs } from "@/components/ui/nav-tabs";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Menu,
  Home,
  FileText,
  Users,
  Calendar,
  MessageSquare,
  BarChart3,
  Calculator,
  Book,
  PanelLeftClose,
  PanelLeft,
  Wrench,
  Map,
  Search,
  Mail,
  Gift,
  Store,
  HardHat,
  CreditCard,
  Bell,
  MapPin,
  Star,
  LayoutDashboard
} from "lucide-react";
import React, { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import CalculatorsPage from "@/pages/calculators-page";
import GlossaryPage from "./pages/glossary-page";
import MessagesPage from "./pages/messages-page";
import ClientPage from "@/pages/client-page";
import ContractorsPage from "@/pages/contractors-page";
import MapPage from "@/pages/map-page";
import PropertySearchPage from "@/pages/property-search-page";
import MailPage from "@/pages/mail-page";
import ClientTransactionPage from "@/pages/client-transaction-page";
import VendorPortal from "@/pages/vendor-portal";
import LenderPortal from "@/pages/lender-portal";
import LenderTransactionPage from "@/pages/lender-transaction-page";
import InspectionReviewPage from "@/pages/inspection-review-page";
import BidComparisonPage from "@/pages/bid-comparison-page";
import MyHomePage from "@/pages/my-home-page";
import ReferralPage from "@/pages/referral-page";
import MarketplacePage from "@/pages/marketplace-page";
import MyTeamPage from "@/pages/my-team-page";
import BillingPage from "@/pages/billing-page";
import DripCampaignsPage from "@/pages/drip-campaigns-page";
import { TopAgentsPage, AgentReviewsPage } from "@/pages/agent-reviews-page";
import LeadGenerationPage from "@/pages/lead-generation-page";
import DashboardPage from "@/pages/dashboard-page";
import LeadSubmitPage from "@/pages/lead-submit-page";
import FindContractorPage from "@/pages/find-contractor-page";
import VendorRatingsPage from "@/pages/vendor-ratings-page";
import BiometricSettingsPage from "@/pages/biometric-settings-page";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { BiometricSetupButton } from "@/components/biometric-setup";
import { useLeadAlerts } from "@/hooks/use-lead-alerts";

function LeadAlertBanner() {
  const { newLeadCount, isAgent } = useLeadAlerts();
  const [dismissedAt, setDismissedAt] = React.useState(0);

  React.useEffect(() => {
    if (newLeadCount > dismissedAt && dismissedAt > 0) {
      setDismissedAt(0);
    }
  }, [newLeadCount, dismissedAt]);

  if (!isAgent || newLeadCount === 0 || (dismissedAt > 0 && newLeadCount <= dismissedAt)) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="font-medium">
          {newLeadCount === 1
            ? "You have 1 new lead waiting for you!"
            : `You have ${newLeadCount} new leads waiting for you!`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/lead-gen" className="underline font-semibold hover:opacity-80">
          View Leads
        </Link>
        <button onClick={() => setDismissedAt(newLeadCount)} className="opacity-70 hover:opacity-100 ml-1">
          ✕
        </button>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const isClient = user?.role === 'client';
  const isVendor = user?.role === 'vendor';
  const isLender = user?.role === 'lender';
  const { newLeadCount } = useLeadAlerts();

  // Update sidebar state when mobile status changes
  React.useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleCompact = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <div className="flex min-h-screen bg-background w-full overflow-x-hidden">
        {user && !isMobile && (
          <div className={`flex-none transition-all duration-200 ease-in-out ${
            isSidebarOpen ? 'w-[220px]' : 'w-[60px]'
          }`}>
            <Sidebar
              side="left"
              collapsible="icon"
              className="fixed inset-y-0 left-0 z-40 border-r bg-background"
            >
              <SidebarHeader>
                <div className="flex items-center justify-between p-2">
                  <Logo isCompact={!isSidebarOpen} />
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarMenu>
                    {isVendor && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Dashboard">
                            <Link href="/dashboard" className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              {isSidebarOpen && <span>Dashboard</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Vendor Portal">
                            <Link href="/vendor" className="flex items-center gap-2">
                              <div className="relative">
                                <Wrench className="h-4 w-4" />
                                {newLeadCount > 0 && !isSidebarOpen && (
                                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-0.5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                                    {newLeadCount > 99 ? "99+" : newLeadCount}
                                  </span>
                                )}
                              </div>
                              {isSidebarOpen && (
                                <span className="flex items-center gap-2">
                                  Vendor Portal
                                  {newLeadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                      {newLeadCount}
                                    </span>
                                  )}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="My Ratings">
                            <Link href="/vendor-ratings" className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              {isSidebarOpen && <span>My Ratings</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                    {isLender && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Dashboard">
                            <Link href="/dashboard" className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              {isSidebarOpen && <span>Dashboard</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Loan Pipeline">
                            <Link href="/lender-portal" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {isSidebarOpen && <span>Loan Pipeline</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                    {isClient && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Dashboard">
                            <Link href="/dashboard" className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              {isSidebarOpen && <span>Dashboard</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="My Transaction">
                            <Link href="/my-transaction" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {isSidebarOpen && <span>My Transaction</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                    {!isClient && !isVendor && !isLender && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Dashboard">
                            <Link href="/dashboard" className="flex items-center gap-2">
                              <LayoutDashboard className="h-4 w-4" />
                              {isSidebarOpen && <span>Dashboard</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Transactions">
                            <Link href="/transactions" className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {isSidebarOpen && <span>Transactions</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Clients">
                            <Link href="/clients" className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {isSidebarOpen && <span>Clients</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {user?.role === "agent" && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild tooltip="Data">
                                <Link href="/data" className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4" />
                                  {isSidebarOpen && <span>Data</span>}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild tooltip="Contractors">
                                <Link href="/contractors" className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  {isSidebarOpen && <span>Contractors</span>}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild tooltip="Map">
                                <Link href="/map" className="flex items-center gap-2">
                                  <Map className="h-4 w-4" />
                                  {isSidebarOpen && <span>Map</span>}
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </>
                        )}
                      </>
                    )}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="HomeBase Pros">
                        <Link href="/marketplace" className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          {isSidebarOpen && <span>HomeBase Pros</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="My Team">
                        <Link href="/my-team" className="flex items-center gap-2">
                          <HardHat className="h-4 w-4" />
                          {isSidebarOpen && <span>My Team</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="MyHome">
                        <Link href="/my-home" className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          {isSidebarOpen && <span>MyHome</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Find Agents">
                        <Link href="/top-agents" className="flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          {isSidebarOpen && <span>Find Agents</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Property Search">
                        <Link href="/property-search" className="flex items-center gap-2">
                          <Search className="h-4 w-4" />
                          {isSidebarOpen && <span>Property Search</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Calendar">
                        <Link href="/calendar" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {isSidebarOpen && <span>Calendar</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Messages">
                        <Link href="/messages" className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          {isSidebarOpen && <span>Messages</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {user?.role === "agent" && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Mail">
                            <Link href="/mail" className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {isSidebarOpen && <span>Mail</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Referrals">
                            <Link href="/referrals" className="flex items-center gap-2">
                              <Gift className="h-4 w-4" />
                              {isSidebarOpen && <span>Referrals</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Drip Campaigns">
                            <Link href="/drip" className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              {isSidebarOpen && <span>Drip Campaigns</span>}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Lead Gen">
                            <Link href="/lead-gen" className="flex items-center gap-2">
                              <div className="relative">
                                <MapPin className="h-4 w-4" />
                                {newLeadCount > 0 && !isSidebarOpen && (
                                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-0.5 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                                    {newLeadCount > 99 ? "99+" : newLeadCount}
                                  </span>
                                )}
                              </div>
                              {isSidebarOpen && (
                                <span className="flex items-center gap-2">
                                  Lead Gen
                                  {newLeadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                      {newLeadCount}
                                    </span>
                                  )}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                    {(user?.role === 'agent' || user?.role === 'vendor') && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Billing">
                          <Link href="/billing" className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {isSidebarOpen && <span>Billing</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Calculators">
                        <Link href="/calculators" className="flex items-center gap-2">
                          <Calculator className="h-4 w-4" />
                          {isSidebarOpen && <span>Calculators</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isClient && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Glossary">
                          <Link href="/glossary" className="flex items-center gap-2">
                            <Book className="h-4 w-4" />
                            <span className="hidden md:inline">Glossary</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <div className="p-2">
                  {isSidebarOpen && (
                    <span className="text-xs text-muted-foreground block mb-2 px-2 truncate">
                      {user?.email} ({user?.role})
                    </span>
                  )}
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size={!isSidebarOpen ? "icon" : "sm"}
                      onClick={toggleCompact}
                      className="w-full hidden md:flex"
                    >
                      {!isSidebarOpen ? (
                        <PanelLeft className="h-4 w-4" />
                      ) : (
                        <PanelLeftClose className="h-4 w-4" />
                      )}
                      {isSidebarOpen && <span className="ml-2">Compact View</span>}
                    </Button>
                    <BiometricSetupButton compact={!isSidebarOpen} />
                    <Button
                      variant="outline"
                      size={!isSidebarOpen ? "icon" : "sm"}
                      onClick={() => logoutMutation.mutate()}
                      className="w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      {isSidebarOpen && <span className="ml-2">Logout</span>}
                    </Button>
                  </div>
                </div>
              </SidebarFooter>
            </Sidebar>
          </div>
        )}
        <main className="flex-1 min-h-screen w-full overflow-x-hidden relative">
          {user && <LeadAlertBanner />}
          <div className={`w-full ${isMobile && user ? 'pb-20' : ''}`}>
            {children}
          </div>
        </main>
        {isMobile && <MobileBottomNav />}
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <Switch>
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/find-agent" component={LeadSubmitPage} />
      <Route path="/find-contractor" component={FindContractorPage} />
      <Route path="/agents/:agentId/reviews" component={AgentReviewsPage} />
      <Route path="/top-agents" component={TopAgentsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/property-search">
        <ProtectedRoute path="/property-search" component={PropertySearchPage} />
      </Route>
      {isClient && <Route path="/my-transaction" component={ClientTransactionPage} />}
      {isClient && <Route path="/glossary" component={GlossaryPage} />}
      <Route path="/my-home">
        <ProtectedRoute path="/my-home" component={MyHomePage} />
      </Route>
      <Route path="/marketplace">
        <ProtectedRoute path="/marketplace" component={MarketplacePage} />
      </Route>
      <Route path="/my-team">
        <ProtectedRoute path="/my-team" component={MyTeamPage} />
      </Route>
      <Route path="/calculators">
        <ProtectedRoute path="/calculators" component={CalculatorsPage} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute path="/calendar" component={CalendarPage} />
      </Route>
      <Route path="/settings/biometric">
        <ProtectedRoute path="/settings/biometric" component={BiometricSettingsPage} />
      </Route>

      {user?.role === "vendor" ? (
        <>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
          </Route>
          <Route path="/vendor">
            <ProtectedRoute path="/vendor" component={VendorPortal} />
          </Route>
          <Route path="/vendor-ratings">
            <ProtectedRoute path="/vendor-ratings" component={VendorRatingsPage} />
          </Route>
          <Route path="/billing">
            <ProtectedRoute path="/billing" component={BillingPage} />
          </Route>
          <Route path="/">
            <ProtectedRoute path="/" component={DashboardPage} />
          </Route>
        </>
      ) : user?.role === "lender" ? (
        <>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
          </Route>
          <Route path="/lender-portal">
            <ProtectedRoute path="/lender-portal" component={LenderPortal} />
          </Route>
          <Route path="/lender-transaction/:id">
            <ProtectedRoute path="/lender-transaction/:id" component={LenderTransactionPage} />
          </Route>
          <Route path="/billing">
            <ProtectedRoute path="/billing" component={BillingPage} />
          </Route>
          <Route path="/">
            <ProtectedRoute path="/" component={DashboardPage} />
          </Route>
        </>
      ) : user?.role === "agent" ? (
        <>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
          </Route>
          <Route path="/transactions/:id/inspection">
            <ProtectedRoute path="/transactions/:id/inspection" component={InspectionReviewPage} />
          </Route>
          <Route path="/transactions/:id/bids">
            <ProtectedRoute path="/transactions/:id/bids" component={BidComparisonPage} />
          </Route>
          <Route path="/transactions/:id">
            <ProtectedRoute path="/transactions/:id" component={TransactionPage} />
          </Route>
          <Route path="/transactions">
            <ProtectedRoute path="/transactions" component={TransactionsPage} />
          </Route>
          <Route path="/clients">
            <ProtectedRoute path="/clients" component={ClientsPage} />
          </Route>
          <Route path="/clients/:id">
            <ProtectedRoute path="/clients/:id" component={ClientPage} />
          </Route>
          <Route path="/data">
            <ProtectedRoute path="/data" component={DataPage} />
          </Route>
          <Route path="/contractors">
            <ProtectedRoute path="/contractors" component={ContractorsPage} />
          </Route>
          <Route path="/map">
            <ProtectedRoute path="/map" component={MapPage} />
          </Route>
          <Route path="/mail">
            <ProtectedRoute path="/mail" component={MailPage} />
          </Route>
          <Route path="/referrals">
            <ProtectedRoute path="/referrals" component={ReferralPage} />
          </Route>
          <Route path="/drip">
            <ProtectedRoute path="/drip" component={DripCampaignsPage} />
          </Route>
          <Route path="/lead-gen">
            <ProtectedRoute path="/lead-gen" component={LeadGenerationPage} />
          </Route>
          <Route path="/billing">
            <ProtectedRoute path="/billing" component={BillingPage} />
          </Route>
          <Route path="/">
            <ProtectedRoute path="/" component={DashboardPage} />
          </Route>
        </>
      ) : (
        <>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
          </Route>
          <Route path="/">
            <ProtectedRoute path="/" component={DashboardPage} />
          </Route>
        </>
      )}
      <Route path="*" component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // Give the app a moment to initialize
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route>
            <Layout>
              <Router />
            </Layout>
          </Route>
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;