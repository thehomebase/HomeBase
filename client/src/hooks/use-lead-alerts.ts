import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface LeadStats {
  total: number;
  new: number;
  accepted: number;
  converted: number;
  rejected: number;
  acceptanceRate: number;
}

export function useLeadAlerts() {
  const { user } = useAuth();
  const isAgent = user?.role === "agent";

  const { data: stats } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats", user?.id],
    enabled: isAgent && !!user,
    refetchInterval: 30000,
  });

  return {
    newLeadCount: isAgent ? (stats?.new ?? 0) : 0,
    isAgent,
  };
}
