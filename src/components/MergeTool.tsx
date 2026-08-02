import React, { useState } from "react";
import { Combine, ArrowUp, ArrowDown, Download, Loader2, Sparkles, AlertCircle } from "lucide-react";
import type { PdfFileItem } from "../types";
import { mergePdfs, downloadPdfBlob, parsePageRanges } from "../lib/pdfUtils";

interface MergeToolProps {
  fileItems: PdfFileItem[];
  onReorderFiles: (newOrder: PdfFileItem[]) => void;
}

export const MergeTool: React.FC<MergeToolProps> = ({
  fileItems,
  onReorderFiles,
}) => {
  const [pageSelections, setPageSelections] = useState<{ [fileId: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedOutputName, setMergedOutputName] = useState("Merged_Document.pdf");
  const [errorMessage, setErrorMessage] = useState("");

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...fileItems];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    onReorderFiles(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === fileItems.length - 1) return;
    const updated = [...fileItems];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    onReorderFiles(updated);
  };

  const handlePageSelectionChange = (fileId: string, value: string) => {
    setPageSelections((prev) => ({ ...prev, [fileId]: value }));
  };

  const calculateTotalPages = () => {
    let total = 0;
    for (const item of fileItems) {
      const selectionStr = pageSelections[item.id] || "";
      if (selectionStr.trim()) {
        const indices = parsePageRanges(selectionStr, item.pageCount);
        total += indices.length;
      } else {
        total += item.pageCount;
      }
    }
    return total;
  };

  const handleMerge = async () => {
    if (fileItems.length < 2) {
      setErrorMessage("Please upload at least 2 PDF files to merge.");
      return;
    }
    setErrorMessage("");
    setIsProcessing(true);

    try {
      const filePayload = fileItems.map((item) => {
        const selectionStr = pageSelections[item.id] || "";
        const selectedPages = selectionStr.trim()
          ? parsePageRanges(selectionStr, item.pageCount)
          : undefined;
        return {
          arrayBuffer: item.arrayBuffer,
          selectedPages,
        };
      });

      const mergedBytes = await mergePdfs(filePayload);
      const safeName = mergedOutputName.endsWith(".pdf")
        ? mergedOutputName
        : `${mergedOutputName}.pdf`;
      downloadPdfBlob(mergedBytes, safeName);
    } catch (err: any) {
      console.error("Error merging PDFs:", err);
      setErrorMessage(err?.message || "Failed to merge PDF files.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (fileItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Combine className="w-5 h-5 text-indigo-600" /> Combine Files & Select Pages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Arrange the order of your documents and optionally specify page ranges (e.g., 1-3, 5).
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold text-slate-700 block">
            Estimated Total Pages: {calculateTotalPages()}
          </span>
          <span className="text-[11px] text-slate-400 block">{fileItems.length} files queued</span>
        </div>
      </div>

      {/* File Ordering List */}
      <div className="space-y-3 mb-6">
        {fileItems.map((item, index) => {
          const customRange = pageSelections[item.id] || "";
          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    id={`btn-move-up-${item.id}`}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 cursor-pointer text-xs"
                    title="Move file up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === fileItems.length - 1}
                    id={`btn-move-down-${item.id}`}
                    className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 disabled:opacity-30 disabled:hover:text-slate-600 disabled:hover:border-slate-200 cursor-pointer text-xs"
                    title="Move file down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Total: {item.pageCount} page{item.pageCount > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Optional custom page range */}
              <div className="flex items-center gap-2 shrink-0">
                <label className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                  Pages:
                </label>
                <input
                  type="text"
                  placeholder={`All (1-${item.pageCount})`}
                  value={customRange}
                  onChange={(e) => handlePageSelectionChange(item.id, e.target.value)}
                  id={`input-page-range-${item.id}`}
                  className="w-32 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          );
        })}
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Output Configuration & Action */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 max-w-xs w-full">
          <label className="text-xs font-medium text-slate-700 whitespace-nowrap">Output Name:</label>
          <input
            type="text"
            value={mergedOutputName}
            onChange={(e) => setMergedOutputName(e.target.value)}
            id="input-merged-filename"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium text-slate-800"
          />
        </div>

        <button
          onClick={handleMerge}
          disabled={isProcessing || fileItems.length < 2}
          id="btn-execute-merge"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Merging PDF Files...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Merge & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
