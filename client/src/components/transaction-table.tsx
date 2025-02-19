import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Settings2, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Transaction {
  id: number;
  address: string;
  status: string;
  type: 'buy' | 'sell';
  clientId: number | null;
  client?: {
    firstName: string;
    lastName: string;
  } | null;
  contractPrice: number | null;
  commission: number | null;
  dealCreated?: string;
  wonTime?: string;
  dealDuration?: number;
}

interface Column {
  id: string;
  title: string;
  visible: boolean;
}

const defaultColumns: Column[] = [
  { id: 'title', title: 'Title', visible: true },
  { id: 'closed_sales_price', title: 'Closed Sales Price', visible: true },
  { id: 'commission', title: 'Commission (%)', visible: true },
  { id: 'commission_usd', title: 'Commission ($USD)', visible: true },
  { id: 'value', title: 'Value', visible: true },
  { id: 'contact_person', title: 'Contact person', visible: true },
  { id: 'deal_created', title: 'Deal created', visible: true },
  { id: 'won_time', title: 'Won time', visible: true },
  { id: 'deal_duration', title: 'Deal Duration', visible: true },
];

function SortableHeader({ column }: { column: Column }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: column.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="relative h-10 px-2 text-left align-middle font-medium text-muted-foreground hover:bg-accent/50"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4" />
        {column.title}
      </div>
    </th>
  );
}

export function TransactionTable({
  transactions,
  onDeleteTransaction,
  onTransactionClick,
}: {
  transactions: Transaction[];
  onDeleteTransaction: (id: number) => void;
  onTransactionClick: (id: number) => void;
}) {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleColumn = (columnId: string) => {
    setColumns(columns.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ));
  };

  const formatValue = (value: any, type: string) => {
    if (value === null || value === undefined) return '-';
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case 'percentage':
        return `${value}%`;
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return value;
    }
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (transaction.client &&
      `${transaction.client.firstName} ${transaction.client.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()))
  );

  const getColumnValue = (transaction: Transaction, columnId: string) => {
    switch (columnId) {
      case 'title':
        return transaction.address;
      case 'closed_sales_price':
        return formatValue(transaction.contractPrice, 'currency');
      case 'commission':
        return formatValue(transaction.commission, 'percentage');
      case 'commission_usd':
        return formatValue(
          transaction.contractPrice && transaction.commission
            ? (transaction.contractPrice * transaction.commission) / 100
            : null,
          'currency'
        );
      case 'value':
        return formatValue(transaction.contractPrice, 'currency');
      case 'contact_person':
        return transaction.client
          ? `${transaction.client.firstName} ${transaction.client.lastName}`
          : '-';
      case 'deal_created':
        return formatValue(transaction.dealCreated, 'date');
      case 'won_time':
        return formatValue(transaction.wonTime, 'date');
      case 'deal_duration':
        return transaction.dealDuration ? `${transaction.dealDuration} days` : '-';
      default:
        return '-';
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Choose columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48">
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.id}
                    checked={column.visible}
                    onCheckedChange={() => toggleColumn(column.id)}
                  />
                  <label
                    htmlFor={column.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {column.title}
                  </label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={columns.filter(col => col.visible).map(col => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {columns
                    .filter(column => column.visible)
                    .map((column) => (
                      <SortableHeader key={column.id} column={column} />
                    ))}
                </SortableContext>
              </DndContext>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onTransactionClick(transaction.id)}
              >
                {columns
                  .filter(column => column.visible)
                  .map((column) => (
                    <TableCell key={column.id}>
                      {getColumnValue(transaction, column.id)}
                    </TableCell>
                  ))}
              </TableRow>
            ))}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.filter(col => col.visible).length}
                  className="h-24 text-center"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}