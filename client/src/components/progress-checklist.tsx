import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProgressChecklistProps {
  transactionId: number;
  userRole: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Checklist {
  id: string;
  items: ChecklistItem[];
}

export function ProgressChecklist({ transactionId, userRole }: ProgressChecklistProps) {
  const { toast } = useToast();

  const { data: checklist, isLoading } = useQuery<Checklist>({
    queryKey: ["/api/checklists", transactionId, userRole],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/checklists/${transactionId}/${userRole}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch checklist");
      }
      return response.json();
    },
    enabled: !!transactionId && !!userRole,
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (items: ChecklistItem[]) => {
      const response = await apiRequest(
        "PATCH",
        `/api/checklists/${checklist?.id}`,
        { items }
      );
      if (!response.ok) {
        throw new Error("Failed to update checklist");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/checklists", transactionId, userRole] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createChecklistMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/checklists", {
        transactionId,
        role: userRole,
        items: DEFAULT_ITEMS,
      });
      if (!response.ok) {
        throw new Error("Failed to create checklist");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/checklists", transactionId, userRole] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const DEFAULT_ITEMS: ChecklistItem[] = [
    { id: "1", text: "Initial consultation with client", completed: false },
    { id: "2", text: "Property listing agreement signed", completed: false },
    { id: "3", text: "Schedule professional photography", completed: false },
    { id: "4", text: "List property on MLS", completed: false },
    { id: "5", text: "Schedule open houses", completed: false },
  ];

  // Create a new checklist if one doesn't exist
  useEffect(() => {
    if (!isLoading && !checklist) {
      createChecklistMutation.mutate();
    }
  }, [isLoading, checklist]);

  const items = checklist?.items || DEFAULT_ITEMS;
  const progress = Math.round((items.filter((item: ChecklistItem) => item.completed).length / items.length) * 100);

  const handleCheck = (itemId: string, checked: boolean) => {
    const updatedItems = items.map((item: ChecklistItem) =>
      item.id === itemId ? { ...item, completed: checked } : item
    );
    updateChecklistMutation.mutate(updatedItems);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
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
            {items.map((item: ChecklistItem) => (
              <div key={item.id} className="flex items-center space-x-2">
                <Checkbox
                  id={item.id}
                  checked={item.completed}
                  onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                  disabled={updateChecklistMutation.isPending}
                />
                <label
                  htmlFor={item.id}
                  className={`text-sm ${
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