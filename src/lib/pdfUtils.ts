/**
 * Browser-only PDF helpers (rendering via PDF.js, downloads, image decoding).
 * Pure pdf-lib operations live in pdfOps.ts and are re-exported here.
 */
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getPageCount, type ImageInput } from "./pdfOps";

export * from "./pdfOps";

// Use the worker that ships with the installed pdfjs-dist version (bundled by
// Vite) so the API and worker versions always match.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

function openWithPdfjs(arrayBuffer: ArrayBuffer) {
  // PDF.js transfers the buffer to the worker, so always hand it a copy.
  return pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
}

/** Read a file and validate it as an unencrypted PDF. */
export async function getPdfInfo(file: File): Promise<{ arrayBuffer: ArrayBuffer; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pageCount = await getPageCount(arrayBuffer);
  return { arrayBuffer, pageCount };
}

async function renderPageToCanvas(pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number, scale: number) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvas, viewport }).promise;
  page.cleanup();
  return canvas;
}

/** Render JPEG thumbnails for the first `maxPages` pages. */
export async function generatePageThumbnails(arrayBuffer: ArrayBuffer, maxPages = 50, scale = 0.35): Promise<string[]> {
  try {
    const pdf = await openWithPdfjs(arrayBuffer);
    const count = Math.min(pdf.numPages, maxPages);
    const thumbnails: string[] = [];
    for (let i = 1; i <= count; i++) {
      const canvas = await renderPageToCanvas(pdf, i, scale);
      thumbnails.push(canvas.toDataURL("image/jpeg", 0.75));
    }
    await pdf.loadingTask.destroy();
    return thumbnails;
  } catch (err) {
    console.warn("Failed to generate PDF thumbnails:", err);
    return [];
  }
}

/** Extract plain text from all pages. Returns an empty string if the PDF has no text layer. */
export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await openWithPdfjs(arrayBuffer);
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .trim();
    if (pageText) fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }
  await pdf.loadingTask.destroy();
  return fullText;
}

/** Render every page to a PNG data URL. */
export async function pdfToImages(
  arrayBuffer: ArrayBuffer,
  scale = 1.5,
  onProgress?: (done: number, total: number) => void
): Promise<{ pageIndex: number; dataUrl: string }[]> {
  const pdf = await openWithPdfjs(arrayBuffer);
  const results: { pageIndex: number; dataUrl: string }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const canvas = await renderPageToCanvas(pdf, i, scale);
    results.push({ pageIndex: i - 1, dataUrl: canvas.toDataURL("image/png") });
    onProgress?.(i, pdf.numPages);
  }
  await pdf.loadingTask.destroy();
  return results;
}

/**
 * Prepare an image file for pdf-lib. PNG and JPEG are embedded as-is; other
 * browser-decodable formats (e.g. WebP) are converted to PNG via a canvas.
 */
export async function fileToImageInput(file: File): Promise<ImageInput> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") return { bytes, format: "png" };
  if (file.type === "image/jpeg") return { bytes, format: "jpeg" };

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error(`Could not convert ${file.name} to PNG.`);
  return { bytes: new Uint8Array(await blob.arrayBuffer()), format: "png" };
}

function triggerDownload(href: string, filename: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Download bytes as a PDF file. */
export function downloadPdfBlob(data: Uint8Array | ArrayBuffer, filename: string) {
  const blob = new Blob([data as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  // Revoke after the click has been handled; immediate revocation can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Download a data URL (e.g. a rendered PNG). */
export function downloadDataUrl(dataUrl: string, filename: string) {
  triggerDownload(dataUrl, filename);
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
