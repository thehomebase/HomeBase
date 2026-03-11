import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, FileText, Trash2, Mail, Download, Eye, Loader2,
  Camera, ScanLine, X, Send, FileCheck, FileDown
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction, Client, ScannedDocument } from "@shared/schema";

function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        if (width <= maxWidth) {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
          return;
        }
        const ratio = maxWidth / width;
        width = maxWidth;
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(objectUrl); resolve(file); return; }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
          },
          "image/jpeg",
          quality
        );
      } catch { URL.revokeObjectURL(objectUrl); resolve(file); }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
    img.src = objectUrl;
  });
}


const CATEGORIES = [
  { value: "contract", label: "Contract" },
  { value: "disclosure", label: "Disclosure" },
  { value: "inspection", label: "Inspection" },
  { value: "identification", label: "Identification" },
  { value: "financial", label: "Financial" },
  { value: "correspondence", label: "Correspondence" },
  { value: "other", label: "Other" },
];

type DocMetadata = Omit<ScannedDocument, "fileData">;

export default function DocumentScannerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState("other");
  const [docTransactionId, setDocTransactionId] = useState<string>("");
  const [docClientId, setDocClientId] = useState<string>("");
  const [docNotes, setDocNotes] = useState("");

  const [previewDoc, setPreviewDoc] = useState<DocMetadata | null>(null);
  const [emailDoc, setEmailDoc] = useState<DocMetadata | null>(null);
  const [pdfExporting, setPdfExporting] = useState<number | null>(null);
  const [pdfGrayscale, setPdfGrayscale] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const { data: documents = [], isLoading } = useQuery<DocMetadata[]>({
    queryKey: ["/api/scanned-documents"],
    enabled: !!user,
  });

  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/scanned-documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document uploaded successfully" });
      resetUploadForm();
      queryClient.invalidateQueries({ queryKey: ["/api/scanned-documents"] });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/scanned-documents/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Document deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/scanned-documents"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const emailMutation = useMutation({
    mutationFn: async ({ id, to, subject, body }: { id: number; to: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", `/api/scanned-documents/${id}/email`, { to, subject, body });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Document emailed successfully" });
      setEmailDoc(null);
      setEmailTo("");
      setEmailSubject("");
      setEmailBody("");
    },
    onError: (error: Error) => {
      toast({ title: "Email failed", description: error.message, variant: "destructive" });
    },
  });

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview(null);
    setDocName("");
    setDocCategory("other");
    setDocTransactionId("");
    setDocClientId("");
    setDocNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleFileSelect = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    let processedFile = file;
    if (file.type.startsWith("image/")) {
      processedFile = await compressImage(file);
    }
    setUploadFile(processedFile);
    if (!docName) {
      setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
    if (processedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadPreview(e.target?.result as string);
      reader.readAsDataURL(processedFile);
    } else {
      setUploadPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !docName.trim()) return;
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("name", docName.trim());
    formData.append("category", docCategory);
    if (docTransactionId && docTransactionId !== "none") formData.append("transactionId", docTransactionId);
    if (docClientId && docClientId !== "none") formData.append("clientId", docClientId);
    if (docNotes.trim()) formData.append("notes", docNotes.trim());
    uploadMutation.mutate(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      contract: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      disclosure: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      inspection: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      identification: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      financial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      correspondence: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[category] || colors.other;
  };

  const exportAsPdf = useCallback(async (doc: DocMetadata, grayscale: boolean) => {
    setPdfExporting(doc.id);
    let imageSrc: string | null = null;
    try {
      const isImage = doc.mimeType.startsWith("image/");
      if (!isImage) {
        const a = document.createElement("a");
        a.href = `/api/scanned-documents/${doc.id}/file`;
        a.download = doc.name.endsWith(".pdf") ? doc.name : `${doc.name}.pdf`;
        a.click();
        return;
      }

      const response = await fetch(`/api/scanned-documents/${doc.id}/file`, { credentials: "include" });
      if (!response.ok) throw new Error(`Failed to fetch document (${response.status})`);
      const blob = await response.blob();
      imageSrc = URL.createObjectURL(blob);

      const img = new window.Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = imageSrc;
      });

      const maxExportDim = 2000;
      let canvasW = img.width;
      let canvasH = img.height;
      if (canvasW > maxExportDim || canvasH > maxExportDim) {
        const downscale = Math.min(maxExportDim / canvasW, maxExportDim / canvasH);
        canvasW = Math.round(canvasW * downscale);
        canvasH = Math.round(canvasH * downscale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      ctx.drawImage(img, 0, 0, canvasW, canvasH);

      if (grayscale) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        ctx.putImageData(imageData, 0, 0);
      }

      const imgWidth = canvasW;
      const imgHeight = canvasH;
      const pdfPageWidth = 595.28;
      const pdfPageHeight = 841.89;
      const margin = 20;
      const maxW = pdfPageWidth - margin * 2;
      const maxH = pdfPageHeight - margin * 2;
      const scale = Math.min(maxW / imgWidth, maxH / imgHeight);
      const drawW = imgWidth * scale;
      const drawH = imgHeight * scale;
      const offsetX = (pdfPageWidth - drawW) / 2;
      const offsetY = (pdfPageHeight - drawH) / 2;

      const imgDataUrl = canvas.toDataURL("image/jpeg", 0.92);

      const rawImgData = atob(imgDataUrl.split(",")[1]);
      const imgBytes = new Uint8Array(rawImgData.length);
      for (let i = 0; i < rawImgData.length; i++) imgBytes[i] = rawImgData.charCodeAt(i);

      const streamContent = `q ${drawW} 0 0 ${drawH} ${offsetX} ${pdfPageHeight - offsetY - drawH} cm /Img0 Do Q`;

      const offsets: number[] = [];
      const encoder = new TextEncoder();

      const parts: Uint8Array[] = [];
      let pos = 0;
      const addText = (text: string) => { const b = encoder.encode(text); parts.push(b); pos += b.length; };
      const addBytes = (b: Uint8Array) => { parts.push(b); pos += b.length; };

      addText(`%PDF-1.4\n`);

      offsets.push(pos);
      addText(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n\n`);

      offsets.push(pos);
      addText(`2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n\n`);

      offsets.push(pos);
      addText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfPageWidth} ${pdfPageHeight}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>\nendobj\n\n`);

      offsets.push(pos);
      addText(`4 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n\n`);

      offsets.push(pos);
      addText(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`);
      addBytes(imgBytes);
      addText(`\nendstream\nendobj\n\n`);

      const xrefPos = pos;
      addText(`xref\n0 6\n0000000000 65535 f \n`);
      for (let i = 0; i < offsets.length; i++) {
        addText(`${offsets[i].toString().padStart(10, "0")} 00000 n \n`);
      }
      addText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`);

      const totalLength = parts.reduce((a, b) => a + b.length, 0);
      const pdfBytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const part of parts) {
        pdfBytes.set(part, offset);
        offset += part.length;
      }

      const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name.replace(/\.[^/.]+$/, "") + ".pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `PDF saved${grayscale ? " (grayscale)" : " (color)"}` });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({ title: "PDF export failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setPdfExporting(null);
    }
  }, [toast]);

  const getTransactionLabel = (t: Transaction) => {
    const addr = [t.streetName, t.city, t.state].filter(Boolean).join(", ");
    return addr || `Transaction #${t.id}`;
  };

  const isAgentOrBroker = user?.role === "agent" || user?.role === "broker";

  return (
    <div className="px-4 sm:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6" />
          Document Scanner
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload, categorize, and email physical documents
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadPreview ? (
                  <div className="relative">
                    <img src={uploadPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-0 right-0 h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); resetUploadForm(); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium truncate max-w-[200px]">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2"
                      onClick={(e) => { e.stopPropagation(); resetUploadForm(); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, PNG up to 10MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Name *</Label>
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Seller's Disclosure"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={docCategory} onValueChange={setDocCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Link to Transaction</Label>
                  <Select value={docTransactionId} onValueChange={setDocTransactionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {transactions.map((t) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                          {getTransactionLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Client</Label>
                  <Select value={docClientId} onValueChange={setDocClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.firstName} {c.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                  placeholder="Optional notes about this document..."
                  rows={2}
                />
              </div>
              <Button
                onClick={handleUpload}
                disabled={!uploadFile || !docName.trim() || uploadMutation.isPending}
                className="w-full"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileCheck className="h-4 w-4 mr-2" />
                )}
                Upload & Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Uploaded Documents ({documents.length})
          </h2>
          {documents.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="pdf-grayscale" className="text-muted-foreground cursor-pointer">PDF Mode:</Label>
              <span className={`text-xs ${!pdfGrayscale ? "font-semibold" : "text-muted-foreground"}`}>Color</span>
              <Switch id="pdf-grayscale" checked={pdfGrayscale} onCheckedChange={setPdfGrayscale} />
              <span className={`text-xs ${pdfGrayscale ? "font-semibold" : "text-muted-foreground"}`}>Grayscale</span>
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ScanLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No documents uploaded yet</p>
              <p className="text-sm mt-1">Use the upload area above to scan or upload your first document</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const isImage = doc.mimeType.startsWith("image/");
              const transaction = doc.transactionId ? transactions.find(t => t.id === doc.transactionId) : null;
              const client = doc.clientId ? clients.find(c => c.id === doc.clientId) : null;

              return (
                <Card key={doc.id} className="overflow-hidden">
                  <div
                    className="h-32 bg-muted flex items-center justify-center cursor-pointer"
                    onClick={() => setPreviewDoc(doc)}
                  >
                    {isImage ? (
                      <img
                        src={`/api/scanned-documents/${doc.id}/file`}
                        alt={doc.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    )}
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm truncate flex-1">{doc.name}</h3>
                      <Badge className={`text-[10px] shrink-0 ${getCategoryColor(doc.category)}`}>
                        {doc.category}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{formatFileSize(doc.fileSize)} • {format(new Date(doc.createdAt), "MMM d, yyyy")}</p>
                      {transaction && <p className="truncate">Transaction: {getTransactionLabel(transaction)}</p>}
                      {client && <p>Client: {client.firstName} {client.lastName}</p>}
                      {doc.notes && <p className="truncate italic">{doc.notes}</p>}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPreviewDoc(doc)} title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = `/api/scanned-documents/${doc.id}/file`;
                          a.download = doc.name;
                          a.click();
                        }}
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {doc.mimeType.startsWith("image/") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => exportAsPdf(doc, pdfGrayscale)}
                          disabled={pdfExporting === doc.id}
                          title={`Save as PDF (${pdfGrayscale ? "grayscale" : "color"})`}
                        >
                          {pdfExporting === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      {isAgentOrBroker && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setEmailDoc(doc);
                            setEmailSubject(doc.name);
                          }}
                          title="Email via Gmail"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Delete this document?")) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="mt-2">
              {previewDoc.mimeType.startsWith("image/") ? (
                <img
                  src={`/api/scanned-documents/${previewDoc.id}/file`}
                  alt={previewDoc.name}
                  className="w-full rounded"
                />
              ) : (
                <iframe
                  src={`/api/scanned-documents/${previewDoc.id}/file`}
                  className="w-full h-[60vh] rounded border"
                  title={previewDoc.name}
                />
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = `/api/scanned-documents/${previewDoc.id}/file`;
                    a.download = previewDoc.name;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {previewDoc.mimeType.startsWith("image/") && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => exportAsPdf(previewDoc, false)}
                      disabled={pdfExporting === previewDoc.id}
                    >
                      {pdfExporting === previewDoc.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      PDF (Color)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportAsPdf(previewDoc, true)}
                      disabled={pdfExporting === previewDoc.id}
                    >
                      {pdfExporting === previewDoc.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                      PDF (Grayscale)
                    </Button>
                  </>
                )}
                {isAgentOrBroker && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailDoc(previewDoc);
                      setEmailSubject(previewDoc.name);
                      setPreviewDoc(null);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email via Gmail
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!emailDoc} onOpenChange={() => setEmailDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Document</DialogTitle>
          </DialogHeader>
          {emailDoc && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2 p-3 bg-muted rounded">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{emailDoc.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(emailDoc.fileSize)}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>To *</Label>
                <Input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Subject *</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Optional message..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDoc(null)}>Cancel</Button>
            <Button
              onClick={() => emailDoc && emailMutation.mutate({ id: emailDoc.id, to: emailTo, subject: emailSubject, body: emailBody })}
              disabled={!emailTo || !emailSubject || emailMutation.isPending}
            >
              {emailMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
