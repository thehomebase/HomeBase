import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { Checklist } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ProgressChecklistProps {
  transactionId: number;
  userRole: string;
}

const DEFAULT_ITEMS = {
  agent: [
    { id: "a1", text: "Initial consultation with client", completed: false },
    { id: "a2", text: "Property listing agreement signed", completed: false },
    { id: "a3", text: "Schedule professional photography", completed: false },
    { id: "a4", text: "List property on MLS", completed: false },
    { id: "a5", text: "Schedule open houses", completed: false },
  ],
  client: [
    { id: "c1", text: "Sign purchase agreement", completed: false },
    { id: "c2", text: "Submit earnest money", completed: false },
    { id: "c3", text: "Schedule property inspection", completed: false },
    { id: "c4", text: "Review closing documents", completed: false },
    { id: "c5", text: "Final walk-through", completed: false },
  ]
};

export function ProgressChecklist({ transactionId, userRole }: ProgressChecklistProps) {
  const { toast } = useToast();
  console.log("ProgressChecklist render:", { transactionId, userRole });

  // Get existing checklist
  const { data: checklist, isLoading } = useQuery<Checklist>({
    queryKey: ["/api/checklists", transactionId, userRole],
    enabled: !!transactionId && !!userRole,
  });

  const defaultItems = DEFAULT_ITEMS[userRole as keyof typeof DEFAULT_ITEMS] || [];
  const items = checklist?.items || defaultItems;
  const progress = Math.round((items.filter(item => item.completed).length / items.length) * 100);

  // Single mutation to handle both create and update
  const updateChecklistMutation = useMutation({
    mutationFn: async (newItems: typeof defaultItems) => {
      try {
        if (checklist) {
          // Update existing checklist
          const response = await apiRequest("PATCH", `/api/checklists/${checklist.id}`, { items: newItems });
          return response.json();
        } else {
          // Create new checklist
          const response = await apiRequest("POST", "/api/checklists", {
            transactionId,
            role: userRole,
            items: newItems
          });
          return response.json();
        }
      } catch (error) {
        console.error("Mutation error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists", transactionId, userRole] });
    },
    onError: (error) => {
      console.error("Failed to update checklist:", error);
      toast({
        title: "Error",
        description: "Failed to update checklist. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleCheck = (itemId: string, checked: boolean) => {
    console.log("Handling checkbox change:", { itemId, checked, transactionId, userRole });
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, completed: checked } : item
    );
    updateChecklistMutation.mutate(updatedItems);
  };

  if (isLoading) {
    return <div>Loading checklist...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-lg">Progress</CardTitle>
          <Progress value={progress} className="h-2" />
          <div className="text-sm text-muted-foreground">{progress}% complete</div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={(checked) => {
                    console.log("Checkbox clicked:", { itemId: item.id, checked });
                    handleCheck(item.id, checked as boolean);
                  }}
                  className="h-5 w-5 cursor-pointer"
                />
                <label
                  htmlFor={item.id}
                  className={`text-sm cursor-pointer select-none ${
                    item.completed ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.text}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ProgressChecklist;