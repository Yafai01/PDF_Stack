import React, { useState } from "react";
import { Hash, Download, Loader2 } from "lucide-react";
import type { PdfFileItem, PageNumberConfig } from "../types";
import { addPageNumbersToPdf, downloadPdfBlob } from "../lib/pdfUtils";

interface PageNumbersToolProps {
  fileItems: PdfFileItem[];
}

export const PageNumbersTool: React.FC<PageNumbersToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [isProcessing, setIsProcessing] = useState(false);

  const [config, setConfig] = useState<PageNumberConfig>({
    position: "bottom-center",
    format: "page_x_of_y",
    fontSize: 10,
    colorHex: "#334155",
    marginPt: 30,
    startFromPage: 1,
    customText: "Document - Page {page} of {total}",
  });

  if (!activeFile) return null;

  const handleApplyPageNumbers = async () => {
    setIsProcessing(true);
    try {
      const bytes = await addPageNumbersToPdf(activeFile.arrayBuffer, config);
      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(bytes, `${baseName}_Numbered.pdf`);
    } catch (err) {
      console.error("Page numbering failed:", err);
      alert("Failed to add page numbers to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Hash className="w-5 h-5 text-cyan-600" /> Add Page Numbers & Footers
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Insert automated page numbers, headers, or footers across your document.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column: Numbering Format & Text */}
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-800 block">Number Format:</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "page_x_of_y", label: "Page 1 of 10" },
                { id: "page_x", label: "Page 1" },
                { id: "x_slash_y", label: "1 / 10" },
                { id: "custom", label: "Custom Format" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setConfig((prev) => ({ ...prev, format: fmt.id as any }))}
                  id={`btn-number-format-${fmt.id}`}
                  className={`py-2 px-3 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                    config.format === fmt.id
                      ? "bg-cyan-50 border-cyan-500 text-cyan-800 font-semibold shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {config.format === "custom" && (
              <div className="pt-2">
                <label className="text-[11px] font-medium text-slate-600 block mb-1">
                  Custom Pattern (Use &#123;page&#125; and &#123;total&#125;):
                </label>
                <input
                  type="text"
                  value={config.customText || ""}
                  onChange={(e) => setConfig((prev) => ({ ...prev, customText: e.target.value }))}
                  id="input-custom-pagenum-pattern"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Font Size ({config.fontSize}pt):
                </label>
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={config.fontSize}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, fontSize: parseInt(e.target.value) }))
                  }
                  id="slider-pagenum-fontsize"
                  className="w-full accent-cyan-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Font Color:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.colorHex}
                    onChange={(e) => setConfig((prev) => ({ ...prev, colorHex: e.target.value }))}
                    id="input-pagenum-color"
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                  />
                  <span className="text-xs font-mono text-slate-600">{config.colorHex}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Start Numbering From Page:
              </label>
              <input
                type="number"
                min="1"
                max={activeFile.pageCount}
                value={config.startFromPage}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    startFromPage: Math.max(1, parseInt(e.target.value) || 1),
                  }))
                }
                id="input-start-from-page"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">Useful to skip cover pages or titles.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Position Presets & Live Box */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
            <label className="text-xs font-semibold text-slate-800 block">Position Placement:</label>

            {/* Visual 2D Document Grid */}
            <div className="aspect-[4/3] bg-white border-2 border-dashed border-slate-300 rounded-xl relative p-4 flex flex-col justify-between">
              {/* Top Row */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, position: "top-center" }))}
                  id="btn-pos-top-center"
                  className={`mx-auto text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                    config.position === "top-center"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Top Center
                </button>
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, position: "top-right" }))}
                  id="btn-pos-top-right"
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                    config.position === "top-right"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Top Right
                </button>
              </div>

              <div className="text-center text-xs text-slate-400 font-mono">
                DOCUMENT BODY PREVIEW
              </div>

              {/* Bottom Row */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, position: "bottom-left" }))}
                  id="btn-pos-bottom-left"
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                    config.position === "bottom-left"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Bottom Left
                </button>
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, position: "bottom-center" }))}
                  id="btn-pos-bottom-center"
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                    config.position === "bottom-center"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Bottom Center
                </button>
                <button
                  onClick={() => setConfig((prev) => ({ ...prev, position: "bottom-right" }))}
                  id="btn-pos-bottom-right"
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                    config.position === "bottom-right"
                      ? "bg-cyan-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Bottom Right
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleApplyPageNumbers}
          disabled={isProcessing}
          id="btn-execute-pagenumbers"
          className="px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-xs font-semibold shadow-sm hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Numbering Document...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Add Numbers & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
