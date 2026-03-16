import { QueryClient, QueryFunction } from "@tanstack/react-query";

export function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

const originalFetch = window.fetch.bind(window);
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  if (!CSRF_SAFE_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token) {
      const headers = new Headers(init?.headers || {});
      if (!headers.has("X-CSRF-Token")) {
        headers.set("X-CSRF-Token", token);
      }
      init = { ...init, headers };
    }
  }
  return originalFetch(input, init);
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      console.log('Authentication required, redirecting to login...');
      throw new Error("Please log in to access this resource");
    }
    const text = (await res.text()) || res.statusText;
    console.error(`API request failed with status ${res.status}: ${text}`);
    throw new Error(`${res.status}: ${text}`);
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const timeout = 10000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      console.log(`Executing query for ${queryKey[0]}`);
      const res = await fetchWithTimeout(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log('Unauthorized request, returning null as configured');
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      return data;
    } catch (error: any) {
      console.error(`Query failed for ${queryKey[0]}:`, error.message);
      throw error;
    }
  };

// Use the current host instead of hardcoded value
const API_BASE_URL = window.location.origin;

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
  headers: HeadersInit = {}
) {
  console.log(`Making ${method} request to ${path}`);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed: ${response.status} - ${errorText}`);
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.error) errorMessage = parsed.error;
        if (parsed.accountDeactivated) {
          const err = new Error(errorMessage) as any;
          err.accountDeactivated = true;
          err.email = parsed.email;
          throw err;
        }
      } catch (e) {
        if ((e as any)?.accountDeactivated) throw e;
      }
      throw new Error(errorMessage);
    }

    return response;
  } catch (error) {
    console.error(`Request failed for ${path}:`, error);
    throw error;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
  },
});