import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import type {
  WatermarkConfig,
  PageNumberConfig,
  SignaturePlacement,
  ImageToPdfConfig,
} from "../types";

// Configure pdfjs worker source via CDN matching installed or compatible version
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

/**
 * Format bytes to readable size string
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Helper to parse hex color to pdf-lib RGB (0-1)
 */
export function hexToRgb(hex: string) {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  return rgb(
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  );
}

/**
 * Load PDF page count and validation
 */
export async function getPdfInfo(file: File): Promise<{
  arrayBuffer: ArrayBuffer;
  pageCount: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  return {
    arrayBuffer,
    pageCount: pdfDoc.getPageCount(),
  };
}

/**
 * Render canvas thumbnail for pages using pdfjs-dist
 */
export async function generatePageThumbnails(
  arrayBuffer: ArrayBuffer,
  maxPages = 50,
  scale = 0.35
): Promise<string[]> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    const pdf = await loadingTask.promise;
    const count = Math.min(pdf.numPages, maxPages);
    const thumbnails: string[] = [];

    for (let i = 1; i <= count; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await (page as any).render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;
        thumbnails.push(canvas.toDataURL("image/jpeg", 0.75));
      } else {
        thumbnails.push("");
      }
    }
    return thumbnails;
  } catch (err) {
    console.warn("Failed to generate PDF thumbnails with pdfjs:", err);
    return [];
  }
}

/**
 * Extract text from all pages using pdfjs
 */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    return fullText;
  } catch (err) {
    console.error("Text extraction failed:", err);
    return "Error extracting text from PDF.";
  }
}

/**
 * Merge multiple PDFs or specific page subsets into one PDF document
 */
export async function mergePdfs(
  fileItems: { arrayBuffer: ArrayBuffer; selectedPages?: number[] }[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const item of fileItems) {
    const srcDoc = await PDFDocument.load(item.arrayBuffer, { ignoreEncryption: true });
    const pageIndices =
      item.selectedPages && item.selectedPages.length > 0
        ? item.selectedPages
        : srcDoc.getPageIndices();

    const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Parse page range string (e.g., "1, 3-5, 8") into 0-indexed numbers
 */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const pageNumbers = new Set<number>();
  const parts = rangeStr.split(",").map((p) => p.trim());

  for (const part of parts) {
    if (!part) continue;
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-");
      let start = parseInt(startStr, 10);
      let end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        start = Math.max(1, Math.min(start, totalPages));
        end = Math.max(1, Math.min(end, totalPages));
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          pageNumbers.add(i - 1);
        }
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        pageNumbers.add(num - 1);
      }
    }
  }

  return Array.from(pageNumbers).sort((a, b) => a - b);
}

/**
 * Split PDF by page range or create individual files
 */
export async function splitPdf(
  arrayBuffer: ArrayBuffer,
  rangeStr: string
): Promise<{ blob: Uint8Array; pageCount: number }> {
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const selectedIndices = parsePageRanges(rangeStr, totalPages);

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(
    srcDoc,
    selectedIndices.length > 0 ? selectedIndices : srcDoc.getPageIndices()
  );
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  return { blob: pdfBytes, pageCount: copiedPages.length };
}

/**
 * Reorder, rotate, or delete pages from a PDF
 */
export async function processPageArrangement(
  arrayBuffer: ArrayBuffer,
  pageArrangement: { originalIndex: number; rotation: number }[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const newDoc = await PDFDocument.create();

  for (const item of pageArrangement) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
    if (item.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
    }
    newDoc.addPage(copiedPage);
  }

  return await newDoc.save();
}

/**
 * Add text or image watermark to PDF pages
 */
export async function addWatermarkToPdf(
  arrayBuffer: ArrayBuffer,
  config: WatermarkConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const color = hexToRgb(config.colorHex || "#94a3b8");

  let embeddedImg: any = null;
  if (config.type === "image" && config.imageDataUrl) {
    try {
      if (config.imageDataUrl.includes("image/png")) {
        embeddedImg = await pdfDoc.embedPng(config.imageDataUrl);
      } else {
        embeddedImg = await pdfDoc.embedJpg(config.imageDataUrl);
      }
    } catch (e) {
      console.warn("Could not embed watermark image:", e);
    }
  }

  for (const page of pages) {
    const { width, height } = page.getSize();

    if (config.type === "text" && config.text) {
      const text = config.text;
      const fontSize = config.fontSize || 40;
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      if (config.position === "grid") {
        const stepX = textWidth + 100;
        const stepY = textHeight + 100;
        for (let x = 50; x < width; x += stepX) {
          for (let y = 50; y < height; y += stepY) {
            page.drawText(text, {
              x,
              y,
              size: fontSize,
              font,
              color,
              opacity: config.opacity,
              rotate: degrees(config.rotationDegrees),
            });
          }
        }
      } else {
        let x = (width - textWidth) / 2;
        let y = (height - textHeight) / 2;

        if (config.position === "top-left") {
          x = 40;
          y = height - 60;
        } else if (config.position === "bottom-right") {
          x = width - textWidth - 40;
          y = 40;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          font,
          color,
          opacity: config.opacity,
          rotate: degrees(config.rotationDegrees),
        });
      }
    } else if (config.type === "image" && embeddedImg) {
      const imgWidth = 180;
      const imgHeight = (embeddedImg.height / embeddedImg.width) * imgWidth;
      let x = (width - imgWidth) / 2;
      let y = (height - imgHeight) / 2;

      if (config.position === "top-left") {
        x = 40;
        y = height - imgHeight - 40;
      } else if (config.position === "bottom-right") {
        x = width - imgWidth - 40;
        y = 40;
      }

      page.drawImage(embeddedImg, {
        x,
        y,
        width: imgWidth,
        height: imgHeight,
        opacity: config.opacity,
        rotate: degrees(config.rotationDegrees),
      });
    }
  }

  return await pdfDoc.save();
}

