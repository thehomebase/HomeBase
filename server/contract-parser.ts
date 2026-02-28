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
  if (isNaN(num) || num <= 0) return null;
  return Math.round(num);
}

function parseDate(dateStr: string): string | null {
  const cleaned = dateStr.trim();

  const mmddyyyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (mmddyyyy) {
    const [, month, day, year] = mmddyyyy;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
      return d.toISOString();
    }
  }

  const mmddyy = cleaned.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/);
  if (mmddyy) {
    const [, month, day, year] = mmddyy;
    const fullYear = parseInt(year) > 50 ? 1900 + parseInt(year) : 2000 + parseInt(year);
    const d = new Date(fullYear, parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  const monthNames = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i;
  const monthMatch = cleaned.match(monthNames);
  if (monthMatch) {
    const d = new Date(monthMatch[0]);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }

  return null;
}

function findAllDollarAmounts(text: string): number[] {
  const amounts: number[] = [];
  const pattern = /\$\s*([\d,]+(?:\.\d{2})?)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const parsed = parseCurrency(match[1]);
    if (parsed !== null && parsed > 0) {
      amounts.push(parsed);
    }
  }
  return amounts;
}

function findAllDates(text: string): string[] {
  const dates: string[] = [];
  const patterns = [
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = parseDate(match[0]);
      if (parsed) {
        dates.push(parsed);
      }
    }
  }
  return dates;
}

function findAmountNear(text: string, searchTerms: string[], maxDistance: number = 200): number | null {
  const lowerText = text.toLowerCase();
  for (const term of searchTerms) {
    const termLower = term.toLowerCase();
    let idx = lowerText.indexOf(termLower);
    while (idx !== -1) {
      const searchArea = text.substring(idx, idx + maxDistance);
      const amountMatch = searchArea.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (amountMatch) {
        const parsed = parseCurrency(amountMatch[1]);
        if (parsed !== null && parsed > 0) {
          return parsed;
        }
      }
      const beforeArea = text.substring(Math.max(0, idx - maxDistance), idx);
      const beforeAmounts = [...beforeArea.matchAll(/\$\s*([\d,]+(?:\.\d{2})?)/g)];
      if (beforeAmounts.length > 0) {
        const lastAmount = beforeAmounts[beforeAmounts.length - 1];
        const parsed = parseCurrency(lastAmount[1]);
        if (parsed !== null && parsed > 0) {
          return parsed;
        }
      }
      idx = lowerText.indexOf(termLower, idx + 1);
    }
  }
  return null;
}

