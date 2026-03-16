import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Check, X, Shield, AlertTriangle, Loader2, Users, Pencil, ArrowLeftRight, Sparkles, Bot } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { type Transaction } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExtractedContactInfo {
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  brokerage: string;
}

interface ExtractedData {
  contractPrice: number | null;
  earnestMoney: number | null;
  optionFee: number | null;
  downPayment: number | null;
  sellerConcessions: number | null;
  closingDate: string | null;
  optionPeriodExpiration: string | null;
  contractExecutionDate: string | null;
  financing: string | null;
  mlsNumber: string | null;
  propertyAddress: string | null;
  buyerName: string | null;
  sellerName: string | null;
  extractedContacts: ExtractedContactInfo[];
}

interface ContractUploadProps {
  transactionId: number;
  transaction: Transaction;
  readOnly?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  contractPrice: "Contract Price",
  earnestMoney: "Earnest Money",
  optionFee: "Option Fee",
  downPayment: "Down Payment",
  sellerConcessions: "Seller Concessions",
  closingDate: "Closing Date",
  optionPeriodExpiration: "Option Period Expiration",
  contractExecutionDate: "Contract Execution Date",
  financing: "Financing Type",
  mlsNumber: "MLS Number",
};

const CURRENCY_FIELDS = ["contractPrice", "earnestMoney", "optionFee", "downPayment", "sellerConcessions"];
const DATE_FIELDS = ["closingDate", "optionPeriodExpiration", "contractExecutionDate"];
const TRANSACTION_FIELDS = ["contractPrice", "earnestMoney", "optionFee", "downPayment", "sellerConcessions", "closingDate", "optionPeriodExpiration", "contractExecutionDate", "financing", "mlsNumber"];

const CONTACT_ROLES = [
  "Buyer",
  "Seller",
  "Listing Agent",
  "Buyer Agent",
  "Lender",
  "Escrow Officer",
  "Home Inspector",
  "Transaction Coordinator",
];

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "Not found";
  if (CURRENCY_FIELDS.includes(key)) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value as number);
  }
  if (DATE_FIELDS.includes(key)) {
    return new Date(value as string).toLocaleDateString();
  }
  return String(value);
}

function formatEditValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (CURRENCY_FIELDS.includes(key)) return String(value);
  if (DATE_FIELDS.includes(key)) {
    const d = new Date(value as string);
    return d.toISOString().split("T")[0];
  }
  return String(value);
}

