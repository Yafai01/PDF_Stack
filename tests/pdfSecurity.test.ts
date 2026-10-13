import { describe, expect, it } from "vitest";
import { PDFDocument } from "@cantoo/pdf-lib";
import { PasswordResponses, PermissionFlag } from "pdfjs-dist/legacy/build/pdf.mjs";
import { encryptPdf, PdfAlreadyEncryptedError } from "../src/lib/pdfSecurity";
import { extractText, makePdf, openWithPdfjs } from "./helpers";

const base = { allowPrinting: true, allowCopying: false, allowModifying: false };

describe("encryptPdf", () => {
  it("produces an AES-256 encrypted PDF that cannot be opened without the password", async () => {
    const plain = await makePdf(["Top secret page"]);
    const encrypted = await encryptPdf(plain, { ...base, userPassword: "open-sesame", ownerPassword: "owner-pw" });

    const raw = new TextDecoder("latin1").decode(encrypted);
    expect(raw).toContain("/Encrypt");
    expect(raw).toContain("/AESV3"); // AES-256 crypt filter

    await expect(openWithPdfjs(encrypted)).rejects.toMatchObject({
      name: "PasswordException",
      code: PasswordResponses.NEED_PASSWORD,
    });
    await expect(openWithPdfjs(encrypted, "wrong")).rejects.toMatchObject({
      name: "PasswordException",
      code: PasswordResponses.INCORRECT_PASSWORD,
    });
    // pdf-lib also refuses to load it without decryption.
    await expect(PDFDocument.load(encrypted)).rejects.toThrow();
  });

  it("decrypts with the user password and the owner password", async () => {
    const plain = await makePdf(["Page one", "Page two"]);
    const encrypted = await encryptPdf(plain, { ...base, userPassword: "u-pass", ownerPassword: "o-pass" });

    expect(await extractText(encrypted, "u-pass")).toEqual(["Page one", "Page two"]);
    expect(await extractText(encrypted, "o-pass")).toEqual(["Page one", "Page two"]);
  });

  it("encodes the requested permissions", async () => {
    const plain = await makePdf();
    const restricted = await encryptPdf(plain, { ...base, userPassword: "pw", ownerPassword: "owner" });
    const doc = await openWithPdfjs(restricted, "pw");
    const perms = await doc.getPermissions();
    expect(perms).not.toBeNull();
    expect(perms!.has(PermissionFlag.PRINT)).toBe(true);
    expect(perms!.has(PermissionFlag.COPY)).toBe(false);
    expect(perms!.has(PermissionFlag.MODIFY_CONTENTS)).toBe(false);
    await doc.loadingTask.destroy();
  });

  it("generates a distinct owner password when none is given", async () => {
    const plain = await makePdf();
    const encrypted = await encryptPdf(plain, { ...base, userPassword: "only-user" });
    expect(await extractText(encrypted, "only-user")).toEqual(["Hello PDF Stack"]);
  });

  it("rejects an empty password", async () => {
    await expect(encryptPdf(await makePdf(), { ...base, userPassword: "" })).rejects.toThrow(/password/i);
  });

  it("refuses to re-encrypt an already encrypted PDF", async () => {
    const encrypted = await encryptPdf(await makePdf(), { ...base, userPassword: "a" });
    await expect(encryptPdf(encrypted, { ...base, userPassword: "b" })).rejects.toBeInstanceOf(
      PdfAlreadyEncryptedError
    );
  });
});
