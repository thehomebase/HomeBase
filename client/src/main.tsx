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
    },
  },
});

// Configure HMR with enhanced error handling
if (import.meta.hot) {
  import.meta.hot.accept();

  // Log when HMR update is about to happen
  import.meta.hot.on('vite:beforeUpdate', (data) => {
    console.log('HMR update incoming:', data);
  });

  // Handle HMR errors
  import.meta.hot.on('vite:error', (err) => {
    console.error('HMR error:', err);
  });

  // Log successful updates
  import.meta.hot.on('vite:afterUpdate', (data) => {
    console.log('HMR update applied:', data);
    // Preserve query cache during HMR updates
    queryClient.refetchQueries();
  });
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);