export interface ParsedInspectionItem {
  category: string;
  description: string;
  severity: string;
  location: string;
}

const SECTION_HEADERS: Record<string, string> = {
  roof: "roof",
  roofing: "roof",
  plumbing: "plumbing",
  "plumbing system": "plumbing",
  "water heater": "plumbing",
  electrical: "electrical",
  "electrical system": "electrical",
  "electrical panel": "electrical",
  wiring: "electrical",
  hvac: "hvac",
  "heating": "hvac",
  "cooling": "hvac",
  "air conditioning": "hvac",
  "heating and cooling": "hvac",
  "hvac system": "hvac",
  foundation: "foundation",
  "structural": "foundation",
  "structure": "foundation",
  "foundation and structure": "foundation",
  exterior: "exterior",
  "exterior walls": "exterior",
  "siding": "exterior",
  "grading": "exterior",
  "drainage": "exterior",
  interior: "interior",
  "interior walls": "interior",
  "walls": "interior",
  "ceilings": "interior",
  "floors": "interior",
  "doors": "interior",
  "windows": "interior",
  appliances: "appliances",
  "appliance": "appliances",
  "kitchen appliances": "appliances",
  "built-in appliances": "appliances",
  garage: "exterior",
  "garage door": "exterior",
  attic: "roof",
  "attic space": "roof",
  insulation: "interior",
  "ventilation": "hvac",
  fireplace: "interior",
  "chimney": "roof",
  bathroom: "plumbing",
  "bathrooms": "plumbing",
  kitchen: "interior",
  "laundry": "plumbing",
  "crawl space": "foundation",
  "basement": "foundation",
  pool: "exterior",
  "swimming pool": "exterior",
  "spa": "exterior",
  "deck": "exterior",
  "patio": "exterior",
  "fence": "exterior",
  "driveway": "exterior",
  "walkway": "exterior",
  "landscape": "exterior",
  "sprinkler": "exterior",
  "irrigation": "exterior",
  "gutters": "roof",
  "downspouts": "roof",
};

const DEFICIENCY_PATTERNS = [
  /deficien(?:t|cy)/i,
  /needs?\s+repair/i,
  /recommend(?:ed|s|ation)?\s+(?:that|repair|replac|servic|evaluat|further)/i,
  /damaged/i,
  /cracked/i,
  /leaking/i,
  /leak(?:s|ed)?\b/i,
  /replace(?:ment)?\s+(?:is\s+)?(?:needed|recommended|required)/i,
  /broken/i,
  /not\s+function(?:ing|al)/i,
  /safety\s+hazard/i,
  /maintenance\s+item/i,
  /inoperable/i,
  /deteriorat(?:ed|ing)/i,
  /corrod(?:ed|ing)/i,
  /corrosi(?:on|ve)/i,
  /rusted/i,
  /missing/i,
  /loose/i,
  /improper(?:ly)?/i,
  /inadequate/i,
  /worn/i,
  /moisture\s+(?:damage|intrusion|stain)/i,
  /water\s+(?:damage|stain|intrusion|penetration)/i,
  /mold/i,
  /rot(?:ted|ting)?\b/i,
  /pest\s+damage/i,
  /termite/i,
  /wood\s+(?:destroying|damage)/i,
  /fire\s+hazard/i,
  /code\s+violation/i,
  /not\s+(?:up\s+to|to)\s+code/i,
  /trip(?:ping)?\s+hazard/i,
  /needs?\s+(?:attention|service|maintenance)/i,
  /should\s+be\s+(?:repaired|replaced|serviced|evaluated|inspected)/i,
  /failed/i,
  /failing/i,
  /end\s+of\s+(?:useful\s+)?life/i,
  /past\s+(?:its?\s+)?(?:useful\s+)?life/i,
  /gap(?:s|ping)?\b/i,
  /separation/i,
  /settling/i,
  /sagging/i,
  /bowing/i,
  /warped/i,
  /discolored/i,
  /stain(?:ed|ing|s)?\b/i,
  /peeling/i,
  /flaking/i,
  /bubbling/i,
  /exposed\s+wir(?:e|ing)/i,
  /no\s+gfci/i,
  /no\s+ground/i,
  /double[\s-]?tapped/i,
  /reverse(?:d)?\s+polarity/i,
  /open\s+ground/i,
  /open\s+neutral/i,
];

const SAFETY_KEYWORDS = [
  /safety\s+hazard/i,
  /fire\s+hazard/i,
  /immediate(?:ly)?\s+(?:danger|hazard|risk|repair)/i,
  /dangerous/i,
  /health\s+(?:hazard|risk|concern)/i,
  /carbon\s+monoxide/i,
  /gas\s+leak/i,
  /electr(?:ic(?:al)?|ocution)\s+(?:hazard|shock|risk)/i,
  /exposed\s+wir(?:e|ing)/i,
  /no\s+gfci/i,
  /double[\s-]?tapped/i,
  /reverse(?:d)?\s+polarity/i,
  /open\s+ground/i,
  /open\s+neutral/i,
  /trip(?:ping)?\s+hazard/i,
  /code\s+violation/i,
  /not\s+(?:up\s+to|to)\s+code/i,
  /mold/i,
  /asbestos/i,
  /radon/i,
  /lead\s+paint/i,
];

