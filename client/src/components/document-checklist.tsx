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
  { id: "option_period", name: "Option Period", status: "not_applicable" },
  { id: "third_party_financing", name: "Third Party Financing", status: "not_applicable" },
  { id: "earnest_money_receipt", name: "Earnest Money Receipt", status: "not_applicable" },
  { id: "amendment", name: "Amendment", status: "not_applicable" },
  { id: "closing_disclosure", name: "Closing Disclosure", status: "not_applicable" },
  { id: "inspection", name: "Home Inspection Report", status: "not_applicable" },
  { id: "inspection_amendment", name: "Inspection Amendment", status: "not_applicable" },
  { id: "inspection_response", name: "Inspection Response", status: "not_applicable" },
  { id: "termite_inspection", name: "Termite Inspection", status: "not_applicable" },
  { id: "appraisal", name: "Appraisal", status: "not_applicable" },
  { id: "title_commitment", name: "Title Commitment", status: "not_applicable" },
  { id: "loan_estimate", name: "Loan Estimate", status: "not_applicable" },
  { id: "homeowners_insurance", name: "Homeowner's Insurance", status: "not_applicable" },
  { id: "flood_insurance", name: "Flood Insurance", status: "not_applicable" },
  { id: "warranty", name: "Home Warranty", status: "not_applicable" },
  { id: "repairs", name: "Repair Documentation", status: "not_applicable" },
  { id: "survey", name: "New Survey", status: "not_applicable" },
  { id: "wire_instructions", name: "Wire Instructions", status: "not_applicable" },
  { id: "sellers_affidavit", name: "Seller's Affidavit", status: "not_applicable" },
  { id: "closing_statement", name: "Closing Statement", status: "not_applicable" },
  { id: "deed", name: "Deed", status: "not_applicable" },
  { id: "mortgage", name: "Mortgage", status: "not_applicable" },
  { id: "occupancy_agreement", name: "Occupancy Agreement", status: "not_applicable" },
  { id: "tax_certificate", name: "Tax Certificate", status: "not_applicable" },
  { id: "addendums", name: "Additional Addendums", status: "not_applicable" }
] as const;

interface Document {
  id: string;
  name: string;
  status: 'not_applicable' | 'waiting_signatures' | 'signed' | 'waiting_others' | 'complete';
  transactionId: number;
}

const statusColumns = [
  { key: 'not_applicable', label: 'Not Applicable' },
  { key: 'waiting_signatures', label: 'Waiting Signatures' },
  { key: 'signed', label: 'Signed' },
  { key: 'waiting_others', label: 'Waiting Others' },
  { key: 'complete', label: 'Complete' }
] as const;

export function DocumentChecklist({ transactionId }: { transactionId: number }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [newDocument, setNewDocument] = useState("");

  const { data: documents = defaultDocuments.map(doc => ({
    ...doc,
    transactionId
  })), isLoading } = useQuery({
    queryKey: ["/api/documents", transactionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/documents/${transactionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const existingDocs = await response.json();
      return existingDocs.length ? existingDocs : defaultDocuments.map(doc => ({
        ...doc,
        transactionId
      }));
    },
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

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDocument.trim()) {
      addDocumentMutation.mutate(newDocument.trim());
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Calculate progress
  const completedDocs = documents.filter(doc => doc.status === 'complete').length;
  const progress = documents.length > 0 ? Math.round((completedDocs / documents.length) * 100) : 0;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Documents</CardTitle>
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">{progress}% complete</div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {statusColumns.map(column => (
            <div key={column.key} className="space-y-4">
              <h3 className="font-medium text-sm">{column.label}</h3>
              <div className="space-y-2">
                {documents
                  .filter(doc => doc.status === column.key)
                  .map((doc) => (
                    <div key={`${doc.id}-${column.key}`} className="flex items-center gap-2 group">
                      <Checkbox
                        id={`doc-${doc.id}-${column.key}`}
                        checked={doc.status === column.key}
                        onCheckedChange={(checked) => {
                          updateDocumentMutation.mutate({
                            id: doc.id,
                            status: checked ? column.key : 'not_applicable'
                          });
                        }}
                      />
                      <label
                        htmlFor={`doc-${doc.id}-${column.key}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {doc.name}
                      </label>
                      {user?.role === 'agent' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeDocumentMutation.mutate(doc.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {user?.role === 'agent' && (
          <form onSubmit={handleAddDocument} className="flex flex-col sm:flex-row gap-2 pt-6 mt-6 border-t">
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