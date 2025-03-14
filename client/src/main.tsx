import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './hooks/use-auth';
import App from './App';
import './index.css';

const queryClient = new QueryClient();

// Configure HMR
if (import.meta.hot) {
  import.meta.hot.accept(); // Accept updates to the module
  import.meta.hot.on('vite:beforeUpdate', () => {
    console.log('vite:beforeUpdate');
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