import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Switch, Route } from "wouter";
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
import { LogOut, Mail } from "lucide-react";
import React from "react";
import CalculatorsPage from "@/pages/calculators-page"; //Import CalculatorsPage
import GlossaryPage from "./pages/glossary-page"; // Added import for GlossaryPage
import MessagesPage from "./pages/messages-page"; // Added import for MessagesPage


function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex bg-background">
        {user && (
          <Sidebar side="left" collapsible="icon">
            <SidebarHeader>
              <Logo />
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Home">
                      <a href="/">Home</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Transactions">
                      <a href="/transactions">Transactions</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Clients">
                      <a href="/clients">Clients</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Calendar">
                      <a href="/calendar">Calendar</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Messages">
                      <a href="/messages">Messages</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Calculators">
                      <a href="/calculators">Calculators</a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-muted-foreground px-2">
                  {user?.username} ({user?.role})
                </span>
                <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        <div className="flex-1">
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
      {user?.role === "agent" ? (
        <>
          <Route path="/transactions/:id">
            {(params) => (
              <ProtectedRoute
                path="/transactions/:id"
                component={() => <TransactionPage />}
              />
            )}
          </Route>
          <ProtectedRoute path="/" component={TransactionsPage} />
          <ProtectedRoute path="/transactions" component={TransactionsPage} />
          <ProtectedRoute path="/calculators" component={CalculatorsPage} />
          <ProtectedRoute path="/clients" component={ClientsPage} />
          <ProtectedRoute path="/calendar" component={CalendarPage} />
          <Route path="/data" component={DataPage} />
          <Route path="/messages" component={MessagesPage} /> {/* Added messages route */}

        </>
      ) : (
        <>
          <ProtectedRoute path="/" component={CalculatorsPage} />
          <ProtectedRoute path="/calculators" component={CalculatorsPage} />
          <Route path="/transactions/:id">
            {(params) => (
              <ProtectedRoute
                path="/transactions/:id"
                component={() => <TransactionPage />}
              />
            )}
          </Route>
          <Route path="/messages" component={MessagesPage} /> {/* Added messages route */}
        </>
      )}
      <Route path="/glossary" component={GlossaryPage} /> {/* Added glossary route */}
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