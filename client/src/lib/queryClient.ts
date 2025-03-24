import { QueryClient } from "@tanstack/react-query";

const API_BASE_URL = 'http://0.0.0.0:5000';

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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type");
    let errorMessage = `HTTP error! status: ${res.status}`;
    if (contentType?.includes("application/json")) {
      const data = await res.json();
      errorMessage = data.error || errorMessage;
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  path: string,
  data?: unknown,
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const response = await fetchWithTimeout(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(response);
  return response;
}

function getQueryFn({ on401 = "throw" as UnauthorizedBehavior } = {}) {
  return async ({ queryKey: [url] }: { queryKey: string[] }) => {
    try {
      const res = await apiRequest("GET", url as string);
      const data = await res.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        if (on401 === "returnNull") return null;
      }
      throw error;
    }
  };
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