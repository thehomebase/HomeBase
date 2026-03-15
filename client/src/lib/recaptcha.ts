declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

const isRecaptchaDomainValid = (() => {
  try {
    const host = window.location.hostname;
    return !host.includes('.replit.dev') && !host.includes('.repl.co') && !host.includes('localhost');
  } catch {
    return true;
  }
})();

let scriptLoaded = false;
function loadRecaptchaScript(): Promise<void> {
  if (scriptLoaded || !SITE_KEY || !isRecaptchaDomainValid) return Promise.resolve();
  scriptLoaded = true;
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

if (SITE_KEY && isRecaptchaDomainValid) {
  loadRecaptchaScript();
}

export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY) return null;
  await loadRecaptchaScript();
  if (!window.grecaptcha) return null;

  return new Promise((resolve) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(SITE_KEY, { action });
        resolve(token);
      } catch {
        resolve(null);
      }
    });
  });
}