function findDateNear(text: string, searchTerms: string[], maxDistance: number = 200): string | null {
  const lowerText = text.toLowerCase();
  for (const term of searchTerms) {
    const termLower = term.toLowerCase();
    let idx = lowerText.indexOf(termLower);
    while (idx !== -1) {
      const searchArea = text.substring(idx, idx + maxDistance);
      const datePatterns = [
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/,
        /((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i,
      ];
      for (const dp of datePatterns) {
        const dateMatch = searchArea.match(dp);
        if (dateMatch) {
          const parsed = parseDate(dateMatch[1]);
          if (parsed) return parsed;
        }
      }
      idx = lowerText.indexOf(termLower, idx + 1);
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
  const normalizedText = text.replace(/\s+/g, " ");

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
    rawTextPreview: text.substring(0, 8000),
  };

  extracted.contractPrice = findAmountNear(normalizedText, [
    "Sales Price (Sum of A and B)",
    "Sales Price",
    "sales price",
    "purchase price",
    "contract price",
    "total price",
    "Sum of A and B",
  ]);

  extracted.earnestMoney = findAmountNear(normalizedText, [
    "earnest money",
    "earnest money deposit",
    "EMD",
    "as earnest money",
    "Earnest Money",
  ]);

  extracted.optionFee = findAmountNear(normalizedText, [
    "option fee",
    "option money",
    "option consideration",
    "Option Fee",
  ]);

  extracted.downPayment = findAmountNear(normalizedText, [
    "down payment",
    "Down Payment",
    "cash down payment",
  ]);

  extracted.sellerConcessions = findAmountNear(normalizedText, [
    "seller concession",
    "seller's concession",
    "seller contribution",
    "seller credit",
    "Seller Concession",
  ]);

  extracted.closingDate = findDateNear(normalizedText, [
    "closing date",
    "close on or before",
    "closing shall be",
    "date of closing",
    "Closing Date",
    "closing on",
  ]);

  extracted.optionPeriodExpiration = findDateNear(normalizedText, [
    "option period",
    "option period expir",
    "option period ends",
    "termination option",
    "Option Period",
  ]);

  if (!extracted.optionPeriodExpiration) {
    const optionDaysMatch = normalizedText.match(
      /option\s*period.*?(\d+)\s*(?:calendar\s*)?days?\b/i
    );
    if (optionDaysMatch) {
      const execDateMatch = normalizedText.match(
        /(?:effective\s*date|execution\s*date|executed?\s*(?:on|this))[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
      );
      if (execDateMatch) {
        const execDate = parseDate(execDateMatch[1]);
        if (execDate) {
          const days = parseInt(optionDaysMatch[1]);
          const d = new Date(execDate);
          d.setDate(d.getDate() + days);
          extracted.optionPeriodExpiration = d.toISOString();
        }
      }
    }
  }

  extracted.contractExecutionDate = findDateNear(normalizedText, [
    "effective date",
    "execution date",
    "contract date",
    "executed on",
    "executed this",
    "Effective Date",
  ]);

  if (!extracted.contractExecutionDate) {
    const topDate = text.substring(0, 300).match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (topDate) {
      extracted.contractExecutionDate = parseDate(topDate[1]);
    }
  }

  const financingPatterns = [
    { pattern: /\bconventional\b/i, type: "conventional" },
    { pattern: /\bFHA\b/i, type: "fha" },
    { pattern: /\bVA\b/i, type: "va" },
    { pattern: /\bUSDA\b/i, type: "usda" },
  ];

  const financingSection = normalizedText.match(
    /(?:third\s*party\s*financing|financing\s*addendum|type\s*of\s*financing|loan\s*type)[^.]{0,500}/i
  );
  const financingText = financingSection ? financingSection[0] : normalizedText;

  const cashPattern = /\b(?:cash\s*(?:purchase|sale|transaction)|all\s*cash|no\s*financing)\b/i;
  if (cashPattern.test(financingText)) {
    extracted.financing = "cash";
  } else {
    for (const { pattern, type } of financingPatterns) {
      if (pattern.test(financingText)) {
        extracted.financing = type;
        break;
      }
    }
  }

  const mlsPatterns = [
    /MLS\s*(?:#|number|no\.?|num)?[:\s]*([A-Z0-9][A-Z0-9\-]{3,14})/i,
    /MLS[:\s]+(\d{5,15})/i,
  ];
  for (const pattern of mlsPatterns) {
    const mlsMatch = normalizedText.match(pattern);
    if (mlsMatch) {
      const val = mlsMatch[1].trim();
      const stopWords = ["number", "offer", "listing", "list", "data", "area", "service", "system"];
      if (!stopWords.includes(val.toLowerCase()) && /\d/.test(val)) {
        extracted.mlsNumber = val;
        break;
      }
    }
  }

  const partyPattern = /PARTIES[:\s].*?(?:contract\s*are)\s+([A-Z][A-Za-z\s,.'"-]+?)\s*\(Seller\)\s*and\s+([A-Z][A-Za-z\s,.'"-]+?)\s*\(Buyer\)/i;
  const partyMatch = normalizedText.match(partyPattern);
  if (partyMatch) {
    const seller = partyMatch[1].trim();
    const buyer = partyMatch[2].trim();
    if (seller.length > 2 && seller.length < 80) extracted.sellerName = seller;
    if (buyer.length > 2 && buyer.length < 80) extracted.buyerName = buyer;
  }

  if (!extracted.buyerName) {
    const buyerPatterns = [
      /Buyer[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/,
      /Purchaser[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/,
    ];
    for (const bp of buyerPatterns) {
      const m = normalizedText.match(bp);
      if (m) {
        const name = m[1].trim();
        const skipWords = ["agrees", "shall", "will", "may", "has", "and", "or"];
        if (!skipWords.some(w => name.toLowerCase().startsWith(w))) {
          extracted.buyerName = name;
          break;
        }
      }
    }
  }

  if (!extracted.sellerName) {
    const sellerPatterns = [
      /Seller[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/,
      /Vendor[:\s]+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})/,
    ];
    for (const sp of sellerPatterns) {
      const m = normalizedText.match(sp);
      if (m) {
        const name = m[1].trim();
        const skipWords = ["agrees", "shall", "will", "may", "has", "and", "or", "is"];
        if (!skipWords.some(w => name.toLowerCase().startsWith(w))) {
          extracted.sellerName = name;
          break;
        }
      }
    }
  }

  const addressMatch = normalizedText.match(
    /(?:known\s*as|property\s*address|address)[:\s]*([^,\n]{5,60}(?:,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})?)/i
  );
  if (addressMatch) {
    const addr = addressMatch[1].trim();
    if (addr.length > 5 && /\d/.test(addr)) {
      extracted.propertyAddress = addr;
    }
  }

  return extracted;
}
