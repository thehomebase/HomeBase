import { FC } from "react";
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";

interface KanbanColumn {
  title: string;
  transactions: Transaction[];
}

interface Transaction {
  id: number;
  stage: string;
  // ... other transaction properties
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onDragEnd: (result: any) => void;
}

const SortableCard: FC<{ transaction: Transaction }> = ({ transaction }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: transaction.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors"
    >
      <div>Transaction {transaction.id}</div>
    </Card>
  );
};

export const KanbanBoard: FC<KanbanBoardProps> = ({ columns, onDragEnd }) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const sensors = useSensors(useSensor(PointerSensor));

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className={`flex ${isDesktop ? 'flex-row' : 'flex-col'} gap-4 w-full ${isDesktop ? 'overflow-x-auto' : ''}`}>
        {columns.map((column) => (
          <div 
            key={column.title}
            className={`${isDesktop ? 'w-[300px] min-w-[300px]' : 'w-full'} bg-muted/50 rounded-lg p-4`}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              {column.title}
              <span className="text-sm text-muted-foreground">
                ({column.transactions.length})
              </span>
            </h3>
            <SortableContext 
              items={column.transactions.map(t => t.id)}
              strategy={isDesktop ? horizontalListSortingStrategy : verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {column.transactions.map((transaction) => (
                  <SortableCard key={transaction.id} transaction={transaction} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
};