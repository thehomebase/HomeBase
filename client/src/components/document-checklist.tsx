import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { useToast } from "@/hooks/use-toast";

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
];

interface Document {
  id: string;
  name: string;
  status: 'not_applicable' | 'waiting_signatures' | 'signed' | 'waiting_others' | 'complete';
}

export function DocumentChecklist({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newDocument, setNewDocument] = useState("");

  const { data: documents = defaultDocuments, isLoading } = useQuery({
    queryKey: ["/api/documents", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const existingDocs = await response.json();
      return existingDocs.length ? existingDocs : defaultDocuments;
    },
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/documents/${transactionId}/${id}`, { status });
      if (!response.ok) {
        throw new Error("Failed to update document status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", `/api/documents/${transactionId}`, {
        name,
        status: 'not_applicable'
      });
      if (!response.ok) {
        throw new Error("Failed to add document");
      }
      return response.json();
    },
    onSuccess: (newDoc) => {
      const existingDocs = queryClient.getQueryData<Document[]>(["/api/documents", transactionId]) || [];
      queryClient.setQueryData(["/api/documents", transactionId], [...existingDocs, newDoc]);
      setNewDocument("");
      toast({
        title: "Success",
        description: "Document added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add document",
        variant: "destructive",
      });
    },
  });

  const removeDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${transactionId}/${id}`);
      if (!response.ok) {
        throw new Error("Failed to remove document");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
      toast({
        title: "Success",
        description: "Document removed successfully",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleAddDocument = () => {
    if (newDocument.trim()) {
      addDocumentMutation.mutate(newDocument.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr,200px,40px] gap-4 items-center font-medium text-sm text-muted-foreground">
        <div>Document</div>
        <div>Status</div>
        <div></div>
      </div>

      {documents.map((doc) => (
        <div key={doc.id} className="grid grid-cols-[1fr,200px,40px] gap-4 items-center">
          <div>{doc.name}</div>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={doc.status}
            onChange={(e) => updateDocumentMutation.mutate({ id: doc.id, status: e.target.value })}
            disabled={user?.role !== 'agent'}
          >
            <option value="not_applicable">Not Applicable</option>
            <option value="waiting_signatures">Waiting On Signature(s)</option>
            <option value="signed">Signed</option>
            <option value="waiting_others">Waiting On Others</option>
            <option value="complete">Complete</option>
          </select>
          {user?.role === 'agent' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeDocumentMutation.mutate(doc.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {user?.role === 'agent' && (
        <div className="grid grid-cols-[1fr,auto] gap-4 items-center pt-4 border-t">
          <Input
            placeholder="New document name..."
            value={newDocument}
            onChange={(e) => setNewDocument(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddDocument();
              }
            }}
          />
          <Button
            onClick={handleAddDocument}
            disabled={!newDocument.trim() || addDocumentMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      )}
    </div>
  );
}