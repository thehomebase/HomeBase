import { PDFParse } from "pdf-parse";

export interface ExtractedContractData {
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
  rawTextPreview: string;
}

function parseCurrency(value: string): number | null {
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

function parseDate(dateStr: string): string | null {
  const cleaned = dateStr.trim();

  const formats = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/,
    /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
  ];

  for (const fmt of formats) {
    const match = cleaned.match(fmt);
    if (match) {
      try {
        const d = new Date(match[0]);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      } catch {
        continue;
      }
    }
  }

  const mmddyyyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const mmddyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/);
  if (mmddyy) {
    const [, month, day, year] = mmddyy;
    const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
    const d = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  return null;
}

function findCurrencyAfterPattern(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const groups = match.groups || {};
      const amount = groups.amount || match[1];
      if (amount) {
        const parsed = parseCurrency(amount);
        if (parsed !== null && parsed > 0) {
          return parsed;
        }
      }
    }
  }
  return null;
}

function findDateAfterPattern(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const groups = match.groups || {};
      const dateStr = groups.date || match[1];
      if (dateStr) {
        const parsed = parseDate(dateStr);
        if (parsed) return parsed;
      }
    }
  }
  return null;
}

export async function parseContract(buffer: Buffer): Promise<ExtractedContractData> {
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8 as any);
  await parser.load();
  const pdfResult = await parser.getText();
  const text = (pdfResult as any).text || "";
  const normalizedText = text.replace(/\s+/g, " ").replace(/\n+/g, " ");

  const extracted: ExtractedContractData = {
    contractPrice: null,
    earnestMoney: null,
    optionFee: null,
    downPayment: null,
    sellerConcessions: null,
    closingDate: null,
    optionPeriodExpiration: null,
    contractExecutionDate: null,
    financing: null,
    mlsNumber: null,
    propertyAddress: null,
    buyerName: null,
    sellerName: null,
    rawTextPreview: text.substring(0, 500),
  };

  extracted.contractPrice = findCurrencyAfterPattern(normalizedText, [
    /(?:sales\s*price|purchase\s*price|contract\s*(?:sales?\s*)?price|total\s*(?:sales?\s*)?price)[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /(?:price|amount)[:\s]*\$\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /\$\s*(?<amount>[\d,]+(?:\.\d{2})?)\s*(?:as\s*(?:the\s*)?(?:sales?|purchase|contract)\s*price)/i,
  ]);

  extracted.earnestMoney = findCurrencyAfterPattern(normalizedText, [
    /(?:earnest\s*money)[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /(?:earnest\s*money\s*deposit|emd)[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /\$\s*(?<amount>[\d,]+(?:\.\d{2})?)\s*(?:as\s*earnest\s*money)/i,
  ]);

  extracted.optionFee = findCurrencyAfterPattern(normalizedText, [
    /(?:option\s*(?:fee|money|consideration))[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /\$\s*(?<amount>[\d,]+(?:\.\d{2})?)\s*(?:as\s*(?:the\s*)?option\s*(?:fee|money))/i,
  ]);

  extracted.downPayment = findCurrencyAfterPattern(normalizedText, [
    /(?:down\s*payment)[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /\$\s*(?<amount>[\d,]+(?:\.\d{2})?)\s*(?:as\s*(?:a\s*)?down\s*payment)/i,
  ]);

  extracted.sellerConcessions = findCurrencyAfterPattern(normalizedText, [
    /(?:seller\s*(?:'s?\s*)?concession(?:s)?)[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /(?:seller\s*(?:contribution|credit)(?:s)?)[:\s]*\$?\s*(?<amount>[\d,]+(?:\.\d{2})?)/i,
    /\$\s*(?<amount>[\d,]+(?:\.\d{2})?)\s*(?:in\s*seller\s*concession)/i,
  ]);

  extracted.closingDate = findDateAfterPattern(normalizedText, [
    /(?:closing\s*(?:date|on|shall\s*be))[:\s]*(?<date>\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:closing\s*(?:date|on|shall\s*be))[:\s]*(?<date>(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
    /(?:close\s*(?:on|by|before))[:\s]*(?<date>\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ]);

  extracted.optionPeriodExpiration = findDateAfterPattern(normalizedText, [
    /(?:option\s*period\s*(?:expir(?:es|ation)|ends?))[:\s]*(?<date>\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:option\s*period)[:\s]*(?:.*?)(?:expir(?:es|ation)|ends?)[:\s]*(?<date>\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ]);

  if (!extracted.optionPeriodExpiration) {
    const optionDaysMatch = normalizedText.match(
      /option\s*period.*?(\d+)\s*(?:calendar\s*)?days?\s*(?:after|from|following)/i
    );
    if (optionDaysMatch && extracted.contractExecutionDate) {
      const days = parseInt(optionDaysMatch[1]);
      const execDate = new Date(extracted.contractExecutionDate);
      execDate.setDate(execDate.getDate() + days);
      extracted.optionPeriodExpiration = execDate.toISOString();
    }
  }

  extracted.contractExecutionDate = findDateAfterPattern(normalizedText, [
    /(?:(?:contract\s*)?(?:execution|effective)\s*date)[:\s]*(?<date>\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:dated?|executed?\s*(?:on|this))[:\s]*(?<date>\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:dated?|executed?\s*(?:on|this))[:\s]*(?<date>(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
  ]);

  const financingPatterns = [
    { pattern: /\b(?:conventional\s*(?:loan|mortgage|financing))\b/i, type: "conventional" },
    { pattern: /\bFHA\s*(?:loan|mortgage|financing)?\b/i, type: "fha" },
    { pattern: /\bVA\s*(?:loan|mortgage|financing)?\b/i, type: "va" },
    { pattern: /\bUSDA\s*(?:loan|mortgage|financing)?\b/i, type: "usda" },
    { pattern: /\b(?:cash\s*(?:purchase|sale|transaction|offer)|all\s*cash)\b/i, type: "cash" },
  ];

  for (const { pattern, type } of financingPatterns) {
    if (pattern.test(normalizedText)) {
      extracted.financing = type;
      break;
    }
  }

  const mlsMatch = normalizedText.match(
    /(?:MLS\s*(?:#|number|no\.?)?)[:\s]*(?<mls>[A-Z0-9\-]{4,15})/i
  );
  if (mlsMatch) {
    extracted.mlsNumber = (mlsMatch.groups?.mls || mlsMatch[1] || "").trim();
  }

  const buyerMatch = normalizedText.match(
    /(?:buyer|purchaser)\s*(?:name)?[:\s]*["']?(?<name>[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})["']?/i
  );
  if (buyerMatch) {
    extracted.buyerName = (buyerMatch.groups?.name || buyerMatch[1] || "").trim();
  }

  const sellerMatch = normalizedText.match(
    /(?:seller|vendor)\s*(?:name)?[:\s]*["']?(?<name>[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})["']?/i
  );
  if (sellerMatch) {
    extracted.sellerName = (sellerMatch.groups?.name || sellerMatch[1] || "").trim();
  }

  return extracted;
}
