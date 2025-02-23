
import { SidebarProvider } from '@/components/ui/sidebar';
import { Router } from 'wouter';
import ClientsPage from './pages/clients-page';
import { AuthProvider } from '@/hooks/use-auth';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SidebarProvider>
          <div className="min-h-screen">
            <main className="flex-1">
              <Router>
                <ClientsPage />
              </Router>
            </main>
          </div>
        </SidebarProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
