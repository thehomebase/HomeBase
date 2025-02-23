import { SidebarProvider } from '@/components/sidebar-provider';
import { Router } from 'wouter';
import ClientsPage from './pages/clients-page';

export default function App() {
  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <main className="flex-1">
          <Router>
            <ClientsPage />
          </Router>
        </main>
      </div>
    </SidebarProvider>
  );
}