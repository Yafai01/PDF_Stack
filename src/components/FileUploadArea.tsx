import React, { useRef, useState } from "react";
import { UploadCloud, FileText, Trash2, Plus, Loader2, CheckCircle2 } from "lucide-react";
import type { PdfFileItem } from "../types";
import { formatBytes, getPdfInfo, generatePageThumbnails } from "../lib/pdfUtils";

interface FileUploadAreaProps {
  acceptTypes?: string;
  multiple?: boolean;
  fileItems: PdfFileItem[];
  onFilesAdded: (newFiles: PdfFileItem[]) => void;
  onRemoveFile: (fileId: string) => void;
  onClearAll: () => void;
  label?: string;
  sublabel?: string;
  maxFiles?: number;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  acceptTypes = ".pdf,application/pdf",
  multiple = true,
  fileItems,
  onFilesAdded,
  onRemoveFile,
  onClearAll,
  label = "Upload PDF Files",
  sublabel = "Drag & drop files here or click to browse",
  maxFiles = 20,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsLoading(true);
    const newItems: PdfFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setLoadingText(`Processing ${file.name} (${i + 1}/${files.length})...`);

      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const { arrayBuffer, pageCount } = await getPdfInfo(file);
          const thumbnails = await generatePageThumbnails(arrayBuffer, 30);

          newItems.push({
            id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            name: file.name,
            size: file.size,
            arrayBuffer,
            pageCount,
            pageThumbnails: thumbnails,
          });
        }
      } catch (err) {
        console.error(`Failed to process PDF file ${file.name}:`, err);
      }
    }

    if (newItems.length > 0) {
      onFilesAdded(newItems);
    }
    setIsLoading(false);
    setLoadingText("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = Array.from(e.dataTransfer.files) as File[];
      await processFiles(multiple ? dropped : [dropped[0]]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files) as File[];
      await processFiles(multiple ? selected : [selected[0]]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full mb-6">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        id="input-file-uploader"
      />

      {/* Main Drag & Drop Box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[170px] ${
          isDragging
            ? "border-blue-600 bg-blue-50/70 scale-[1.005]"
            : fileItems.length > 0
            ? "border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 hover:border-slate-400"
            : "border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/80 shadow-2xs"
        }`}
      >
        {isLoading ? (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-800">{loadingText}</p>
            <p className="text-xs text-slate-500 mt-1">Generating page previews & analyzing structure...</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-0.5 uppercase tracking-wide">{label}</h3>
            <p className="text-xs text-slate-500 max-w-md">{sublabel}</p>
            <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-500 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Select PDF File{multiple ? "s" : ""}
            </div>
          </>
        )}
      </div>

      {/* Uploaded Files Summary List */}
      {fileItems.length > 0 && (
        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Workspace ({fileItems.length} Document{fileItems.length > 1 ? "s" : ""})
              </span>
            </div>
            <button
              onClick={onClearAll}
              id="btn-clear-all-files"
              className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear Workspace
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {fileItems.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100/80 transition-colors text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 text-center font-mono text-[11px] font-bold text-slate-400">
                    #{index + 1}
                  </span>
                  {/* PDF Red Badge Icon */}
                  <div className="w-6 h-8 bg-red-100 text-red-600 rounded flex items-center justify-center font-bold text-[8px] border border-red-200 shadow-2xs shrink-0">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {item.pageCount} page{item.pageCount > 1 ? "s" : ""} • {formatBytes(item.size)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(item.id);
                  }}
                  id={`btn-remove-file-${item.id}`}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer shrink-0"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
