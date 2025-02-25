
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "./ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";

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
        status: 'not_applicable'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add document");
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
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData(["/api/documents", transactionId], (oldData: Document[] = []) => 
        oldData.filter(doc => doc.id !== deletedId)
      );
      toast({
        title: "Success",
        description: "Document removed successfully",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocument.trim()) {
      addDocumentMutation.mutate(newDocument.trim());
    }
  };

  // Calculate progress
  const completedDocs = documents.filter(doc => doc.status === 'complete').length;
  const progress = Math.round((completedDocs / documents.length) * 100);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Documents</CardTitle>
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">{progress}% complete</div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {documents.map((doc: Document) => (
            <div key={doc.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <Checkbox
                  id={`doc-${doc.id}`}
                  checked={doc.status === 'complete'}
                  onCheckedChange={(checked) => {
                    updateDocumentMutation.mutate({
                      id: doc.id,
                      status: checked ? 'complete' : 'not_applicable'
                    });
                  }}
                  disabled={user?.role !== 'agent'}
                />
                <div className="flex-1">
                  <label
                    htmlFor={`doc-${doc.id}`}
                    className={`text-sm ${doc.status === 'complete' ? "line-through text-muted-foreground" : ""}`}
                  >
                    {doc.name}
                  </label>
                  <select
                    className="block w-full mt-1 text-sm px-2 py-1 rounded-md border"
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
                </div>
                {user?.role === 'agent' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeDocumentMutation.mutate(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {user?.role === 'agent' && (
            <form onSubmit={handleAddDocument} className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
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
        </div>
      </CardContent>
    </Card>
  );
}
