import { describe, expect, it } from "vitest";
import { PDFDocument } from "@cantoo/pdf-lib";
import {
  formatBytes,
  formatPageLabel,
  mergePdfs,
  originForCenteredRotation,
  parsePageRanges,
  splitPdf,
  addPageNumbersToPdf,
  PASSWORD_PROTECTED_MESSAGE,
  getPageCount,
} from "../src/lib/pdfOps";
import { encryptPdf } from "../src/lib/pdfSecurity";
import { extractText, makePdf } from "./helpers";
import type { PageNumberConfig } from "../src/types";

const toBuffer = (u8: Uint8Array) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;

describe("parsePageRanges", () => {
  it("parses single pages and ranges into sorted 0-based indices", () => {
    expect(parsePageRanges("1, 3-5, 8", 10)).toEqual([0, 2, 3, 4, 7]);
  });
  it("clamps ranges and ignores junk or out-of-range pages", () => {
    expect(parsePageRanges("0, 9-20, abc, 4-2, 50", 10)).toEqual([1, 2, 3, 8, 9]);
    expect(parsePageRanges("", 3)).toEqual([]);
    expect(parsePageRanges("12-15", 10)).toEqual([]);
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });
});

describe("formatPageLabel", () => {
  it("replaces every placeholder occurrence", () => {
    const cfg = { format: "custom", customText: "{page}/{total} - p{page}" } as PageNumberConfig;
    expect(formatPageLabel(cfg, 2, 9)).toBe("2/9 - p2");
  });
});

describe("originForCenteredRotation", () => {
  it("returns the plain bottom-left origin when not rotated", () => {
    const o = originForCenteredRotation(100, 100, 40, 20, 0);
    expect(o.x).toBeCloseTo(80);
    expect(o.y).toBeCloseTo(90);
  });
  it("keeps the box centre fixed when rotated 90 degrees", () => {
    // Rotating (w=40,h=20) by 90deg: the box spans x in [cx-10, cx+10].
    const o = originForCenteredRotation(100, 100, 40, 20, 90);
    expect(o.x).toBeCloseTo(110);
    expect(o.y).toBeCloseTo(80);
  });
});

describe("merge / split / numbering", () => {
  it("merges selected pages in order", async () => {
    const a = await makePdf(["A1", "A2"]);
    const b = await makePdf(["B1", "B2", "B3"]);
    const merged = await mergePdfs([{ arrayBuffer: toBuffer(a), selectedPages: [1] }, { arrayBuffer: toBuffer(b) }]);
    expect(await extractText(merged)).toEqual(["A2", "B1", "B2", "B3"]);
  });

  it("splits a page range", async () => {
    const src = await makePdf(["P1", "P2", "P3"]);
    const { blob, pageCount } = await splitPdf(toBuffer(src), "2-3");
    expect(pageCount).toBe(2);
    expect(await extractText(blob)).toEqual(["P2", "P3"]);
  });

  it("returns zero pages for a range that matches nothing", async () => {
    const src = await makePdf(["P1"]);
    expect((await splitPdf(toBuffer(src), "5")).pageCount).toBe(0);
  });

  it("adds page numbers", async () => {
    const src = await makePdf(["One", "Two"]);
    const out = await addPageNumbersToPdf(toBuffer(src), {
      position: "bottom-center",
      format: "page_x_of_y",
      fontSize: 10,
      colorHex: "#334155",
      marginPt: 30,
      startFromPage: 1,
    });
    const pages = await extractText(out);
    expect(pages[1]).toContain("Page 2 of 2");
    expect((await PDFDocument.load(out)).getPageCount()).toBe(2);
  });

  it("reports password-protected uploads clearly", async () => {
    const enc = await encryptPdf(await makePdf(), {
      userPassword: "x",
      allowPrinting: true,
      allowCopying: true,
      allowModifying: true,
    });
    await expect(getPageCount(enc)).rejects.toThrow(PASSWORD_PROTECTED_MESSAGE);
  });
});
