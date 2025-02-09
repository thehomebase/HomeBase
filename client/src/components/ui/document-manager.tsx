import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { useState, useRef } from "react";

interface Document {
  id: number;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  transactionId: number | null;
  uploadedBy: number;
  uploadedAt: Date;
  category: string;
  notes: string | null;
}

interface DocumentManagerProps {
  transactionId?: number;
}

const categories = [
  'contract',
  'deed',
  'inspection',
  'insurance',
  'mortgage',
  'other'
] as const;

export function DocumentManager({ transactionId }: DocumentManagerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadData, setUploadData] = useState({
    title: '',
    category: 'other' as typeof categories[number],
    notes: ''
  });

  const queryKey = transactionId 
    ? ["/api/documents/transaction", transactionId]
    : ["/api/documents/user"];

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey,
    enabled: true,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      // Reset form
      setUploadData({
        title: '',
        category: 'other',
        notes: ''
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/documents/${id}`);
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.length) {
      toast({
        title: "Error",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('title', uploadData.title);
    formData.append('category', uploadData.category);
    formData.append('notes', uploadData.notes);
    if (transactionId) {
      formData.append('transactionId', String(transactionId));
    }

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={uploadData.title}
                onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={uploadData.category}
                onValueChange={(value) => setUploadData(prev => ({ ...prev, category: value as typeof categories[number] }))}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={uploadData.notes}
              onChange={(e) => setUploadData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input
              id="file"
              type="file"
              ref={fileInputRef}
              required
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            />
          </div>
          <Button type="submit" disabled={uploadMutation.isPending}>
            <Upload className="h-4 w-4 mr-2" />
            {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
          </Button>
        </form>
      </Card>

      <Card>
        <ScrollArea className="h-[400px] p-6">
          <div className="space-y-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <File className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium">{doc.title}</h4>
                    <div className="text-sm text-muted-foreground">
                      {doc.fileName} • {formatFileSize(doc.fileSize)} • 
                      Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                    </div>
                    {doc.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{doc.notes}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => window.open(doc.fileUrl, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this document?')) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No documents found. Upload your first document to get started!
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
