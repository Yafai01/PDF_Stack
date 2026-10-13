/**
 * Pure PDF operations built on pdf-lib. No DOM access here so the module can
 * be unit-tested in Node; browser-only helpers live in pdfUtils.ts.
 */
import {
  PDFDocument,
  PDFImage,
  rgb,
  degrees,
  StandardFonts,
  EncryptedPDFError,
} from "@cantoo/pdf-lib";
import type {
  WatermarkConfig,
  PageNumberConfig,
  SignaturePlacement,
  ImageToPdfConfig,
} from "../types";

export const PASSWORD_PROTECTED_MESSAGE =
  "This PDF is password-protected. Remove the password in a PDF reader first, then upload it again.";

/** Format bytes to a readable size string. */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : decimals))} ${sizes[i]}`;
}

/** Parse a hex colour (#rgb or #rrggbb) into a pdf-lib RGB colour. */
export function hexToRgb(hex: string) {
  let cleanHex = hex.replace("#", "");
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(cleanHex, 16);
  if (Number.isNaN(num)) return rgb(0, 0, 0);
  return rgb(((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255);
}

export function baseFileName(name: string): string {
  return name.replace(/\.pdf$/i, "");
}

/** Load a PDF, translating encryption errors into a user-facing message. */
export async function loadPdf(bytes: ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes);
  } catch (err) {
    if (err instanceof EncryptedPDFError) throw new Error(PASSWORD_PROTECTED_MESSAGE);
    throw err;
  }
}

/** Page count of a PDF; throws a readable error for encrypted/invalid files. */
export async function getPageCount(bytes: ArrayBuffer | Uint8Array): Promise<number> {
  const doc = await loadPdf(bytes);
  return doc.getPageCount();
}

/** Parse a page range string (e.g. "1, 3-5, 8") into sorted, 0-based indices. */
export function parsePageRanges(rangeStr: string, totalPages: number): number[] {
  const pageNumbers = new Set<number>();
  const parts = rangeStr.split(",").map((p) => p.trim());

  for (const part of parts) {
    if (!part) continue;
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(part);
    if (rangeMatch) {
      let start = parseInt(rangeMatch[1], 10);
      let end = parseInt(rangeMatch[2], 10);
      if (start > end) [start, end] = [end, start];
      if (end < 1 || start > totalPages) continue;
      start = Math.max(1, start);
      end = Math.min(totalPages, end);
      for (let i = start; i <= end; i++) pageNumbers.add(i - 1);
    } else if (/^\d+$/.test(part)) {
      const num = parseInt(part, 10);
      if (num >= 1 && num <= totalPages) pageNumbers.add(num - 1);
    }
  }

  return Array.from(pageNumbers).sort((a, b) => a - b);
}

/** Merge multiple PDFs (or subsets of their pages) into one document. */
export async function mergePdfs(
  fileItems: { arrayBuffer: ArrayBuffer; selectedPages?: number[] }[]
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const item of fileItems) {
    const srcDoc = await loadPdf(item.arrayBuffer);
    const pageIndices =
      item.selectedPages && item.selectedPages.length > 0 ? item.selectedPages : srcDoc.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return mergedPdf.save();
}

/** Extract the pages in `rangeStr` into a new PDF. */
export async function splitPdf(
  arrayBuffer: ArrayBuffer,
  rangeStr: string
): Promise<{ blob: Uint8Array; pageCount: number }> {
  const srcDoc = await loadPdf(arrayBuffer);
  const selectedIndices = parsePageRanges(rangeStr, srcDoc.getPageCount());
  if (selectedIndices.length === 0) return { blob: new Uint8Array(), pageCount: 0 };

  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, selectedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  return { blob: await newDoc.save(), pageCount: copiedPages.length };
}

/** Reorder, rotate, duplicate or delete pages. */
export async function processPageArrangement(
  arrayBuffer: ArrayBuffer,
  pageArrangement: { originalIndex: number; rotation: number }[]
): Promise<Uint8Array> {
  const srcDoc = await loadPdf(arrayBuffer);
  const newDoc = await PDFDocument.create();

  for (const item of pageArrangement) {
    const [copiedPage] = await newDoc.copyPages(srcDoc, [item.originalIndex]);
    if (item.rotation) {
      const currentRotation = copiedPage.getRotation().angle;
      copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
    }
    newDoc.addPage(copiedPage);
  }

  return newDoc.save();
}

/**
 * pdf-lib rotates around the draw origin (bottom-left). Return the origin that
 * makes a box of size w x h rotated by `angleDeg` stay centred on (cx, cy).
 */
export function originForCenteredRotation(cx: number, cy: number, w: number, h: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return {
    x: cx - (w / 2) * cos + (h / 2) * sin,
    y: cy - (w / 2) * sin - (h / 2) * cos,
  };
}

async function embedImageFromDataUrl(pdfDoc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  if (dataUrl.startsWith("data:image/png")) return pdfDoc.embedPng(dataUrl);
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return pdfDoc.embedJpg(dataUrl);
  }
  throw new Error("Only PNG and JPEG images are supported.");
}

/** Stamp a text or image watermark on every page. */
export async function addWatermarkToPdf(arrayBuffer: ArrayBuffer, config: WatermarkConfig): Promise<Uint8Array> {
  const pdfDoc = await loadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const color = hexToRgb(config.colorHex || "#94a3b8");

  let embeddedImg: PDFImage | null = null;
  if (config.type === "image") {
    if (!config.imageDataUrl) throw new Error("Choose a PNG or JPEG image for the watermark.");
    embeddedImg = await embedImageFromDataUrl(pdfDoc, config.imageDataUrl);
  } else if (!config.text.trim()) {
    throw new Error("Enter the watermark text.");
  }

  for (const page of pages) {
    const { width, height } = page.getSize();
    const angle =
      config.position === "diagonal" ? (Math.atan2(height, width) * 180) / Math.PI : config.rotationDegrees;

    let boxW: number;
    let boxH: number;
    let draw: (x: number, y: number) => void;

    if (embeddedImg) {
      const img = embeddedImg;
      boxW = Math.min(180, width * 0.4);
      boxH = (img.height / img.width) * boxW;
      draw = (x, y) =>
        page.drawImage(img, { x, y, width: boxW, height: boxH, opacity: config.opacity, rotate: degrees(angle) });
    } else {
      const fontSize = config.fontSize || 40;
      boxW = font.widthOfTextAtSize(config.text, fontSize);
      boxH = font.heightAtSize(fontSize, { descender: false });
      draw = (x, y) =>
        page.drawText(config.text, { x, y, size: fontSize, font, color, opacity: config.opacity, rotate: degrees(angle) });
    }

    const centers: { cx: number; cy: number }[] = [];
    if (config.position === "grid") {
      const stepX = boxW + 80;
      const stepY = boxH + 120;
      for (let cx = boxW / 2 + 20; cx < width; cx += stepX) {
        for (let cy = boxH / 2 + 20; cy < height; cy += stepY) centers.push({ cx, cy });
      }
    } else if (config.position === "top-left") {
      centers.push({ cx: 40 + boxW / 2, cy: height - 40 - boxH / 2 });
    } else if (config.position === "bottom-right") {
      centers.push({ cx: width - 40 - boxW / 2, cy: 40 + boxH / 2 });
    } else {
      centers.push({ cx: width / 2, cy: height / 2 });
    }

    for (const { cx, cy } of centers) {
      const { x, y } = originForCenteredRotation(cx, cy, boxW, boxH, angle);
      draw(x, y);
    }
  }

  return pdfDoc.save();
}

export function formatPageLabel(config: PageNumberConfig, pageNum: number, total: number): string {
  switch (config.format) {
    case "page_x":
      return `Page ${pageNum}`;
    case "x_slash_y":
      return `${pageNum} / ${total}`;
    case "custom":
      return (config.customText || "{page}")
        .split("{page}")
        .join(String(pageNum))
        .split("{total}")
        .join(String(total));
    default:
      return `Page ${pageNum} of ${total}`;
  }
}

/** Add page numbers / footer text. */
export async function addPageNumbersToPdf(arrayBuffer: ArrayBuffer, config: PageNumberConfig): Promise<Uint8Array> {
  const pdfDoc = await loadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const color = hexToRgb(config.colorHex || "#475569");
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    const pageNum = i + 1;
    if (pageNum < config.startFromPage) continue;

    const page = pages[i];
    const { width, height } = page.getSize();
    const text = formatPageLabel(config, pageNum, total);

    let textWidth: number;
    try {
      textWidth = font.widthOfTextAtSize(text, config.fontSize);
    } catch {
      throw new Error("The page label contains characters the built-in font cannot display. Use plain Latin text.");
    }
    const margin = config.marginPt || 30;

    let x = (width - textWidth) / 2;
    let y = margin;
    if (config.position.includes("left")) x = margin;
    else if (config.position.includes("right")) x = width - textWidth - margin;
    if (config.position.startsWith("top")) y = height - margin - config.fontSize;

    page.drawText(text, { x, y, size: config.fontSize, font, color });
  }

  return pdfDoc.save();
}

/**
 * Overlay signature images. Placement ratios describe the centre of the
 * signature box relative to the page (0..1, origin top-left), matching the
 * on-screen preview.
 */
export async function applySignaturesToPdf(
  arrayBuffer: ArrayBuffer,
  signatures: SignaturePlacement[]
): Promise<Uint8Array> {
  const pdfDoc = await loadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    if (sig.pageIndex < 0 || sig.pageIndex >= pages.length) continue;
    const page = pages[sig.pageIndex];
    const { width, height } = page.getSize();
    const img = await embedImageFromDataUrl(pdfDoc, sig.dataUrl);

    // Preserve the image aspect ratio inside the placement box.
    const scale = Math.min(sig.widthPt / img.width, sig.heightPt / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const cx = sig.xRatio * width;
    const cy = (1 - sig.yRatio) * height;

    page.drawImage(img, {
      x: Math.min(Math.max(0, cx - drawW / 2), width - drawW),
      y: Math.min(Math.max(0, cy - drawH / 2), height - drawH),
      width: drawW,
      height: drawH,
    });
  }

  return pdfDoc.save();
}

export interface ImageInput {
  bytes: Uint8Array | ArrayBuffer;
  /** "png" or "jpeg"; other formats must be converted before calling. */
  format: "png" | "jpeg";
}

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

/** Build a PDF with one page per image. */
export async function imagesToPdf(images: ImageInput[], config: ImageToPdfConfig): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const image of images) {
    const embeddedImg =
      image.format === "png" ? await pdfDoc.embedPng(image.bytes) : await pdfDoc.embedJpg(image.bytes);
    const margin = config.marginPt;

    let pageWidth: number;
    let pageHeight: number;
    if (config.pageSize === "fit") {
      pageWidth = embeddedImg.width + margin * 2;
      pageHeight = embeddedImg.height + margin * 2;
    } else {
      const [w, h] = PAGE_SIZES[config.pageSize];
      const landscape =
        config.orientation === "landscape" ||
        (config.orientation === "auto" && embeddedImg.width > embeddedImg.height);
      pageWidth = landscape ? h : w;
      pageHeight = landscape ? w : h;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;

    let drawWidth = availableWidth;
    let drawHeight = availableHeight;
    if (config.fitMode === "contain") {
      const scale = Math.min(availableWidth / embeddedImg.width, availableHeight / embeddedImg.height);
      drawWidth = embeddedImg.width * scale;
      drawHeight = embeddedImg.height * scale;
    }

    page.drawImage(embeddedImg, {
      x: margin + (availableWidth - drawWidth) / 2,
      y: margin + (availableHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return pdfDoc.save();
}
