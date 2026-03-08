import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

interface LeadStats {
  total: number;
  new: number;
  accepted: number;
  converted: number;
  rejected: number;
  acceptanceRate?: number;
}

export function useLeadAlerts() {
  const { user } = useAuth();
  const isAgent = user?.role === "agent";
  const isVendor = user?.role === "vendor";

  const { data: agentStats } = useQuery<LeadStats>({
    queryKey: ["/api/leads/stats", user?.id],
    enabled: isAgent && !!user,
    refetchInterval: 30000,
  });

  const { data: vendorStats } = useQuery<LeadStats>({
    queryKey: ["/api/vendor/leads/stats", user?.id],
    enabled: isVendor && !!user,
    refetchInterval: 30000,
  });

  return {
    newLeadCount: isAgent ? (agentStats?.new ?? 0) : isVendor ? (vendorStats?.new ?? 0) : 0,
    isAgent,
    isVendor,
  };
}
