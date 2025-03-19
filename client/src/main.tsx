import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/use-auth';
import App from './App';
import './index.css';

// Create a persistent QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // Data remains fresh for 5 minutes
      retry: 1, // Only retry failed requests once
    },
  },
});

const container = document.getElementById('root')!;
const root = createRoot(container);

function render() {
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

render();

// Enhanced HMR configuration with fallback
if (import.meta.hot) {
  // Accept specific modules for HMR
  import.meta.hot.accept(['./App', './index.css'], (modules) => {
    console.log('HMR update detected, attempting hot reload');
    try {
      // Clear query cache to ensure fresh data
      queryClient.clear();
      // Try to re-render the application
      render();
    } catch (error) {
      console.error('HMR update failed, falling back to full reload:', error);
      window.location.reload();
    }
  });

  // Handle connection loss
  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('Development server connection lost');
    // Wait a bit to see if it reconnects
    setTimeout(() => {
      console.log('Forcing page reload due to lost connection');
      window.location.reload();
    }, 2000);
  });

  // Log reconnection
  import.meta.hot.on('vite:ws-connect', () => {
    console.log('Development server connected');
  });
}