const MAJOR_KEYWORDS = [
  /foundation/i,
  /structural/i,
  /roof\s+replac/i,
  /major\s+(?:repair|damage|issue|concern)/i,
  /significant\s+(?:damage|deteriorat|issue|concern)/i,
  /extensive\s+(?:damage|repair|deteriorat)/i,
  /replac(?:e|ement)\s+(?:needed|required|recommended)/i,
  /end\s+of\s+(?:useful\s+)?life/i,
  /past\s+(?:its?\s+)?(?:useful\s+)?life/i,
  /failing/i,
  /failed/i,
  /settling/i,
  /sagging/i,
  /bowing/i,
  /water\s+(?:damage|intrusion|penetration)/i,
  /termite/i,
  /wood\s+(?:destroying|damage)/i,
  /sewer/i,
  /main\s+line/i,
  /rot(?:ted|ting)?\b/i,
];

const MINOR_KEYWORDS = [
  /cosmetic/i,
  /minor\s+(?:repair|issue|concern|damage)/i,
  /small\s+(?:crack|gap|stain|chip)/i,
  /touch[\s-]?up/i,
  /paint(?:ing)?\s+(?:needed|recommended|required)/i,
  /caulk(?:ing)?\s+(?:needed|recommended|required|missing|deteriorat)/i,
  /weatherstrip/i,
  /peeling\s+paint/i,
  /discolor/i,
  /stain(?:ed|s)?\b/i,
  /normal\s+wear/i,
  /maintenance\s+item/i,
  /routine\s+maintenance/i,
];

function classifySeverity(text: string): string {
  const lower = text.toLowerCase();

  for (const pattern of SAFETY_KEYWORDS) {
    if (pattern.test(lower)) return "safety";
  }

  for (const pattern of MAJOR_KEYWORDS) {
    if (pattern.test(lower)) return "major";
  }

  for (const pattern of MINOR_KEYWORDS) {
    if (pattern.test(lower)) return "minor";
  }

  return "moderate";
}

function detectCategory(text: string): string {
  const lower = text.toLowerCase().trim();

  for (const [header, category] of Object.entries(SECTION_HEADERS)) {
    if (lower.startsWith(header) || lower.includes(header)) {
      return category;
    }
  }

  return "other";
}

function detectSectionCategory(sectionHeader: string): string {
  const lower = sectionHeader.toLowerCase().trim()
    .replace(/^[\d.]+\s*/, "")
    .replace(/[:\-–—]/g, "")
    .trim();

  for (const [header, category] of Object.entries(SECTION_HEADERS)) {
    if (lower === header || lower.startsWith(header) || lower.includes(header)) {
      return category;
    }
  }

  return "other";
}

