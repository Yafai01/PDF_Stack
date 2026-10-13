import { describe, expect, it } from "vitest";
import { PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFDict } from "@cantoo/pdf-lib";
import { compressPdf, type JpegReencoder } from "../src/lib/pdfCompress";
import { encryptPdf, PdfAlreadyEncryptedError } from "../src/lib/pdfSecurity";
import { extractText, makePdf } from "./helpers";

/** A PDF with a large, uncompressed (no /Filter) content stream. */
async function makeUncompressedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 400]);
  const font = await doc.embedFont("Helvetica");
  page.drawText("Searchable text survives", { x: 20, y: 380, size: 12, font });
  const ops = Array.from({ length: 400 }, (_, i) => `0.5 0.5 0.5 rg ${i % 400} 10 5 5 re f`).join("\n");
  const stream = doc.context.stream(ops); // no Filter
  const ref = doc.context.register(stream);
  page.node.addContentStream(ref);
  return doc.save({ useObjectStreams: false });
}

/** Register a fake DCT image XObject (its bytes are opaque to the compressor). */
function addFakeJpeg(doc: PDFDocument, colorSpace: string, size: number) {
  const dict = doc.context.obj({
    Type: "XObject",
    Subtype: "Image",
    Width: 1000,
    Height: 800,
    ColorSpace: colorSpace,
    BitsPerComponent: 8,
    Filter: "DCTDecode",
  }) as PDFDict;
  return doc.context.register(PDFRawStream.of(dict, new Uint8Array(size).fill(7)));
}

describe("compressPdf", () => {
  it("deflates uncompressed streams, keeps text intact and reports real sizes", async () => {
    const input = await makeUncompressedPdf();
    const result = await compressPdf(input);

    expect(result.originalSize).toBe(input.byteLength);
    expect(result.outputSize).toBe(result.bytes.byteLength);
    expect(result.streamsDeflated).toBeGreaterThan(0);
    expect(result.outputSize).toBeLessThan(result.originalSize);
    expect(result.isSmaller).toBe(true);

    const [text] = await extractText(result.bytes);
    expect(text).toContain("Searchable text survives");
  });

  it("removes document metadata only when requested", async () => {
    const input = await makePdf(["Meta"]);
    const stripped = await PDFDocument.load((await compressPdf(input, { removeMetadata: true })).bytes);
    expect(stripped.getTitle()).toBeUndefined();
    expect(stripped.getAuthor()).toBeUndefined();

    const kept = await PDFDocument.load((await compressPdf(input, { removeMetadata: false })).bytes);
    expect(kept.getTitle()).toBe("Fixture title");
  });

  it("reports isSmaller from the real output size", async () => {
    // An already compact file may not shrink; the flag must reflect reality.
    const input = await makePdf(["x"]);
    const result = await compressPdf(input, { removeMetadata: false });
    expect(result.isSmaller).toBe(result.outputSize < result.originalSize);
  });

  it("re-encodes RGB JPEG images and skips CMYK ones", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const rgbRef = addFakeJpeg(doc, "DeviceRGB", 50_000);
    const cmykRef = addFakeJpeg(doc, "DeviceCMYK", 50_000);
    const input = await doc.save();

    const calls: number[] = [];
    const reencoder: JpegReencoder = async (bytes, w, h) => {
      calls.push(bytes.length);
      return { bytes: new Uint8Array(5_000), width: Math.round(w / 2), height: Math.round(h / 2) };
    };
    const result = await compressPdf(input, { reencodeJpeg: reencoder });
    expect(result.imagesReencoded).toBe(1);
    expect(calls).toHaveLength(1);

    const out = await PDFDocument.load(result.bytes);
    const rgb = out.context.lookup(rgbRef) as PDFRawStream;
    expect(rgb.getContents().length).toBe(5_000);
    expect((rgb.dict.lookup(PDFName.of("Width")) as PDFNumber).asNumber()).toBe(500);
    expect((rgb.dict.lookup(PDFName.of("Length")) as PDFNumber).asNumber()).toBe(5_000);
    const cmyk = out.context.lookup(cmykRef) as PDFRawStream;
    expect(cmyk.getContents().length).toBe(50_000);
  });

  it("keeps the original image when the re-encode is not meaningfully smaller", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const ref = addFakeJpeg(doc, "DeviceRGB", 10_000);
    const input = await doc.save();
    const result = await compressPdf(input, {
      reencodeJpeg: async () => ({ bytes: new Uint8Array(9_800), width: 1000, height: 800 }),
    });
    expect(result.imagesReencoded).toBe(0);
    const out = await PDFDocument.load(result.bytes);
    expect((out.context.lookup(ref) as PDFRawStream).getContents().length).toBe(10_000);
  });

  it("rejects encrypted input with a clear error", async () => {
    const encrypted = await encryptPdf(await makePdf(), {
      userPassword: "pw",
      allowPrinting: true,
      allowCopying: true,
      allowModifying: true,
    });
    await expect(compressPdf(encrypted)).rejects.toBeInstanceOf(PdfAlreadyEncryptedError);
  });
});
