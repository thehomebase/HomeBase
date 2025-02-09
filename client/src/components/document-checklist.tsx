
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

interface Document {
  id: string;
  name: string;
  status: 'not_applicable' | 'waiting_signatures' | 'signed' | 'waiting_others' | 'complete';
}

const defaultDocuments = [
  { id: "1", name: "Purchase Agreement", status: "waiting_signatures" },
  { id: "2", name: "Seller's Disclosure", status: "not_applicable" },
  { id: "3", name: "Lead-Based Paint Disclosure", status: "not_applicable" },
  { id: "4", name: "Property Survey", status: "waiting_others" },
  { id: "5", name: "Home Inspection Report", status: "not_applicable" },
  { id: "6", name: "Appraisal Report", status: "not_applicable" },
  { id: "7", name: "Title Report", status: "not_applicable" },
  { id: "8", name: "Closing Disclosure", status: "not_applicable" },
  { id: "9", name: "Deed", status: "not_applicable" },
  { id: "10", name: "Information About Broker Services (IABS)", status: "not_applicable" },
  { id: "11", name: "Buyer Representation Agreement", status: "not_applicable" },
  { id: "12", name: "Listing Agreement", status: "not_applicable" },
  { id: "13", name: "3rd Party Financing Addendum", status: "not_applicable" },
  { id: "14", name: "HOA Addendum", status: "not_applicable" }
];

export function DocumentChecklist({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newDocument, setNewDocument] = useState("");

  const { data: documents = defaultDocuments, isLoading } = useQuery({
    queryKey: ["/api/documents", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/${transactionId}`);
      if (!response.ok) {
        return defaultDocuments;
      }
      return response.json();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", transactionId] });
      setNewDocument("");
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
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
          />
          <Button
            onClick={() => newDocument && addDocumentMutation.mutate(newDocument)}
            disabled={!newDocument}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>
      )}
    </div>
  );
}
