import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton
} from "./components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch, Route, Link, useLocation } from "wouter";
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
  LayoutDashboard,
  DollarSign,
  Briefcase,
  ChevronDown,
  Phone,
  ScanLine,
  Zap,
  Key,
  User as UserIcon,
  Settings,
  Target
} from "lucide-react";
import React, { useState, createContext, useContext } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OnboardingTutorial, useOnboardingTutorial, TutorialStartButton } from "@/components/onboarding-tutorial";
import CalculatorsPage from "@/pages/calculators-page";
import ProfilePage from "@/pages/profile-page";
import { SiteFooter } from "@/components/site-footer";
import GlossaryPage from "./pages/glossary-page";
import MessagesPage from "./pages/messages-page";
import ClientPage from "@/pages/client-page";

import MapPage from "@/pages/map-page";
import PropertySearchPage from "@/pages/property-search-page";
import ListingAlertsPage from "@/pages/listing-alerts-page";
import ListingDetailPage from "@/pages/listing-detail-page";
import MailPage from "@/pages/mail-page";
import PhonePage from "@/pages/phone-page";
import DocumentScannerPage from "@/pages/document-scanner-page";
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
import LeadMetricsPage from "@/pages/lead-metrics-page";
import DashboardPage from "@/pages/dashboard-page";
import LeadSubmitPage from "@/pages/lead-submit-page";
import LenderLeadSubmitPage from "@/pages/lender-lead-submit-page";
import FindContractorPage from "@/pages/find-contractor-page";
import VendorRatingsPage from "@/pages/vendor-ratings-page";
import BiometricSettingsPage from "@/pages/biometric-settings-page";
import SettingsPage from "@/pages/settings-page";
import LandingPage from "@/pages/landing-page";
import FeedbackPage from "@/pages/feedback-page";
import VerifyEmailPage from "@/pages/verify-email-page";
import ZapierPage from "@/pages/zapier-page";
import ApiKeysPage from "@/pages/api-keys-page";
import BrokerPortalPage from "@/pages/broker-portal-page";
import CommissionsPage from "@/pages/commissions-page";
import RemindersPage from "@/pages/reminders-page";
import OpenHousesPage from "@/pages/open-houses-page";
import OpenHouseSignInPage from "@/pages/open-house-sign-in-page";
import AdminPage from "@/pages/admin-page";
import TasksPage from "@/pages/tasks-page";
import SponsoredAdsPage from "@/pages/sponsored-ads-page";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { BiometricSetupButton } from "@/components/biometric-setup";
import { useLeadAlerts } from "@/hooks/use-lead-alerts";
import { NotificationBell } from "@/components/notification-bell";
import { useQuery as useQueryRQ } from "@tanstack/react-query";
import { ListTodo, Megaphone as MegaphoneIcon, ShieldCheck, ArrowLeftRight, Check } from "lucide-react";

interface ActingAsAccount {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  profilePhotoUrl?: string;
}

interface ActingAsContextType {
  actingAs: ActingAsAccount | null;
  setActingAs: (account: ActingAsAccount | null) => void;
}

