import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  phase: string;
}

interface ProgressChecklistProps {
  transactionId: number;
  userRole: string;
}

const BUYER_CHECKLIST_ITEMS: Omit<ChecklistItem, "completed">[] = [
  // Pre-Listing Preparation
  { id: "assess-value", text: "Assess Home Value", phase: "Pre-Listing Preparation" },
  { id: "home-inspection", text: "Conduct Pre-Listing Inspection", phase: "Pre-Listing Preparation" },
  { id: "repairs", text: "Complete Necessary Repairs", phase: "Pre-Listing Preparation" },
  { id: "declutter", text: "Declutter and Depersonalize", phase: "Pre-Listing Preparation" },
  { id: "staging", text: "Stage the Home", phase: "Pre-Listing Preparation" },
  { id: "curb-appeal", text: "Enhance Curb Appeal", phase: "Pre-Listing Preparation" },

  // Listing Phase
  { id: "select-agent", text: "Select Real Estate Agent", phase: "Listing Phase" },
  { id: "photos", text: "Obtain Professional Photography", phase: "Listing Phase" },
  { id: "listing-desc", text: "Write Compelling Listing", phase: "Listing Phase" },
  { id: "showings", text: "Set Up Showings", phase: "Listing Phase" },

  // Offer and Negotiation
  { id: "review-offers", text: "Review Offers", phase: "Offer and Negotiation" },
  { id: "counter-offers", text: "Handle Counter Offers", phase: "Offer and Negotiation" },
  { id: "accept-offer", text: "Accept Final Offer", phase: "Offer and Negotiation" },

  // Post-Acceptance
  { id: "appraisal", text: "Complete Home Appraisal", phase: "Post-Acceptance" },
  { id: "buyer-inspection", text: "Facilitate Buyer's Inspection", phase: "Post-Acceptance" },
  { id: "disclosures", text: "Complete Property Disclosures", phase: "Post-Acceptance" },
  { id: "title-search", text: "Complete Title Search", phase: "Post-Acceptance" },

  // Closing Preparation
  { id: "utilities", text: "Cancel/Transfer Utilities", phase: "Closing Preparation" },
  { id: "moving", text: "Arrange Moving Plans", phase: "Closing Preparation" },
  { id: "walkthrough", text: "Schedule Final Walkthrough", phase: "Closing Preparation" },

  // Closing
  { id: "review-docs", text: "Review Closing Documents", phase: "Closing" },
  { id: "sign-docs", text: "Sign Closing Documents", phase: "Closing" },
  { id: "keys", text: "Hand Over Keys", phase: "Closing" },

  // Post-Closing
  { id: "address-change", text: "Update Address Information", phase: "Post-Closing" },
  { id: "final-move", text: "Complete Moving Process", phase: "Post-Closing" }
];

export function ProgressChecklist({ transactionId, userRole }: ProgressChecklistProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<string>("Pre-Listing Preparation");

  const { data: checklist, isLoading, error } = useQuery({
    queryKey: ["/api/checklists", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/checklists/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist");
      }
      return response.json();
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (updatedItem: ChecklistItem) => {
      const response = await apiRequest("PATCH", `/api/checklists/${transactionId}/${updatedItem.id}`, {
        completed: updatedItem.completed,
      });
      if (!response.ok) {
        throw new Error("Failed to update checklist item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists", transactionId] });
      toast({
        title: "Progress updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: `Failed to update progress: ${err.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading checklist...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-6 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error loading checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  const phases = Array.from(new Set(BUYER_CHECKLIST_ITEMS.map(item => item.phase)));
  const items = checklist || BUYER_CHECKLIST_ITEMS.map(item => ({ ...item, completed: false }));
  const completedItems = items.filter(item => item.completed).length;
  const progress = Math.round((completedItems / items.length) * 100);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Progress</CardTitle>
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">{progress}% complete</div>
        <div className="flex gap-2 overflow-x-auto py-2">
          {phases.map((phase) => (
            <button
              key={phase}
              onClick={() => setActivePhase(phase)}
              className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                activePhase === phase
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted-foreground/10"
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items
            .filter(item => item.phase === activePhase)
            .map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      updateChecklistMutation.mutate({
                        ...item,
                        completed: checked,
                      });
                    }
                  }}
                  disabled={updateChecklistMutation.isPending}
                />
                <label
                  htmlFor={item.id}
                  className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}
                >
                  {item.text}
                </label>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}