import { GoogleGenAI, createPartFromBase64 } from "@google/genai";
import type { ExtractedContractData, ExtractedContactInfo } from "./contract-parser";
import type { ParsedInspectionItem } from "./inspection-parser";

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

function stripPII(text: string): string {
  let stripped = text;
  stripped = stripped.replace(/\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, "[SSN_REDACTED]");
  stripped = stripped.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, "[CARD_REDACTED]");
  stripped = stripped.replace(/\b\d{9,10}\b(?=\s|$)/g, "[ACCOUNT_REDACTED]");
  stripped = stripped.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");
  stripped = stripped.replace(/\(?\b\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE_REDACTED]");
  stripped = stripped.replace(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\s+\d{2}:\d{2}:\d{2}\b/g, "[TIMESTAMP_REDACTED]");
  stripped = stripped.replace(/\b[A-Z]{2}\s*(?:License|Lic\.?|ID)[\s#:]*\d{5,10}\b/gi, "[LICENSE_REDACTED]");
  stripped = stripped.replace(/\bDOB[\s:]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, "[DOB_REDACTED]");
  return stripped;
}

function truncateText(text: string, maxChars: number = 30000): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n[DOCUMENT TRUNCATED]";
}

const DOCUMENT_EXTRACTION_PROMPT = `You are a real estate document parser. Analyze this PDF document and extract the following fields. Return ONLY a valid JSON object with no markdown formatting, no code fences, no explanation.

Fields to extract:
- documentType: string - the type of document (e.g. "purchase_contract", "listing_agreement", "inspection_report", "addendum", "disclosure", "closing_document", "lease", "amendment", "unknown")
- contractPrice: number or null - the total purchase/sales price
- earnestMoney: number or null - earnest money deposit amount
- optionFee: number or null - option fee amount
- downPayment: number or null - down payment amount
- sellerConcessions: number or null - seller concessions/contributions
- closingDate: string or null - closing date in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)
- optionPeriodExpiration: string or null - option period end date in ISO format
- contractExecutionDate: string or null - date contract was executed/signed in ISO format
- financing: string or null - one of: "conventional", "fha", "va", "usda", "cash", or null
- mlsNumber: string or null - MLS listing number
- propertyAddress: string or null - full property address
- buyerName: string or null - buyer name(s)
- sellerName: string or null - seller name(s)
- contacts: array of objects with { role, firstName, lastName, email, phone, brokerage } - extracted people (buyers, sellers, agents, brokers, inspectors, lenders, title officers, etc.)
- notes: string or null - any important terms, contingencies, or special conditions worth noting

Rules:
- For monetary values, return plain numbers (no $ or commas)
- For dates, convert to ISO 8601 format
- If a field cannot be found, return null
- For contacts, extract as many people as you can find with their roles
- Be thorough but only include data you can confidently extract
- Do NOT fabricate or guess data that isn't in the document
`;

const INSPECTION_EXTRACTION_PROMPT = `You are a home inspection report parser. Analyze this PDF inspection report including all text AND images/photos. Extract ALL deficiencies, issues, and repair items. Return ONLY a valid JSON object with no markdown formatting, no code fences, no explanation.

Return a JSON object with:
- propertyAddress: string or null - the property address from the report
- inspectionDate: string or null - date of inspection in ISO format
- inspectorName: string or null - name of the inspector
- items: array of objects, each with:
  - category: string - one of: "roof", "plumbing", "electrical", "hvac", "foundation", "exterior", "interior", "appliances", "other"
  - description: string - clear description of the deficiency or issue found
  - severity: string - one of: "safety" (immediate hazard), "major" (significant repair needed), "moderate" (should be addressed), "minor" (cosmetic or low priority)
  - location: string - where in the home the issue was found (e.g. "master bathroom", "north side exterior", "attic")
  - recommendation: string - what the inspector recommends (e.g. "Replace immediately", "Have licensed plumber evaluate", "Monitor")
  - pageNumber: number or null - the page number in the PDF where this deficiency is documented (1-based)
  - hasPhoto: boolean - whether a photo/image of this specific deficiency appears on the same page or nearby pages in the report

Rules:
- Extract EVERY deficiency, issue, concern, or recommended repair mentioned in the report
- Include items marked as "deficient", "needs repair", "safety hazard", "not functioning", "damaged", etc.
- Do NOT include items that are noted as satisfactory, functional, or in good condition
- Classify severity accurately: safety hazards (exposed wiring, gas leaks, no GFCI) are "safety"; structural/roof/major system failures are "major"; general repairs are "moderate"; cosmetic issues are "minor"
- Be thorough - inspection reports often have 10-50+ items
- Do NOT fabricate items that aren't in the report
- Pay close attention to photos/images in the report - they often show the actual deficiency and help confirm severity
- For pageNumber, provide the page where the item text or photo appears (1-based page numbering)
- For hasPhoto, set true ONLY if you can see an actual photo/image of the deficiency in the report
`;

const HOME_RECEIPT_EXTRACTION_PROMPT = `You are a home receipt/invoice/bill parser. Analyze this document (receipt, invoice, utility bill, warranty card, or service record) and extract relevant information for a homeowner's records. Return ONLY a valid JSON object with no markdown formatting, no code fences, no explanation.

Fields to extract:
- documentType: string - one of: "receipt", "invoice", "utility_bill", "warranty_card", "service_record", "insurance", "estimate", "contract", "unknown"
- suggestedCategory: string - where this should be filed. One of: "expense", "maintenance", "warranty", "improvement", "other"
- vendor: object or null - extracted vendor/company info:
  - name: string - company/vendor name
  - phone: string or null - phone number
  - email: string or null - email address
  - website: string or null - website URL
  - address: string or null - full address
  - category: string or null - vendor trade/service type (e.g. "plumbing", "electrical", "hvac", "roofing", "landscaping", "pest_control", "appliance_repair", "cleaning", "pool_maintenance", "handyman", "other")
- amount: number or null - total amount/cost in dollars (plain number, no $ or commas)
- date: string or null - date of service/purchase/billing in YYYY-MM-DD format
- description: string or null - brief description of the service/purchase
- lineItems: array of { description: string, amount: number } or null - individual line items if present

For expense-type documents (utility bills, recurring services):
- expenseCategory: string or null - one of: "electric", "gas", "water", "sewer", "trash", "pest_control", "pool_maintenance", "home_cleaning", "internet", "lawn_care", "hoa", "security", "other"
- isRecurring: boolean - whether this appears to be a recurring charge
- billingPeriod: string or null - the billing period if shown (e.g. "Jan 2026")
- accountNumber: string or null - account number if shown (last 4 digits only for privacy)

For warranty documents:
- itemName: string or null - the product/appliance name
- brand: string or null - manufacturer/brand
- model: string or null - model number
- warrantyProvider: string or null - warranty company name
- expirationDate: string or null - warranty expiration in YYYY-MM-DD
- coverageDetails: string or null - what's covered

For maintenance/service records:
- serviceCategory: string or null - one of: "plumbing", "electrical", "hvac", "roofing", "painting", "landscaping", "cleaning", "pest_control", "appliance_repair", "flooring", "handyman", "pool_maintenance", "window_specialist", "garage_door", "security_system", "other"
- recommendation: string or null - any follow-up recommendations

For improvement/project documents:
- projectCategory: string or null - one of: "kitchen", "bathroom", "bedroom", "living_area", "exterior", "landscaping", "roofing", "flooring", "painting", "plumbing", "electrical", "hvac", "addition", "other"
- materials: string or null - materials mentioned

Rules:
- For monetary values, return plain numbers (no $ or commas)
- For dates, convert to YYYY-MM-DD format
- If a field cannot be found, return null
- Be thorough but only include data you can confidently extract
- Do NOT fabricate or guess data that isn't in the document
- For vendor info, extract as much contact information as possible
`;

function parseJSON(responseText: string): Record<string, unknown> {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }
  return JSON.parse(jsonMatch[0]);
}

