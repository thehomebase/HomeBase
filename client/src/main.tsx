
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
  let wsReconnectAttempts = 0;
  const maxReconnectAttempts = 20;
  const reconnectDelay = 1000;
  let pingInterval: number | null = null;
  let hmrConnectionStatus = {
    connected: false,
    lastUpdate: Date.now(),
    recentFiles: [] as string[]
  };

  // Make HMR status available globally for other components to use
  // @ts-ignore - Adding custom property to window
  window.__hmrStatus = hmrConnectionStatus;

  // Enhanced reconnection logic
  const attemptReconnect = () => {
    if (wsReconnectAttempts < maxReconnectAttempts) {
      console.log(`Attempting WebSocket reconnect (${wsReconnectAttempts + 1}/${maxReconnectAttempts})`);
      wsReconnectAttempts++;
      import.meta.hot?.send('vite:ws-reconnect');
      setTimeout(attemptReconnect, reconnectDelay);
    } else {
      console.log('Maximum reconnection attempts reached, reloading page...');
      window.location.reload();
    }
  };

  // Keep connection alive with periodic pings
  const startPingInterval = () => {
    if (pingInterval) clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (import.meta.hot && hmrConnectionStatus.connected) {
        import.meta.hot.send('vite:ping');
      }
    }, 15000) as unknown as number;
  };

  // Handle WebSocket connection events
  import.meta.hot.on('vite:ws-connect', () => {
    console.log('WebSocket connected - HMR active');
    wsReconnectAttempts = 0;
    hmrConnectionStatus.connected = true;
    startPingInterval();
    
    // Create a custom event to notify components of the connection
    const connectionEvent = new CustomEvent('hmr-status-change', { 
      detail: { status: 'connected' } 
    });
    window.dispatchEvent(connectionEvent);
    
    // Force query invalidation to refresh data
    queryClient.invalidateQueries();
  });

  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('WebSocket disconnected - HMR connection lost');
    hmrConnectionStatus.connected = false;
    if (pingInterval) clearInterval(pingInterval);
    
    // Create a custom event to notify components of the disconnection
    const disconnectEvent = new CustomEvent('hmr-status-change', { 
      detail: { status: 'disconnected' } 
    });
    window.dispatchEvent(disconnectEvent);
    
    // Start reconnection process
    attemptReconnect();
  });

  import.meta.hot.on('vite:error', (payload: any) => {
    console.error('Vite HMR error:', payload.err?.message || payload);
    
    // Create a custom event to notify components of the error
    const errorEvent = new CustomEvent('hmr-status-change', { 
      detail: { status: 'error', error: payload.err?.message || 'Unknown error' } 
    });
    window.dispatchEvent(errorEvent);
  });

  // Handle module updates
  import.meta.hot.accept((mod) => {
    console.log('HMR update received - Applying changes');
    if (!mod) {
      console.log('No module provided, performing full reload');
      window.location.reload();
      return;
    }
    
    // Invalidate all queries to ensure fresh data
    queryClient.invalidateQueries();
    
    // Re-render the application with updated modules
    console.log('Re-rendering application with updated modules');
    render();
  });

  // Display notification when updates are available
  import.meta.hot.on('vite:beforeUpdate', (payload: { updates: Array<{ path: string; acceptedPath: string }> }) => {
    console.log('HMR update available:', payload);
    
    // Extract file names from the payload
    const updatedFiles = Array.isArray(payload.updates) 
      ? payload.updates.map(u => {
          const path = u.path || u.acceptedPath || '';
          if (!path) return '';
          const parts = path.split('/');
          return parts[parts.length - 1];
        }).filter(Boolean)
      : [];
    
    // Update the HMR status
    hmrConnectionStatus.lastUpdate = Date.now();
    hmrConnectionStatus.recentFiles = updatedFiles;
    
    // Create a custom event for file changes
    const updateEvent = new CustomEvent('hmr-update', { 
      detail: { 
        files: updatedFiles,
        timestamp: hmrConnectionStatus.lastUpdate
      } 
    });
    window.dispatchEvent(updateEvent);
  });

  // Improved error handling for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}
