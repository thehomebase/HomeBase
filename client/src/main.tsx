
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";

const root = ReactDOM.createRoot(document.getElementById("root")!);

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

if (import.meta.hot) {
  // Log when HMR update is received
  import.meta.hot.accept((mod) => {
    console.log('HMR update received');
    if (!mod) {
      window.location.reload();
      return;
    }
    
    // Invalidate all queries to ensure fresh data
    queryClient.invalidateQueries();
    
    // Re-render the application with updated modules
    render();
  });

  // Log when file changes are detected
  import.meta.hot.on('vite:beforeUpdate', (payload: any) => {
    console.log('File changes detected, updating interface...');
    
    // Extract and log updated file names for easier debugging
    const updatedFiles = Array.isArray(payload.updates) 
      ? payload.updates.map((u: any) => {
          const path = u.path || u.acceptedPath || '';
          if (!path) return '';
          const parts = path.split('/');
          return parts[parts.length - 1];
        }).filter(Boolean)
      : [];
    
    if (updatedFiles.length > 0) {
      console.log('Updated files:', updatedFiles);
    }
  });
  
  // Log HMR connection status
  import.meta.hot.on('vite:ws-connect', () => {
    console.log('HMR connected');
  });
  
  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('HMR disconnected, attempting to reconnect...');
  });
}
