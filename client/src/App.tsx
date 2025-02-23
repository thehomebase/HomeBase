import { SidebarProvider } from '@/components/ui/sidebar';
import { Router } from 'wouter';
import ClientsPage from './pages/clients-page';
import { AuthProvider } from '@/hooks/use-auth';

export default function App() {
  return (
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
  );
}