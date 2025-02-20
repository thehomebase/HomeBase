import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

interface Client {
  id: number;
  firstName: string;
  lastName: string;
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
  onClick,
  clients
}: { 
  transaction: Transaction; 
  onDelete: (id: number) => Promise<void>;
  onClick: () => void;
  clients: Client[];
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: transaction.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const client = clients.find((c) => c.id === transaction.clientId);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 w-full cursor-move hover:shadow-md transition-shadow relative group dark:bg-gray-700"
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
        <div className="text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="capitalize font-medium text-primary dark:text-white">
              {transaction.type === "buy" ? "Purchase" : "Sale"}
            </span>
            <span>{formatPrice(transaction.contractPrice)}</span>
          </div>
          <div className="text-muted-foreground">
            Client: {client 
              ? `${client.firstName} ${client.lastName}` 
              : 'Not set'}
          </div>
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
  onTransactionClick,
  clients
}: { 
  status: string; 
  title: string; 
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onTransactionClick: (id: number) => void;
  clients: Client[];
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-2 dark:bg-gray-800/50">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm dark:text-white">{title}</h3>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs dark:text-white">
          {transactions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-h-[100px] px-1 mt-1">
        {transactions.map((transaction) => (
          <DraggableCard
            key={transaction.id}
            transaction={transaction}
            onDelete={onDelete}
            onClick={() => onTransactionClick(transaction.id)}
            clients={clients}
          />
        ))}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: number) => void;
  onTransactionClick: (id: number) => void;
  clients: Client[];
}

export function KanbanBoard({ transactions, onDeleteTransaction, onTransactionClick, clients }: KanbanBoardProps) {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>(transactions);

  const { data: clientsData = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const updateTransactionStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/transactions/${id}`,
        { status: status.toLowerCase() }
      );
      if (!response.ok) {
        throw new Error("Failed to update transaction");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: "Transaction status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update transaction status",
        variant: "destructive",
      });
      setLocalTransactions(transactions);
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

    const updatedTransactions = localTransactions.map(t => 
      t.id === draggedId 
        ? { ...t, status: newStatus.toLowerCase() }
        : t
    );

    setLocalTransactions(updatedTransactions);
    updateTransactionStatusMutation.mutate({ id: draggedId, status: newStatus });
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
      <div className="w-full overflow-x-auto">
        <div className={`${isMobile ? 'flex flex-col w-full' : 'flex'} gap-4 pb-4 flex-grow`}>
          {statusColumns.map((column) => (
            <KanbanColumn 
              key={column.id} 
              status={column.id} 
              title={column.title} 
              transactions={localTransactions.filter((t) => t.status === column.id)}
              onDelete={onDeleteTransaction}
              onTransactionClick={(id) => setLocation(`/transactions/${id}`)}
              clients={clientsData}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeId && activeTransaction && activeTransaction.client ? (
          <Card className="p-3 w-[180px] shadow-lg cursor-grabbing dark:bg-gray-700">
            <div className="font-medium text-sm truncate dark:text-white">
              {activeTransaction.address}
            </div>
            <div className="text-sm text-primary dark:text-primary-foreground">
              {activeTransaction.client.firstName} {activeTransaction.client.lastName}
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