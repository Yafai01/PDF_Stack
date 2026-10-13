import React, { useId, useRef, useState } from "react";
import { Upload, FileText, Trash2, Loader2 } from "lucide-react";
import type { PdfFileItem } from "../types";
import { formatBytes, getPdfInfo, generatePageThumbnails, errorMessage } from "../lib/pdfUtils";
import { Alert, Button, IconButton, cx } from "./ui";

interface FileUploadAreaProps {
  multiple?: boolean;
  fileItems: PdfFileItem[];
  /** Selected document for single-file tools (null in multi-file mode). */
  activeFileId?: string | null;
  onSelectActive?: (fileId: string) => void;
  onFilesAdded: (newFiles: PdfFileItem[]) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  label?: string;
}

const MAX_THUMBNAIL_PAGES = 30;

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  multiple = true,
  fileItems,
  activeFileId,
  onSelectActive,
  onFilesAdded,
  onRemoveFile,
  onClearAll,
  label = "Add PDF files",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    const newItems: PdfFileItem[] = [];
    const newErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setLoadingText(`Reading ${file.name} (${i + 1} of ${files.length})`);
      if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
        newErrors.push(`${file.name}: not a PDF file.`);
        continue;
      }
      try {
        const { arrayBuffer, pageCount } = await getPdfInfo(file);
        const thumbnails = await generatePageThumbnails(arrayBuffer, MAX_THUMBNAIL_PAGES);
        newItems.push({
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          name: file.name,
          size: file.size,
          arrayBuffer,
          pageCount,
          pageThumbnails: thumbnails,
        });
      } catch (err) {
        newErrors.push(`${file.name}: ${errorMessage(err, "could not be read as a PDF.")}`);
      }
    }

    setErrors(newErrors);
    if (newItems.length > 0) onFilesAdded(newItems);
    setLoadingText(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped: File[] = Array.from(e.dataTransfer.files);
    if (dropped.length) await processFiles(multiple ? dropped : [dropped[0]]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (selected.length) await processFiles(multiple ? selected : [selected[0]]);
  };

  const isLoading = loadingText !== null;

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        multiple={multiple}
        onChange={handleFileSelect}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cx(
          "rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragging ? "border-blue-500 bg-blue-50/60" : "border-slate-300 bg-white"
        )}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2" role="status" aria-live="polite">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-800">{loadingText}</p>
            <p className="text-xs text-slate-500">Validating the file and rendering page previews</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
              <Upload className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <p className="text-sm text-slate-500">Drag and drop, or choose from your device</p>
            </div>
            <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
              Choose PDF{multiple ? " files" : ""}
            </Button>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <Alert tone="error">
          <ul className="space-y-0.5">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </Alert>
      )}

      {fileItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-medium text-slate-700">
              {fileItems.length} document{fileItems.length > 1 ? "s" : ""}
              {onSelectActive && fileItems.length > 1 && (
                <span className="font-normal text-slate-500"> — select the one to work on</span>
              )}
            </span>
            <Button variant="ghost" size="sm" onClick={onClearAll} id="btn-clear-all-files">
              Clear all
            </Button>
          </div>

          <ul className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {fileItems.map((item) => {
              const isActive = activeFileId === item.id;
              const meta = (
                <>
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-800 truncate">{item.name}</span>
                    <span className="block text-xs text-slate-500">
                      {item.pageCount} page{item.pageCount === 1 ? "" : "s"} · {formatBytes(item.size)}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={item.id} className={cx("flex items-center gap-2 px-4 py-2", isActive && "bg-blue-50/50")}>
                  {onSelectActive ? (
                    <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="active-pdf"
                        checked={isActive}
                        onChange={() => onSelectActive(item.id)}
                        className="accent-blue-600"
                      />
                      {meta}
                    </label>
                  ) : (
                    <div className="flex items-center gap-3 min-w-0 flex-1">{meta}</div>
                  )}
                  <IconButton label={`Remove ${item.name}`} tone="danger" onClick={() => onRemoveFile(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
