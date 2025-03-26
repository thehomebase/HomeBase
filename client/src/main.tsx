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
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 1000;

  // Clear retry count on successful connection
  import.meta.hot.on('vite:ws-connect', () => {
    console.log('WebSocket connected');
    retryCount = 0;
  });

  // Handle WebSocket disconnections
  import.meta.hot.on('vite:ws-disconnect', async () => {
    console.log('WebSocket disconnected');

    if (retryCount < maxRetries) {
      retryCount++;
      console.log(`Attempting reconnect ${retryCount}/${maxRetries}`);

      await new Promise(resolve => setTimeout(resolve, retryDelay));

      try {
        await fetch('/health');
        console.log('Server reachable, forcing page reload');
        window.location.reload();
      } catch (err) {
        console.error('Server unreachable:', err);
      }
    }
  });

  // Handle HMR updates
  import.meta.hot.accept(() => {
    console.log('HMR update received');
    queryClient.invalidateQueries();
    render();
  });
}