import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFImage } from "pdf-lib";

interface ExhibitItem {
  id: number;
  category: string;
  description: string;
  severity: string;
  location: string | null;
  pageNumber: number | null;
  hasPhoto: boolean;
}

interface TextBlock {
  text: string;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  roof: "Roof",
  plumbing: "Plumbing",
  electrical: "Electrical",
  hvac: "HVAC",
  foundation: "Foundation",
  exterior: "Exterior",
  interior: "Interior",
  appliances: "Appliances",
  other: "Other",
};

const SEVERITY_LABELS: Record<string, string> = {
  safety: "Safety Hazard",
  major: "Major",
  moderate: "Moderate",
  minor: "Minor",
};

function parseTextPositions(htmlContent: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const lineRegex = /<line xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)<\/line>/gs;
  let match;
  while ((match = lineRegex.exec(htmlContent)) !== null) {
    const wordTexts: string[] = [];
    const wordRegex = /<word xMin="[\d.]+" yMin="[\d.]+" xMax="[\d.]+" yMax="[\d.]+">(.*?)<\/word>/g;
    let wordMatch;
    const lineContent = match[5];
    while ((wordMatch = wordRegex.exec(lineContent)) !== null) {
      wordTexts.push(wordMatch[1]);
    }
    if (wordTexts.length > 0) {
      blocks.push({
        text: wordTexts.join(" "),
        xMin: parseFloat(match[1]),
        yMin: parseFloat(match[2]),
        xMax: parseFloat(match[3]),
        yMax: parseFloat(match[4]),
      });
    }
  }
  return blocks;
}

function findItemRegion(
  blocks: TextBlock[],
  description: string,
  pageWidthPt: number,
  pageHeightPt: number
): { yStart: number; yEnd: number } | null {
  const descWords = description.toLowerCase().split(/\s+/).slice(0, 6);
  if (descWords.length < 2) return null;

  const searchPhrase = descWords.join(" ");

  let bestMatchIdx = -1;
  let bestScore = 0;

  for (let i = 0; i < blocks.length; i++) {
    const blockText = blocks[i].text.toLowerCase();
    let score = 0;
    for (const word of descWords) {
      if (blockText.includes(word)) score++;
    }
    if (blockText.includes(searchPhrase.substring(0, Math.min(30, searchPhrase.length)))) {
      score += 5;
    }
    if (score > bestScore && score >= Math.min(3, descWords.length)) {
      bestScore = score;
      bestMatchIdx = i;
    }
  }

  if (bestMatchIdx === -1) return null;

  const matchY = blocks[bestMatchIdx].yMin;

  let sectionStart = matchY;
  let lastTextEnd = blocks[bestMatchIdx].yMax;

  for (let i = bestMatchIdx - 1; i >= 0; i--) {
    const gap = sectionStart - blocks[i].yMax;
    if (gap > 30) break;
    sectionStart = blocks[i].yMin;
    if (sectionStart <= matchY - 120) break;
  }

  for (let i = bestMatchIdx + 1; i < blocks.length; i++) {
    const gap = blocks[i].yMin - lastTextEnd;
    if (gap > 50) break;
    lastTextEnd = blocks[i].yMax;
    if (lastTextEnd >= matchY + 250) break;
  }

  let sectionEnd = lastTextEnd;
  let nextSectionStart = pageHeightPt;
  for (let i = bestMatchIdx + 1; i < blocks.length; i++) {
    if (blocks[i].yMin > lastTextEnd + 50) {
      nextSectionStart = blocks[i].yMin;
      break;
    }
  }

  const photoBuffer = Math.min(nextSectionStart - lastTextEnd, 350);
  sectionEnd = lastTextEnd + Math.max(photoBuffer, 150);

  const padding = 20;
  return {
    yStart: Math.max(0, sectionStart - padding),
    yEnd: Math.min(pageHeightPt, sectionEnd + padding),
  };
}

function renderPageImage(pdfPath: string, pageNum: number, transactionId: number, dpi: number = 250): string | null {
  const tmpDir = os.tmpdir();
  const outputPrefix = path.join(tmpDir, `exhibita-${transactionId}-p${pageNum}-${dpi}`);
  const outputFile = `${outputPrefix}.png`;

  if (fs.existsSync(outputFile)) return outputFile;

  try {
    execSync(
      `pdftoppm -png -r ${dpi} -singlefile -f ${pageNum} -l ${pageNum} "${pdfPath}" "${outputPrefix}"`,
      { timeout: 20000 }
    );
    if (fs.existsSync(outputFile)) return outputFile;
  } catch (err) {
    console.error(`[ExhibitA] Failed to render page ${pageNum}:`, err);
  }
  return null;
}

function cropImage(
  inputPath: string,
  outputPath: string,
  yStartPercent: number,
  yEndPercent: number
): boolean {
  try {
    const result = execSync(`magick identify -format "%w %h" "${inputPath}"`, { timeout: 5000 });
    const [imgW, imgH] = result.toString().trim().split(" ").map(Number);

    const cropY = Math.floor(imgH * yStartPercent);
    const cropH = Math.floor(imgH * (yEndPercent - yStartPercent));
    const safeH = Math.max(cropH, 100);

    execSync(
      `magick "${inputPath}" -crop ${imgW}x${safeH}+0+${cropY} +repage "${outputPath}"`,
      { timeout: 10000 }
    );
    return fs.existsSync(outputPath);
  } catch (err) {
    console.error("[ExhibitA] Image crop failed:", err);
    return false;
  }
}

