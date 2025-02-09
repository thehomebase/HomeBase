import React, { useState } from "react";
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

interface Checklist {
  id: number;
  transactionId: number;
  role: string;
  items: ChecklistItem[];
}

interface ProgressChecklistProps {
  transactionId: number;
  userRole: string;
  transactionType?: 'buy' | 'sell';
}

// This is for SELLER transactions (selling a property)
const SELLER_CHECKLIST_ITEMS: Omit<ChecklistItem, "completed">[] = [
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

// This is for BUYER transactions (buying a property)
const BUYER_CHECKLIST_ITEMS: Omit<ChecklistItem, "completed">[] = [
  // Pre-Offer
  { id: "buying-criteria", text: "Determine buying criteria", phase: "Pre-Offer" },
  { id: "hire-agent", text: "Hire a real estate agent", phase: "Pre-Offer" },
  { id: "get-preapproval", text: "Hire a lender & get pre-approved", phase: "Pre-Offer" },
  { id: "review-disclosures", text: "Review property disclosures", phase: "Pre-Offer" },
  { id: "preliminary-inspection", text: "Conduct preliminary inspections", phase: "Pre-Offer" },
  { id: "attend-viewings", text: "Attend open houses or viewings", phase: "Pre-Offer" },

  // Offer and Negotiation
  { id: "submit-offer", text: "Write and submit an offer", phase: "Offer and Negotiation" },
  { id: "negotiate-terms", text: "Negotiate terms if counteroffer received", phase: "Offer and Negotiation" },
  { id: "review-contingencies", text: "Review and agree on contingencies", phase: "Offer and Negotiation" },
  { id: "sign-acceptance", text: "Sign offer acceptance or counteroffer", phase: "Offer and Negotiation" },
  { id: "earnest-money", text: "Include earnest money deposit", phase: "Offer and Negotiation" },

  // Due Diligence
  { id: "home-inspection", text: "Schedule and conduct home inspection", phase: "Due Diligence" },
  { id: "review-inspection", text: "Review inspection report", phase: "Due Diligence" },
  { id: "negotiate-repairs", text: "Negotiate repairs or price adjustments", phase: "Due Diligence" },
  { id: "order-appraisal", text: "Order appraisal", phase: "Due Diligence" },
  { id: "review-appraisal", text: "Review appraisal report", phase: "Due Diligence" },
  { id: "additional-checks", text: "Perform additional due diligence", phase: "Due Diligence" },
  { id: "review-title", text: "Review title report", phase: "Due Diligence" },
  { id: "title-insurance", text: "Obtain title insurance", phase: "Due Diligence" },
  { id: "finalize-mortgage", text: "Finalize mortgage details", phase: "Due Diligence" },
  { id: "lock-rate", text: "Lock in mortgage rate", phase: "Due Diligence" },

  // Closing Preparation
  { id: "final-walkthrough", text: "Final walkthrough of property", phase: "Closing Preparation" },
  { id: "confirm-conditions", text: "Confirm all conditions of sale", phase: "Closing Preparation" },
  { id: "secure-insurance", text: "Secure homeowners insurance", phase: "Closing Preparation" },
  { id: "arrange-utilities", text: "Arrange for utilities transfer", phase: "Closing Preparation" },
  { id: "prepare-moving", text: "Prepare for moving", phase: "Closing Preparation" },
  { id: "review-closing-docs", text: "Review closing documents", phase: "Closing Preparation" },
  { id: "secure-funds", text: "Secure funds for closing", phase: "Closing Preparation" },
  { id: "wire-funds", text: "Wire funds or obtain cashier's check", phase: "Closing Preparation" },
  { id: "power-of-attorney", text: "Sign power of attorney if needed", phase: "Closing Preparation" },

  // Closing
  { id: "attend-closing", text: "Attend closing", phase: "Closing" },
  { id: "sign-documents", text: "Sign all closing documents", phase: "Closing" },
  { id: "receive-keys", text: "Receive keys to the property", phase: "Closing" },

  // Post-Closing
  { id: "change-locks", text: "Change locks and security systems", phase: "Post-Closing" },
  { id: "update-address", text: "Update address with relevant parties", phase: "Post-Closing" },
  { id: "file-homestead", text: "File homestead exemption if applicable", phase: "Post-Closing" },
  { id: "begin-maintenance", text: "Begin maintenance and warranty registration", phase: "Post-Closing" }
];

export function ProgressChecklist({ transactionId, userRole, transactionType = 'buy' }: ProgressChecklistProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<string>(
    transactionType === 'buy' ? "Pre-Offer" : "Pre-Listing Preparation"
  );

  // Query to fetch checklist data
  const { data: checklist, isLoading, error } = useQuery({
    queryKey: ["/api/checklists", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/checklists/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch checklist");
      }
      return response.json() as Promise<Checklist>;
    },
  });

  // Mutation to update checklist items
  const updateChecklistMutation = useMutation({
    mutationFn: async (updatedItem: ChecklistItem) => {
      const currentChecklist = queryClient.getQueryData<Checklist>(["/api/checklists", transactionId]);
      if (!currentChecklist) {
        throw new Error("No checklist data available");
      }

      const updatedItems = currentChecklist.items.map(item =>
        item.id === updatedItem.id ? updatedItem : item
      );

      const response = await apiRequest("PATCH", `/api/checklists/${transactionId}`, {
        items: updatedItems
      });

      if (!response.ok) {
        throw new Error("Failed to update checklist");
      }

      return response.json() as Promise<Checklist>;
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ["/api/checklists", transactionId] });

      const previousChecklist = queryClient.getQueryData<Checklist>(["/api/checklists", transactionId]);

      if (previousChecklist) {
        const optimisticChecklist = {
          ...previousChecklist,
          items: previousChecklist.items.map(item =>
            item.id === newItem.id ? newItem : item
          )
        };

        queryClient.setQueryData<Checklist>(
          ["/api/checklists", transactionId],
          optimisticChecklist
        );
      }

      return { previousChecklist };
    },
    onError: (error, _, context) => {
      if (context?.previousChecklist) {
        queryClient.setQueryData(
          ["/api/checklists", transactionId],
          context.previousChecklist
        );
      }
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update progress",
        variant: "destructive",
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/checklists", transactionId], data);
      toast({
        title: "Progress updated",
        description: "Your changes have been saved.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists", transactionId] });
    },
  });

  // Get the base checklist items based on transaction type
  const baseChecklistItems = transactionType === 'buy' ? BUYER_CHECKLIST_ITEMS : SELLER_CHECKLIST_ITEMS;

  // Use checklist data if available, otherwise use base items
  const items = checklist?.items || baseChecklistItems.map(item => ({ ...item, completed: false }));

  // Calculate progress
  const completedItems = items.filter(item => item.completed).length;
  const progress = Math.round((completedItems / items.length) * 100);

  // Get unique phases
  const phases = Array.from(new Set(items.map(item => item.phase)));

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
          <p className="text-red-500">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </CardContent>
      </Card>
    );
  }

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
            .map(item => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={(checked) => {
                    if (typeof checked === 'boolean') {
                      updateChecklistMutation.mutate({
                        ...item,
                        completed: checked
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