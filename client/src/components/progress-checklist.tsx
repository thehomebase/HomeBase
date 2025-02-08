import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { Checklist } from "@shared/schema";
import { Progress } from "@/components/ui/progress";

interface ProgressChecklistProps {
  transactionId: number;
  checklist?: Checklist;
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
  lender: [
    { id: "l1", text: "Pre-approval letter issued", completed: false },
    { id: "l2", text: "Review borrower documentation", completed: false },
    { id: "l3", text: "Order property appraisal", completed: false },
    { id: "l4", text: "Clear underwriting conditions", completed: false },
    { id: "l5", text: "Issue final loan approval", completed: false },
  ],
  title: [
    { id: "t1", text: "Title search completed", completed: false },
    { id: "t2", text: "Review title report", completed: false },
    { id: "t3", text: "Clear title issues", completed: false },
    { id: "t4", text: "Prepare closing documents", completed: false },
    { id: "t5", text: "Schedule closing", completed: false },
  ],
  inspector: [
    { id: "i1", text: "Schedule inspection", completed: false },
    { id: "i2", text: "Complete property inspection", completed: false },
    { id: "i3", text: "Generate inspection report", completed: false },
    { id: "i4", text: "Review findings with client", completed: false },
    { id: "i5", text: "Follow-up inspection if needed", completed: false },
  ],
  client: [
    { id: "c1", text: "Sign purchase agreement", completed: false },
    { id: "c2", text: "Submit earnest money", completed: false },
    { id: "c3", text: "Schedule property inspection", completed: false },
    { id: "c4", text: "Review closing documents", completed: false },
    { id: "c5", text: "Final walk-through", completed: false },
  ],
};

export default function ProgressChecklist({
  transactionId,
  checklist,
  userRole,
}: ProgressChecklistProps) {
  const updateChecklistMutation = useMutation({
    mutationFn: async (items: Checklist["items"]) => {
      if (checklist) {
        await apiRequest("PATCH", `/api/checklists/${checklist.id}`, { items });
      } else {
        await apiRequest("POST", "/api/checklists", {
          transactionId,
          role: userRole,
          items,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklists", transactionId, userRole] });
    },
  });

  const items = checklist?.items || DEFAULT_ITEMS[userRole as keyof typeof DEFAULT_ITEMS] || [];
  const progress = Math.round((items.filter((item) => item.completed).length / items.length) * 100);

  const handleCheck = (itemId: string, checked: boolean) => {
    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, completed: checked } : item
    );
    updateChecklistMutation.mutate(updatedItems);
  };

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
                  onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
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
    </div>
  );
}
