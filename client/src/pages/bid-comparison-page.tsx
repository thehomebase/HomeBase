import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { InspectionItem, Bid, BidRequest, Contractor } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  Shield,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { RateVendorDialog } from "@/pages/vendor-ratings-page";
import { Star } from "lucide-react";

const severityColors: Record<string, string> = {
  minor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  safety: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const bidStatusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  withdrawn: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export default function BidComparisonPage() {
  const params = useParams<{ id: string }>();
  const transactionId = Number(params.id);
  const { toast } = useToast();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [ratingContractorId, setRatingContractorId] = useState<number | null>(null);

  const { data: inspectionItems, isLoading: itemsLoading } = useQuery<InspectionItem[]>({
    queryKey: [`/api/transactions/${transactionId}/inspection-items`],
  });

  const { data: bids, isLoading: bidsLoading } = useQuery<Bid[]>({
    queryKey: ["/api/transactions", transactionId, "bids"],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}/bids`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bids");
      return res.json();
    },
  });

  const { data: bidRequests } = useQuery<BidRequest[]>({
    queryKey: ["/api/transactions", transactionId, "bid-requests"],
    queryFn: async () => {
      const res = await fetch(`/api/transactions/${transactionId}/bid-requests`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bid requests");
      return res.json();
    },
  });

  const { data: contractors } = useQuery<Contractor[]>({
    queryKey: ["/api/contractors"],
  });

  const updateBidMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/bids/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId, "bids"] });
      queryClient.invalidateQueries({ queryKey: [`/api/transactions/${transactionId}/inspection-items`] });
      toast({ title: "Bid updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update bid", variant: "destructive" });
    },
  });

  const toggleItem = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getContractorName = (contractorId: number) => {
    return contractors?.find((c) => c.id === contractorId)?.name || `Vendor #${contractorId}`;
  };

  const getContractorRating = (contractorId: number) => {
    return contractors?.find((c) => c.id === contractorId)?.agentRating;
  };

  const getBidsForItem = (itemId: number) => {
    if (!bidRequests || !bids) return [];
    const itemBidRequestIds = bidRequests
      .filter((br) => br.inspectionItemId === itemId)
      .map((br) => br.id);
    return bids.filter((b) => itemBidRequestIds.includes(b.bidRequestId));
  };

  const acceptedBids = bids?.filter((b) => b.status === "accepted") || [];
  const totalAcceptedCost = acceptedBids.reduce((sum, b) => sum + b.amount, 0);

  const isLoading = itemsLoading || bidsLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const itemsWithBids = (inspectionItems || []).filter(
    (item) => item.status === "sent_for_bids" || item.status === "bids_received" || item.status === "accepted" || item.status === "declined"
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/transactions/${transactionId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Bid Comparison</h1>
          <p className="text-sm text-muted-foreground">
            Compare vendor bids for inspection repair items
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{itemsWithBids.length}</div>
              <div className="text-sm text-muted-foreground">Items with Bids</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold">{acceptedBids.length}</div>
              <div className="text-sm text-muted-foreground">Accepted Bids</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {totalAcceptedCost > 0 ? formatCurrency(totalAcceptedCost) : "$0.00"}
              </div>
              <div className="text-sm text-muted-foreground">Total Accepted Cost</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {itemsWithBids.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-medium mb-1">No Bids Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              No inspection items have been sent for bids yet.
            </p>
            <Link href={`/transactions/${transactionId}/inspection`}>
              <Button>Go to Inspection Review</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {itemsWithBids.map((item) => {
            const itemBids = getBidsForItem(item.id);
            const isExpanded = expandedItems.has(item.id) || itemBids.length <= 3;
            const lowestBid = itemBids.length > 0
              ? itemBids.reduce((min, b) => (b.amount < min.amount ? b : min), itemBids[0])
              : null;

            return (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{item.description}</CardTitle>
                      <Badge variant="outline" className="capitalize">
                        {item.category}
                      </Badge>
                      <Badge className={severityColors[item.severity]}>
                        {item.severity}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="capitalize w-fit">
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {item.location && (
                    <p className="text-sm text-muted-foreground">Location: {item.location}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {itemBids.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Awaiting vendor responses...
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(isExpanded ? itemBids : itemBids.slice(0, 3)).map((bid) => {
                          const rating = getContractorRating(bid.contractorId);
                          const isLowest = lowestBid?.id === bid.id;
                          return (
                            <div
                              key={bid.id}
                              className={`border rounded-lg p-4 space-y-3 relative ${
                                bid.status === "accepted"
                                  ? "border-green-500 bg-green-50/50 dark:bg-green-900/10"
                                  : bid.status === "rejected"
                                  ? "border-red-300 bg-red-50/30 dark:bg-red-900/10 opacity-60"
                                  : isLowest
                                  ? "border-blue-400 bg-blue-50/30 dark:bg-blue-900/10"
                                  : ""
                              }`}
                            >
                              {isLowest && bid.status === "submitted" && (
                                <div className="absolute -top-2.5 left-3">
                                  <Badge className="bg-blue-600 text-white text-xs">Lowest Bid</Badge>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-sm">
                                  {getContractorName(bid.contractorId)}
                                </span>
                                <Badge className={bidStatusColors[bid.status]}>
                                  {bid.status}
                                </Badge>
                              </div>

                              <div className="text-2xl font-bold text-primary">
                                {formatCurrency(bid.amount)}
                              </div>

                              <div className="space-y-1.5 text-sm">
                                {bid.estimatedDays && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock className="h-3.5 w-3.5" />
                                    {bid.estimatedDays} day{bid.estimatedDays !== 1 ? "s" : ""}
                                  </div>
                                )}
                                {bid.warranty && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Shield className="h-3.5 w-3.5" />
                                    {bid.warranty}
                                  </div>
                                )}
                                {rating && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    {"★".repeat(rating)}{"☆".repeat(5 - rating)}
                                    <span className="ml-1">({rating}/5)</span>
                                  </div>
                                )}
                              </div>

                              {bid.description && (
                                <p className="text-xs text-muted-foreground border-t pt-2">
                                  {bid.description}
                                </p>
                              )}

                              {bid.status === "submitted" && (
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() =>
                                      updateBidMutation.mutate({ id: bid.id, status: "accepted" })
                                    }
                                    disabled={updateBidMutation.isPending}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() =>
                                      updateBidMutation.mutate({ id: bid.id, status: "rejected" })
                                    }
                                    disabled={updateBidMutation.isPending}
                                  >
                                    <XCircle className="h-3.5 w-3.5 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}

                              {bid.status === "accepted" && (user?.role === "agent" || user?.role === "broker") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full mt-2"
                                  onClick={() => setRatingContractorId(bid.contractorId)}
                                >
                                  <Star className="h-3.5 w-3.5 mr-1" />
                                  Rate Vendor
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {itemBids.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => toggleItem(item.id)}
                        >
                          {expandedItems.has(item.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" /> Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" /> Show All {itemBids.length} Bids
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {ratingContractorId && (
        <RateVendorDialog
          contractorId={ratingContractorId}
          open={!!ratingContractorId}
          onOpenChange={(open) => { if (!open) setRatingContractorId(null); }}
        />
      )}
    </div>
  );
}