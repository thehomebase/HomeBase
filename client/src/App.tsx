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
      <div className="flex min-h-screen bg-background overflow-hidden">
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
            className={`absolute md:fixed h-screen transition-all duration-200 ease-in-out ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } md:translate-x-0 ${
              isCompact ? 'w-[60px]' : 'w-[220px]'
            } z-40 border-r bg-background`}
          >
            <SidebarHeader>
              <div className="flex items-center justify-between p-2">
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
              <div className="p-2">
                {!isCompact && (
                  <span className="text-xs text-muted-foreground block mb-2 px-2 truncate">
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
                  {!isCompact && <span className="ml-2">Logout</span>}
                </Button>
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        <main
          className={`flex-1 min-h-screen overflow-x-hidden ${
            user ? (
              isCompact
                ? 'pl-[60px]'
                : 'pl-[220px]'
            ) : ''
          }`}
        >
          {children}
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