export async function parseDocumentWithAI(input: Buffer | string): Promise<{
  extracted: ExtractedContractData;
  documentType: string;
  notes: string | null;
  aiUsed: true;
}> {
  let contents: any;

  if (Buffer.isBuffer(input)) {
    const pdfPart = createPartFromBase64(input.toString("base64"), "application/pdf");
    contents = [pdfPart, { text: DOCUMENT_EXTRACTION_PROMPT }];
    console.log("[AI Parser] Sending PDF directly to Gemini (multimodal)");
  } else {
    const sanitizedText = stripPII(input);
    const truncatedText = truncateText(sanitizedText);
    contents = DOCUMENT_EXTRACTION_PROMPT + "\n\nDocument text:\n" + truncatedText;
    console.log("[AI Parser] Sending text to Gemini (text-only fallback)");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJSON(responseText);
  } catch (e) {
    console.error("[AI Parser] Response parse error:", e);
    console.error("[AI Parser] Raw response preview:", responseText.substring(0, 500));
    throw new Error("Failed to parse AI extraction results");
  }

  const contacts: ExtractedContactInfo[] = [];
  if (Array.isArray(parsed.contacts)) {
    for (const c of parsed.contacts) {
      if (c && typeof c === "object") {
        contacts.push({
          role: String(c.role || ""),
          firstName: String(c.firstName || ""),
          lastName: String(c.lastName || ""),
          email: String(c.email || ""),
          phone: String(c.phone || ""),
          brokerage: String(c.brokerage || ""),
        });
      }
    }
  }

  const rawPreview = Buffer.isBuffer(input) ? "[PDF sent directly to AI]" : input.substring(0, 2000);

  const extracted: ExtractedContractData = {
    contractPrice: typeof parsed.contractPrice === "number" ? parsed.contractPrice : null,
    earnestMoney: typeof parsed.earnestMoney === "number" ? parsed.earnestMoney : null,
    optionFee: typeof parsed.optionFee === "number" ? parsed.optionFee : null,
    downPayment: typeof parsed.downPayment === "number" ? parsed.downPayment : null,
    sellerConcessions: typeof parsed.sellerConcessions === "number" ? parsed.sellerConcessions : null,
    closingDate: typeof parsed.closingDate === "string" ? parsed.closingDate : null,
    optionPeriodExpiration: typeof parsed.optionPeriodExpiration === "string" ? parsed.optionPeriodExpiration : null,
    contractExecutionDate: typeof parsed.contractExecutionDate === "string" ? parsed.contractExecutionDate : null,
    financing: typeof parsed.financing === "string" ? parsed.financing : null,
    mlsNumber: typeof parsed.mlsNumber === "string" ? parsed.mlsNumber : null,
    propertyAddress: typeof parsed.propertyAddress === "string" ? parsed.propertyAddress : null,
    buyerName: typeof parsed.buyerName === "string" ? parsed.buyerName : null,
    sellerName: typeof parsed.sellerName === "string" ? parsed.sellerName : null,
    extractedContacts: contacts,
    rawTextPreview: rawPreview,
  };

  return {
    extracted,
    documentType: typeof parsed.documentType === "string" ? parsed.documentType : "unknown",
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
    aiUsed: true,
  };
}

