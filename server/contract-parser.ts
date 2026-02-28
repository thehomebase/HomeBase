import { PDFParse } from "pdf-parse";

export interface ExtractedContactInfo {
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  brokerage: string;
}

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
  extractedContacts: ExtractedContactInfo[];
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

function splitPages(text: string): string[] {
  return text.split(/--\s*\d+\s*of\s*\d+\s*--/);
}

function extractPageFooterBlock(pageText: string): string {
  const lines = pageText.split("\n");
  let footerStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/TXR\s*1601|Produced with Lone Wolf|zipForm|TREC NO\./i.test(lines[i])) {
      if (footerStart === -1) footerStart = i;
    }
  }
  if (footerStart === -1) return "";
  return lines.slice(footerStart).join("\n");
}

function extractAllNumbers(text: string): number[] {
  const numbers: number[] = [];
  const matches = text.match(/[\d,]+\.\d{2}/g) || [];
  for (const m of matches) {
    const parsed = parseCurrency(m);
    if (parsed !== null) numbers.push(parsed);
  }
  return numbers;
}

function extractAllDates(text: string): string[] {
  const dates: string[] = [];
  const patterns = [
    /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g,
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const parsed = parseDate(match[0]);
      if (parsed) dates.push(parsed);
    }
  }
  return dates;
}

function findAmountNear(text: string, searchTerms: string[], maxDistance: number = 300): number | null {
  const lowerText = text.toLowerCase();
  for (const term of searchTerms) {
    const termLower = term.toLowerCase();
    let idx = lowerText.indexOf(termLower);
    while (idx !== -1) {
      const afterArea = text.substring(idx, idx + maxDistance);
      const amountMatch = afterArea.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (amountMatch) {
        const parsed = parseCurrency(amountMatch[1]);
        if (parsed !== null && parsed > 0) {
          return parsed;
        }
      }
      const standaloneMatch = afterArea.match(/(?:^|\s)([\d,]+\.\d{2})(?:\s|$)/m);
      if (standaloneMatch) {
        const parsed = parseCurrency(standaloneMatch[1]);
        if (parsed !== null && parsed > 0) {
          return parsed;
        }
      }
      idx = lowerText.indexOf(termLower, idx + 1);
    }
  }
  return null;
}

