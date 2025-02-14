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
import { Switch, Route, Link as WouterLink } from "wouter";
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
import { LogOut, Menu } from "lucide-react";
import React, { useState } from "react";
import CalculatorsPage from "@/pages/calculators-page";
import GlossaryPage from "./pages/glossary-page";
import MessagesPage from "./pages/messages-page";
import { Link } from "wouter";

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
            } md:translate-x-0`}
          >
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Home">
                      <Link href="/">Home</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Transactions">
                      <Link href="/transactions">Transactions</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Clients">
                      <Link href="/clients">Clients</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Calendar">
                      <Link href="/calendar">Calendar</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Messages">
                      <Link href="/messages">Messages</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Calculators">
                      <Link href="/calculators">Calculators</Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground px-2">
                  {user?.email} ({user?.role})
                </span>
                <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        <div className="flex-1 p-4 md:p-8 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/glossary" component={GlossaryPage} />
      {/* Common routes for all authenticated users */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={MessagesPage} />
      <Route path="/glossary" component={GlossaryPage} />
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