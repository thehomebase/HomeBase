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
  import.meta.hot.accept(['./App', './index.css'], (modules) => {
    console.log('HMR update detected, attempting hot reload');
    try {
      queryClient.clear();
      render();
    } catch (error) {
      console.error('HMR update failed:', error);
      window.location.reload();
    }
  });

  let reconnectTimeout: NodeJS.Timeout;
  
  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('HMR disconnected, scheduling reconnect...');
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      console.log('Attempting page reload after disconnect');
      window.location.reload();
    }, 1000);
  });

  import.meta.hot.on('vite:ws-connect', () => {
    console.log('HMR connected');
    clearTimeout(reconnectTimeout);
  });
}