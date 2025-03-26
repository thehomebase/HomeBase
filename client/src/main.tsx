
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
  const maxReconnectAttempts = 10;
  const reconnectDelay = 1000;

  const attemptReconnect = () => {
    if (wsReconnectAttempts < maxReconnectAttempts) {
      console.log(`Attempting WebSocket reconnect (${wsReconnectAttempts + 1}/${maxReconnectAttempts})`);
      wsReconnectAttempts++;
      import.meta.hot?.send('vite:ws-reconnect');
    }
  };

  import.meta.hot.on('vite:ws-connect', () => {
    console.log('WebSocket connected');
    wsReconnectAttempts = 0;
  });

  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('WebSocket disconnected');
    setTimeout(attemptReconnect, reconnectDelay);
  });

  import.meta.hot.on('vite:error', (err: Error) => {
    console.error('Vite HMR error:', err);
  });

  import.meta.hot.accept((mod) => {
    console.log('HMR update accepted');
    if (!mod) {
      window.location.reload();
      return;
    }
    queryClient.invalidateQueries();
    render();
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
  });
}
