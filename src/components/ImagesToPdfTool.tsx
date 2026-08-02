import React, { useRef, useState } from "react";
import { Image, Upload, Download, ArrowLeft, ArrowRight, Trash2, Loader2, Plus } from "lucide-react";
import type { ImageToPdfConfig } from "../types";
import { imagesToPdf, downloadPdfBlob, formatBytes } from "../lib/pdfUtils";

export const ImagesToPdfTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFiles, setImageFiles] = useState<{ id: string; file: File; previewUrl: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [config, setConfig] = useState<ImageToPdfConfig>({
    pageSize: "a4",
    orientation: "portrait",
    marginPt: 10,
    fitMode: "contain",
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files) as File[];
      const newItems = selected.map((file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setImageFiles((prev) => [...prev, ...newItems]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleMoveLeft = (index: number) => {
    if (index === 0) return;
    setImageFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const handleMoveRight = (index: number) => {
    if (index === imageFiles.length - 1) return;
    setImageFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  const handleRemove = (id: string) => {
    setImageFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCompilePdf = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);

    try {
      const rawFiles = imageFiles.map((item) => item.file);
      const pdfBytes = await imagesToPdf(rawFiles, config);
      downloadPdfBlob(pdfBytes, "Images_Compiled.pdf");
    } catch (err) {
      console.error("Failed to convert images to PDF:", err);
      alert("Failed to create PDF from images.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Image className="w-5 h-5 text-sky-600" /> Convert Images to PDF
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select and arrange JPG, PNG, or WebP photos to compile into a single PDF document.
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        multiple
        onChange={handleImageSelect}
        className="hidden"
        id="input-img2pdf-file"
      />

      {/* Image Uploader Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-sky-500 hover:bg-sky-50/50 cursor-pointer transition-all mb-6 flex flex-col items-center justify-center min-h-[140px]"
      >
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-2">
          <Upload className="w-6 h-6" />
        </div>
        <p className="text-xs font-semibold text-slate-800">Click to Select Photos or Images</p>
        <p className="text-[11px] text-slate-500 mt-0.5">Supports PNG, JPG, JPEG, and WebP formats</p>
      </div>

      {/* Image Gallery and Reorder Grid */}
      {imageFiles.length > 0 && (
        <div className="mb-6 space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
            <span>{imageFiles.length} Image(s) Loaded</span>
            <button
              onClick={() => setImageFiles([])}
              id="btn-clear-all-images"
              className="text-red-600 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-72 overflow-y-auto p-1">
            {imageFiles.map((item, idx) => (
              <div
                key={item.id}
                className="group relative bg-slate-50 border border-slate-200/80 rounded-xl p-2 flex flex-col justify-between hover:border-sky-300 transition-all"
              >
                <div className="flex justify-between items-center text-[10px] font-mono font-semibold text-slate-500 mb-1">
                  <span>#{idx + 1}</span>
                  <span className="truncate max-w-[70px]">{formatBytes(item.file.size)}</span>
                </div>

                <div className="aspect-square bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center p-1">
                  <img src={item.previewUrl} alt={`Image ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                </div>

                <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200 text-slate-600">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveLeft(idx)}
                      disabled={idx === 0}
                      id={`btn-move-img-left-${idx}`}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleMoveRight(idx)}
                      disabled={idx === imageFiles.length - 1}
                      id={`btn-move-img-right-${idx}`}
                      className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    id={`btn-remove-img-${idx}`}
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Settings Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Page Size:</label>
              <select
                value={config.pageSize}
                onChange={(e) => setConfig((prev) => ({ ...prev, pageSize: e.target.value as any }))}
                id="select-img2pdf-pagesize"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="a4">A4 (Standard)</option>
                <option value="letter">US Letter</option>
                <option value="fit">Fit Exact Image Dimensions</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Orientation:</label>
              <select
                value={config.orientation}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, orientation: e.target.value as any }))
                }
                id="select-img2pdf-orientation"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
                <option value="auto">Auto Detect per Image</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Margin Padding ({config.marginPt}pt):
              </label>
              <select
                value={config.marginPt}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, marginPt: parseInt(e.target.value) }))
                }
                id="select-img2pdf-margin"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
              >
                <option value={0}>No Margin (Full Bleed)</option>
                <option value={10}>Small Margin (10pt)</option>
                <option value={20}>Medium Margin (20pt)</option>
                <option value={36}>Large Margin (36pt)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleCompilePdf}
          disabled={isProcessing || imageFiles.length === 0}
          id="btn-execute-img2pdf"
          className="px-5 py-2.5 rounded-xl bg-sky-600 text-white text-xs font-semibold shadow-sm hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Compiling PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Convert & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
