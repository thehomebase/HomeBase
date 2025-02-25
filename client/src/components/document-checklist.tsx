import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
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
  useDroppable
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, Clock, FileText } from "lucide-react";
import { Input } from "./ui/input";
import { format } from "date-fns";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const statusColumns = [
  { key: 'not_applicable', label: 'Not Applicable', color: 'gray' },
  { key: 'waiting_signatures', label: 'Waiting Signatures', color: 'orange' },
  { key: 'signed', label: 'Signed', color: 'blue' },
  { key: 'waiting_others', label: 'Waiting Others', color: 'yellow' },
  { key: 'complete', label: 'Complete', color: 'green' }
] as const;

const defaultDocuments = [
  { id: "iabs", name: "IABS", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "buyer_rep", name: "Buyer Rep Agreement", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "listing_agreement", name: "Listing Agreement", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "seller_disclosure", name: "Seller's Disclosure", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "property_survey", name: "Property Survey", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "lead_paint", name: "Lead-Based Paint Disclosure", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "purchase_agreement", name: "Purchase Agreement", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "hoa_addendum", name: "HOA Addendum", status: "not_applicable", notes: "", deadline: null, deadlineTime: null },
  { id: "inspection", name: "Home Inspection Report", status: "not_applicable", notes: "", deadline: null, deadlineTime: null }
] as const;

