import { PDFDocument, StandardFonts } from "@cantoo/pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

/** Create a small PDF whose pages contain the given text lines. */
export async function makePdf(pageTexts: string[] = ["Hello PDF Stack"]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = doc.addPage([400, 400]);
    page.drawText(text, { x: 40, y: 300, size: 18, font });
  }
  doc.setTitle("Fixture title");
  doc.setAuthor("Fixture author");
  return doc.save();
}

/** Open a PDF with PDF.js (an independent implementation from pdf-lib). */
export function openWithPdfjs(bytes: Uint8Array, password?: string) {
  return pdfjs.getDocument({
    data: bytes.slice(),
    password,
    verbosity: 0,
  }).promise;
}

export async function extractText(bytes: Uint8Array, password?: string): Promise<string[]> {
  const doc = await openWithPdfjs(bytes, password);
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(""));
  }
  await doc.loadingTask.destroy();
  return pages;
}
