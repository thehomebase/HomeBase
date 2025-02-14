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
  Calculator,
  Book,
  PanelLeftClose,
  PanelLeft
} from "lucide-react";
import React, { useState } from "react";
import CalculatorsPage from "@/pages/calculators-page";
import GlossaryPage from "./pages/glossary-page";
import MessagesPage from "./pages/messages-page";

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const isClient = user?.role === 'client';

  const toggleCompact = () => setIsCompact(!isCompact);

  return (
    <SidebarProvider defaultOpen={isSidebarOpen}>
      <div className="min-h-screen flex bg-background relative">
        {/* Mobile Menu Toggle */}
        {user && (
          <Button
            variant="outline"
            size="icon"
            className="fixed top-4 left-4 z-50 md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}

        {user && (
          <Sidebar
            side="left"
            collapsible="icon"
            className={`transition-transform duration-200 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0 ${
              isCompact ? 'w-[70px]' : 'w-[240px]'
            }`}
          >
            <SidebarHeader className="mb-2">
              <div className="flex items-center justify-between px-2 py-4">
                <Logo isCompact={isCompact} />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleCompact}
                  className="hidden md:flex"
                >
                  {isCompact ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {!isClient && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Transactions">
                          <Link href="/transactions" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {!isCompact && "Transactions"}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild tooltip="Clients">
                          <Link href="/clients" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {!isCompact && "Clients"}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Calendar">
                      <Link href="/calendar" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {!isCompact && "Calendar"}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Messages">
                      <Link href="/messages" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {!isCompact && "Messages"}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Calculators">
                      <Link href="/calculators" className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        {!isCompact && "Calculators"}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isClient && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Glossary">
                        <Link href="/glossary" className="flex items-center gap-2">
                          <Book className="h-4 w-4" />
                          {!isCompact && "Glossary"}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className={`flex flex-col gap-2 ${isCompact ? 'px-2' : 'px-4'}`}>
                {!isCompact && (
                  <span className="text-xs text-muted-foreground">
                    {user?.email} ({user?.role})
                  </span>
                )}
                <Button
                  variant="outline"
                  size={isCompact ? "icon" : "sm"}
                  onClick={() => logoutMutation.mutate()}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4" />
                  {!isCompact && "Logout"}
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        <div className={`flex-1 transition-all duration-200 overflow-x-hidden py-4 ${
          user ? 'px-4' : 'px-4'
        }`}>
          <div className="max-w-[2000px] mx-auto">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={MessagesPage} />
      {isClient && <Route path="/glossary" component={GlossaryPage} />}
      <Route path="/calculators">
        <ProtectedRoute path="/calculators" component={CalculatorsPage} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute path="/calendar" component={CalendarPage} />
      </Route>

      {/* Agent specific routes */}
      {user?.role === "agent" ? (
        <>
          <Route path="/transactions/:id">
            <ProtectedRoute path="/transactions/:id" component={TransactionPage} />
          </Route>
          <Route path="/transactions">
            <ProtectedRoute path="/transactions" component={TransactionsPage} />
          </Route>
          <Route path="/clients">
            <ProtectedRoute path="/clients" component={ClientsPage} />
          </Route>
          <Route path="/data">
            <ProtectedRoute path="/data" component={DataPage} />
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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Layout>
          <Router />
        </Layout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;