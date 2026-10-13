import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  EncryptedPDFError,
} from "@cantoo/pdf-lib";
import { PdfAlreadyEncryptedError } from "./pdfSecurity";

/** Result of re-encoding a single JPEG image. */
export interface ReencodedImage {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Re-encodes JPEG bytes (e.g. via a browser canvas). Returns null to leave the
 * image untouched. Injected so the core logic stays testable outside a browser.
 */
export type JpegReencoder = (
  jpegBytes: Uint8Array,
  width: number,
  height: number
) => Promise<ReencodedImage | null>;

export interface CompressOptions {
  /** Remove document info (title, author, producer...) and XMP metadata. */
  removeMetadata?: boolean;
  /** Deflate streams that are stored without any compression filter. */
  compressUncompressedStreams?: boolean;
  /** Optional lossy JPEG re-encoder. When omitted, images are left as-is. */
  reencodeJpeg?: JpegReencoder;
  /**
   * Only keep a re-encoded image if it is at most this fraction of the
   * original size (avoids churning images for negligible gains).
   */
  minImageSavingsRatio?: number;
}

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  outputSize: number;
  /** outputSize < originalSize */
  isSmaller: boolean;
  imagesReencoded: number;
  streamsDeflated: number;
}

const INFO_KEYS = ["Title", "Author", "Subject", "Keywords", "Creator", "Producer", "CreationDate", "ModDate"];

function nameOf(dict: PDFDict, key: string): string | undefined {
  const value = dict.lookup(PDFName.of(key));
  return value instanceof PDFName ? value.decodeText() : undefined;
}

function numberOf(dict: PDFDict, key: string): number | undefined {
  const value = dict.lookup(PDFName.of(key));
  return value instanceof PDFNumber ? value.asNumber() : undefined;
}

/**
 * Losslessly restructure a PDF (object streams, deflate of raw streams,
 * optional metadata removal) and optionally re-encode baseline JPEG images.
 *
 * Text and vector content are never rasterised. The caller decides what to do
 * when the result is not smaller than the original (see `isSmaller`).
 */
export async function compressPdf(
  input: ArrayBuffer | Uint8Array,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const originalSize = input.byteLength;
  const {
    removeMetadata = true,
    compressUncompressedStreams = true,
    reencodeJpeg,
    minImageSavingsRatio = 0.9,
  } = options;

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(input, { updateMetadata: false });
  } catch (err) {
    if (err instanceof EncryptedPDFError) throw new PdfAlreadyEncryptedError();
    throw err;
  }

  const context = pdfDoc.context;

  if (removeMetadata) {
    pdfDoc.catalog.delete(PDFName.of("Metadata"));
    const infoRef = context.trailerInfo.Info;
    const info = infoRef ? context.lookup(infoRef) : undefined;
    if (info instanceof PDFDict) {
      for (const key of INFO_KEYS) info.delete(PDFName.of(key));
    }
  }

  let imagesReencoded = 0;
  let streamsDeflated = 0;

  for (const [ref, obj] of context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const filter = dict.lookup(PDFName.of("Filter"));
    const subtype = nameOf(dict, "Subtype");
    const type = nameOf(dict, "Type");

    if (reencodeJpeg && subtype === "Image" && filter instanceof PDFName && filter.decodeText() === "DCTDecode") {
      const colorSpace = nameOf(dict, "ColorSpace");
      const bpc = numberOf(dict, "BitsPerComponent");
      const width = numberOf(dict, "Width");
      const height = numberOf(dict, "Height");
      const hasDecode = dict.has(PDFName.of("Decode"));
      // Only plain 8-bit RGB / Gray JPEGs: CMYK, ICC and inverted images are
      // left alone to avoid colour shifts.
      if (
        (colorSpace === "DeviceRGB" || colorSpace === "DeviceGray") &&
        bpc === 8 &&
        !hasDecode &&
        width &&
        height
      ) {
        const original = obj.getContents();
        try {
          const result = await reencodeJpeg(original, width, height);
          if (result && result.bytes.length <= original.length * minImageSavingsRatio) {
            dict.set(PDFName.of("Width"), PDFNumber.of(result.width));
            dict.set(PDFName.of("Height"), PDFNumber.of(result.height));
            // Canvas output is always RGB.
            dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
            dict.delete(PDFName.of("DecodeParms"));
            context.assign(ref, PDFRawStream.of(dict, result.bytes));
            imagesReencoded++;
          }
        } catch {
          // Undecodable image: keep the original bytes.
        }
      }
      continue;
    }

    if (compressUncompressedStreams && !filter && type !== "Metadata") {
      const raw = obj.getContents();
      if (raw.length < 64) continue;
      const deflated = context.flateStream(raw).getContents();
      if (deflated.length < raw.length) {
        dict.set(PDFName.of("Filter"), PDFName.of("FlateDecode"));
        dict.delete(PDFName.of("DecodeParms"));
        obj.updateContents(deflated);
        streamsDeflated++;
      }
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  return {
    bytes,
    originalSize,
    outputSize: bytes.byteLength,
    isSmaller: bytes.byteLength < originalSize,
    imagesReencoded,
    streamsDeflated,
  };
}

/**
 * Browser JPEG re-encoder: downsamples to `maxDimension` and re-encodes at the
 * given quality using an OffscreenCanvas/canvas.
 */
export function createCanvasJpegReencoder(quality: number, maxDimension: number): JpegReencoder {
  return async (jpegBytes, width, height) => {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(new Blob([jpegBytes as BlobPart], { type: "image/jpeg" }));
    try {
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetW = Math.max(1, Math.round(bitmap.width * scale));
      const targetH = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (!blob) return null;
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width: targetW, height: targetH };
    } finally {
      bitmap.close();
    }
  };
}
