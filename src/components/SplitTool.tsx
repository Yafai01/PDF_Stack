import React, { useState } from "react";
import { Scissors, Download, CheckSquare, Square, Loader2, AlertCircle } from "lucide-react";
import type { PdfFileItem } from "../types";
import { splitPdf, downloadPdfBlob, parsePageRanges } from "../lib/pdfUtils";

interface SplitToolProps {
  fileItems: PdfFileItem[];
}

export const SplitTool: React.FC<SplitToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0]; // Primary active file
  const [rangeInput, setRangeInput] = useState("1-3");
  const [splitMode, setSplitMode] = useState<"range" | "single_pages">("range");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!activeFile) return null;

  const togglePageSelection = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === activeFile.pageCount) {
      setSelectedPages([]);
    } else {
      setSelectedPages(Array.from({ length: activeFile.pageCount }, (_, i) => i + 1));
    }
  };

  const handleSplit = async () => {
    setErrorMessage("");
    setIsProcessing(true);

    try {
      let finalRange = "";
      if (splitMode === "single_pages") {
        if (selectedPages.length === 0) {
          setErrorMessage("Please click to select at least one page to extract.");
          setIsProcessing(false);
          return;
        }
        finalRange = selectedPages.sort((a, b) => a - b).join(",");
      } else {
        finalRange = rangeInput.trim();
        if (!finalRange) {
          setErrorMessage("Please enter a valid page range (e.g. 1-3, 5).");
          setIsProcessing(false);
          return;
        }
      }

      const { blob, pageCount } = await splitPdf(activeFile.arrayBuffer, finalRange);
      if (pageCount === 0) {
        setErrorMessage("No valid pages were found in the specified range.");
        setIsProcessing(false);
        return;
      }

      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(blob, `${baseName}_Split.pdf`);
    } catch (err: any) {
      console.error("Failed to split PDF:", err);
      setErrorMessage(err?.message || "Failed to split PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-emerald-600" /> Split & Extract Pages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Document: <span className="font-semibold text-slate-700">{activeFile.name}</span> ({activeFile.pageCount} total pages)
          </p>
        </div>

        {/* Split Mode Switcher */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setSplitMode("range")}
            id="btn-split-mode-range"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              splitMode === "range" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600"
            }`}
          >
            By Custom Range
          </button>
          <button
            onClick={() => setSplitMode("single_pages")}
            id="btn-split-mode-single"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              splitMode === "single_pages" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600"
            }`}
          >
            Visual Selection
          </button>
        </div>
      </div>

      {splitMode === "range" ? (
        <div className="mb-6 bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
          <label className="text-xs font-semibold text-slate-800 block">Enter Page Ranges to Extract:</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={rangeInput}
              onChange={(e) => setRangeInput(e.target.value)}
              placeholder="e.g. 1-2, 5, 7-10"
              id="input-split-range"
              className="flex-1 px-3.5 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
            />
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Matches: {parsePageRanges(rangeInput, activeFile.pageCount).length} pages
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Tip: Use commas to separate ranges or pages (e.g. <span className="font-mono text-slate-700">1-3, 5, 8-12</span>).
          </p>
        </div>
      ) : (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-700">
              Selected ({selectedPages.length} of {activeFile.pageCount} pages)
            </span>
            <button
              onClick={handleSelectAll}
              id="btn-select-all-split"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer flex items-center gap-1"
            >
              {selectedPages.length === activeFile.pageCount ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5" /> Deselect All
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5" /> Select All Pages
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-1">
            {Array.from({ length: activeFile.pageCount }, (_, i) => i + 1).map((pageNum) => {
              const isSelected = selectedPages.includes(pageNum);
              const thumbUrl = activeFile.pageThumbnails[pageNum - 1];

              return (
                <div
                  key={pageNum}
                  onClick={() => togglePageSelection(pageNum)}
                  className={`group relative aspect-[3/4] border-2 rounded-xl p-1.5 cursor-pointer flex flex-col justify-between transition-all ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-600 z-10 px-1 pt-0.5">
                    <span>Page {pageNum}</span>
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400" />
                    )}
                  </div>

                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Page ${pageNum}`}
                      className="w-full h-28 object-contain my-auto rounded border border-slate-100"
                    />
                  ) : (
                    <div className="w-full h-28 bg-slate-100 rounded flex items-center justify-center text-[10px] text-slate-400 font-mono">
                      Page {pageNum}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSplit}
          disabled={isProcessing}
          id="btn-execute-split"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Extracting Pages...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Split & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
