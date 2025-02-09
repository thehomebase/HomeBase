import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getTooltipContent(itemId: string): string {
  const tooltips: Record<string, string> = {
    // Pre-Listing Preparation
    "assess-value": "Consider both professional appraisal and online valuation tools. Recent comparable sales in the area are crucial for accurate pricing.",
    "home-inspection": "A pre-listing inspection can identify issues early, allowing you to address them before they become negotiating points.",
    "repairs-upgrades": "Focus on repairs that offer the best ROI. Kitchen and bathroom upgrades typically provide the highest return.",
    "declutter": "Remove personal photos, excess furniture, and organize closets to make spaces appear larger.",
    "staging": "Professional staging can help buyers visualize themselves in the space and typically leads to faster sales.",
    "curb-appeal": "First impressions matter. Consider fresh paint, landscaping, and cleaning exterior surfaces.",
    
    // Listing Phase
    "select-agent": "Look for agents with experience in your specific market and property type.",
    "photos": "Professional photos can make your listing stand out online where most buyers start their search.",
    "listing-desc": "Focus on unique features and recent upgrades. Use descriptive but accurate language.",
    "showings": "Keep the home clean and available for showings. Consider using a lockbox for easier access.",
    
    // Offer and Negotiation
    "review-offers": "Consider all terms, not just price. A lower offer with better terms might be more advantageous.",
    "counter-offers": "Stay flexible on terms like closing date or included items to reach an agreement.",
    "accept-offer": "Once accepted, the offer becomes a binding contract. Review all terms carefully.",
    
    // Post-Acceptance
    "appraisal": "The appraisal protects the lender. Having recent comparable sales data ready can help.",
    "buyer-inspection": "Be prepared to negotiate repairs or provide credits based on inspection findings.",
    "disclosures": "Full disclosure protects you legally. When in doubt, disclose.",
    "title-search": "Address any title issues early to prevent closing delays.",
    
    // Closing Preparation
    "cancel-utilities": "Schedule utility transfers for the day after closing to ensure continuous service.",
    "moving-prep": "Start packing early and label boxes clearly for easier unpacking.",
    "final-walkthrough": "Remove all personal items and leave the property in clean condition.",
    
    // Closing
    "review-docs": "Take time to understand each document. Don't hesitate to ask questions.",
    "sign-docs": "Bring proper identification and any required documents to closing.",
    "hand-over-keys": "Provide all keys, garage door openers, and access codes.",
    
    // Post-Closing
    "change-address": "Update your address with USPS, credit cards, and subscriptions.",
    "complete-move": "Double-check all spaces, including attic and basement, before final move-out.",

    // Buyer Checklist Items
    "buying-criteria": "Define your must-haves vs. nice-to-haves. Consider location, size, and amenities.",
    "hire-agent": "Interview multiple agents to find one who understands your needs and communication style.",
    "get-preapproval": "Get preapproved before house hunting to understand your budget and strengthen offers.",
    "preliminary-inspection": "Look for obvious red flags during viewings like water damage or foundation issues.",
    "attend-viewings": "Take notes and photos during viewings to help remember details of each property.",
    "submit-offer": "Include all terms and contingencies in writing. Your agent can advise on competitive offers.",
    "negotiate-terms": "Consider both price and other terms like closing date and included items.",
    "earnest-money": "Typically 1-3% of purchase price to show good faith in the transaction.",
    "schedule-inspection": "Choose a thorough inspector and attend the inspection if possible.",
    "order-appraisal": "Required by most lenders to ensure the property value supports the loan amount.",
    "additional-checks": "Consider specialized inspections for specific concerns like radon or termites.",
    "review-title": "Title insurance protects against ownership disputes or liens.",
    "title-insurance": "Required by lenders but also important for buyer protection.",
    "finalize-mortgage": "Provide all required documentation promptly to avoid closing delays.",
    "lock-rate": "Discuss rate lock timing with your lender to secure the best rate.",
    "secure-insurance": "Shop multiple insurance providers for the best coverage and rates.",
    "arrange-utilities": "Set up utilities in your name starting on the closing date.",
    "prepare-moving": "Get multiple moving quotes and start packing non-essential items early.",
    "secure-funds": "Arrange for closing funds well in advance of closing date.",
    "wire-funds": "Double-check wire instructions to avoid fraud.",
    "power-of-attorney": "If needed, arrange for power of attorney well before closing.",
    "change-locks": "Change all exterior door locks and garage codes after closing.",
    "file-homestead": "File for homestead exemption if available in your area.",
    "begin-maintenance": "Start a home maintenance schedule and register major appliances."
  };

  return tooltips[itemId] || "Complete this task to progress through the transaction.";
}
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
  { id: "assess-value", text: "Assess Home Value: Hire a real estate appraiser or use online tools to determine a competitive listing price", phase: "Pre-Listing Preparation" },
  { id: "home-inspection", text: "Conduct pre-listing inspection to identify any issues that might need fixing before listing", phase: "Pre-Listing Preparation" },
  { id: "repairs-upgrades", text: "Make necessary repairs or upgrades based on inspection. Focus on high-impact areas like kitchens and bathrooms", phase: "Pre-Listing Preparation" },
  { id: "declutter", text: "Remove personal items and declutter to make the home more appealing to potential buyers", phase: "Pre-Listing Preparation" },
  { id: "staging", text: "Either stage the home yourself or hire a professional to enhance its appeal", phase: "Pre-Listing Preparation" },
  { id: "curb-appeal", text: "Enhance the exterior; mow the lawn, plant flowers, paint the front door if needed", phase: "Pre-Listing Preparation" },

  // Listing Phase
  { id: "select-agent", text: "Choose an agent with good local market knowledge and successful sales records", phase: "Listing Phase" },
  { id: "photos", text: "Invest in high-quality photos and possibly a virtual tour for online listings", phase: "Listing Phase" },
  { id: "listing-desc", text: "Write a compelling listing: Highlight unique features, recent upgrades, and neighborhood attractions", phase: "Listing Phase" },
  { id: "showings", text: "Coordinate with your agent for open houses and private showings, ensuring the home is always ready", phase: "Listing Phase" },

  // Offer and Negotiation
  { id: "review-offers", text: "Analyze each offer with your agent, focusing on price, contingencies, and the buyer's financial status", phase: "Offer and Negotiation" },
  { id: "counter-offers", text: "Be prepared to negotiate; consider terms beyond just price, like closing dates or included furnishings", phase: "Offer and Negotiation" },
  { id: "accept-offer", text: "Once you agree on terms, sign the purchase agreement", phase: "Offer and Negotiation" },

  // Post-Acceptance
  { id: "appraisal", text: "Coordinate with the buyer's lender for the appraisal. Be ready to address any discrepancies if the appraisal comes in low", phase: "Post-Acceptance" },
  { id: "buyer-inspection", text: "Allow for the buyer's inspection, and be open to negotiating repairs or price adjustments", phase: "Post-Acceptance" },
  { id: "disclosures", text: "Complete and provide all necessary property disclosure documents about known defects or issues", phase: "Post-Acceptance" },
  { id: "title-search", text: "Ensure there are no liens or issues with the title that could delay or derail the sale", phase: "Post-Acceptance" },

  // Closing Preparation
  { id: "cancel-utilities", text: "Arrange to cancel or transfer utilities like water, gas, and electricity on the closing date", phase: "Closing Preparation" },
  { id: "moving-prep", text: "Schedule movers or plan your move. Consider packing non-essential items early", phase: "Closing Preparation" },
  { id: "final-walkthrough", text: "Agree to a time for the buyer's final walkthrough, usually 24-48 hours before closing", phase: "Closing Preparation" },

  // Closing
  { id: "review-docs", text: "Go over all documents with your agent or attorney to ensure everything is correct", phase: "Closing" },
  { id: "sign-docs", text: "Attend the closing either in person or via electronic means if permitted", phase: "Closing" },
  { id: "hand-over-keys", text: "After receiving payment confirmation, provide keys and garage door openers to the new owner", phase: "Closing" },

  // Post-Closing
  { id: "change-address", text: "Update your address with banks, employers, subscriptions, etc", phase: "Post-Closing" },
  { id: "complete-move", text: "Ensure all personal belongings are moved out, and the house is left in agreed-upon condition", phase: "Post-Closing" }
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
        items: updatedItems,
        role: userRole,
        transactionId: transactionId
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update checklist");
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
      // Invalidate transaction query to update progress bar
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId] });
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label
                        htmlFor={item.id}
                        className={`text-sm cursor-help ${item.completed ? "line-through text-muted-foreground" : ""}`}
                      >
                        {item.text}
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{getTooltipContent(item.id)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}