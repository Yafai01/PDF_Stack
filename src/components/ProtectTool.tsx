import React, { useState } from "react";
import { Lock } from "lucide-react";
import type { PdfFileItem, ProtectConfig } from "../types";
import { encryptPdf } from "../lib/pdfSecurity";
import { baseFileName, downloadPdfBlob, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, Label, Panel, PanelHeader, Section, inputClass } from "./ui";

interface ProtectToolProps {
  fileItems: PdfFileItem[];
}

const PERMISSIONS: { key: "allowPrinting" | "allowCopying" | "allowModifying"; label: string }[] = [
  { key: "allowPrinting", label: "Allow printing" },
  { key: "allowCopying", label: "Allow copying text and images" },
  { key: "allowModifying", label: "Allow editing, annotations and form filling" },
];

export const ProtectTool: React.FC<ProtectToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [doneName, setDoneName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [config, setConfig] = useState<ProtectConfig>({
    userPassword: "",
    ownerPassword: "",
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  });

  if (!activeFile) return null;

  const mismatch = confirmPassword.length > 0 && confirmPassword !== config.userPassword;
  const ownerSameAsUser = Boolean(config.ownerPassword) && config.ownerPassword === config.userPassword;
  const canSubmit = Boolean(config.userPassword) && confirmPassword === config.userPassword && !ownerSameAsUser;

  const handleProtectPdf = async () => {
    if (!canSubmit) return;
    setIsProcessing(true);
    setError("");
    setDoneName("");
    try {
      const encryptedBytes = await encryptPdf(activeFile.arrayBuffer, config);
      const name = `${baseFileName(activeFile.name)}_protected.pdf`;
      downloadPdfBlob(encryptedBytes, name);
      setDoneName(name);
    } catch (err) {
      setError(errorMessage(err, "Could not encrypt this PDF."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Password protection"
        description={
          <>
            Encrypts <span className="font-medium text-slate-700">{activeFile.name}</span> with AES-256 in your
            browser. The password is never sent anywhere.
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section title="Passwords">
          <div className="space-y-3">
            <div>
              <Label htmlFor="input-user-password">Password to open the PDF</Label>
              <input
                id="input-user-password"
                type="password"
                autoComplete="new-password"
                value={config.userPassword}
                onChange={(e) => setConfig((prev) => ({ ...prev, userPassword: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="input-confirm-password">Confirm password</Label>
              <input
                id="input-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={mismatch}
                aria-describedby={mismatch ? "password-mismatch" : undefined}
                className={inputClass}
              />
              {mismatch && (
                <p id="password-mismatch" className="text-xs text-red-700 mt-1">
                  Passwords do not match.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="input-owner-password">Owner password (optional)</Label>
              <input
                id="input-owner-password"
                type="password"
                autoComplete="new-password"
                value={config.ownerPassword}
                onChange={(e) => setConfig((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                aria-describedby="owner-password-help"
                className={inputClass}
              />
              <p id="owner-password-help" className="text-xs text-slate-500 mt-1">
                Lifts the restrictions below. Must differ from the open password. If left empty, a random one is
                generated and the restrictions cannot be lifted later.
              </p>
              {ownerSameAsUser && (
                <p className="text-xs text-red-700 mt-1">The owner password must be different from the open password.</p>
              )}
            </div>
          </div>
        </Section>

        <Section title="Permissions after opening">
          <div className="space-y-2.5">
            {PERMISSIONS.map((perm) => (
              <label key={perm.key} className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[perm.key]}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [perm.key]: e.target.checked }))}
                  id={`chk-permission-${perm.key}`}
                  className="w-4 h-4 accent-blue-600"
                />
                {perm.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">
            Permission flags are honoured by mainstream PDF readers but are advisory: anyone who can open the file can
            in principle bypass them with specialised tools. The open password itself is real encryption.
          </p>
        </Section>
      </div>

      <div className="mt-4 space-y-3">
        {error && <Alert tone="error">{error}</Alert>}
        {doneName && (
          <Alert tone="success">
            Downloaded <span className="font-medium">{doneName}</span>. Keep the password safe: it cannot be recovered.
          </Alert>
        )}
      </div>

      <ActionBar>
        <Button
          variant="primary"
          onClick={handleProtectPdf}
          disabled={!canSubmit}
          loading={isProcessing}
          icon={<Lock className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-protect"
        >
          {isProcessing ? "Encrypting" : "Encrypt and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