function isDeficiencyLine(text: string): boolean {
  for (const pattern of DEFICIENCY_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function cleanDescription(text: string): string {
  return text
    .replace(/^\s*[-•●○◦▪▸►■□☐☑✓✗✘×]\s*/gm, "")
    .replace(/^\s*\d+[.)]\s*/gm, "")
    .replace(/^\s*[a-z][.)]\s*/gmi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractLocation(text: string): string {
  const locationPatterns = [
    /(?:in\s+(?:the\s+)?|at\s+(?:the\s+)?|near\s+(?:the\s+)?)((?:master\s+)?(?:bedroom|bathroom|kitchen|living\s+room|dining\s+room|family\s+room|laundry\s+room|utility\s+room|garage|attic|basement|crawl\s+space|hallway|foyer|entry|porch|patio|deck|balcony)(?:\s+\d+)?)/i,
    /(?:north|south|east|west|front|rear|back|left|right|side)\s+(?:side|wall|elevation|yard|porch|entry)/i,
    /(?:first|second|third|1st|2nd|3rd|upper|lower|main)\s+(?:floor|level|story)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return "";
}

function splitIntoSections(text: string): Array<{ header: string; content: string }> {
  const sectionPattern = /^(?:\d+[.)]\s*)?([A-Z][A-Z\s/&-]{2,40})(?:\s*[:\-–—]|\s*$)/gm;
  const sections: Array<{ header: string; content: string; startIdx: number }> = [];
  let match;

  while ((match = sectionPattern.exec(text)) !== null) {
    const header = match[1].trim();
    const headerLower = header.toLowerCase();

    const skipHeaders = [
      "table of contents", "summary", "introduction", "disclaimer",
      "scope of inspection", "general information", "client information",
      "property information", "inspector", "report", "page", "appendix",
      "glossary", "definitions", "limitations", "standards of practice",
    ];
    if (skipHeaders.some(s => headerLower.includes(s))) continue;

    const category = detectSectionCategory(header);
    if (category !== "other" || Object.keys(SECTION_HEADERS).some(h => headerLower.includes(h))) {
      sections.push({
        header: header,
        content: "",
        startIdx: match.index + match[0].length,
      });
    }
  }

  for (let i = 0; i < sections.length; i++) {
    const endIdx = i + 1 < sections.length ? sections[i + 1].startIdx - (sections[i + 1].header.length + 5) : text.length;
    sections[i].content = text.substring(sections[i].startIdx, endIdx);
  }

  return sections.map(s => ({ header: s.header, content: s.content }));
}

function extractItemsFromSection(
  sectionHeader: string,
  sectionContent: string,
  category: string
): ParsedInspectionItem[] {
  const items: ParsedInspectionItem[] = [];
  const sentences = sectionContent
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  let currentDeficiency = "";

  for (const sentence of sentences) {
    if (isDeficiencyLine(sentence)) {
      if (currentDeficiency) {
        const desc = cleanDescription(currentDeficiency);
        if (desc.length > 10) {
          items.push({
            category,
            description: desc,
            severity: classifySeverity(desc),
            location: extractLocation(desc) || sectionHeader,
          });
        }
      }
      currentDeficiency = sentence;
    } else if (currentDeficiency) {
      if (sentence.length < 200) {
        currentDeficiency += " " + sentence;
      } else {
        const desc = cleanDescription(currentDeficiency);
        if (desc.length > 10) {
          items.push({
            category,
            description: desc,
            severity: classifySeverity(desc),
            location: extractLocation(desc) || sectionHeader,
          });
        }
        currentDeficiency = "";
      }
    }
  }

  if (currentDeficiency) {
    const desc = cleanDescription(currentDeficiency);
    if (desc.length > 10) {
      items.push({
        category,
        description: desc,
        severity: classifySeverity(desc),
        location: extractLocation(desc) || sectionHeader,
      });
    }
  }

  return items;
}

function extractItemsFromBulletList(text: string): ParsedInspectionItem[] {
  const items: ParsedInspectionItem[] = [];
  const bulletPattern = /^\s*[-•●○◦▪▸►■□☐☑✓✗✘×]\s*(.+)$/gm;
  let match;

  while ((match = bulletPattern.exec(text)) !== null) {
    const line = match[1].trim();
    if (isDeficiencyLine(line) && line.length > 10) {
      const desc = cleanDescription(line);
      const category = detectCategory(desc);
      items.push({
        category,
        description: desc,
        severity: classifySeverity(desc),
        location: extractLocation(desc),
      });
    }
  }

  return items;
}

function extractFromDeficiencySummary(text: string): ParsedInspectionItem[] {
  const items: ParsedInspectionItem[] = [];

  const summaryPatterns = [
    /(?:deficienc(?:y|ies)|repair|action)\s*(?:summary|list|items)[:\s]*\n([\s\S]*?)(?:\n{3,}|$)/gi,
    /(?:items?\s+(?:needing|requiring)\s+(?:repair|attention|action))[:\s]*\n([\s\S]*?)(?:\n{3,}|$)/gi,
    /(?:recommended\s+repairs?|repair\s+recommendations?)[:\s]*\n([\s\S]*?)(?:\n{3,}|$)/gi,
  ];

  for (const pattern of summaryPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const summaryBlock = match[1];
      const lines = summaryBlock.split("\n").map(l => l.trim()).filter(l => l.length > 10);
      for (const line of lines) {
        if (isDeficiencyLine(line)) {
          const desc = cleanDescription(line);
          if (desc.length > 10) {
            const category = detectCategory(desc);
            items.push({
              category,
              description: desc,
              severity: classifySeverity(desc),
              location: extractLocation(desc),
            });
          }
        }
      }
    }
  }

  return items;
}

function deduplicateItems(items: ParsedInspectionItem[]): ParsedInspectionItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.description.toLowerCase().substring(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseInspectionReport(text: string): ParsedInspectionItem[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const allItems: ParsedInspectionItem[] = [];

  const sections = splitIntoSections(text);
  for (const section of sections) {
    const category = detectSectionCategory(section.header);
    const sectionItems = extractItemsFromSection(section.header, section.content, category);
    allItems.push(...sectionItems);
  }

  const bulletItems = extractItemsFromBulletList(text);
  allItems.push(...bulletItems);

  const summaryItems = extractFromDeficiencySummary(text);
  allItems.push(...summaryItems);

  if (allItems.length === 0) {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 10);
    for (const line of lines) {
      if (isDeficiencyLine(line)) {
        const desc = cleanDescription(line);
        if (desc.length > 10) {
          const category = detectCategory(desc);
          allItems.push({
            category,
            description: desc,
            severity: classifySeverity(desc),
            location: extractLocation(desc),
          });
        }
      }
    }
  }

  return deduplicateItems(allItems);
}

export async function parseInspectionPdf(buffer: Buffer): Promise<ParsedInspectionItem[]> {
  const { PDFParse } = await import("pdf-parse");
  const uint8 = new Uint8Array(buffer);
  const parser = new PDFParse(uint8 as any);
  const pdfResult = await parser.getText();
  const text = (pdfResult as any).text || "";
  return parseInspectionReport(text);
}
