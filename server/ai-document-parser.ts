import { GoogleGenAI } from "@google/genai";
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

const DOCUMENT_EXTRACTION_PROMPT = `You are a real estate document parser. Extract the following fields from this document text. Return ONLY a valid JSON object with no markdown formatting, no code fences, no explanation.

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

Document text:
`;

const INSPECTION_EXTRACTION_PROMPT = `You are a home inspection report parser. Extract ALL deficiencies, issues, and repair items from this inspection report. Return ONLY a valid JSON object with no markdown formatting, no code fences, no explanation.

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

Rules:
- Extract EVERY deficiency, issue, concern, or recommended repair mentioned in the report
- Include items marked as "deficient", "needs repair", "safety hazard", "not functioning", "damaged", etc.
- Do NOT include items that are noted as satisfactory, functional, or in good condition
- Classify severity accurately: safety hazards (exposed wiring, gas leaks, no GFCI) are "safety"; structural/roof/major system failures are "major"; general repairs are "moderate"; cosmetic issues are "minor"
- Be thorough - inspection reports often have 10-50+ items
- Do NOT fabricate items that aren't in the report

Inspection report text:
`;

export async function parseDocumentWithAI(rawText: string): Promise<{
  extracted: ExtractedContractData;
  documentType: string;
  notes: string | null;
  aiUsed: true;
}> {
  const sanitizedText = stripPII(rawText);
  const truncatedText = truncateText(sanitizedText);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: DOCUMENT_EXTRACTION_PROMPT + truncatedText,
    config: {
      maxOutputTokens: 4096,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }
    parsed = JSON.parse(jsonMatch[0]);
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
    rawTextPreview: rawText.substring(0, 2000),
  };

  return {
    extracted,
    documentType: typeof parsed.documentType === "string" ? parsed.documentType : "unknown",
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
    aiUsed: true,
  };
}

export async function parseInspectionWithAI(rawText: string): Promise<{
  items: ParsedInspectionItem[];
  propertyAddress: string | null;
  inspectionDate: string | null;
  inspectorName: string | null;
  aiUsed: true;
}> {
  const sanitizedText = stripPII(rawText);
  const truncatedText = truncateText(sanitizedText, 40000);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: INSPECTION_EXTRACTION_PROMPT + truncatedText,
    config: {
      maxOutputTokens: 8192,
      temperature: 0.1,
    },
  });

  const responseText = response.text || "";

  let parsed: Record<string, unknown>;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in AI response");
    }
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("[AI Inspection Parser] Response parse error:", e);
    console.error("[AI Inspection Parser] Raw response preview:", responseText.substring(0, 500));
    throw new Error("Failed to parse AI inspection extraction results");
  }

  const items: ParsedInspectionItem[] = [];
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
