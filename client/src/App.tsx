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
  Book
} from "lucide-react";
import React from "react";
import CalculatorsPage from "@/pages/calculators-page";
import GlossaryPage from "./pages/glossary-page";
import MessagesPage from "./pages/messages-page";

function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const isClient = user?.role === 'client';

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {user && (
          <Sidebar side="left" className="w-64 border-r">
            <SidebarHeader>
              <div className="flex items-center justify-between p-2">
                <Logo />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarMenu>
                  {!isClient && (
                    <>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link href="/transactions" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Transactions
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                          <Link href="/clients" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Clients
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/calendar" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Calendar
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/messages" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Messages
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href="/calculators" className="flex items-center gap-2">
                        <Calculator className="h-4 w-4" />
                        Calculators
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {isClient && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild>
                        <Link href="/glossary" className="flex items-center gap-2">
                          <Book className="h-4 w-4" />
                          Glossary
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="p-2">
                <span className="text-xs text-muted-foreground block mb-2 px-2 truncate">
                  {user?.email} ({user?.role})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        <main className="flex-1 h-screen w-full overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-[2000px] mx-auto px-4 py-4">
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
      <Route path="/auth" component={AuthPage} />
      <Route path="/messages" component={MessagesPage} />
      {isClient && <Route path="/glossary" component={GlossaryPage} />}
      <Route path="/calculators">
        <ProtectedRoute path="/calculators" component={CalculatorsPage} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute path="/calendar" component={CalendarPage} />
      </Route>

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