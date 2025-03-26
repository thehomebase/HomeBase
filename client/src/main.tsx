
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

// Enhanced file change detection system
(() => {
  let lastFileCheck = Date.now();
  let fileWatcherActive = false;
  
  // Function to notify the system about potential file changes
  const notifyFileChange = () => {
    // Dispatch a custom event that could be listened to by editor plugins
    const event = new CustomEvent('file-system-change', { 
      detail: { timestamp: Date.now() } 
    });
    window.dispatchEvent(event);
    
    // Force a browser check for changes in CSS
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href) {
        link.setAttribute('href', href.split('?')[0] + '?t=' + Date.now());
      }
    });
  };
  
  // Start a file watcher if it's not already running
  const startFileWatcher = () => {
    if (fileWatcherActive) return;
    fileWatcherActive = true;
    
    // Check for file changes periodically
    setInterval(() => {
      // Only perform this check in development mode
      if (import.meta.env.DEV) {
        const now = Date.now();
        
        // Check if sufficient time has passed since last check
        if (now - lastFileCheck > 2000) {
          lastFileCheck = now;
          
          // Make a request to force the server to check file changes
          fetch(`/ping?t=${now}`)
            .then(() => {
              notifyFileChange();
            })
            .catch(() => {
              // Continue even if the request fails
              notifyFileChange();
            });
        }
      }
    }, 3000);
    
    // Also setup a listener for editor focus events
    window.addEventListener('focus', () => {
      // When the window regains focus, check for changes
      notifyFileChange();
    });
  };
  
  // Start the file watcher
  startFileWatcher();
})();
