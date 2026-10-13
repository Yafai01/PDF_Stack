import React, { useEffect, useState } from "react";
import { Check, Scissors } from "lucide-react";
import type { PdfFileItem } from "../types";
import { splitPdf, downloadPdfBlob, parsePageRanges, baseFileName, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, Label, Panel, PanelHeader, Segmented, cx, inputClass } from "./ui";

interface SplitToolProps {
  fileItems: PdfFileItem[];
}

export const SplitTool: React.FC<SplitToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [rangeInput, setRangeInput] = useState("");
  const [mode, setMode] = useState<"range" | "select">("range");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSelectedPages([]);
    setError("");
  }, [activeFile?.id]);

  if (!activeFile) return null;

  const togglePage = (pageNum: number) =>
    setSelectedPages((prev) => (prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum]));

  const allSelected = selectedPages.length === activeFile.pageCount;
  const rangeMatches = parsePageRanges(rangeInput, activeFile.pageCount).length;

  const handleSplit = async () => {
    setError("");
    const finalRange = mode === "select" ? [...selectedPages].sort((a, b) => a - b).join(",") : rangeInput.trim();
    if (!finalRange) {
      setError(mode === "select" ? "Select at least one page." : "Enter a page range, for example 1-3, 5.");
      return;
    }
    setIsProcessing(true);
    try {
      const { blob, pageCount } = await splitPdf(activeFile.arrayBuffer, finalRange);
      if (pageCount === 0) {
        setError(`No pages match. This document has ${activeFile.pageCount} page(s).`);
        return;
      }
      downloadPdfBlob(blob, `${baseFileName(activeFile.name)}_pages.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not split this PDF."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Choose pages"
        description={
          <>
            <span className="font-medium text-slate-700">{activeFile.name}</span> · {activeFile.pageCount} pages
          </>
        }
        actions={
          <Segmented
            label="Selection mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "range", label: "Page range" },
              { value: "select", label: "Pick pages" },
            ]}
          />
        }
      />

      {mode === "range" ? (
        <div className="max-w-md">
          <Label htmlFor="input-split-range">Pages to extract</Label>
          <input
            id="input-split-range"
            type="text"
            value={rangeInput}
            onChange={(e) => setRangeInput(e.target.value)}
            placeholder="e.g. 1-2, 5, 7-10"
            aria-describedby="split-range-help"
            className={inputClass}
          />
          <p id="split-range-help" className="text-xs text-slate-500 mt-1.5">
            Separate pages and ranges with commas. {rangeInput.trim() && `${rangeMatches} page(s) match.`}
          </p>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-600">
              {selectedPages.length} of {activeFile.pageCount} selected
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelectedPages(allSelected ? [] : Array.from({ length: activeFile.pageCount }, (_, i) => i + 1))
              }
            >
              {allSelected ? "Clear selection" : "Select all"}
            </Button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-1">
            {Array.from({ length: activeFile.pageCount }, (_, i) => i + 1).map((pageNum) => {
              const isSelected = selectedPages.includes(pageNum);
              const thumbUrl = activeFile.pageThumbnails[pageNum - 1];
              return (
                <button
                  type="button"
                  key={pageNum}
                  onClick={() => togglePage(pageNum)}
                  aria-pressed={isSelected}
                  aria-label={`Page ${pageNum}`}
                  className={cx(
                    "relative rounded-lg border-2 p-1.5 bg-white text-left cursor-pointer transition-colors",
                    isSelected ? "border-blue-600" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  {thumbUrl ? (
                    <img src={thumbUrl} alt="" className="w-full h-28 object-contain" />
                  ) : (
                    <div className="w-full h-28 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                      No preview
                    </div>
                  )}
                  <span className="mt-1 flex items-center justify-between text-xs text-slate-600">
                    {pageNum}
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3" aria-hidden="true" />
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <ActionBar>
        <Button
          variant="primary"
          onClick={handleSplit}
          loading={isProcessing}
          icon={<Scissors className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-split"
        >
          {isProcessing ? "Extracting" : "Extract and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