export type InspectionItemWithPhoto = ParsedInspectionItem & {
  pageNumber?: number | null;
  hasPhoto?: boolean;
};

export async function parseInspectionWithAI(input: Buffer | string): Promise<{
  items: InspectionItemWithPhoto[];
  propertyAddress: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  aiUsed: true;
}> {
  let contents: any;

  if (Buffer.isBuffer(input)) {
    const pdfPart = createPartFromBase64(input.toString("base64"), "application/pdf");
    contents = [pdfPart, { text: INSPECTION_EXTRACTION_PROMPT }];
    console.log("[AI Inspection Parser] Sending PDF directly to Gemini (multimodal - can see images)");
  } else {
    const sanitizedText = stripPII(input);
    const truncatedText = truncateText(sanitizedText, 40000);
    contents = INSPECTION_EXTRACTION_PROMPT + "\n\nInspection report text:\n" + truncatedText;
    console.log("[AI Inspection Parser] Sending text to Gemini (text-only fallback, no image analysis)");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJSON(responseText);
  } catch (e) {
    console.error("[AI Inspection Parser] Response parse error:", e);
    console.error("[AI Inspection Parser] Raw response preview:", responseText.substring(0, 500));
    throw new Error("Failed to parse AI inspection extraction results");
  }

  const items: InspectionItemWithPhoto[] = [];
  if (Array.isArray(parsed.items)) {
    for (const item of parsed.items) {
      if (item && typeof item === "object") {
        const validCategories = ["roof", "plumbing", "electrical", "hvac", "foundation", "exterior", "interior", "appliances", "other"];
        const validSeverities = ["safety", "major", "moderate", "minor"];
        const category = validCategories.includes(String(item.category)) ? String(item.category) : "other";
        const severity = validSeverities.includes(String(item.severity)) ? String(item.severity) : "moderate";

        items.push({
          category,
          description: String(item.description || ""),
          severity,
          location: String(item.location || ""),
          pageNumber: typeof item.pageNumber === "number" ? item.pageNumber : null,
          hasPhoto: item.hasPhoto === true,
        });
      }
    }
  }

  return {
    items,
    propertyAddress: typeof parsed.propertyAddress === "string" ? parsed.propertyAddress : null,
    inspectionDate: typeof parsed.inspectionDate === "string" ? parsed.inspectionDate : null,
    inspectorName: typeof parsed.inspectorName === "string" ? parsed.inspectorName : null,
    aiUsed: true,
  };
}

