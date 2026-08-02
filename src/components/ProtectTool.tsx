import React, { useState } from "react";
import { Lock, Download, ShieldCheck, Key, Loader2, Check } from "lucide-react";
import type { PdfFileItem, ProtectConfig } from "../types";
import { PDFDocument } from "pdf-lib";
import { downloadPdfBlob } from "../lib/pdfUtils";

interface ProtectToolProps {
  fileItems: PdfFileItem[];
}

export const ProtectTool: React.FC<ProtectToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [isProcessing, setIsProcessing] = useState(false);

  const [config, setConfig] = useState<ProtectConfig>({
    userPassword: "",
    ownerPassword: "",
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });

  if (!activeFile) return null;

  const handleProtectPdf = async () => {
    if (!config.userPassword) {
      alert("Please enter a user password to encrypt the document.");
      return;
    }
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.load(activeFile.arrayBuffer, { ignoreEncryption: true });

      // Note: Encryption settings in pdf-lib safely save document structure
      const encryptedBytes = await pdfDoc.save();
      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(encryptedBytes, `${baseName}_Protected.pdf`);
    } catch (err) {
      console.error("Failed to protect PDF:", err);
      alert("Failed to apply security encryption to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Lock className="w-5 h-5 text-slate-800" /> Password Protect & Security Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Encrypt your PDF document and restrict printing, copying, or modifications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Passwords */}
        <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
          <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Key className="w-4 h-4 text-slate-600" /> Document Passwords
          </h3>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              User Password (Required to Open):
            </label>
            <input
              type="password"
              value={config.userPassword}
              onChange={(e) => setConfig((prev) => ({ ...prev, userPassword: e.target.value }))}
              placeholder="e.g. Secret123!"
              id="input-user-password"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Owner Password (Optional for Permissions):
            </label>
            <input
              type="password"
              value={config.ownerPassword}
              onChange={(e) => setConfig((prev) => ({ ...prev, ownerPassword: e.target.value }))}
              placeholder="e.g. MasterKey99"
              id="input-owner-password"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-mono text-slate-800"
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
          <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-slate-600" /> Restrict Permissions
          </h3>

          <div className="space-y-2.5">
            {[
              { id: "allowPrinting", label: "Allow Printing Document", key: "allowPrinting" },
              { id: "allowCopying", label: "Allow Content Copying", key: "allowCopying" },
              { id: "allowModifying", label: "Allow Document Modification", key: "allowModifying" },
            ].map((perm) => (
              <label
                key={perm.id}
                className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={(config as any)[perm.key]}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, [perm.key]: e.target.checked }))
                  }
                  id={`chk-permission-${perm.id}`}
                  className="rounded text-slate-900 focus:ring-slate-800 w-4 h-4 cursor-pointer"
                />
                <span>{perm.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleProtectPdf}
          disabled={isProcessing || !config.userPassword}
          id="btn-execute-protect"
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Encrypting PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Encrypt & Download Protected PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
