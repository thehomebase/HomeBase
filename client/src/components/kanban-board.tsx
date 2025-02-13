
import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogCancel, 
  AlertDialogAction 
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: number;
  address: string;
  status: string;
  type: 'buy' | 'sell';
  contractPrice: number | null;
  clientId: number | null;
  client?: { firstName: string; lastName: string; } | null;
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

export function KanbanBoard({ transactions }: { transactions: Transaction[] }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [activeId, setActiveId] = React.useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
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

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Transaction deleted",
        description: "Transaction has been deleted successfully.",
      });
      setDeleteId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedId = Number(active.id);
    const [, targetStatus] = over.id.toString().split("-");
    
    const transaction = transactions.find(t => t.id === draggedId);
    if (transaction && transaction.status !== targetStatus) {
      updateTransactionStatus.mutate({
        id: draggedId,
        newStatus: targetStatus,
      });
    }
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statusColumns.map((column) => (
            <div
              key={column.id}
              className="flex flex-col min-w-[240px] bg-muted/50 rounded-lg p-2 dark:bg-gray-800/50"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm dark:text-white">{column.title}</h3>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs dark:text-white">
                  {transactions.filter(t => t.status === column.id).length}
                </span>
              </div>
              <div 
                id={`droppable-${column.id}`}
                data-droppable="true"
                className="flex flex-col gap-2 min-h-[100px]"
              >
                {transactions
                  .filter((t) => t.status === column.id)
                  .map((transaction) => (
                    <Card
                      key={transaction.id}
                      data-draggable="true"
                      id={transaction.id.toString()}
                      className="p-3 cursor-move hover:shadow-md transition-shadow relative group dark:bg-gray-700"
                    >
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(transaction.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div 
                        className="flex flex-col gap-1"
                        onClick={() => setLocation(`/transactions/${transaction.id}`)}
                      >
                        <div className="font-medium text-sm truncate pr-6 dark:text-white">
                          {transaction.address}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5 dark:text-gray-300">
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
          ))}
        </div>
      </DndContext>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteTransactionMutation.mutate(deleteId);
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
