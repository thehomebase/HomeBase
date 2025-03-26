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
  let wsRetryTimeout: NodeJS.Timeout;
  
  import.meta.hot.on('vite:ws-connect', () => {
    console.log('WebSocket connected');
    if (wsRetryTimeout) clearTimeout(wsRetryTimeout);
  });

  import.meta.hot.on('vite:ws-disconnect', () => {
    console.log('WebSocket disconnected, attempting reconnect...');
    if (wsRetryTimeout) clearTimeout(wsRetryTimeout);
    
    wsRetryTimeout = setTimeout(() => {
      console.log('Reloading page due to WebSocket disconnect');
      window.location.reload();
    }, 3000);
  });

  import.meta.hot.on('vite:error', (err: Error) => {
    console.error('HMR error:', err);
    if (err.message.includes('WebSocket') || err.message.includes('connection')) {
      window.location.reload();
    }
  });

  import.meta.hot.accept(() => {
    console.log('HMR update received');
    queryClient.invalidateQueries();
    render();
  });
}