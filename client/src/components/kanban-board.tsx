import React from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: number;
  address: string;
  status: string;
  type: 'buy' | 'sell';
}

interface KanbanColumnProps {
  title: string;
  transactions: Transaction[];
  status: string;
}

const statusColumns = [
  { id: "prospect", title: "Prospect" },
  { id: "active_listing_prep", title: "Active Listing Prep" },
  { id: "live_listing", title: "Live Listing" },
  { id: "under_contract", title: "Under Contract" },
  { id: "closed", title: "Closed" },
];

const KanbanColumn = ({ title, transactions, status }: KanbanColumnProps) => {
  return (
    <div className="flex flex-col min-w-[300px] bg-muted/50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">{title}</h3>
        <span className="bg-primary/10 text-primary px-2 py-1 rounded-full text-sm">
          {transactions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="p-4 cursor-move hover:shadow-md transition-shadow">
            <div className="flex flex-col gap-1">
              <div className="font-medium">{transaction.address}</div>
              <div className="text-sm text-muted-foreground capitalize">
                {transaction.type === 'buy' ? 'Purchase' : 'Sale'}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export function KanbanBoard({ transactions }: { transactions: Transaction[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateTransactionStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: number; newStatus: string }) => {
      const response = await apiRequest("PATCH", `/api/transactions/${id}`, {
        status: newStatus,
      });
      if (!response.ok) {
        throw new Error("Failed to update transaction status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Status updated",
        description: "Transaction status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update transaction status.",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const [draggedId, draggedStatus] = active.id.split("-");
    const [targetId, targetStatus] = over.id.split("-");

    if (draggedStatus !== targetStatus) {
      updateTransactionStatus.mutate({
        id: parseInt(draggedId),
        newStatus: targetStatus,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {statusColumns.map((column) => {
          const columnTransactions = transactions.filter(
            (t) => t.status === column.id
          );
          return (
            <KanbanColumn
              key={column.id}
              title={column.title}
              transactions={columnTransactions}
              status={column.id}
            />
          );
        })}
      </div>
    </DndContext>
  );
}
