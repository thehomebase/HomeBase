
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";

export function useTransaction(id: number | null) {
  return useQuery<Transaction>({
    queryKey: ["/api/transactions", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest("GET", `/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch transaction");
      }
      return response.json();
    },
    enabled: !!id,
  });
}
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";

export function useTransaction(id: string | undefined) {
  return useQuery({
    queryKey: ["/api/transactions", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest("GET", `/api/transactions/${id}`);
      if (!response.ok) throw new Error("Failed to fetch transaction");
      return response.json() as Promise<Transaction>;
    },
    enabled: !!id
  });
}