function findDateNear(text: string, searchTerms: string[], maxDistance: number = 300): string | null {
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

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function parseBrokerInfoFooter(footerText: string): ExtractedContactInfo[] {
  const contacts: ExtractedContactInfo[] = [];
  const lines = footerText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  const skipPatterns = [
    /^TXR\s*1601/i,
    /^Produced with/i,
    /^TREC NO/i,
    /^\d+$/,
    /^X$/,
    /^DocuSign/i,
    /^\d+\s+of\s+\d+/,
    /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
    /^\d+%$/,
  ];

  const filteredLines: string[] = [];
  for (const line of lines) {
    const shouldSkip = skipPatterns.some(p => p.test(line));
    if (!shouldSkip) {
      filteredLines.push(line);
    }
  }

  const addressLine = filteredLines.find(l =>
    /\d+\s+[A-Za-z].*(?:Dr|St|Ave|Blvd|Ln|Rd|Ct|Way|Pl|Main)\b.*(?:Fort Worth|TX|Keller|Haslet|Dallas|Houston|Austin|Southlake)/i.test(l)
  );
  if (addressLine) {
    const idx = filteredLines.indexOf(addressLine);
    if (idx !== -1) filteredLines.splice(idx, 1);
  }

  const emailPhonePattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s*\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
  const phonePattern = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/;
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const licenseNumberPattern = /\d{6,7}$/;
  const brokeragePattern = /(?:realty|team|group|llc|inc|corp|associates|properties|real\s*estate|dba\s)/i;

  let buyerBrokerage = "";
  let buyerAgentName = "";
  let buyerAgentEmail = "";
  let buyerAgentPhone = "";

  let listingBrokerage = "";
  let listingAgentName = "";
  let listingAgentEmail = "";
  let listingAgentPhone = "";

  let section: "unknown" | "first" | "second" = "unknown";
  let foundFirstBrokerage = false;
  let foundSecondBrokerage = false;

  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];

    if (brokeragePattern.test(line) && licenseNumberPattern.test(line)) {
      if (!foundFirstBrokerage) {
        buyerBrokerage = line.replace(/\s*\d{6,7}\s*$/, "").trim();
        foundFirstBrokerage = true;
        section = "first";
        continue;
      } else if (!foundSecondBrokerage) {
        listingBrokerage = line.replace(/\s*\d{6,7}\s*$/, "").trim();
        foundSecondBrokerage = true;
        section = "second";
        continue;
      }
    }

    const emailPhoneMatch = line.match(emailPhonePattern);
    if (emailPhoneMatch) {
      const email = line.match(emailPattern)?.[0] || "";
      const phone = line.match(phonePattern)?.[0] || "";
      if (section === "first" && !buyerAgentEmail) {
        buyerAgentEmail = email;
        buyerAgentPhone = phone;
      } else if (section === "second" && !listingAgentEmail) {
        listingAgentEmail = email;
        listingAgentPhone = phone;
      }
      continue;
    }

    if (licenseNumberPattern.test(line) && !brokeragePattern.test(line)) {
      const name = line.replace(/\s*\d{6,7}\s*$/, "").trim();
      if (name.length > 2 && name.length < 50) {
        if (section === "first" && !buyerAgentName) {
          buyerAgentName = name;
        } else if (section === "second" && !listingAgentName) {
          listingAgentName = name;
        }
      }
      continue;
    }

    if (/^[A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?$/.test(line) && line.length < 40) {
      continue;
    }

    const cityStateZip = /^[A-Za-z]+\s+[A-Za-z]{2}\s+\d{5}/;
    if (cityStateZip.test(line)) {
      continue;
    }
    if (phonePattern.test(line) && !emailPattern.test(line)) {
      continue;
    }
  }

  if (!foundFirstBrokerage && !foundSecondBrokerage) {
    let brokerageCount = 0;
    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];
      if (brokeragePattern.test(line)) {
        brokerageCount++;
        if (brokerageCount === 1) {
          section = "first";
          buyerBrokerage = line.trim();
        } else if (brokerageCount === 2) {
          section = "second";
          listingBrokerage = line.trim();
        }
      }

      const ep = line.match(emailPhonePattern);
      if (ep) {
        const email = line.match(emailPattern)?.[0] || "";
        const phone = line.match(phonePattern)?.[0] || "";
        if (section === "first" && !buyerAgentEmail) {
          buyerAgentEmail = email;
          buyerAgentPhone = phone;
        } else if (section === "second" && !listingAgentEmail) {
          listingAgentEmail = email;
          listingAgentPhone = phone;
        }
      }
    }
  }

  if (listingAgentName || listingAgentEmail) {
    const { firstName, lastName } = splitName(listingAgentName);
    contacts.push({
      role: "Listing Agent",
      firstName,
      lastName,
      email: listingAgentEmail,
      phone: listingAgentPhone,
      brokerage: listingBrokerage,
    });
  }

  if (buyerAgentName || buyerAgentEmail) {
    const { firstName, lastName } = splitName(buyerAgentName);
    contacts.push({
      role: "Buyer Agent",
      firstName,
      lastName,
      email: buyerAgentEmail,
      phone: buyerAgentPhone,
      brokerage: buyerBrokerage,
    });
  }

  return contacts;
}

