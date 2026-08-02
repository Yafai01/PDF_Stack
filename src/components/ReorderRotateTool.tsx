import React, { useState, useEffect } from "react";
import { RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, Download, Loader2, RefreshCw, Copy } from "lucide-react";
import type { PdfFileItem, PageThumbnailItem } from "../types";
import { processPageArrangement, downloadPdfBlob } from "../lib/pdfUtils";

interface ReorderRotateToolProps {
  fileItems: PdfFileItem[];
}

export const ReorderRotateTool: React.FC<ReorderRotateToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [pages, setPages] = useState<PageThumbnailItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (activeFile) {
      const initialPages: PageThumbnailItem[] = Array.from(
        { length: activeFile.pageCount },
        (_, i) => ({
          id: `${activeFile.id}_page_${i}_${Math.random()}`,
          fileId: activeFile.id,
          fileName: activeFile.name,
          pageIndex: i,
          displayPageNum: i + 1,
          originalIndex: i,
          rotation: 0,
          isSelected: false,
          thumbnailUrl: activeFile.pageThumbnails[i] || "",
        })
      );
      setPages(initialPages);
    }
  }, [activeFile]);

  if (!activeFile) return null;

  const handleRotatePage = (index: number, deltaDegrees: number) => {
    setPages((prev) => {
      const updated = [...prev];
      const page = updated[index];
      const newRotation = (page.rotation + deltaDegrees + 360) % 360;
      updated[index] = { ...page, rotation: newRotation };
      return updated;
    });
  };

  const handleRotateAll = (deltaDegrees: number) => {
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        rotation: (page.rotation + deltaDegrees + 360) % 360,
      }))
    );
  };

  const handleMovePageLeft = (index: number) => {
    if (index === 0) return;
    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMovePageRight = (index: number) => {
    if (index === pages.length - 1) return;
    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleDeletePage = (index: number) => {
    if (pages.length <= 1) {
      alert("A document must contain at least one page.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDuplicatePage = (index: number) => {
    setPages((prev) => {
      const target = prev[index];
      const copy: PageThumbnailItem = {
        ...target,
        id: `${target.fileId}_dup_${Date.now()}_${Math.random()}`,
      };
      const updated = [...prev];
      updated.splice(index + 1, 0, copy);
      return updated;
    });
  };

  const handleReset = () => {
    if (activeFile) {
      const resetPages: PageThumbnailItem[] = Array.from(
        { length: activeFile.pageCount },
        (_, i) => ({
          id: `${activeFile.id}_page_${i}_${Math.random()}`,
          fileId: activeFile.id,
          fileName: activeFile.name,
          pageIndex: i,
          displayPageNum: i + 1,
          originalIndex: i,
          rotation: 0,
          isSelected: false,
          thumbnailUrl: activeFile.pageThumbnails[i] || "",
        })
      );
      setPages(resetPages);
    }
  };

  const handleSave = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      const arrangement = pages.map((p) => ({
        originalIndex: p.originalIndex,
        rotation: p.rotation,
      }));

      const newPdfBytes = await processPageArrangement(activeFile.arrayBuffer, arrangement);
      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(newPdfBytes, `${baseName}_Organized.pdf`);
    } catch (err) {
      console.error("Failed to process pages:", err);
      alert("Error saving organized PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      {/* Header & Global Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <RotateCw className="w-5 h-5 text-amber-600" /> Organize & Rotate Pages
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Document: <span className="font-semibold text-slate-700">{activeFile.name}</span> ({pages.length} pages currently)
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleRotateAll(90)}
            id="btn-rotate-all-cw"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            title="Rotate all pages 90 degrees clockwise"
          >
            <RotateCw className="w-3.5 h-3.5 text-amber-600" /> Rotate All 90°
          </button>
          <button
            onClick={handleReset}
            id="btn-reset-pages"
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            title="Reset layout to original"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[500px] overflow-y-auto p-1 mb-6">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className="group relative bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md hover:border-amber-300 transition-all"
          >
            {/* Top Bar: Page Indicator */}
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-slate-600 mb-2">
              <span>#{index + 1}</span>
              {page.rotation !== 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                  {page.rotation}°
                </span>
              )}
            </div>

            {/* Thumbnail Canvas / Image with rotation CSS */}
            <div className="w-full h-36 flex items-center justify-center overflow-hidden my-1 bg-white rounded-lg border border-slate-200/80 p-1">
              {page.thumbnailUrl ? (
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${index + 1}`}
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                  className="max-h-full max-w-full object-contain transition-transform duration-200"
                />
              ) : (
                <div
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                  className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-mono transition-transform"
                >
                  Page {page.originalIndex + 1}
                </div>
              )}
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 mt-2 text-slate-600">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleRotatePage(index, -90)}
                  id={`btn-rotate-ccw-${index}`}
                  className="p-1 rounded hover:bg-slate-200 hover:text-amber-700 transition-colors cursor-pointer"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRotatePage(index, 90)}
                  id={`btn-rotate-cw-${index}`}
                  className="p-1 rounded hover:bg-slate-200 hover:text-amber-700 transition-colors cursor-pointer"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDuplicatePage(index)}
                  id={`btn-duplicate-${index}`}
                  className="p-1 rounded hover:bg-slate-200 hover:text-indigo-700 transition-colors cursor-pointer"
                  title="Duplicate Page"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleMovePageLeft(index)}
                  disabled={index === 0}
                  id={`btn-move-left-${index}`}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                  title="Move Left"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMovePageRight(index)}
                  disabled={index === pages.length - 1}
                  id={`btn-move-right-${index}`}
                  className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                  title="Move Right"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeletePage(index)}
                  id={`btn-delete-page-${index}`}
                  className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  title="Delete Page"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isProcessing || pages.length === 0}
          id="btn-save-reordered-pdf"
          className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-semibold shadow-sm hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving Document...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Save & Download Organized PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
