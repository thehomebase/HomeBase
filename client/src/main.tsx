
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";

const root = ReactDOM.createRoot(document.getElementById("root")!);

function render() {
  // Force update of DOM attributes to trigger style recalculation
  const rootElement = document.documentElement;
  rootElement.setAttribute('data-hmr-updated', Date.now().toString());
  
  // Update HMR counters in CSS variables
  const updateCount = parseInt(getComputedStyle(rootElement).getPropertyValue('--hmr-update-count').trim() || '0');
  rootElement.style.setProperty('--hmr-update-count', (updateCount + 1).toString());
  rootElement.style.setProperty('--hmr-timestamp', Date.now().toString());
  
  // Render the React application
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
  
  console.log('[HMR] Application rendered successfully');
}

render();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Enhanced Vite HMR setup with explicit handlers
if (import.meta.hot) {
  import.meta.hot.accept('./App', (newApp) => {
    console.log('[HMR] App component updated');
    render();
  });
  
  // Force CSS updates by manipulating a CSS variable
  import.meta.hot.accept('./index.css', () => {
    console.log('[HMR] CSS updated');
    const root = document.documentElement;
    const currentVal = getComputedStyle(root).getPropertyValue('--hmr-trigger').trim();
    const newVal = currentVal === '1' ? '0' : '1';
    root.style.setProperty('--hmr-trigger', newVal);
  });
  
  // Log connection status
  import.meta.hot.on('vite:beforeUpdate', (payload) => {
    console.log(`[HMR] Update detected in: ${payload.updates.map(u => u.path).join(', ')}`);
  });
  
  import.meta.hot.on('vite:error', (err) => {
    console.error('[HMR] Error occurred during update:', err);
  });
}
