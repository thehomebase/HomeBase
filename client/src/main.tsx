import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Force host to be 0.0.0.0 for Replit
if (import.meta.env.DEV) {
  const script = document.createElement('script');
  script.type = 'module';
  script.innerHTML = `
    import { injectIntoGlobalHook } from "/@react-refresh";
    injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {};
    window.$RefreshSig$ = () => (type) => type;
  `;
  document.head.appendChild(script);
}

createRoot(document.getElementById('root')!).render(<App />);