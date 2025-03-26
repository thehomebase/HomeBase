
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
  const connected = { value: false };

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
      if (import.meta.hot && connected.value) {
        import.meta.hot.send('vite:ping');
      }
    }, 15000) as unknown as number;
  };

  import.meta.hot.on('vite:ws-connect', () => {
    console.log('WebSocket connected - HMR active');
    wsReconnectAttempts = 0;
    connected.value = true;
    startPingInterval();
    
    // Force query invalidation to refresh data
    queryClient.invalidateQueries();
  });

  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('WebSocket disconnected - HMR connection lost');
    connected.value = false;
    if (pingInterval) clearInterval(pingInterval);
    
    // Start reconnection process
    attemptReconnect();
  });

  import.meta.hot.on('vite:error', (payload: any) => {
    console.error('Vite HMR error:', payload);
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
  import.meta.hot.on('vite:beforeUpdate', (payload: any) => {
    console.log('HMR update available:', payload);
  });

  // Improved error handling for unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}
