import { PDFDocument, EncryptedPDFError } from "@cantoo/pdf-lib";

export interface EncryptOptions {
  /** Password required to open the document. */
  userPassword: string;
  /**
   * Password that grants full access and lifts the permission restrictions.
   * When omitted, a random owner password is generated so the restrictions
   * cannot be lifted by re-using the user password.
   */
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
}

export class PdfAlreadyEncryptedError extends Error {
  constructor() {
    super("This PDF is already password-protected. Remove the existing protection first.");
    this.name = "PdfAlreadyEncryptedError";
  }
}

function randomPassword(byteLength = 24): string {
  const bytes = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypt a PDF with the standard security handler using AES-256
 * (PDF 2.0 / ISO 32000-2, revision 6). Runs entirely client-side.
 */
export async function encryptPdf(
  input: ArrayBuffer | Uint8Array,
  options: EncryptOptions
): Promise<Uint8Array> {
  if (!options.userPassword) {
    throw new Error("A password is required to encrypt the document.");
  }

  let pdfDoc: PDFDocument;
  try {
    pdfDoc = await PDFDocument.load(input);
  } catch (err) {
    if (err instanceof EncryptedPDFError) throw new PdfAlreadyEncryptedError();
    throw err;
  }

  const ownerPassword = options.ownerPassword?.trim() ? options.ownerPassword : randomPassword();

  pdfDoc.encrypt({
    algorithm: "AES-256",
    userPassword: options.userPassword,
    ownerPassword,
    permissions: {
      printing: options.allowPrinting ? "highResolution" : false,
      copying: options.allowCopying,
      modifying: options.allowModifying,
      annotating: options.allowModifying,
      fillingForms: options.allowModifying,
      documentAssembly: options.allowModifying,
      // Keep text available to assistive technology regardless of copy permission.
      contentAccessibility: true,
    },
  });

  return pdfDoc.save();
}
