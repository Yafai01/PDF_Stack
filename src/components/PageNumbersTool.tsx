import React, { useState } from "react";
import { Hash } from "lucide-react";
import type { PdfFileItem, PageNumberConfig } from "../types";
import { addPageNumbersToPdf, downloadPdfBlob, baseFileName, errorMessage, formatPageLabel } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, Label, Panel, PanelHeader, Section, Segmented, cx, inputClass } from "./ui";

interface PageNumbersToolProps {
  fileItems: PdfFileItem[];
}

const FORMATS: { value: PageNumberConfig["format"]; label: string }[] = [
  { value: "page_x_of_y", label: "Page 1 of 10" },
  { value: "page_x", label: "Page 1" },
  { value: "x_slash_y", label: "1 / 10" },
  { value: "custom", label: "Custom" },
];

const POSITIONS: { value: PageNumberConfig["position"]; label: string; slot: string }[] = [
  { value: "top-center", label: "Top center", slot: "col-start-2 row-start-1" },
  { value: "top-right", label: "Top right", slot: "col-start-3 row-start-1" },
  { value: "bottom-left", label: "Bottom left", slot: "col-start-1 row-start-3" },
  { value: "bottom-center", label: "Bottom center", slot: "col-start-2 row-start-3" },
  { value: "bottom-right", label: "Bottom right", slot: "col-start-3 row-start-3" },
];

export const PageNumbersTool: React.FC<PageNumbersToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<PageNumberConfig>({
    position: "bottom-center",
    format: "page_x_of_y",
    fontSize: 10,
    colorHex: "#334155",
    marginPt: 30,
    startFromPage: 1,
    customText: "Page {page} of {total}",
  });

  if (!activeFile) return null;

  const set = <K extends keyof PageNumberConfig>(key: K, value: PageNumberConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  const handleApply = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const bytes = await addPageNumbersToPdf(activeFile.arrayBuffer, config);
      downloadPdfBlob(bytes, `${baseFileName(activeFile.name)}_numbered.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not add page numbers."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Page number settings"
        description={
          <>
            Preview: <span className="font-medium text-slate-700">{formatPageLabel(config, config.startFromPage, activeFile.pageCount)}</span>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Section title="Format">
            <Segmented label="Number format" value={config.format} onChange={(v) => set("format", v)} options={FORMATS} />
            {config.format === "custom" && (
              <div className="mt-3">
                <Label htmlFor="input-custom-pagenum-pattern">Pattern</Label>
                <input
                  id="input-custom-pagenum-pattern"
                  type="text"
                  value={config.customText || ""}
                  onChange={(e) => set("customText", e.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use {"{page}"} and {"{total}"} as placeholders. Latin characters only.
                </p>
              </div>
            )}
          </Section>

          <Section>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slider-pagenum-fontsize">Font size: {config.fontSize} pt</Label>
                <input
                  id="slider-pagenum-fontsize"
                  type="range"
                  min="8"
                  max="24"
                  value={config.fontSize}
                  onChange={(e) => set("fontSize", parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <Label htmlFor="input-pagenum-color">Colour</Label>
                <input
                  id="input-pagenum-color"
                  type="color"
                  value={config.colorHex}
                  onChange={(e) => set("colorHex", e.target.value)}
                  className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="input-start-from-page">Start numbering at page</Label>
              <input
                id="input-start-from-page"
                type="number"
                min={1}
                max={activeFile.pageCount}
                value={config.startFromPage}
                onChange={(e) =>
                  set("startFromPage", Math.min(activeFile.pageCount, Math.max(1, parseInt(e.target.value, 10) || 1)))
                }
                className={cx(inputClass, "max-w-[8rem]")}
              />
              <p className="text-xs text-slate-500 mt-1">Earlier pages (for example a cover) are left unnumbered.</p>
            </div>
          </Section>
        </div>

        <Section title="Position">
          <div className="grid grid-cols-3 grid-rows-3 gap-2 aspect-[4/3] rounded-lg border border-dashed border-slate-300 bg-white p-3">
            {POSITIONS.map((pos) => (
              <button
                type="button"
                key={pos.value}
                onClick={() => set("position", pos.value)}
                aria-pressed={config.position === pos.value}
                id={`btn-pos-${pos.value}`}
                className={cx(
                  pos.slot,
                  "self-center rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer",
                  config.position === pos.value
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <ActionBar>
        <Button
          variant="primary"
          onClick={handleApply}
          loading={isProcessing}
          icon={<Hash className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-pagenumbers"
        >
          {isProcessing ? "Numbering" : "Add numbers and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
