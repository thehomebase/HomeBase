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
}

interface ProgressChecklistProps {
  transactionId: number;
  userRole: string;
}

export function ProgressChecklist({ transactionId, userRole }: ProgressChecklistProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: checklist, isLoading, error } = useQuery<ChecklistItem[]>({
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
    onError: (err:any) => {
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

  if (!checklist) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No checklist items available.</p>
        </CardContent>
      </Card>
    );
  }

  const completedItems = checklist.filter(item => item.completed).length;
  const progress = Math.round((completedItems / checklist.length) * 100);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Progress</CardTitle>
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">{progress}% complete</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checklist.map((item) => (
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