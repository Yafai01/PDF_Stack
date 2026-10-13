import React, { useCallback, useEffect, useState } from "react";
import { RotateCw, RotateCcw, Trash2, ArrowLeft, ArrowRight, RefreshCw, Copy, Download } from "lucide-react";
import type { PdfFileItem, PageThumbnailItem } from "../types";
import { processPageArrangement, downloadPdfBlob, baseFileName, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, IconButton, Panel, PanelHeader } from "./ui";

interface ReorderRotateToolProps {
  fileItems: PdfFileItem[];
}

let pageKeyCounter = 0;
const nextKey = () => `page-${++pageKeyCounter}`;

function initialPages(file: PdfFileItem): PageThumbnailItem[] {
  return Array.from({ length: file.pageCount }, (_, i) => ({
    id: nextKey(),
    fileId: file.id,
    fileName: file.name,
    pageIndex: i,
    displayPageNum: i + 1,
    originalIndex: i,
    rotation: 0,
    isSelected: false,
    thumbnailUrl: file.pageThumbnails[i] || "",
  }));
}

export const ReorderRotateTool: React.FC<ReorderRotateToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [pages, setPages] = useState<PageThumbnailItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    if (activeFile) setPages(initialPages(activeFile));
    setError("");
  }, [activeFile]);

  useEffect(reset, [reset]);

  if (!activeFile) return null;

  const rotate = (index: number, delta: number) =>
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + delta + 360) % 360 } : p))
    );

  const rotateAll = (delta: number) =>
    setPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + delta + 360) % 360 })));

  const move = (index: number, delta: -1 | 1) =>
    setPages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const updated = [...prev];
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return updated;
    });

  const remove = (index: number) => {
    if (pages.length <= 1) {
      setError("A document must keep at least one page.");
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicate = (index: number) =>
    setPages((prev) => {
      const updated = [...prev];
      updated.splice(index + 1, 0, { ...prev[index], id: nextKey() });
      return updated;
    });

  const handleSave = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const bytes = await processPageArrangement(
        activeFile.arrayBuffer,
        pages.map((p) => ({ originalIndex: p.originalIndex, rotation: p.rotation }))
      );
      downloadPdfBlob(bytes, `${baseFileName(activeFile.name)}_organized.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not save the reorganised PDF."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="Arrange pages"
        description={
          <>
            <span className="font-medium text-slate-700">{activeFile.name}</span> · {pages.length} page
            {pages.length === 1 ? "" : "s"} in the output
          </>
        }
        actions={
          <div className="flex gap-2">
            <Button size="sm" onClick={() => rotateAll(90)} icon={<RotateCw className="w-3.5 h-3.5" aria-hidden="true" />}>
              Rotate all
            </Button>
            <Button size="sm" onClick={reset} icon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}>
              Reset
            </Button>
          </div>
        }
      />

      <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[560px] overflow-y-auto p-1">
        {pages.map((page, index) => (
          <li key={page.id} className="rounded-lg border border-slate-200 bg-white p-2 flex flex-col">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="tabular-nums">
                {index + 1}
                {page.originalIndex !== index && (
                  <span className="text-slate-400"> (was {page.originalIndex + 1})</span>
                )}
              </span>
              {page.rotation !== 0 && <span className="tabular-nums">{page.rotation}°</span>}
            </div>

            <div className="h-36 flex items-center justify-center overflow-hidden rounded bg-slate-50">
              {page.thumbnailUrl ? (
                <img
                  src={page.thumbnailUrl}
                  alt={`Page ${page.originalIndex + 1}`}
                  style={{ transform: `rotate(${page.rotation}deg)` }}
                  className="max-h-full max-w-full object-contain transition-transform"
                />
              ) : (
                <span className="text-xs text-slate-400" style={{ transform: `rotate(${page.rotation}deg)` }}>
                  Page {page.originalIndex + 1}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-100">
              <div className="flex">
                <IconButton label={`Rotate page ${index + 1} left`} onClick={() => rotate(index, -90)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton label={`Rotate page ${index + 1} right`} onClick={() => rotate(index, 90)}>
                  <RotateCw className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton label={`Duplicate page ${index + 1}`} onClick={() => duplicate(index)}>
                  <Copy className="w-3.5 h-3.5" />
                </IconButton>
              </div>
              <div className="flex">
                <IconButton label={`Move page ${index + 1} earlier`} onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton
                  label={`Move page ${index + 1} later`}
                  onClick={() => move(index, 1)}
                  disabled={index === pages.length - 1}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </IconButton>
                <IconButton label={`Delete page ${index + 1}`} tone="danger" onClick={() => remove(index)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </IconButton>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <ActionBar>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={pages.length === 0}
          loading={isProcessing}
          icon={<Download className="w-4 h-4" aria-hidden="true" />}
          id="btn-save-reordered-pdf"
        >
          {isProcessing ? "Saving" : "Save and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
