import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent
} from "@dnd-kit/core";
import { 
  SortableContext, 
  verticalListSortingStrategy,
  useSortable 
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./ui/input";

const statusColumns = [
  { key: 'not_applicable', label: 'Not Applicable' },
  { key: 'waiting_signatures', label: 'Waiting Signatures' },
  { key: 'signed', label: 'Signed' },
  { key: 'waiting_others', label: 'Waiting Others' },
  { key: 'complete', label: 'Complete' }
] as const;

const defaultDocuments = [
  { id: "iabs", name: "IABS", status: "not_applicable" },
  { id: "buyer_rep", name: "Buyer Rep Agreement", status: "not_applicable" },
  { id: "listing_agreement", name: "Listing Agreement", status: "not_applicable" },
  { id: "seller_disclosure", name: "Seller's Disclosure", status: "not_applicable" },
  { id: "property_survey", name: "Property Survey", status: "not_applicable" },
  { id: "lead_paint", name: "Lead-Based Paint Disclosure", status: "not_applicable" },
  { id: "purchase_agreement", name: "Purchase Agreement", status: "not_applicable" },
  { id: "hoa_addendum", name: "HOA Addendum", status: "not_applicable" },
  { id: "inspection", name: "Home Inspection Report", status: "not_applicable" }
] as const;

interface Document {
  id: string;
  name: string;
  status: typeof statusColumns[number]['key'];
  transactionId: number;
}

function DocumentCard({ document, isDragging }: { document: Document; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: document.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-background border rounded-md p-2 cursor-move hover:bg-accent/50 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="text-sm">{document.name}</div>
    </div>
  );
}

function DroppableColumn({ 
  status, 
  documents,
  title 
}: { 
  status: typeof statusColumns[number]['key'];
  documents: Document[];
  title: string;
}) {
  return (
    <div className="space-y-4">
      <h3 className="font-medium text-sm">{title}</h3>
      <div
        data-status={status}
        className="space-y-2 min-h-[100px] p-2 rounded-md bg-muted/50 transition-colors"
      >
        <SortableContext items={documents.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
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
    initialData: []
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Document['status'] }) => {
      const response = await apiRequest("PATCH", `/api/documents/${transactionId}/${id}`, { status });
      if (!response.ok) {
        throw new Error("Failed to update document status");
      }
      return response.json();
    },
    onSuccess: (updatedDoc) => {
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) =>
        oldData.map(doc => doc.id === updatedDoc.id ? updatedDoc : doc)
      );
      toast({
        title: "Success",
        description: "Document status updated successfully",
      });
    },
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
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) => [...oldData, newDoc]);
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

    const container = over.data.current?.sortable?.containerId || 
                     (over.data.current as any)?.status ||
                     over.id;

    if (!container || typeof container !== 'string') return;

    const status = container as Document['status'];
    const documentId = active.id as string;

    const activeDocument = documents.find(doc => doc.id === documentId);
    if (!activeDocument || activeDocument.status === status) return;

    updateDocumentMutation.mutate({
      id: documentId,
      status
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

  const completedDocs = documents.filter(doc => doc.status === 'complete').length;
  const progress = documents.length ? Math.round((completedDocs / documents.length) * 100) : 0;

  const activeDocument = activeId ? documents.find(doc => doc.id === activeId) : null;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Documents</CardTitle>
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">{progress}% complete</div>
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