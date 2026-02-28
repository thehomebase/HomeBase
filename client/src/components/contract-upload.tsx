import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Check, X, Shield, AlertTriangle, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { type Transaction } from "@shared/schema";
import { Separator } from "@/components/ui/separator";

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
  propertyAddress: "Property Address",
  buyerName: "Buyer Name",
  sellerName: "Seller Name",
};

const CURRENCY_FIELDS = ["contractPrice", "earnestMoney", "optionFee", "downPayment", "sellerConcessions"];
const DATE_FIELDS = ["closingDate", "optionPeriodExpiration", "contractExecutionDate"];
const TRANSACTION_FIELDS = ["contractPrice", "earnestMoney", "optionFee", "downPayment", "sellerConcessions", "closingDate", "optionPeriodExpiration", "contractExecutionDate", "financing", "mlsNumber"];

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

export function ContractUpload({ transactionId, transaction }: ContractUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [selectedContacts, setSelectedContacts] = useState<Record<number, boolean>>({});

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
      toast({ title: "Contract parsed", description: "Review the extracted data below." });
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
      const results = [];
      for (const contact of contacts) {
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

    try {
      if (Object.keys(updateData).length > 0) {
        await applyMutation.mutateAsync(updateData as Partial<Transaction>);
      }
      if (contactsToAdd.length > 0) {
        await addContactsMutation.mutateAsync(contactsToAdd);
      }
      setShowReview(false);
      setExtractedData(null);
      toast({ title: "Applied successfully", description: `Updated transaction${contactsToAdd.length > 0 ? ` and added ${contactsToAdd.length} contact${contactsToAdd.length !== 1 ? "s" : ""}` : ""}.` });
    } catch {
      toast({ title: "Error", description: "Failed to apply some changes.", variant: "destructive" });
    }
  };

  const toggleField = (key: string) => {
    setSelectedFields((prev) => ({ ...prev, [key]: !prev[key] }));
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
            Upload Contract
          </CardTitle>
          <CardDescription>
            Upload a real estate contract PDF to automatically extract key transaction data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-green-700 dark:text-green-300">
              <span className="font-medium">Privacy Protected:</span> Your contract is processed in memory only and is never stored on our servers. The file is immediately discarded after data extraction.
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contract-file">Select Contract PDF</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                id="contract-file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="flex-1"
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadMutation.isPending}
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
                Extracting data from your contract... This may take a moment.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review Extracted Data
            </DialogTitle>
            <DialogDescription>
              {extractedCount > 0
                ? `Found ${extractedCount} field${extractedCount !== 1 ? "s" : ""}. Select which values to apply to this transaction.`
                : "No data could be automatically extracted from this contract."}
            </DialogDescription>
          </DialogHeader>

          {extractedData && (
            <div className="space-y-3 py-2">
              {extractedCount === 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    The parser could not find standard contract fields in this document. This may happen with non-standard contract formats, scanned documents, or image-based PDFs. You can still enter data manually using the edit button.
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
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          selectedContacts[idx]
                            ? "bg-primary/5 border-primary/30"
                            : "bg-background border-border"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedContacts(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedContacts[idx]
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selectedContacts[idx] && <Check className="h-3 w-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium px-2 py-0.5 bg-muted rounded-full">{contact.role}</span>
                            <span className="text-sm font-medium">{contact.firstName} {contact.lastName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {contact.email && <p>Email: {contact.email}</p>}
                            {contact.phone && <p>Phone: {contact.phone}</p>}
                            {contact.brokerage && <p>Brokerage: {contact.brokerage}</p>}
                            {!contact.email && !contact.phone && !contact.brokerage && <p>No additional details found</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                </>
              )}

              {TRANSACTION_FIELDS.map((key) => {
                const value = extractedData[key as keyof ExtractedData];
                const currentValue = transaction[key as keyof Transaction];
                const hasValue = value !== null && value !== undefined;
                const hasExisting = currentValue !== null && currentValue !== undefined;

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
                    {!hasValue && <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{FIELD_LABELS[key]}</p>
                      <p className={`text-sm ${hasValue ? "text-foreground" : "text-muted-foreground"}`}>
                        {formatValue(key, value)}
                      </p>
                      {hasExisting && hasValue && (
                        <p className="text-xs text-muted-foreground">
                          Current: {formatValue(key, currentValue)}
                          {selectedFields[key] && " (will be overwritten)"}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