function getPageTextPositions(pdfPath: string, pageNum: number): TextBlock[] {
  try {
    const result = execSync(
      `pdftotext -bbox-layout -f ${pageNum} -l ${pageNum} "${pdfPath}" -`,
      { timeout: 10000, maxBuffer: 5 * 1024 * 1024 }
    );
    return parseTextPositions(result.toString());
  } catch (err) {
    console.error(`[ExhibitA] pdftotext failed for page ${pageNum}:`, err);
    return [];
  }
}

function getPageDimensions(pdfPath: string, pageNum: number): { width: number; height: number } {
  try {
    const result = execSync(
      `pdftotext -bbox -f ${pageNum} -l ${pageNum} "${pdfPath}" -`,
      { timeout: 10000 }
    );
    const html = result.toString();
    const pageMatch = html.match(/page width="([\d.]+)" height="([\d.]+)"/);
    if (pageMatch) {
      return { width: parseFloat(pageMatch[1]), height: parseFloat(pageMatch[2]) };
    }
  } catch {}
  return { width: 612, height: 792 };
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export async function generateExhibitA(
  items: ExhibitItem[],
  pdfPath: string | null,
  transactionId: number,
  propertyAddress: string
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const MARGIN = 50;
  const CONTENT_W = PAGE_W - 2 * MARGIN;

  function addCoverPage() {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - 60;

    page.drawText("EXHIBIT A", {
      x: MARGIN,
      y,
      size: 28,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    page.drawText("Inspection Repair Requests", {
      x: MARGIN,
      y,
      size: 16,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 30;

    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 1.5,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 25;

    if (propertyAddress) {
      page.drawText("Property:", {
        x: MARGIN,
        y,
        size: 10,
        font: helveticaBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(propertyAddress, {
        x: MARGIN + 60,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 16;
    }

    page.drawText("Date:", {
      x: MARGIN,
      y,
      size: 10,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), {
      x: MARGIN + 60,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 16;

    page.drawText("Total Items:", {
      x: MARGIN,
      y,
      size: 10,
      font: helveticaBold,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(`${items.length}`, {
      x: MARGIN + 60,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 30;

    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });
    y -= 20;

    page.drawText("SUMMARY OF REPAIR REQUESTS", {
      x: MARGIN,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.15, 0.15, 0.15),
    });
    y -= 20;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (y < 80) {
        const nextPage = doc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - 60;
        addPageItems(nextPage, items.slice(i), y);
        return;
      }

      const numStr = `${i + 1}.`;
      page.drawText(numStr, {
        x: MARGIN,
        y,
        size: 10,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      const catSev = `[${CATEGORY_LABELS[item.category] || item.category}] [${SEVERITY_LABELS[item.severity] || item.severity}]`;
      page.drawText(catSev, {
        x: MARGIN + 20,
        y,
        size: 9,
        font: helveticaBold,
        color: rgb(0.4, 0.2, 0.1),
      });
      y -= 14;

      const descLines = wrapText(item.description, helvetica, 9, CONTENT_W - 20);
      for (const line of descLines) {
        if (y < 60) break;
        page.drawText(line, {
          x: MARGIN + 20,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= 12;
      }

      if (item.location) {
        page.drawText(`Location: ${item.location}`, {
          x: MARGIN + 20,
          y,
          size: 8,
          font: helveticaOblique,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 12;
      }

      if (item.pageNumber) {
        page.drawText(`Reference: Inspection Report Page ${item.pageNumber}`, {
          x: MARGIN + 20,
          y,
          size: 8,
          font: helveticaOblique,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 12;
      }

      y -= 8;
    }
  }

  function addPageItems(page: PDFPage, remainingItems: ExhibitItem[], startY: number) {
    let y = startY;
    for (let i = 0; i < remainingItems.length; i++) {
      const item = remainingItems[i];
      if (y < 80) {
        const nextPage = doc.addPage([PAGE_W, PAGE_H]);
        addPageItems(nextPage, remainingItems.slice(i), PAGE_H - 60);
        return;
      }

      const itemIndex = items.indexOf(item) + 1;
      const numStr = `${itemIndex}.`;
      page.drawText(numStr, {
        x: MARGIN,
        y,
        size: 10,
        font: helveticaBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      const catSev = `[${CATEGORY_LABELS[item.category] || item.category}] [${SEVERITY_LABELS[item.severity] || item.severity}]`;
      page.drawText(catSev, {
        x: MARGIN + 20,
        y,
        size: 9,
        font: helveticaBold,
        color: rgb(0.4, 0.2, 0.1),
      });
      y -= 14;

      const descLines = wrapText(item.description, helvetica, 9, CONTENT_W - 20);
      for (const line of descLines) {
        if (y < 60) break;
        page.drawText(line, {
          x: MARGIN + 20,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= 12;
      }

      if (item.location) {
        page.drawText(`Location: ${item.location}`, {
          x: MARGIN + 20,
          y,
          size: 8,
          font: helveticaOblique,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 12;
      }
      y -= 8;
    }
  }

  addCoverPage();

  if (pdfPath && fs.existsSync(pdfPath)) {
    const processedPages = new Map<number, { fullImage: string; dimensions: { width: number; height: number }; textBlocks: TextBlock[] }>();

    for (const item of items) {
      if (!item.pageNumber) continue;
      if (processedPages.has(item.pageNumber)) continue;

      const fullImage = renderPageImage(pdfPath, item.pageNumber, transactionId, 250);
      if (!fullImage) continue;

      const dimensions = getPageDimensions(pdfPath, item.pageNumber);
      const textBlocks = getPageTextPositions(pdfPath, item.pageNumber);

      processedPages.set(item.pageNumber, { fullImage, dimensions, textBlocks });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.pageNumber) continue;

      const pageData = processedPages.get(item.pageNumber);
      if (!pageData) continue;

      const page = doc.addPage([PAGE_W, PAGE_H]);
      let y = PAGE_H - 50;

      page.drawText(`Item ${i + 1}: ${CATEGORY_LABELS[item.category] || item.category}`, {
        x: MARGIN,
        y,
        size: 14,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 18;

      const sevLabel = SEVERITY_LABELS[item.severity] || item.severity;
      page.drawText(`Severity: ${sevLabel}`, {
        x: MARGIN,
        y,
        size: 10,
        font: helvetica,
        color: item.severity === "safety" ? rgb(0.8, 0, 0) : item.severity === "major" ? rgb(0.8, 0.4, 0) : rgb(0.4, 0.4, 0.4),
      });

      if (item.location) {
        const sevWidth = helvetica.widthOfTextAtSize(`Severity: ${sevLabel}`, 10);
        page.drawText(`  |  Location: ${item.location}`, {
          x: MARGIN + sevWidth,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.4, 0.4, 0.4),
        });
      }
      y -= 20;

      const descLines = wrapText(item.description, helvetica, 10, CONTENT_W);
      for (const line of descLines) {
        page.drawText(line, {
          x: MARGIN,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.15, 0.15, 0.15),
        });
        y -= 14;
      }
      y -= 10;

      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      y -= 10;

      const region = findItemRegion(
        pageData.textBlocks,
        item.description,
        pageData.dimensions.width,
        pageData.dimensions.height
      );

      let imageToEmbed: string | null = null;
      const tmpDir = os.tmpdir();

      if (region) {
        const yStartPct = region.yStart / pageData.dimensions.height;
        const yEndPct = region.yEnd / pageData.dimensions.height;

        const cropPath = path.join(tmpDir, `exhibita-crop-${transactionId}-item${item.id}.png`);
        const cropped = cropImage(pageData.fullImage, cropPath, yStartPct, yEndPct);
        if (cropped) {
          imageToEmbed = cropPath;
        }
      }

      if (!imageToEmbed) {
        page.drawText(`[See Inspection Report Page ${item.pageNumber}]`, {
          x: MARGIN,
          y: y - 20,
          size: 10,
          font: helveticaOblique,
          color: rgb(0.5, 0.5, 0.5),
        });
        continue;
      }

      try {
        const imgBytes = fs.readFileSync(imageToEmbed);
        const pngImage = await doc.embedPng(imgBytes);

        const imgAspect = pngImage.width / pngImage.height;
        const maxImgWidth = CONTENT_W;
        const maxImgHeight = y - 40;

        let drawWidth = maxImgWidth;
        let drawHeight = drawWidth / imgAspect;

        if (drawHeight > maxImgHeight) {
          drawHeight = maxImgHeight;
          drawWidth = drawHeight * imgAspect;
        }

        drawWidth = Math.min(drawWidth, maxImgWidth);
        drawHeight = Math.min(drawHeight, maxImgHeight);

        if (drawHeight > 50) {
          const imgX = MARGIN + (CONTENT_W - drawWidth) / 2;
          const imgY = y - drawHeight;

          page.drawRectangle({
            x: imgX - 2,
            y: imgY - 2,
            width: drawWidth + 4,
            height: drawHeight + 4,
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
            color: rgb(0.97, 0.97, 0.97),
          });

          page.drawImage(pngImage, {
            x: imgX,
            y: imgY,
            width: drawWidth,
            height: drawHeight,
          });

          y = imgY - 15;

          page.drawText(`Source: Inspection Report, Page ${item.pageNumber}`, {
            x: MARGIN,
            y,
            size: 8,
            font: helveticaOblique,
            color: rgb(0.5, 0.5, 0.5),
          });
        }
      } catch (imgErr) {
        console.error(`[ExhibitA] Failed to embed image for item ${item.id}:`, imgErr);
        page.drawText(`[See Inspection Report Page ${item.pageNumber}]`, {
          x: MARGIN,
          y: y - 20,
          size: 10,
          font: helveticaOblique,
          color: rgb(0.5, 0.5, 0.5),
        });
      }
    }
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
