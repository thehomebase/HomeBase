import React, { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

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
    <div className="flex flex-col min-w-[240px] bg-muted/50 rounded-lg p-2 dark:bg-gray-800/50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm dark:text-white">{title}</h3>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs dark:text-white">
          {transactions.length}
        </span>
      </div>
      <div 
        className="flex flex-col gap-2" 
        data-status={status}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-primary/10');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-primary/10');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-primary/10');
          const data = e.dataTransfer.getData('text/plain');
          const [transactionId, sourceStatus] = data.split('-');
          if (sourceStatus !== status) {
            updateTransactionStatus.mutate({
              id: parseInt(transactionId),
              newStatus: status
            });
          }
        }}
      >
        {transactions.map((transaction) => (
          <Card 
            key={transaction.id}
            draggable="true"
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', `${transaction.id}-${status}`);
              e.currentTarget.classList.add('opacity-50');
            }}
            onDragEnd={(e) => {
              e.currentTarget.classList.remove('opacity-50');
            }}
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
              onClick={(e) => handleCardClick(e, transaction.id)}
            >
              <div className="font-medium text-sm truncate pr-6 dark:text-white">{transaction.address}</div>
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
  );
};

export function KanbanBoard({ transactions }: { transactions: Transaction[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
        description: "The transaction has been successfully deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      });
    },
  });

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
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
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
                  setDeleteId(null);
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