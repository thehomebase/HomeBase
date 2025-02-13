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


function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Logged in as {user.username} ({user.role})
              </span>
              <Button variant="outline" size="sm" onClick={() => window.location.href = `mailto:${user.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Mail
              </Button>
              <Button variant="outline" size="sm" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </header>
      {user && <NavTabs />}
      {children}
    </div>
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