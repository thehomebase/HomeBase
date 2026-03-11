import { useState, useEffect } from "react";
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
import { Trash2, Home, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Transaction {
  id: number;
  streetName: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
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

const buyerColumns = [
  { id: "qualified_buyer", title: "Qualified Buyer" },
  { id: "active_search", title: "Active Search" },
  { id: "offer_submitted", title: "Offer Submitted" },
  { id: "under_contract", title: "Under Contract" },
  { id: "closing", title: "Closing" },
];

const BUYER_ADDRESS_STAGES = new Set(["offer_submitted", "under_contract", "closing"]);

const sellerColumns = [
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

function getCardTitle(transaction: Transaction, clients: Client[], hideAddress = false): string {
  if (!hideAddress && transaction.streetName && transaction.streetName.trim()) {
    return transaction.streetName;
  }
  const client = clients.find((c) => c.id === transaction.clientId);
  if (client) {
    return `${client.firstName} ${client.lastName}`;
  }
  return 'Untitled Transaction';
}

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
  const isBuyerEarlyStage = transaction.type === 'buy' && !BUYER_ADDRESS_STAGES.has(transaction.status);
  const hasAddress = !isBuyerEarlyStage && transaction.streetName && transaction.streetName.trim();
  const cardTitle = getCardTitle(transaction, clients, isBuyerEarlyStage);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="p-3 w-full cursor-move hover:shadow-md transition-shadow relative group dark:bg-neutral-600 dark:border-neutral-500 bg-background border border-neutral-300"
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
        <div className="font-medium text-sm truncate pr-8 flex items-center gap-1">
          {hasAddress ? (
            <Home className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <User className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
          {cardTitle}
        </div>
        <div className="text-xs space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="capitalize font-medium text-primary">
              {transaction.type === "buy" ? "Purchase" : "Sale"}
            </span>
            <span>{formatPrice(transaction.contractPrice)}</span>
          </div>
          {hasAddress && (
            <div className="text-muted-foreground">
              Client: {client 
                ? `${client.firstName} ${client.lastName}` 
                : 'Not set'}
            </div>
          )}
          {!hasAddress && isBuyerEarlyStage && (
            <div className="text-muted-foreground italic text-[11px]">
              Searching for property
            </div>
          )}
          {!hasAddress && !isBuyerEarlyStage && transaction.type === 'sell' && (
            <div className="text-muted-foreground italic text-[11px]">
              No property address
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({ 
  status, 
  droppableId,
  title, 
  transactions,
  onDelete,
  onTransactionClick,
  clients
}: { 
  status: string; 
  droppableId: string;
  title: string; 
  transactions: Transaction[];
  onDelete: (id: number) => void;
  onTransactionClick: (id: number) => void;
  clients: Client[];
}) {
  const { setNodeRef } = useDroppable({
    id: droppableId,
  });

  return (
    <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-2 flex-1 border border-border">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
          {transactions.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 px-1 mt-1">
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
  const [viewFilter, setViewFilter] = useState<'all' | 'buyer' | 'seller'>('all');

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
    mutationFn: async ({ id, status, streetName, city, state, zipCode }: { id: number; status: string; streetName?: string | null; city?: string | null; state?: string | null; zipCode?: string | null }) => {
      const body: Record<string, unknown> = { status: status.toLowerCase() };
      if (streetName !== undefined) body.streetName = streetName;
      if (city !== undefined) body.city = city;
      if (state !== undefined) body.state = state;
      if (zipCode !== undefined) body.zipCode = zipCode;
      const response = await apiRequest(
        "PATCH",
        `/api/transactions/${id}`,
        body
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
    const droppableId = over.id.toString();
    const newStatus = droppableId.replace(/^(buyer|seller)_/, '');

    const draggedTransaction = localTransactions.find(t => t.id === draggedId);
    if (!draggedTransaction) return;

    const validBuyerStatuses = buyerColumns.map(c => c.id);
    const validSellerStatuses = sellerColumns.map(c => c.id);
    const validStatuses = draggedTransaction.type === 'buy' ? validBuyerStatuses : validSellerStatuses;

    if (!validStatuses.includes(newStatus)) return;
    if (draggedTransaction.status === newStatus) return;

    const movingToEarlyBuyerStage = draggedTransaction.type === 'buy' && !BUYER_ADDRESS_STAGES.has(newStatus);
    const updatedTransactions = localTransactions.map(t => 
      t.id === draggedId 
        ? { 
            ...t, 
            status: newStatus.toLowerCase(),
            ...(movingToEarlyBuyerStage ? { streetName: null, city: null, state: null, zipCode: null } : {})
          }
        : t
    );

    setLocalTransactions(updatedTransactions);
    if (movingToEarlyBuyerStage) {
      updateTransactionStatusMutation.mutate({ 
        id: draggedId, 
        status: newStatus,
        streetName: null,
        city: null,
        state: null,
        zipCode: null
      });
    } else {
      updateTransactionStatusMutation.mutate({ id: draggedId, status: newStatus });
    }
  };

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const activeTransaction = activeId ? localTransactions.find(t => t.id === activeId) : null;

  const buyerStatusSet = new Set(buyerColumns.map(c => c.id));
  const sellerStatusSet = new Set(sellerColumns.map(c => c.id));
  const buyerTransactions = localTransactions
    .filter(t => t.type === 'buy')
    .map(t => buyerStatusSet.has(t.status) ? t : { ...t, status: 'qualified_buyer' });
  const sellerTransactions = localTransactions
    .filter(t => t.type === 'sell')
    .map(t => sellerStatusSet.has(t.status) ? t : { ...t, status: 'prospect' });

  const renderColumns = (columns: typeof buyerColumns, filteredTransactions: Transaction[], prefix: string) => (
    <div className={`${isMobile ? 'flex flex-col w-full' : 'grid grid-cols-5 w-full'} gap-4 pb-4`}>
      {columns.map((column) => (
        <KanbanColumn 
          key={`${prefix}_${column.id}`} 
          status={column.id}
          droppableId={`${prefix}_${column.id}`}
          title={column.title} 
          transactions={filteredTransactions.filter((t) => t.status === column.id)}
          onDelete={onDeleteTransaction}
          onTransactionClick={(id) => setLocation(`/transactions/${id}`)}
          clients={clientsData}
        />
      ))}
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full min-w-0">
        <div className="flex items-center gap-4 mb-4">
          <Tabs value={viewFilter} onValueChange={(v) => setViewFilter(v as 'all' | 'buyer' | 'seller')}>
            <TabsList>
              <TabsTrigger value="all">
                All ({localTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="buyer">
                Buyers ({buyerTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="seller">
                Sellers ({sellerTransactions.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {(viewFilter === 'all' || viewFilter === 'buyer') && buyerTransactions.length > 0 && (
          <div className="mb-6">
            {viewFilter === 'all' && (
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Buyer Pipeline</h3>
            )}
            {renderColumns(buyerColumns, buyerTransactions, 'buyer')}
          </div>
        )}

        {(viewFilter === 'all' || viewFilter === 'seller') && sellerTransactions.length > 0 && (
          <div className="mb-6">
            {viewFilter === 'all' && (
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Seller Pipeline</h3>
            )}
            {renderColumns(sellerColumns, sellerTransactions, 'seller')}
          </div>
        )}

        {viewFilter === 'buyer' && buyerTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No buyer transactions yet
          </div>
        )}
        {viewFilter === 'seller' && sellerTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No seller transactions yet
          </div>
        )}
        {viewFilter === 'all' && localTransactions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No transactions yet
          </div>
        )}
      </div>

      <DragOverlay>
        {activeId && activeTransaction ? (() => {
          const isEarlyBuyer = activeTransaction.type === 'buy' && !BUYER_ADDRESS_STAGES.has(activeTransaction.status);
          return (
            <Card className="p-3 w-[180px] shadow-lg cursor-grabbing dark:bg-neutral-600 dark:border-neutral-500">
              <div className="font-medium text-sm truncate">
                {getCardTitle(activeTransaction, clientsData, isEarlyBuyer)}
              </div>
              <div className="text-sm text-primary">
                {activeTransaction.client
                  ? `${activeTransaction.client.firstName} ${activeTransaction.client.lastName}`
                  : !isEarlyBuyer && activeTransaction.streetName && activeTransaction.streetName.trim()
                    ? 'No client'
                    : ''}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeTransaction.type === "buy" ? "Purchase" : "Sale"}
              </div>
            </Card>
          );
        })() : null}
      </DragOverlay>
    </DndContext>
  );
}
