import React, { useState } from "react";
import { ArrowUp, ArrowDown, Combine } from "lucide-react";
import type { PdfFileItem } from "../types";
import { mergePdfs, downloadPdfBlob, parsePageRanges, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, IconButton, Panel, PanelHeader, inputClass } from "./ui";

interface MergeToolProps {
  fileItems: PdfFileItem[];
  onReorderFiles: (newOrder: PdfFileItem[]) => void;
}

export const MergeTool: React.FC<MergeToolProps> = ({ fileItems, onReorderFiles }) => {
  const [pageSelections, setPageSelections] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputName, setOutputName] = useState("merged.pdf");
  const [error, setError] = useState("");

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= fileItems.length) return;
    const updated = [...fileItems];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onReorderFiles(updated);
  };

  const selectedPagesFor = (item: PdfFileItem) => {
    const selection = (pageSelections[item.id] || "").trim();
    return selection ? parsePageRanges(selection, item.pageCount) : null;
  };

  const totalPages = fileItems.reduce((sum, item) => sum + (selectedPagesFor(item)?.length ?? item.pageCount), 0);
  const emptySelection = fileItems.find((item) => selectedPagesFor(item)?.length === 0);

  const handleMerge = async () => {
    if (fileItems.length < 2) return;
    if (emptySelection) {
      setError(`The page selection for ${emptySelection.name} does not match any page.`);
      return;
    }
    setError("");
    setIsProcessing(true);
    try {
      const mergedBytes = await mergePdfs(
        fileItems.map((item) => ({ arrayBuffer: item.arrayBuffer, selectedPages: selectedPagesFor(item) ?? undefined }))
      );
      const trimmed = outputName.trim() || "merged.pdf";
      downloadPdfBlob(mergedBytes, /\.pdf$/i.test(trimmed) ? trimmed : `${trimmed}.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not merge these PDFs."));
    } finally {
      setIsProcessing(false);
    }
  };

  if (fileItems.length === 0) return null;

  return (
    <Panel>
      <PanelHeader
        title="Order and pages"
        description="Files are merged top to bottom. Leave the page field empty to include every page, or enter ranges like 1-3, 5."
        actions={
          <span className="text-sm text-slate-500 tabular-nums">
            {totalPages} page{totalPages === 1 ? "" : "s"} total
          </span>
        }
      />

      {fileItems.length < 2 && (
        <Alert tone="info" className="mb-4">
          Add at least one more PDF to merge.
        </Alert>
      )}

      <ol className="space-y-2">
        {fileItems.map((item, index) => {
          const inputId = `input-page-range-${item.id}`;
          const selection = selectedPagesFor(item);
          return (
            <li
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-slate-200"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-sm text-slate-400 tabular-nums text-right">{index + 1}.</span>
                <div className="flex flex-col">
                  <IconButton label={`Move ${item.name} up`} onClick={() => move(index, -1)} disabled={index === 0}>
                    <ArrowUp className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    label={`Move ${item.name} down`}
                    onClick={() => move(index, 1)}
                    disabled={index === fileItems.length - 1}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </IconButton>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {selection ? `${selection.length} of ${item.pageCount}` : `All ${item.pageCount}`} page
                    {item.pageCount === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:w-56">
                <label htmlFor={inputId} className="text-sm text-slate-600 whitespace-nowrap">
                  Pages
                </label>
                <input
                  id={inputId}
                  type="text"
                  placeholder={`All (1-${item.pageCount})`}
                  value={pageSelections[item.id] || ""}
                  onChange={(e) => setPageSelections((prev) => ({ ...prev, [item.id]: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </li>
          );
        })}
      </ol>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <ActionBar className="sm:justify-between">
        <div className="flex items-center gap-2 w-full sm:max-w-xs">
          <label htmlFor="input-merged-filename" className="text-sm text-slate-600 whitespace-nowrap">
            File name
          </label>
          <input
            id="input-merged-filename"
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            className={inputClass}
          />
        </div>
        <Button
          variant="primary"
          onClick={handleMerge}
          disabled={fileItems.length < 2}
          loading={isProcessing}
          icon={<Combine className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-merge"
        >
          {isProcessing ? "Merging" : "Merge and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
