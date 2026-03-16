import { GoogleGenAI } from "@google/genai";
import type { ExtractedContractData, ExtractedContactInfo } from "./contract-parser";

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
  stripped = stripped.replace(/\b(?:0[1-9]|1[0-2])[\/\-](?:0[1-9]|[12]\d|3[01])[\/\-](?:19|20)\d{2}\b/g, (match) => match);
  stripped = stripped.replace(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\s+\d{2}:\d{2}:\d{2}\b/g, "[TIMESTAMP_REDACTED]");
  stripped = stripped.replace(/\b[A-Z]{2}\s*(?:License|Lic\.?|ID)[\s#:]*\d{5,10}\b/gi, "[LICENSE_REDACTED]");
  stripped = stripped.replace(/\bDOB[\s:]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, "[DOB_REDACTED]");
  return stripped;
}

function truncateText(text: string, maxChars: number = 30000): string {
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars) + "\n[DOCUMENT TRUNCATED]";
}

const EXTRACTION_PROMPT = `You are a real estate document parser. Extract the following fields from this document text. Return ONLY a valid JSON object with no markdown formatting, no code fences, no explanation.

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
- inspectionItems: array of objects with { item, condition, recommendation } or null - for inspection reports only
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

export async function parseDocumentWithAI(rawText: string): Promise<{
  extracted: ExtractedContractData;
  documentType: string;
  inspectionItems: Array<{ item: string; condition: string; recommendation: string }> | null;
  notes: string | null;
  aiUsed: true;
}> {
  const sanitizedText = stripPII(rawText);
  const truncatedText = truncateText(sanitizedText);

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: EXTRACTION_PROMPT + truncatedText,
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
    console.error("AI response parse error:", e);
    console.error("Raw response:", responseText.substring(0, 500));
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

  let inspectionItems: Array<{ item: string; condition: string; recommendation: string }> | null = null;
  if (Array.isArray(parsed.inspectionItems)) {
    inspectionItems = parsed.inspectionItems.map((item: Record<string, unknown>) => ({
      item: String(item.item || ""),
      condition: String(item.condition || ""),
      recommendation: String(item.recommendation || ""),
    }));
  }

  return {
    extracted,
    documentType: typeof parsed.documentType === "string" ? parsed.documentType : "unknown",
    inspectionItems,
    notes: typeof parsed.notes === "string" ? parsed.notes : null,
    aiUsed: true,
  };
}

export function shouldUseAI(regexResult: ExtractedContractData): boolean {
  const importantFields = [
    regexResult.contractPrice,
    regexResult.closingDate,
    regexResult.buyerName,
    regexResult.sellerName,
    regexResult.propertyAddress,
  ];
  const foundCount = importantFields.filter(f => f !== null).length;
  return foundCount < 2;
}
