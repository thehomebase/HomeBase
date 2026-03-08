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
  Mail
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
import InspectionReviewPage from "@/pages/inspection-review-page";
import BidComparisonPage from "@/pages/bid-comparison-page";

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const isClient = user?.role === 'client';
  const isVendor = user?.role === 'vendor';

  // Update sidebar state when mobile status changes
  React.useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleCompact = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <div className="flex min-h-screen bg-background">
        {user && (
          <div className={`flex-none transition-all duration-200 ease-in-out ${
            isMobile ? 'w-[60px]' : (isSidebarOpen ? 'w-[220px]' : 'w-[60px]')
          }`}>
            <Sidebar
              side="left"
              collapsible={isMobile ? "none" : "icon"}
              className="fixed inset-y-0 left-0 z-40 border-r bg-background w-[60px] md:w-auto"
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
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Vendor Portal">
                          <Link href="/vendor" className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            {isSidebarOpen && <span>Vendor Portal</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {isClient && (
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="My Transaction">
                          <Link href="/my-transaction" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {isSidebarOpen && <span>My Transaction</span>}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}
                    {!isClient && !isVendor && (
                      <>
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
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Mail">
                          <Link href="/mail" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {isSidebarOpen && <span>Mail</span>}
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
          <div className="w-full">
            {children}
          </div>
        </main>
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
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/property-search">
        <ProtectedRoute path="/property-search" component={PropertySearchPage} />
      </Route>
      {isClient && <Route path="/my-transaction" component={ClientTransactionPage} />}
      {isClient && <Route path="/glossary" component={GlossaryPage} />}
      <Route path="/calculators">
        <ProtectedRoute path="/calculators" component={CalculatorsPage} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute path="/calendar" component={CalendarPage} />
      </Route>

      {user?.role === "vendor" ? (
        <>
          <Route path="/vendor">
            <ProtectedRoute path="/vendor" component={VendorPortal} />
          </Route>
          <Route path="/">
            <ProtectedRoute path="/" component={VendorPortal} />
          </Route>
        </>
      ) : user?.role === "agent" ? (
        <>
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
          <Route path="/">
            <ProtectedRoute path="/" component={TransactionsPage} />
          </Route>
        </>
      ) : (
        <Route path="/">
          <ProtectedRoute path="/" component={CalculatorsPage} />
        </Route>
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