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
import { useLocation } from "wouter";

interface Transaction {
  id: number;
  address: string;
  status: string;
  type: 'buy' | 'sell';
  contractPrice: number | null;
  clientId: number | null;
  client?: { firstName: string; lastName: string; } | null;
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

const formatPrice = (price: number | null) => {
  if (!price) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const KanbanColumn = ({ title, transactions, status }: KanbanColumnProps) => {
  const [, setLocation] = useLocation();

  const handleCardClick = (e: React.MouseEvent, transactionId: number) => {
    // Only navigate if we're not dragging
    if (!e.defaultPrevented) {
      setLocation(`/transactions/${transactionId}`);
    }
  };

  return (
    <div className="flex flex-col min-w-[240px] bg-muted/50 rounded-lg p-2">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
          {transactions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {transactions.map((transaction) => (
          <Card 
            key={transaction.id} 
            className="p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={(e) => handleCardClick(e, transaction.id)}
          >
            <div className="flex flex-col gap-1">
              <div className="font-medium text-sm truncate">{transaction.address}</div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div className="capitalize">{transaction.type === 'buy' ? 'Purchase' : 'Sale'}</div>
                <div>Price: {formatPrice(transaction.contractPrice)}</div>
                {transaction.client && (
                  <div className="truncate">
                    Client: {transaction.client.firstName} {transaction.client.lastName}
                  </div>
                )}
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
      <div className="flex gap-2 overflow-x-auto pb-4">
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