interface Document {
  id: string;
  name: string;
  status: typeof statusColumns[number]['key'];
  transactionId: number;
  notes?: string;
  deadline?: string | null;
  deadlineTime?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

function getStatusColor(status: Document['status']) {
  const statusConfig = statusColumns.find(col => col.key === status);
  return {
    'not_applicable': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    'waiting_signatures': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'signed': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'waiting_others': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'complete': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }[status] || 'bg-gray-100 text-gray-700';
}

function DocumentCard({ 
  document, 
  isDragging,
  onUpdateNotes,
  onUpdateDeadline 
}: { 
  document: Document; 
  isDragging?: boolean;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDeadline: (id: string, deadline: string, time: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: document.id,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(document.notes || '');
  const [deadline, setDeadline] = useState(document.deadline || '');
  const [deadlineTime, setDeadlineTime] = useState(document.deadlineTime || '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const statusColor = getStatusColor(document.status);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-background border rounded-md p-3 cursor-move hover:bg-accent/50 ${isDragging ? 'opacity-50' : ''} relative`}
      onClick={() => setIsEditing(!isEditing)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-medium text-sm mb-1">{document.name}</div>
          <Badge variant="secondary" className={`${statusColor} text-xs`}>
            {statusColumns.find(col => col.key === document.status)?.label}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-1">
          {document.deadline && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Due: {format(new Date(document.deadline), 'MMM d, yyyy')}
                  {document.deadlineTime && ` at ${document.deadlineTime}`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {document.notes && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  {document.notes}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mt-3 space-y-2" onClick={e => e.stopPropagation()}>
          <div className="space-y-2">
            <Label htmlFor={`date-${document.id}`} className="text-sm">
              Date Due
            </Label>
            <Input
              id={`date-${document.id}`}
              type="date"
              value={deadline}
              onChange={(e) => {
                setDeadline(e.target.value);
                onUpdateDeadline(document.id, e.target.value, deadlineTime);
              }}
              className="text-sm"
            />
            <Label htmlFor={`time-${document.id}`} className="text-sm">
              Time Due
            </Label>
            <Input
              id={`time-${document.id}`}
              type="time"
              value={deadlineTime}
              onChange={(e) => {
                setDeadlineTime(e.target.value);
                onUpdateDeadline(document.id, deadline, e.target.value);
              }}
              className="text-sm"
            />
          </div>
          <Textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              onUpdateNotes(document.id, e.target.value);
            }}
            className="text-sm min-h-[60px]"
            placeholder="Add notes..."
          />
        </div>
      )}
    </div>
  );
}

function DroppableColumn({ 
  status, 
  documents,
  title,
  onUpdateNotes,
  onUpdateDeadline
}: { 
  status: typeof statusColumns[number]['key'];
  documents: Document[];
  title: string;
  onUpdateNotes: (id: string, notes: string) => void;
  onUpdateDeadline: (id: string, deadline: string, time: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const statusColor = getStatusColor(status);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        <Badge variant="secondary" className={`${statusColor} text-xs`}>
          {documents.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        data-status={status}
        className="space-y-2 min-h-[100px] p-2 rounded-md bg-muted/50 transition-colors"
      >
        <SortableContext items={documents.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {documents.map((doc) => (
            <DocumentCard 
              key={doc.id} 
              document={doc} 
              onUpdateNotes={onUpdateNotes}
              onUpdateDeadline={onUpdateDeadline}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

export function DocumentChecklist({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [newDocument, setNewDocument] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const { data: documents = [], isLoading, isError } = useQuery({
    queryKey: ["/api/documents", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/${transactionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          const initResponse = await apiRequest("POST", `/api/documents/${transactionId}/initialize`, {
            documents: defaultDocuments.map(doc => ({
              ...doc,
              transactionId
            }))
          });
          if (!initResponse.ok) {
            throw new Error("Failed to initialize documents");
          }
          return initResponse.json();
        }
        throw new Error("Failed to fetch documents");
      }
      const docs = await response.json();
      return docs.length ? docs : [];
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      notes, 
      deadline,
      deadlineTime 
    }: { 
      id: string; 
      status?: Document['status']; 
      notes?: string;
      deadline?: string;
      deadlineTime?: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/documents/${transactionId}/${id}`, { 
        status,
        notes,
        deadline,
        deadlineTime
      });
      if (!response.ok) {
        throw new Error("Failed to update document");
      }

      // If we have both deadline and time, add to calendar
      if (deadline && deadlineTime) {
        try {
          await apiRequest("POST", `/api/calendar/events`, {
            documentId: id,
            date: deadline,
            time: deadlineTime,
            title: `Document Due: ${documents.find(d => d.id === id)?.name}`,
          });
        } catch (error) {
          console.error('Failed to add calendar event:', error);
          // Don't throw error here as the document update was successful
        }
      }

      return response.json();
    },
    onSuccess: (updatedDoc) => {
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) =>
        oldData.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc)
      );
      toast({
        title: "Success",
        description: "Document updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
    }
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", `/api/documents/${transactionId}`, {
        name,
        status: 'not_applicable' as const
      });
      if (!response.ok) {
        throw new Error("Failed to add document");
      }
      return response.json();
    },
    onSuccess: (newDoc) => {
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) => 
        [...oldData, newDoc]
      );
      setNewDocument("");
      toast({
        title: "Success",
        description: "Document added successfully",
      });
    },
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const status = over.id as Document['status'];
    const documentId = active.id as string;

    if (!status || !documentId) return;

    const activeDocument = documents.find(doc => doc.id === documentId);
    if (!activeDocument || activeDocument.status === status) return;

    updateDocumentMutation.mutate({
      id: documentId,
      status
    });
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    updateDocumentMutation.mutate({
      id,
      notes
    });
  };

  const handleUpdateDeadline = (id: string, deadline: string, time: string) => {
    updateDocumentMutation.mutate({
      id,
      deadline,
      deadlineTime: time
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Failed to load documents. Please try again.</div>
        </CardContent>
      </Card>
    );
  }

  const activeDocument = activeId ? documents.find(doc => doc.id === activeId) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statusColumns.map(column => (
              <DroppableColumn
                key={column.key}
                status={column.key}
                title={column.label}
                documents={documents.filter(doc => doc.status === column.key)}
                onUpdateNotes={handleUpdateNotes}
                onUpdateDeadline={handleUpdateDeadline}
              />
            ))}
          </div>
          <DragOverlay>
            {activeDocument && (
              <div className="bg-background border rounded-md p-2 shadow-lg">
                <div className="text-sm">{activeDocument.name}</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
        {user?.role === 'agent' && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (newDocument.trim()) {
              addDocumentMutation.mutate(newDocument.trim());
            }
          }} className="flex flex-col sm:flex-row gap-2 pt-6 mt-6 border-t">
            <Input
              placeholder="New document name..."
              value={newDocument}
              onChange={(e) => setNewDocument(e.target.value)}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!newDocument.trim() || addDocumentMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}