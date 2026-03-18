import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link2, Building2, Phone, Mail, ArrowLeft, CheckCircle2, X, Loader2 } from "lucide-react";

export default function VendorSyncPage() {
  const { vendorContractorId } = useParams<{ vendorContractorId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<{
    vendor: { id: number; name: string; email: string; phone: string; category: string };
    privatePros: Array<{ id: number; name: string; email: string; phone: string; category: string }>;
  }>({
    queryKey: ["/api/vendor/match-candidates", vendorContractorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor/match-candidates?vendorContractorId=${vendorContractorId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    enabled: !!vendorContractorId && !!user,
  });

  const syncMutation = useMutation({
    mutationFn: async (privateContractorId: number) => {
      const res = await apiRequest("POST", "/api/vendor/sync-contractor", {
        privateContractorId,
        vendorContractorId: Number(vendorContractorId),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Synced!", description: data.message || "Vendor added to your team." });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/match-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home-team"] });
    },
    onError: (err: any) => {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-muted-foreground">Please log in to sync vendors.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.vendor) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <p className="text-muted-foreground">Vendor not found.</p>
        <Button variant="ghost" onClick={() => setLocation("/homebase-pros")} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to HomeBase Pros
        </Button>
      </div>
    );
  }

  const { vendor, privatePros } = data;

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <Button variant="ghost" onClick={() => setLocation("/homebase-pros")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back
      </Button>

      <div className="flex items-center gap-3 mb-2">
        <Link2 className="h-6 w-6 text-violet-500" />
        <h1 className="text-2xl font-bold">Sync Vendor to Your Team</h1>
      </div>

      <Card className="border-violet-200 bg-violet-50/30 dark:bg-violet-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-violet-500" />
            {vendor.name}
            <Badge variant="secondary" className="ml-2">{vendor.category}</Badge>
          </CardTitle>
          <CardDescription>This vendor just registered on HomeBase Pros</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {vendor.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" /> {vendor.email}
            </div>
          )}
          {vendor.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" /> {vendor.phone}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Select the matching team member to sync</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which of your private team members is the same business as this new vendor. 
          Syncing will add their verified marketplace profile to your team.
        </p>
      </div>

      {privatePros.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No private team members found. You can still add this vendor from the HomeBase Pros marketplace.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {privatePros.map((pro) => (
            <Card key={pro.id} className="hover:border-violet-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{pro.name}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {pro.category && <Badge variant="outline" className="text-xs">{pro.category}</Badge>}
                    {pro.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{pro.email}</span>}
                    {pro.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{pro.phone}</span>}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => syncMutation.mutate(pro.id)}
                  disabled={syncMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Sync
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={() => setLocation("/homebase-pros")}>
          <X className="h-4 w-4 mr-2" /> Dismiss — Not a match
        </Button>
      </div>
    </div>
  );
}