function parseEditValue(key: string, value: string): unknown {
  if (!value.trim()) return null;
  if (CURRENCY_FIELDS.includes(key)) {
    const num = parseFloat(value.replace(/[,$]/g, ""));
    return isNaN(num) ? null : Math.round(num);
  }
  if (DATE_FIELDS.includes(key)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return value;
}

export function ContractUpload({ transactionId, transaction, readOnly = false }: ContractUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [selectedContacts, setSelectedContacts] = useState<Record<number, boolean>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editingContactIdx, setEditingContactIdx] = useState<number | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [documentNotes, setDocumentNotes] = useState<string | null>(null);

  const overwriteFields = extractedData
    ? TRANSACTION_FIELDS.filter((key) => {
        if (!selectedFields[key]) return false;
        const newVal = extractedData[key as keyof ExtractedData];
        const currentVal = transaction[key as keyof Transaction];
        return newVal !== null && newVal !== undefined && currentVal !== null && currentVal !== undefined;
      })
    : [];

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("contract", file);
      const response = await fetch(`/api/transactions/${transactionId}/parse-contract`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse contract");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.extracted);
      setAiUsed(data.aiUsed || false);
      setDocumentType(data.documentType || null);
      setDocumentNotes(data.notes || null);
      const initial: Record<string, boolean> = {};
      for (const key of TRANSACTION_FIELDS) {
        const val = data.extracted[key as keyof ExtractedData];
        initial[key] = val !== null && val !== undefined;
      }
      setSelectedFields(initial);
      const contactInit: Record<number, boolean> = {};
      if (data.extracted.extractedContacts) {
        data.extracted.extractedContacts.forEach((_: ExtractedContactInfo, idx: number) => {
          contactInit[idx] = true;
        });
      }
      setSelectedContacts(contactInit);
      setShowReview(true);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({
        title: data.aiUsed ? "Document parsed with AI" : "Contract parsed",
        description: "Review the extracted data below.",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (data: Partial<Transaction>) => {
      const response = await apiRequest("PATCH", `/api/transactions/${transactionId}`, data);
      if (!response.ok) throw new Error("Failed to update transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions", transactionId] });
    },
    onError: (error: Error) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Invalid file", description: "Please select a PDF file.", variant: "destructive" });
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const addContactsMutation = useMutation({
    mutationFn: async (contacts: ExtractedContactInfo[]) => {
      const existingRes = await fetch(`/api/contacts/${transactionId}`, { credentials: "include" });
      const existingContacts: { id: number; role: string; firstName: string; lastName: string }[] =
        existingRes.ok ? await existingRes.json() : [];

      const results = [];
      const usedIds = new Set<number>();

      for (const contact of contacts) {
        const exactMatch = existingContacts.find(
          (ec) =>
            !usedIds.has(ec.id) &&
            ec.role === contact.role &&
            ec.firstName?.toLowerCase() === contact.firstName?.toLowerCase() &&
            ec.lastName?.toLowerCase() === contact.lastName?.toLowerCase()
        );

        if (exactMatch) {
          usedIds.add(exactMatch.id);
          const response = await apiRequest("PATCH", `/api/contacts/${exactMatch.id}`, {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
          });
          if (response.ok) {
            results.push(await response.json());
          }
        } else {
          const roleMatch = existingContacts.find(
            (ec) => !usedIds.has(ec.id) && ec.role === contact.role
          );
          if (roleMatch) {
            usedIds.add(roleMatch.id);
            const response = await apiRequest("PATCH", `/api/contacts/${roleMatch.id}`, {
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email || undefined,
              phone: contact.phone || undefined,
            });
            if (response.ok) {
              results.push(await response.json());
            }
          } else {
            const response = await apiRequest("POST", "/api/contacts", {
              transactionId,
              role: contact.role,
              firstName: contact.firstName,
              lastName: contact.lastName,
              email: contact.email || "",
              phone: contact.phone || "",
              mobilePhone: "",
            });
            if (response.ok) {
              results.push(await response.json());
            }
          }
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", transactionId] });
    },
  });

  const handleApply = async () => {
    if (!extractedData) return;

    const updateData: Record<string, unknown> = {};
    for (const key of TRANSACTION_FIELDS) {
      if (selectedFields[key]) {
        const val = extractedData[key as keyof ExtractedData];
        if (val !== null && val !== undefined) {
          if (DATE_FIELDS.includes(key)) {
            updateData[key] = new Date(val as string).toISOString();
          } else {
            updateData[key] = val;
          }
        }
      }
    }

    const contactsToAdd = extractedData.extractedContacts?.filter(
      (_, idx) => selectedContacts[idx]
    ) || [];

    if (Object.keys(updateData).length === 0 && contactsToAdd.length === 0) {
      toast({ title: "Nothing selected", description: "Select at least one field or contact to apply.", variant: "destructive" });
      return;
    }

    if (overwriteFields.length > 0 && !showOverwriteConfirm) {
      setShowOverwriteConfirm(true);
      return;
    }

    try {
      if (Object.keys(updateData).length > 0) {
        await applyMutation.mutateAsync(updateData as Partial<Transaction>);
      }
      if (contactsToAdd.length > 0) {
        await addContactsMutation.mutateAsync(contactsToAdd);
      }
      setShowReview(false);
      setShowOverwriteConfirm(false);
      setExtractedData(null);
      setAiUsed(false);
      setDocumentType(null);
      setDocumentNotes(null);
      toast({ title: "Applied successfully", description: `Updated transaction${contactsToAdd.length > 0 ? ` and saved ${contactsToAdd.length} contact${contactsToAdd.length !== 1 ? "s" : ""}` : ""}.` });
    } catch {
      toast({ title: "Error", description: "Failed to apply some changes.", variant: "destructive" });
    }
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
    setShowOverwriteConfirm(false);
  };

  const startEditField = (key: string) => {
    if (!extractedData) return;
    const value = extractedData[key as keyof ExtractedData];
    setEditingField(key);
    setEditValue(formatEditValue(key, value));
  };

  const saveEditField = () => {
    if (!extractedData || !editingField) return;
    const parsed = parseEditValue(editingField, editValue);
    setExtractedData({
      ...extractedData,
      [editingField]: parsed,
    });
    if (parsed !== null) {
      setSelectedFields(prev => ({ ...prev, [editingField]: true }));
    }
    setEditingField(null);
    setEditValue("");
  };

  const updateContact = (idx: number, field: keyof ExtractedContactInfo, value: string) => {
    if (!extractedData) return;
    const updated = [...extractedData.extractedContacts];
    updated[idx] = { ...updated[idx], [field]: value };
    setExtractedData({ ...extractedData, extractedContacts: updated });
  };

  const swapContactName = (idx: number) => {
    if (!extractedData) return;
    const updated = [...extractedData.extractedContacts];
    const contact = updated[idx];
    updated[idx] = { ...contact, firstName: contact.lastName, lastName: contact.firstName };
    setExtractedData({ ...extractedData, extractedContacts: updated });
  };

  const extractedCount = extractedData
    ? TRANSACTION_FIELDS.filter((k) => extractedData[k as keyof ExtractedData] !== null).length
    : 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Upload a real estate document (contract, inspection report, addendum, etc.) to automatically extract key data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-300">
              <span className="font-medium">Privacy Protected:</span> Your document is processed in memory and never stored on our servers. AI-powered extraction reads your PDF directly for accurate data extraction. The AI provider does not retain or train on your document content.{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-green-900 dark:hover:text-green-100">Learn more</a>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-file">Select PDF Document</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="contract-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="flex-1"
                disabled={readOnly}
              />
              <Button
                onClick={handleUpload}
                disabled={readOnly || !selectedFile || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Parse
                  </>
                )}
              </Button>
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {uploadMutation.isPending && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Extracting data from your document... This may take a moment.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReview} onOpenChange={(open) => {
        setShowReview(open);
        if (!open) {
          setShowOverwriteConfirm(false);
          setExtractedData(null);
          setAiUsed(false);
          setDocumentType(null);
          setDocumentNotes(null);
          setSelectedFields({});
          setSelectedContacts({});
          setEditingField(null);
          setEditingContactIdx(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {aiUsed ? <Bot className="h-5 w-5 text-purple-500" /> : <FileText className="h-5 w-5" />}
              Review Extracted Data
            </DialogTitle>
            <DialogDescription>
              {aiUsed
                ? "AI-assisted extraction was used for this document. Please review all fields carefully before applying."
                : "Review and edit the extracted data. Click the pencil icon to make corrections before applying."}
            </DialogDescription>
          </DialogHeader>

          {aiUsed && (
            <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
              <Sparkles className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-700 dark:text-purple-300">
                <span className="font-medium">AI-Assisted Parse</span>
                {documentType && documentType !== "unknown" && (
                  <span> — Detected as <span className="font-medium">{documentType.replace(/_/g, " ")}</span></span>
                )}
                <span>. Sensitive data (SSNs, account numbers) was redacted before AI processing. Please verify all extracted values.</span>
              </div>
            </div>
          )}

          {documentNotes && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">Notes:</span> {documentNotes}
              </div>
            </div>
          )}

          {extractedData && overwriteFields.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-700 dark:text-amber-300">
                <span className="font-medium">Overwrite Warning:</span>{" "}
                {overwriteFields.length} field{overwriteFields.length !== 1 ? "s" : ""} already{" "}
                {overwriteFields.length !== 1 ? "have" : "has"} existing data that will be replaced:{" "}
                {overwriteFields.map(k => FIELD_LABELS[k]).join(", ")}.
                Uncheck any fields you don't want to change.
              </div>
            </div>
          )}

          {extractedData && (
            <div className="space-y-3 py-2">
              {extractedCount === 0 && (!extractedData.extractedContacts || extractedData.extractedContacts.length === 0) && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    The parser could not find standard contract fields in this document. This may happen with non-standard contract formats, scanned documents, or image-based PDFs.
                  </div>
                </div>
              )}

              {extractedData.propertyAddress && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <p className="text-sm font-medium">Property Address:</p>
                  <p className="text-sm text-muted-foreground">{extractedData.propertyAddress}</p>
                </div>
              )}

              {extractedData.extractedContacts && extractedData.extractedContacts.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <p className="text-sm font-medium">Extracted Contacts (will be added to Contacts tab)</p>
                    </div>
                    {extractedData.extractedContacts.map((contact, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border transition-colors ${
                          selectedContacts[idx]
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedContacts(prev => ({ ...prev, [idx]: !prev[idx] }))}
                            className={`flex-shrink-0 w-5 h-5 mt-1 rounded border-2 flex items-center justify-center transition-colors ${
                              selectedContacts[idx]
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {selectedContacts[idx] && <Check className="h-3 w-3" />}
                          </button>

                          {editingContactIdx === idx ? (
                            <div className="flex-1 space-y-2">
                              <div>
                                <Label className="text-xs">Role</Label>
                                <Select value={contact.role} onValueChange={(val) => updateContact(idx, "role", val)}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {CONTACT_ROLES.map(role => (
                                      <SelectItem key={role} value={role}>{role}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs">First Name</Label>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 px-1 text-xs text-muted-foreground"
                                      onClick={() => swapContactName(idx)}
                                      title="Swap first and last name"
                                    >
                                      <ArrowLeftRight className="h-3 w-3 mr-1" />
                                      Swap
                                    </Button>
                                  </div>
                                  <Input
                                    className="h-8 text-sm"
                                    value={contact.firstName}
                                    onChange={(e) => updateContact(idx, "firstName", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Last Name</Label>
                                  <Input
                                    className="h-8 text-sm"
                                    value={contact.lastName}
                                    onChange={(e) => updateContact(idx, "lastName", e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Email</Label>
                                  <Input
                                    className="h-8 text-sm"
                                    value={contact.email}
                                    onChange={(e) => updateContact(idx, "email", e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Phone</Label>
                                  <Input
                                    className="h-8 text-sm"
                                    value={contact.phone}
                                    onChange={(e) => updateContact(idx, "phone", e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => setEditingContactIdx(null)}
                                >
                                  Done
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full">{contact.role}</span>
                                <span className="text-sm font-medium">{contact.firstName} {contact.lastName}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 ml-auto"
                                  onClick={() => setEditingContactIdx(idx)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                                {contact.email && <p>Email: {contact.email}</p>}
                                {contact.phone && <p>Phone: {contact.phone}</p>}
                                {contact.brokerage && <p>Brokerage: {contact.brokerage}</p>}
                                {!contact.email && !contact.phone && !contact.brokerage && <p>No additional details found</p>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </>
              )}

              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4" />
                <p className="text-sm font-medium">Transaction Fields</p>
              </div>

              {TRANSACTION_FIELDS.map((key) => {
                const value = extractedData[key as keyof ExtractedData];
                const currentValue = transaction[key as keyof Transaction];
                const hasValue = value !== null && value !== undefined;
                const hasExisting = currentValue !== null && currentValue !== undefined;
                const isEditing = editingField === key;

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      hasValue
                        ? selectedFields[key]
                          ? "bg-primary/5 border-primary/30"
                          : "bg-background border-border"
                        : "bg-muted/30 border-border opacity-60"
                    }`}
                  >
                    {hasValue && (
                      <button
                        type="button"
                        onClick={() => toggleField(key)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedFields[key]
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {selectedFields[key] && <Check className="h-3 w-3" />}
                      </button>
                    )}
                    {!hasValue && !isEditing && <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{FIELD_LABELS[key]}</p>
                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            className="h-8 text-sm flex-1"
                            type={DATE_FIELDS.includes(key) ? "date" : CURRENCY_FIELDS.includes(key) ? "number" : "text"}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveEditField();
                              if (e.key === "Escape") { setEditingField(null); setEditValue(""); }
                            }}
                            autoFocus
                          />
                          <Button type="button" size="sm" variant="outline" className="h-8" onClick={saveEditField}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => { setEditingField(null); setEditValue(""); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className={`text-sm ${hasValue ? "text-foreground" : "text-muted-foreground"}`}>
                            {formatValue(key, value)}
                          </p>
                          {hasExisting && hasValue && (
                            <div className={`flex items-center gap-1 mt-0.5 ${selectedFields[key] ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                              {selectedFields[key] && <AlertTriangle className="h-3 w-3 flex-shrink-0" />}
                              <p className="text-xs">
                                Current: {formatValue(key, currentValue)}
                                {selectedFields[key] && " — will be overwritten"}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={() => startEditField(key)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            {showOverwriteConfirm ? (
              <div className="w-full space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    Are you sure? This will overwrite {overwriteFields.length} existing field{overwriteFields.length !== 1 ? "s" : ""}:{" "}
                    <span className="font-medium">{overwriteFields.map(k => FIELD_LABELS[k]).join(", ")}</span>.
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowOverwriteConfirm(false)}>
                    Go Back
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleApply}
                    disabled={applyMutation.isPending || addContactsMutation.isPending}
                  >
                    {applyMutation.isPending || addContactsMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Confirm Overwrite
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowReview(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={applyMutation.isPending || addContactsMutation.isPending || (extractedCount === 0 && !extractedData?.extractedContacts?.some((_, idx) => selectedContacts[idx]))}
                >
                  {applyMutation.isPending || addContactsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Apply Selected
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
