import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

const FETCH_TIMEOUT = 10000; // 10 seconds timeout

async function fetchWithTimeout(resource: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const retries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      console.log(`Attempting API request to ${url} (attempt ${attempt + 1}/${retries})`);
      const res = await fetchWithTimeout(url, {
        method,
        headers: {
          ...(data ? { "Content-Type": "application/json" } : {}),
        },
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });

      await throwIfResNotOk(res);
      return res;
    } catch (error: any) {
      lastError = error;
      console.error(`API request failed (attempt ${attempt + 1}):`, error.message);

      if (error.message === "Please log in to access this resource") {
        console.log('Authentication required, not retrying');
        break;
      }

      if (attempt < retries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  throw lastError;
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