/**
 * Add Page Numbers or Header/Footer to PDF
 */
export async function addPageNumbersToPdf(
  arrayBuffer: ArrayBuffer,
  config: PageNumberConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const color = hexToRgb(config.colorHex || "#475569");
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1;
    if (pageNum < config.startFromPage) continue;

    const page = pages[i];
    const { width, height } = page.getSize();

    let text = `Page ${pageNum} of ${total}`;
    if (config.format === "page_x") text = `Page ${pageNum}`;
    else if (config.format === "x_slash_y") text = `${pageNum} / ${total}`;
    else if (config.format === "custom" && config.customText) {
      text = config.customText
        .replace("{page}", pageNum.toString())
        .replace("{total}", total.toString());
    }

    const textWidth = font.widthOfTextAtSize(text, config.fontSize);
    const margin = config.marginPt || 30;

    let x = (width - textWidth) / 2; // default center
    let y = margin; // default bottom

    if (config.position.includes("left")) x = margin;
    else if (config.position.includes("right")) x = width - textWidth - margin;

    if (config.position.startsWith("top")) y = height - margin - config.fontSize;

    page.drawText(text, {
      x,
      y,
      size: config.fontSize,
      font,
      color,
    });
  }

  return await pdfDoc.save();
}

/**
 * Overlay digital signature onto PDF pages
 */
export async function applySignaturesToPdf(
  arrayBuffer: ArrayBuffer,
  signatures: SignaturePlacement[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    if (sig.pageIndex < 0 || sig.pageIndex >= pages.length) continue;
    const page = pages[sig.pageIndex];
    const { width, height } = page.getSize();

    try {
      const isPng = sig.dataUrl.includes("image/png");
      const img = isPng
        ? await pdfDoc.embedPng(sig.dataUrl)
        : await pdfDoc.embedJpg(sig.dataUrl);

      const targetX = sig.xRatio * width;
      const targetY = (1 - sig.yRatio) * height - sig.heightPt;

      page.drawImage(img, {
        x: Math.max(0, targetX),
        y: Math.max(0, targetY),
        width: sig.widthPt,
        height: sig.heightPt,
      });
    } catch (e) {
      console.error("Failed to embed signature image:", e);
    }
  }

  return await pdfDoc.save();
}

/**
 * Convert Image files to a compiled PDF document
 */
export async function imagesToPdf(
  imageFiles: File[],
  config: ImageToPdfConfig
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const file of imageFiles) {
    const arrayBuf = await file.arrayBuffer();
    let embeddedImg: any;

    if (file.type.includes("png")) {
      embeddedImg = await pdfDoc.embedPng(arrayBuf);
    } else {
      embeddedImg = await pdfDoc.embedJpg(arrayBuf);
    }

    let pageWidth = 595.28; // A4 portrait width in points
    let pageHeight = 841.89; // A4 portrait height in points

    if (config.pageSize === "letter") {
      pageWidth = 612;
      pageHeight = 792;
    } else if (config.pageSize === "fit") {
      pageWidth = embeddedImg.width + config.marginPt * 2;
      pageHeight = embeddedImg.height + config.marginPt * 2;
    }

    if (config.orientation === "landscape") {
      const temp = pageWidth;
      pageWidth = pageHeight;
      pageHeight = temp;
    } else if (config.orientation === "auto" && embeddedImg.width > embeddedImg.height) {
      pageWidth = 841.89;
      pageHeight = 595.28;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const availableWidth = pageWidth - config.marginPt * 2;
    const availableHeight = pageHeight - config.marginPt * 2;

    const scale = Math.min(
      availableWidth / embeddedImg.width,
      availableHeight / embeddedImg.height
    );

    const drawWidth = embeddedImg.width * scale;
    const drawHeight = embeddedImg.height * scale;

    const x = config.marginPt + (availableWidth - drawWidth) / 2;
    const y = config.marginPt + (availableHeight - drawHeight) / 2;

    page.drawImage(embeddedImg, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return await pdfDoc.save();
}

/**
 * Convert PDF pages to PNG image Data URLs using pdfjs
 */
export async function pdfToImages(
  arrayBuffer: ArrayBuffer,
  scale = 1.5
): Promise<{ pageIndex: number; dataUrl: string }[]> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) });
  const pdf = await loadingTask.promise;
  const results: { pageIndex: number; dataUrl: string }[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await (page as any).render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      }).promise;
      results.push({
        pageIndex: i - 1,
        dataUrl: canvas.toDataURL("image/png"),
      });
    }
  }

  return results;
}

/**
 * Utility to trigger client-side download of Uint8Array as PDF file
 */
export function downloadPdfBlob(data: Uint8Array, filename: string) {
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
