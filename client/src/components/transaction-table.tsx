import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Settings2, GripVertical, Plus, Pencil, X } from "lucide-react";
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
  streetName: string;
  city: string;
  state: string;
  zipCode: string;
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
  isCustom?: boolean;
}

function SortableHeader({ column, onEdit, onDelete }: {
  column: Column;
  onEdit: (column: Column) => void;
  onDelete: (columnId: string) => void;
}) {
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
      className="relative h-10 px-2 text-left align-middle font-medium text-muted-foreground hover:bg-accent/50 group"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4" />
        {column.title}
        {column.isCustom && (
          <div className="hidden group-hover:flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(column);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(column.id);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
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
  const [columns, setColumns] = useState<Column[]>([
    { id: 'streetName', title: 'Street Name', visible: true },
    { id: 'city', title: 'City', visible: true },
    { id: 'state', title: 'State', visible: true },
    { id: 'zipCode', title: 'ZIP Code', visible: true },
    { id: 'closed_sales_price', title: 'Closed Sales Price', visible: true },
    { id: 'commission', title: 'Commission (%)', visible: true },
    { id: 'commission_usd', title: 'Commission ($USD)', visible: true },
    { id: 'value', title: 'Value', visible: true },
    { id: 'contact_person', title: 'Contact person', visible: true },
    { id: 'deal_created', title: 'Deal created', visible: true },
    { id: 'won_time', title: 'Won time', visible: true },
    { id: 'deal_duration', title: 'Deal Duration', visible: true },
  ]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [showColumnDialog, setShowColumnDialog] = useState(false);

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

  const addColumn = () => {
    setEditingColumn(null);
    setNewColumnTitle("");
    setShowColumnDialog(true);
  };

  const editColumn = (column: Column) => {
    setEditingColumn(column);
    setNewColumnTitle(column.title);
    setShowColumnDialog(true);
  };

  const deleteColumn = (columnId: string) => {
    setColumns(columns.filter(col => col.id !== columnId));
  };

  const handleSaveColumn = () => {
    if (newColumnTitle.trim()) {
      if (editingColumn) {
        setColumns(columns.map(col =>
          col.id === editingColumn.id
            ? { ...col, title: newColumnTitle.trim() }
            : col
        ));
      } else {
        const newId = `custom_${Date.now()}`;
        setColumns([...columns, {
          id: newId,
          title: newColumnTitle.trim(),
          visible: true,
          isCustom: true
        }]);
      }
      setShowColumnDialog(false);
      setNewColumnTitle("");
      setEditingColumn(null);
    }
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
    transaction.streetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transaction.zipCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (transaction.client &&
      `${transaction.client.firstName} ${transaction.client.lastName}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()))
  );

  const getColumnValue = (transaction: Transaction, columnId: string) => {
    switch (columnId) {
      case 'streetName':
        return transaction.streetName;
      case 'city':
        return transaction.city;
      case 'state':
        return transaction.state;
      case 'zipCode':
        return transaction.zipCode;
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
        if (columnId.startsWith('custom_')) {
          return '-';
        }
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
              Manage columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Column Visibility</h4>
                <Button variant="outline" size="sm" onClick={addColumn}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </div>
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.id} className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-2">
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
                    {column.isCustom && (
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => editColumn(column)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => deleteColumn(column.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
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
                      <SortableHeader
                        key={column.id}
                        column={column}
                        onEdit={editColumn}
                        onDelete={deleteColumn}
                      />
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

      <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingColumn ? 'Edit Column' : 'Add New Column'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="columnTitle" className="text-sm font-medium">
                Column Title
              </label>
              <Input
                id="columnTitle"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Enter column title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowColumnDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveColumn}>
              {editingColumn ? 'Save Changes' : 'Add Column'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}