function parseTRECForm(text: string, pages: string[]): ExtractedContractData {
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
    extractedContacts: [],
    rawTextPreview: text,
  };

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const footer = extractPageFooterBlock(page);
    const footerNumbers = extractAllNumbers(footer);
    const footerDates = extractAllDates(footer);
    const lowerPage = page.toLowerCase();

    if (lowerPage.includes("sales price") && lowerPage.includes("cash portion")) {
      if (footerNumbers.length >= 3) {
        extracted.contractPrice = footerNumbers[footerNumbers.length - 1];
        if (footerNumbers.length >= 2) {
          const sorted = [...footerNumbers].sort((a, b) => b - a);
          extracted.contractPrice = sorted[0];
        }
      } else if (footerNumbers.length === 1) {
        extracted.contractPrice = footerNumbers[0];
      }

      const footerLines = footer.split("\n").filter(l => l.trim().length > 0);
      const nameLines: string[] = [];
      const skipFooter = /TXR|TREC|Produced|zipForm|DocuSign|Envelope|Lone Wolf|www\./i;
      const brokerLine = /REALTY|LLC|INC|TEAM|GROUP|BROKERAGE|DBA/i;
      const numericOnly = /^[\d,.\s$%X]+$/;
      const addressLike = /\d+\s+\w+.*(?:Dr|St|Ave|Blvd|Ln|Rd|Ct|Way|Pl|Main)\b/i;
      for (const line of footerLines) {
        const trimmed = line.trim();
        if (trimmed.length < 3 || trimmed.length > 80) continue;
        if (skipFooter.test(trimmed)) continue;
        if (brokerLine.test(trimmed)) continue;
        if (numericOnly.test(trimmed)) continue;
        if (addressLike.test(trimmed)) continue;
        if (/^\d{5}/.test(trimmed)) continue;
        if (/^(Fort Worth|Tarrant|Dallas|Houston|Austin|Keller)/i.test(trimmed)) continue;
        if (/^(Phone|Fax|Email)/i.test(trimmed)) continue;
        if (/^[A-Z][a-z]/.test(trimmed) || /^[A-Z]{2,}/.test(trimmed)) {
          nameLines.push(trimmed);
        }
      }
      if (nameLines.length >= 2) {
        extracted.buyerName = nameLines[0];
        extracted.sellerName = nameLines[1];
      } else if (nameLines.length === 1) {
        extracted.buyerName = nameLines[0];
      }
    }

    if (lowerPage.includes("earnest money") && lowerPage.includes("option fee") && lowerPage.includes("delivery of earnest money")) {
      if (footerNumbers.length >= 2) {
        const sorted = [...footerNumbers].sort((a, b) => b - a);
        extracted.earnestMoney = sorted[0];
        extracted.optionFee = sorted[1];
      } else if (footerNumbers.length === 1) {
        extracted.earnestMoney = footerNumbers[0];
      }

      const optionDaysMatch = footer.match(/\b(\d{1,3})\b/);
      if (optionDaysMatch && parseInt(optionDaysMatch[1]) <= 30) {
        const days = parseInt(optionDaysMatch[1]);
        if (extracted.contractExecutionDate) {
          const execDate = new Date(extracted.contractExecutionDate);
          execDate.setDate(execDate.getDate() + days);
          extracted.optionPeriodExpiration = execDate.toISOString();
        }
      }
    }

    if (lowerPage.includes("closing") && lowerPage.includes("sale will be on or before")) {
      if (footerDates.length > 0) {
        extracted.closingDate = footerDates[0];
      }
      const footerLines = footer.split("\n").filter(l => l.trim().length > 0);
      for (const line of footerLines) {
        const dateMatch = line.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})/i);
        if (dateMatch) {
          const parsed = parseDate(dateMatch[1]);
          if (parsed) {
            extracted.closingDate = parsed;
            break;
          }
        }
        const numDateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        if (numDateMatch) {
          const parsed = parseDate(numDateMatch[1]);
          if (parsed) {
            extracted.closingDate = parsed;
            break;
          }
        }
      }
    }

    if (lowerPage.includes("executed the") && lowerPage.includes("effective date")) {
      if (footerDates.length > 0) {
        extracted.contractExecutionDate = footerDates[0];
      }
    }

    if (lowerPage.includes("seller concession") || lowerPage.includes("seller's concession") || lowerPage.includes("seller contribution")) {
      if (footerNumbers.length > 0) {
        for (const num of footerNumbers) {
          if (num > 100 && num < (extracted.contractPrice || Infinity)) {
            extracted.sellerConcessions = num;
            break;
          }
        }
      }
    }

    if (lowerPage.includes("broker information") && (lowerPage.includes("listing broker") || lowerPage.includes("other broker"))) {
      const brokerContacts = parseBrokerInfoFooter(footer);
      extracted.extractedContacts.push(...brokerContacts);
    }
  }

  if (!extracted.contractExecutionDate) {
    const topText = text.substring(0, 500);
    const topDate = topText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
    if (topDate) {
      extracted.contractExecutionDate = parseDate(topDate[1]);
    }
  }

  const normalizedText = text.replace(/\s+/g, " ");

  if (!extracted.contractPrice) {
    extracted.contractPrice = findAmountNear(normalizedText, [
      "Sales Price (Sum of A and B)",
      "Sales Price",
      "purchase price",
      "contract price",
    ]);
  }

  if (!extracted.earnestMoney) {
    extracted.earnestMoney = findAmountNear(normalizedText, [
      "as earnest money",
      "earnest money",
    ]);
  }

  if (!extracted.optionFee) {
    extracted.optionFee = findAmountNear(normalizedText, [
      "as the Option Fee",
      "option fee",
    ]);
  }

  if (!extracted.closingDate) {
    extracted.closingDate = findDateNear(normalizedText, [
      "closing date",
      "close on or before",
      "closing shall be",
    ]);
  }

  if (!extracted.contractExecutionDate) {
    extracted.contractExecutionDate = findDateNear(normalizedText, [
      "effective date",
      "execution date",
      "executed on",
    ]);
  }

  const financingSection = normalizedText.match(
    /(?:third\s*party\s*financing|financing\s*addendum|type\s*of\s*financing|loan\s*type)[^.]{0,500}/i
  );
  const financingText = financingSection ? financingSection[0] : normalizedText;

  if (/\b(?:cash\s*(?:purchase|sale|transaction)|all\s*cash|no\s*financing)\b/i.test(financingText)) {
    extracted.financing = "cash";
  } else if (/\bconventional\b/i.test(financingText)) {
    extracted.financing = "conventional";
  } else if (/\bFHA\b/.test(financingText)) {
    extracted.financing = "fha";
  } else if (/\bVA\b/.test(financingText) && /\b(?:loan|financing|mortgage)\b/i.test(financingText)) {
    extracted.financing = "va";
  } else if (/\bUSDA\b/i.test(financingText)) {
    extracted.financing = "usda";
  }

  if (!extracted.financing) {
    if (/\bFHA\b/.test(normalizedText) && !/FHA.*prohibit/i.test(normalizedText.substring(0, normalizedText.indexOf("FHA") + 200))) {
      const fhaContexts = normalizedText.match(/\bFHA\b/g) || [];
      const fhaInFinancing = normalizedText.match(/(?:third\s*party|financing|loan).*?\bFHA\b/i);
      if (fhaInFinancing || fhaContexts.length >= 3) {
        extracted.financing = "fha";
      }
    }
  }

  const mlsPatterns = [
    /MLS\s*(?:#|number|no\.?|num)?[:\s]*([A-Z0-9][A-Z0-9\-]{5,14})/i,
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

  if (!extracted.buyerName || !extracted.sellerName) {
    const partyPattern = /PARTIES[:\s].*?(?:contract\s*are)\s+(.+?)\s*\(Seller\)\s*and\s+(.+?)\s*\(Buyer\)/i;
    const partyMatch = normalizedText.match(partyPattern);
    if (partyMatch) {
      const seller = partyMatch[1].trim();
      const buyer = partyMatch[2].trim();
      if (!extracted.sellerName && seller.length > 2 && seller.length < 80) extracted.sellerName = seller;
      if (!extracted.buyerName && buyer.length > 2 && buyer.length < 80) extracted.buyerName = buyer;
    }
  }

  const addressMatch = normalizedText.match(
    /(?:known\s*as|property\s*address)[:\s]*(\d+[^,\n]{3,55})/i
  );
  if (addressMatch) {
    const addr = addressMatch[1].trim();
    if (addr.length > 5) {
      extracted.propertyAddress = addr;
    }
  }

  if (!extracted.propertyAddress) {
    const addrMatch = text.match(/(\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:Dr|St|Ave|Blvd|Ln|Rd|Ct|Cir|Way|Pl)\b[^,\n]*\d{5})/i);
    if (addrMatch) {
      extracted.propertyAddress = addrMatch[1].trim();
    }
  }

  function parseNameToContacts(rawName: string, role: string): ExtractedContactInfo[] {
    const results: ExtractedContactInfo[] = [];
    const parts = rawName.split(/,\s*/);

    if (parts.length >= 4 && parts.length % 2 === 0) {
      for (let j = 0; j < parts.length; j += 2) {
        results.push({
          role,
          firstName: parts[j + 1]?.trim() || "",
          lastName: parts[j]?.trim() || "",
          email: "",
          phone: "",
          brokerage: "",
        });
      }
    } else if (parts.length === 2) {
      results.push({
        role,
        firstName: parts[1].trim(),
        lastName: parts[0].trim(),
        email: "",
        phone: "",
        brokerage: "",
      });
    } else if (parts.length === 3) {
      results.push({
        role,
        firstName: parts[1].trim(),
        lastName: parts[0].trim(),
        email: "",
        phone: "",
        brokerage: "",
      });
    } else {
      const { firstName, lastName } = splitName(rawName);
      results.push({
        role,
        firstName,
        lastName,
        email: "",
        phone: "",
        brokerage: "",
      });
    }
    return results;
  }

  if (extracted.buyerName) {
    const hasExistingBuyer = extracted.extractedContacts.some(c => c.role === "Buyer");
    if (!hasExistingBuyer) {
      const buyerContacts = parseNameToContacts(extracted.buyerName, "Buyer");
      extracted.extractedContacts.unshift(...buyerContacts);
    }
  }

  if (extracted.sellerName) {
    const hasExistingSeller = extracted.extractedContacts.some(c => c.role === "Seller");
    if (!hasExistingSeller) {
      const sellerContacts = parseNameToContacts(extracted.sellerName, "Seller");
      extracted.extractedContacts.unshift(...sellerContacts);
    }
  }

  if (extracted.optionPeriodExpiration === null && extracted.contractExecutionDate) {
    const optionDaysMatch = normalizedText.match(
      /(\d{1,2})\s*days?\s*after\s*the\s*effective\s*date.*?option\s*period/i
    );
    if (!optionDaysMatch) {
      const altMatch = normalizedText.match(
        /option\s*period.*?(\d{1,2})\s*days?\s*after/i
      );
      if (altMatch) {
        const days = parseInt(altMatch[1]);
        if (days > 0 && days <= 30) {
          const execDate = new Date(extracted.contractExecutionDate);
          execDate.setDate(execDate.getDate() + days);
          extracted.optionPeriodExpiration = execDate.toISOString();
        }
      }
    } else {
      const days = parseInt(optionDaysMatch[1]);
      if (days > 0 && days <= 30) {
        const execDate = new Date(extracted.contractExecutionDate);
        execDate.setDate(execDate.getDate() + days);
        extracted.optionPeriodExpiration = execDate.toISOString();
      }
    }
  }

  return extracted;
}

export async function parseContract(buffer: Buffer): Promise<ExtractedContractData> {
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8 as any);
  await parser.load();
  const pdfResult = await parser.getText();
  const text = (pdfResult as any).text || "";

  const pages = splitPages(text);

  return parseTRECForm(text, pages);
}
