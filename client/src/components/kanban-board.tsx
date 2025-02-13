import React, { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
  useDraggable
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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

function DraggableCard({ 
  transaction, 
  onDelete,
  onClick 
}: { 
  transaction: Transaction; 
  onDelete: (id: number) => void;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: transaction.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 cursor-move hover:shadow-md transition-shadow relative group dark:bg-gray-700"
      {...attributes}
      {...listeners}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 text-destructive hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(transaction.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <div
        className="flex flex-col gap-1"
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        <div className="font-medium text-sm truncate pr-8 dark:text-white">
          {transaction.address}
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5 dark:text-gray-300">
          <div className="capitalize">
            {transaction.type === "buy" ? "Purchase" : "Sale"}
          </div>
          <div>Price: {formatPrice(transaction.contractPrice)}</div>
          {transaction.client && (
            <div className="truncate">
              Client: {transaction.client.firstName}{" "}
              {transaction.client.lastName}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({ 
  status, 
  title, 
  transactions,
  onDelete,
  onTransactionClick 
}: { 
  status: string; 
  title: string; 
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onTransactionClick: (id: number) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="flex flex-col min-w-[240px] bg-muted/50 rounded-lg p-2 dark:bg-gray-800/50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-sm dark:text-white">{title}</h3>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs dark:text-white">
          {transactions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[100px]">
        {transactions.map((transaction) => (
          <DraggableCard
            key={transaction.id}
            transaction={transaction}
            onDelete={onDelete}
            onClick={() => onTransactionClick(transaction.id)}
          />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ transactions }: { transactions: Transaction[] }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/transactions/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete transaction");
      }
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      setLocalTransactions(prev => prev.filter(t => t.id !== deletedId));
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(Number(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const draggedId = Number(active.id);
    const newStatus = over.id.toString();

    if (newStatus === active.id.toString()) return;

    // Update local state immediately for visual feedback
    const updatedTransactions = localTransactions.map(t => 
      t.id === draggedId 
        ? { ...t, status: newStatus.toLowerCase() }
        : t
    );

    setLocalTransactions(updatedTransactions);

    // Update the transaction status in the backend
    try {
      const transaction = localTransactions.find(t => t.id === draggedId);
      if (transaction) {
        const response = await apiRequest(
          "PATCH",
          `/api/transactions/${draggedId}`,
          { status: newStatus.toLowerCase() }
        );

        if (!response.ok) {
          throw new Error("Failed to update transaction");
        }

        // Update the cache with the new data
        queryClient.setQueryData(["/api/transactions"], updatedTransactions);

        toast({
          title: "Success",
          description: "Transaction status updated",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update transaction status",
        variant: "destructive",
      });
      // Revert the local state on error
      setLocalTransactions(transactions);
    }
  };

  // Update local transactions when props change
  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const activeTransaction = activeId ? localTransactions.find(t => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statusColumns.map((column) => (
          <KanbanColumn 
            key={column.id} 
            status={column.id} 
            title={column.title} 
            transactions={localTransactions.filter((t) => t.status === column.id)}
            onDelete={(id) => deleteTransactionMutation.mutate(id)}
            onTransactionClick={(id) => setLocation(`/transactions/${id}`)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId && activeTransaction ? (
          <Card className="p-3 w-[240px] shadow-lg cursor-grabbing dark:bg-gray-700">
            <div className="font-medium text-sm truncate dark:text-white">
              {activeTransaction.address}
            </div>
            <div className="text-xs text-muted-foreground dark:text-gray-300">
              {activeTransaction.type === "buy" ? "Purchase" : "Sale"}
            </div>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}