
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
  // Simple HMR setup - focus on detecting file changes
  import.meta.hot.accept((mod) => {
    console.log('HMR update received - Applying changes');
    if (!mod) {
      window.location.reload();
      return;
    }
    
    // Invalidate all queries to ensure fresh data
    queryClient.invalidateQueries();
    
    // Re-render the application with updated modules
    render();
  });

  // Handle file changes
  import.meta.hot.on('vite:beforeUpdate', (payload: any) => {
    console.log('File changes detected, updating...');
    
    // Extract file names for notification
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
  
  // Handle websocket connection events
  import.meta.hot.on('vite:ws-connect', () => {
    console.log('HMR connected');
  });
  
  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('HMR disconnected, attempting to reconnect...');
  });
}

// Set up manual file change detection
(() => {
  let lastFileCheck = Date.now();
  
  // Force a periodic check for file changes
  setInterval(() => {
    // Only perform this check if we're in development mode
    if (import.meta.env.DEV) {
      const now = Date.now();
      
      // Check if files have changed since last check
      if (now - lastFileCheck > 2000) { // Only check every 2 seconds
        lastFileCheck = now;
        
        // Make a timestamp request to force the server to check file changes
        fetch(`/ping?t=${now}`)
          .then(() => {
            // This doesn't need to succeed - just force a server check
          })
          .catch(() => {
            // Ignore errors - this is just a trigger
          });
      }
    }
  }, 3000);
})();