const ActingAsContext = createContext<ActingAsContextType>({ actingAs: null, setActingAs: () => {} });
export function useActingAs() { return useContext(ActingAsContext); }

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
  const [location] = useLocation();
  const isMapPage = location === '/map';
  const isClient = user?.role === 'client';
  const isVendor = user?.role === 'vendor';
  const isLender = user?.role === 'lender';
  const isBroker = user?.role === 'broker';
  const { newLeadCount } = useLeadAlerts();
  const isAgentOrBroker = user?.role === 'agent' || user?.role === 'broker';
  const isAdmin = user?.role === 'admin';
  const tutorial = useOnboardingTutorial(user?.id, user?.role);
  const [actingAs, setActingAs] = useState<ActingAsAccount | null>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);

  const { data: authorizedAccounts = [] } = useQueryRQ<any[]>({
    queryKey: ["/api/authorized-users/accounts"],
    enabled: isAgentOrBroker,
  });

  const { data: badgeCounts } = useQueryRQ<{
    unreadMessages: number;
    pendingDocuments: number;
    overdueTasks: number;
    upcomingDeadlines: number;
    newLeads: number;
  }>({
    queryKey: ['/api/badge-counts'],
    enabled: !!user,
    refetchInterval: 60000,
  });

  return (
    <ActingAsContext.Provider value={{ actingAs, setActingAs }}>
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen bg-background w-full overflow-x-hidden">
        {user && !isMobile && (
            <Sidebar
              side="left"
              variant="sidebar"
              collapsible="none"
              className="border-r sticky top-0 h-screen overflow-y-auto shrink-0"
            >
              <SidebarHeader>
                <div className="flex items-center justify-between p-2">
                  <Logo isCompact={false} />
                </div>
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Dashboard">
                        <Link href="/dashboard" className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Dashboard</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {isBroker && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Broker Portal">
                          <Link href="/broker-portal" className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            <span>Broker Portal</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {isVendor && (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Vendor Portal">
                            <Link href="/vendor" className="flex items-center gap-2">
                              <Wrench className="h-4 w-4" />
                              <span className="flex items-center gap-2">
                                Vendor Portal
                                {newLeadCount > 0 && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                    {newLeadCount}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="My Ratings">
                            <Link href="/vendor-ratings" className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              <span>My Ratings</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    )}
                    {isLender && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Loan Pipeline">
                          <Link href="/lender-portal" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>Loan Pipeline</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {isClient && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="My Transaction">
                          <Link href="/my-transaction" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>My Transaction</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroup>

                {isAgentOrBroker && (
                  <Collapsible defaultOpen className="group/deals">
                    <SidebarGroup>
                      <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center justify-between">
                          Deals & Clients
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/deals:rotate-0 group-data-[state=closed]/deals:-rotate-90" />
                        </CollapsibleTrigger>
                      </SidebarGroupLabel>
                      <CollapsibleContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Transactions">
                              <Link href="/transactions" className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>Transactions</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Commissions">
                              <Link href="/commissions" className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4" />
                                <span>Commissions</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Clients">
                              <Link href="/clients" className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                <span>Clients</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                )}

                {isAgentOrBroker && (
                  <Collapsible defaultOpen className="group/marketing">
                    <SidebarGroup>
                      <SidebarGroupLabel asChild>
                        <CollapsibleTrigger className="flex w-full items-center justify-between">
                          Marketing & Growth
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/marketing:rotate-0 group-data-[state=closed]/marketing:-rotate-90" />
                        </CollapsibleTrigger>
                      </SidebarGroupLabel>
                      <CollapsibleContent>
                        <SidebarMenu>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Open Houses">
                              <Link href="/open-houses" className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                <span>Open Houses</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Lead Gen">
                              <Link href="/lead-gen" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="flex items-center gap-2">
                                  Lead Gen
                                  {newLeadCount > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                      {newLeadCount}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Lead Metrics">
                              <Link href="/lead-metrics" className="flex items-center gap-2">
                                <Target className="h-4 w-4" />
                                <span>Lead Metrics</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Drip Campaigns">
                              <Link href="/drip" className="flex items-center gap-2">
                                <Bell className="h-4 w-4" />
                                <span>Drip Campaigns</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Referrals">
                              <Link href="/referrals" className="flex items-center gap-2">
                                <Gift className="h-4 w-4" />
                                <span>Referrals</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Data">
                              <Link href="/data" className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" />
                                <span>Data</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </SidebarMenu>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                )}

                <Collapsible defaultOpen className="group/comms">
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="flex w-full items-center justify-between">
                        Communication
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/comms:rotate-0 group-data-[state=closed]/comms:-rotate-90" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Messages">
                            <Link href="/messages" className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              <span>Messages</span>
                              {(badgeCounts?.unreadMessages ?? 0) > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5 min-w-[20px] h-5">
                                  {badgeCounts!.unreadMessages}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isAgentOrBroker && (
                          <>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild tooltip="Mail">
                                <Link href="/mail" className="flex items-center gap-2">
                                  <Mail className="h-4 w-4" />
                                  <span>Mail</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild tooltip="Phone & SMS">
                                <Link href="/phone" className="flex items-center gap-2">
                                  <Phone className="h-4 w-4" />
                                  <span>Phone & SMS</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                              <SidebarMenuButton asChild tooltip="Reminders">
                                <Link href="/reminders" className="flex items-center gap-2">
                                  <Bell className="h-4 w-4" />
                                  <span>Reminders</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Tasks">
                            <Link href="/tasks" className="flex items-center gap-2">
                              <ListTodo className="h-4 w-4" />
                              <span>Tasks</span>
                              {(badgeCounts?.overdueTasks ?? 0) > 0 && (
                                <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium px-1.5 min-w-[20px] h-5">
                                  {badgeCounts!.overdueTasks}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>

                <Collapsible defaultOpen className="group/tools">
                  <SidebarGroup>
                    <SidebarGroupLabel asChild>
                      <CollapsibleTrigger className="flex w-full items-center justify-between">
                        Tools & Services
                        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/tools:rotate-0 group-data-[state=closed]/tools:-rotate-90" />
                      </CollapsibleTrigger>
                    </SidebarGroupLabel>
                    <CollapsibleContent>
                      <SidebarMenu>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="HomeBase Pros">
                            <Link href="/marketplace" className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <span>HomeBase Pros</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="My Team">
                            <Link href="/my-team" className="flex items-center gap-2">
                              <HardHat className="h-4 w-4" />
                              <span>My Team</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Find Agents">
                            <Link href="/top-agents" className="flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              <span>Find Agents</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Property Search">
                            <Link href="/property-search" className="flex items-center gap-2">
                              <Search className="h-4 w-4" />
                              <span>Property Search</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Listing Alerts">
                            <Link href="/listing-alerts" className="flex items-center gap-2">
                              <Bell className="h-4 w-4" />
                              <span>Listing Alerts</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isAgentOrBroker && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Map">
                              <Link href="/map" className="flex items-center gap-2">
                                <Map className="h-4 w-4" />
                                <span>Map</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Calendar">
                            <Link href="/calendar" className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>Calendar</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="MyHome">
                            <Link href="/my-home" className="flex items-center gap-2">
                              <Home className="h-4 w-4" />
                              <span>MyHome</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isMobile && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Document Scanner">
                            <Link href="/scanner" className="flex items-center gap-2">
                              <ScanLine className="h-4 w-4" />
                              <span>Document Scanner</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Calculators">
                            <Link href="/calculators" className="flex items-center gap-2">
                              <Calculator className="h-4 w-4" />
                              <span>Calculators</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        {isClient && (
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild tooltip="Glossary">
                              <Link href="/glossary" className="flex items-center gap-2">
                                <Book className="h-4 w-4" />
                                <span>Glossary</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )}
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Sponsored Ads">
                            <Link href="/sponsored-ads" className="flex items-center gap-2">
                              <MegaphoneIcon className="h-4 w-4" />
                              <span>Sponsored Ads</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild tooltip="Settings">
                            <Link href="/settings" className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              <span>Settings</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </SidebarMenu>
                    </CollapsibleContent>
                  </SidebarGroup>
                </Collapsible>

                {isAdmin && (
                  <SidebarGroup>
                    <SidebarGroupLabel>Administration</SidebarGroupLabel>
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Admin Dashboard">
                          <Link href="/admin" className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            <span>Admin Dashboard</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  </SidebarGroup>
                )}
              </SidebarContent>
              <SidebarFooter>
                <div className="p-2 space-y-2">
                  {isAgentOrBroker && (
                    <TutorialStartButton onClick={tutorial.startTutorial} />
                  )}
                  {isAgentOrBroker && authorizedAccounts.length > 0 && (
                    <div className="relative">
                      <button
                        onClick={() => setShowAccountSwitcher(!showAccountSwitcher)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {actingAs ? `Viewing: ${actingAs.firstName} ${actingAs.lastName}` : "Switch Account"}
                        </span>
                        <ChevronDown className="h-3 w-3 ml-auto" />
                      </button>
                      {showAccountSwitcher && (
                        <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                          <button
                            onClick={() => { setActingAs(null); setShowAccountSwitcher(false); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors ${!actingAs ? "bg-primary/5 font-medium" : ""}`}
                          >
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-semibold text-primary">
                                {(user?.firstName?.[0] || "").toUpperCase()}{(user?.lastName?.[0] || "").toUpperCase()}
                              </span>
                            </div>
                            <span className="truncate">My Account</span>
                            {!actingAs && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                          </button>
                          <div className="border-t mx-2 my-1" />
                          {authorizedAccounts.map((acc: any) => (
                            <button
                              key={acc.id}
                              onClick={() => { setActingAs(acc.owner); setShowAccountSwitcher(false); }}
                              className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors ${actingAs?.id === acc.owner.id ? "bg-primary/5 font-medium" : ""}`}
                            >
                              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                {acc.owner.profilePhotoUrl ? (
                                  <img src={acc.owner.profilePhotoUrl} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-semibold">
                                    {(acc.owner.firstName?.[0] || "").toUpperCase()}{(acc.owner.lastName?.[0] || "").toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 text-left">
                                <span className="truncate block">{acc.owner.firstName} {acc.owner.lastName}</span>
                                <span className="text-[10px] text-muted-foreground block">
                                  {acc.permissionLevel === "full" ? "Full Access" : "View Only"}
                                </span>
                              </div>
                              {actingAs?.id === acc.owner.id && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {actingAs && (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                      <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span className="text-xs text-amber-700 dark:text-amber-400 truncate">
                        Viewing {actingAs.firstName}'s account
                      </span>
                      <button onClick={() => setActingAs(null)} className="ml-auto text-amber-600 hover:text-amber-800 text-xs font-medium shrink-0">
                        Exit
                      </button>
                    </div>
                  )}
                  <Link href="/settings" className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    {user?.profilePhotoUrl ? (
                      <img
                        src={user.profilePhotoUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-9 w-9 rounded-full object-cover border-2 border-border shrink-0"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border-2 border-border shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {(user?.firstName?.[0] || "").toUpperCase()}{(user?.lastName?.[0] || "").toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">{user?.role}</p>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => logoutMutation.mutate()}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SidebarFooter>
            </Sidebar>
        )}
        <main className="flex-1 min-h-screen min-w-0 overflow-x-hidden relative">
          {user && !(isMobile && isMapPage) && (
            <div className="sticky z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
              <div className="flex items-center justify-between px-4 py-2">
                {isMobile && <Logo isCompact={false} />}
                <div className={isMobile ? '' : 'ml-auto'}>
                  <NotificationBell />
                </div>
              </div>
              <LeadAlertBanner />
            </div>
          )}
          <div className={`w-full ${isMobile && user ? 'pb-20' : ''}`}>
            {children}
            {user && <SiteFooter />}
          </div>
        </main>
        {isMobile && <MobileBottomNav />}
        {isAgentOrBroker && (
          <OnboardingTutorial
            isActive={tutorial.isActive}
            currentStep={tutorial.currentStep}
            setCurrentStep={tutorial.setCurrentStep}
            onClose={tutorial.closeTutorial}
          />
        )}
      </div>
    </SidebarProvider>
    </ActingAsContext.Provider>
  );
}

function Router() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <Switch>
      <Route path="/integrations/zapier" component={ZapierPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/find-agent" component={LeadSubmitPage} />
      <Route path="/find-lender" component={LenderLeadSubmitPage} />
      <Route path="/find-contractor" component={FindContractorPage} />
      <Route path="/agents/:agentId/reviews" component={AgentReviewsPage} />
      <Route path="/top-agents" component={TopAgentsPage} />
      <Route path="/feedback/:token" component={FeedbackPage} />
      <Route path="/open-house/:slug" component={OpenHouseSignInPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/property-search">
        <ProtectedRoute path="/property-search" component={PropertySearchPage} />
      </Route>
      <Route path="/listing-alerts">
        <ProtectedRoute path="/listing-alerts" component={ListingAlertsPage} />
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
      <Route path="/scanner">
        <ProtectedRoute path="/scanner" component={DocumentScannerPage} />
      </Route>
      <Route path="/calculators">
        <ProtectedRoute path="/calculators" component={CalculatorsPage} />
      </Route>
      <Route path="/listing/:id">
        <ProtectedRoute path="/listing/:id" component={ListingDetailPage} />
      </Route>
      <Route path="/profile/:id">
        <ProtectedRoute path="/profile/:id" component={ProfilePage} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute path="/profile" component={ProfilePage} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute path="/calendar" component={CalendarPage} />
      </Route>
      <Route path="/settings/biometric">
        <ProtectedRoute path="/settings/biometric" component={BiometricSettingsPage} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute path="/settings" component={SettingsPage} />
      </Route>
      <Route path="/tasks">
        <ProtectedRoute path="/tasks" component={TasksPage} />
      </Route>
      <Route path="/sponsored-ads">
        <ProtectedRoute path="/sponsored-ads" component={SponsoredAdsPage} />
      </Route>
      {user?.role === "admin" && (
        <Route path="/admin">
          <ProtectedRoute path="/admin" component={AdminPage} />
        </Route>
      )}

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
      ) : user?.role === "broker" ? (
        <>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
          </Route>
          <Route path="/broker-portal">
            <ProtectedRoute path="/broker-portal" component={BrokerPortalPage} />
          </Route>
          <Route path="/commissions">
            <ProtectedRoute path="/commissions" component={CommissionsPage} />
          </Route>
          <Route path="/open-houses">
            <ProtectedRoute path="/open-houses" component={OpenHousesPage} />
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
            <ProtectedRoute path="/contractors" component={MarketplacePage} />
          </Route>
          <Route path="/map">
            <ProtectedRoute path="/map" component={MapPage} />
          </Route>
          <Route path="/mail">
            <ProtectedRoute path="/mail" component={MailPage} />
          </Route>
          <Route path="/phone">
            <ProtectedRoute path="/phone" component={PhonePage} />
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
          <Route path="/lead-metrics">
            <ProtectedRoute path="/lead-metrics" component={LeadMetricsPage} />
          </Route>
          <Route path="/reminders">
            <ProtectedRoute path="/reminders" component={RemindersPage} />
          </Route>
          <Route path="/api-keys">
            <ProtectedRoute path="/api-keys" component={ApiKeysPage} />
          </Route>
          <Route path="/billing">
            <ProtectedRoute path="/billing" component={BillingPage} />
          </Route>
          <Route path="/">
            <ProtectedRoute path="/" component={DashboardPage} />
          </Route>
        </>
      ) : (user?.role === "agent" || user?.role === "admin") ? (
        <>
          <Route path="/dashboard">
            <ProtectedRoute path="/dashboard" component={DashboardPage} />
          </Route>
          <Route path="/commissions">
            <ProtectedRoute path="/commissions" component={CommissionsPage} />
          </Route>
          <Route path="/open-houses">
            <ProtectedRoute path="/open-houses" component={OpenHousesPage} />
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
            <ProtectedRoute path="/contractors" component={MarketplacePage} />
          </Route>
          <Route path="/map">
            <ProtectedRoute path="/map" component={MapPage} />
          </Route>
          <Route path="/mail">
            <ProtectedRoute path="/mail" component={MailPage} />
          </Route>
          <Route path="/phone">
            <ProtectedRoute path="/phone" component={PhonePage} />
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
          <Route path="/lead-metrics">
            <ProtectedRoute path="/lead-metrics" component={LeadMetricsPage} />
          </Route>
          <Route path="/reminders">
            <ProtectedRoute path="/reminders" component={RemindersPage} />
          </Route>
          <Route path="/api-keys">
            <ProtectedRoute path="/api-keys" component={ApiKeysPage} />
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
        <AppShell />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!user && <Route path="/" component={LandingPage} />}
      <Route>
        <Layout>
          <Router />
        </Layout>
      </Route>
    </Switch>
  );
}

export default App;