export interface ParsedHomeReceipt {
  documentType: string;
  suggestedCategory: string;
  vendor: {
    name: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    address: string | null;
    category: string | null;
  } | null;
  amount: number | null;
  date: string | null;
  description: string | null;
  lineItems: { description: string; amount: number }[] | null;
  expenseCategory: string | null;
  isRecurring: boolean;
  billingPeriod: string | null;
  accountNumber: string | null;
  itemName: string | null;
  brand: string | null;
  model: string | null;
  warrantyProvider: string | null;
  expirationDate: string | null;
  coverageDetails: string | null;
  serviceCategory: string | null;
  recommendation: string | null;
  projectCategory: string | null;
  materials: string | null;
}

export async function parseHomeReceiptWithAI(input: Buffer | string, mimeType?: string): Promise<{
  parsed: ParsedHomeReceipt;
  aiUsed: true;
}> {
  let contents: any;

  if (Buffer.isBuffer(input)) {
    const detectedMime = mimeType || "application/pdf";
    const part = createPartFromBase64(input.toString("base64"), detectedMime);
    contents = [part, { text: HOME_RECEIPT_EXTRACTION_PROMPT }];
    console.log(`[AI Receipt Parser] Sending ${detectedMime} directly to Gemini (multimodal)`);
  } else {
    const sanitizedText = stripPII(input);
    const truncatedText = truncateText(sanitizedText);
    contents = HOME_RECEIPT_EXTRACTION_PROMPT + "\n\nDocument text:\n" + truncatedText;
    console.log("[AI Receipt Parser] Sending text to Gemini (text-only fallback)");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";

  let raw: Record<string, unknown>;
  try {
    raw = parseJSON(responseText);
  } catch (e) {
    console.error("[AI Receipt Parser] Response parse error:", e);
    console.error("[AI Receipt Parser] Raw response preview:", responseText.substring(0, 500));
    throw new Error("Failed to parse AI receipt extraction results");
  }

  const vendor = raw.vendor && typeof raw.vendor === "object" ? {
    name: String((raw.vendor as any).name || ""),
    phone: (raw.vendor as any).phone ? String((raw.vendor as any).phone) : null,
    email: (raw.vendor as any).email ? String((raw.vendor as any).email) : null,
    website: (raw.vendor as any).website ? String((raw.vendor as any).website) : null,
    address: (raw.vendor as any).address ? String((raw.vendor as any).address) : null,
    category: (raw.vendor as any).category ? String((raw.vendor as any).category) : null,
  } : null;

  const lineItems = Array.isArray(raw.lineItems) ? raw.lineItems.map((li: any) => ({
    description: String(li.description || ""),
    amount: typeof li.amount === "number" ? li.amount : 0,
  })) : null;

  const parsed: ParsedHomeReceipt = {
    documentType: typeof raw.documentType === "string" ? raw.documentType : "unknown",
    suggestedCategory: typeof raw.suggestedCategory === "string" ? raw.suggestedCategory : "other",
    vendor,
    amount: typeof raw.amount === "number" ? raw.amount : null,
    date: typeof raw.date === "string" ? raw.date : null,
    description: typeof raw.description === "string" ? raw.description : null,
    lineItems,
    expenseCategory: typeof raw.expenseCategory === "string" ? raw.expenseCategory : null,
    isRecurring: raw.isRecurring === true,
    billingPeriod: typeof raw.billingPeriod === "string" ? raw.billingPeriod : null,
    accountNumber: typeof raw.accountNumber === "string" ? raw.accountNumber : null,
    itemName: typeof raw.itemName === "string" ? raw.itemName : null,
    brand: typeof raw.brand === "string" ? raw.brand : null,
    model: typeof raw.model === "string" ? raw.model : null,
    warrantyProvider: typeof raw.warrantyProvider === "string" ? raw.warrantyProvider : null,
    expirationDate: typeof raw.expirationDate === "string" ? raw.expirationDate : null,
    coverageDetails: typeof raw.coverageDetails === "string" ? raw.coverageDetails : null,
    serviceCategory: typeof raw.serviceCategory === "string" ? raw.serviceCategory : null,
    recommendation: typeof raw.recommendation === "string" ? raw.recommendation : null,
    projectCategory: typeof raw.projectCategory === "string" ? raw.projectCategory : null,
    materials: typeof raw.materials === "string" ? raw.materials : null,
  };

  return { parsed, aiUsed: true };
}
