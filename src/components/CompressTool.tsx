import React, { useState } from "react";
import { Minimize2, Download, Loader2, CheckCircle, Zap } from "lucide-react";
import type { PdfFileItem } from "../types";
import { formatBytes, pdfToImages, imagesToPdf, downloadPdfBlob } from "../lib/pdfUtils";

interface CompressToolProps {
  fileItems: PdfFileItem[];
}

export const CompressTool: React.FC<CompressToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [level, setLevel] = useState<"low" | "medium" | "high">("medium");
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

  if (!activeFile) return null;

  const handleCompress = async () => {
    setIsProcessing(true);
    setCompressedSize(null);

    try {
      // Scale factor & image compression based on selected level
      const scaleMap = { low: 1.2, medium: 0.9, high: 0.65 };
      const scale = scaleMap[level];

      // Extract canvas rendered image pages
      const pageImages = await pdfToImages(activeFile.arrayBuffer, scale);

      // Convert data URLs to synthetic File objects for re-encoding
      const imageFiles: File[] = [];
      for (const item of pageImages) {
        const res = await fetch(item.dataUrl);
        const blob = await res.blob();
        imageFiles.push(new File([blob], `page_${item.pageIndex}.png`, { type: "image/png" }));
      }

      // Recompile into optimized PDF
      const compressedBytes = await imagesToPdf(imageFiles, {
        pageSize: "fit",
        orientation: "auto",
        marginPt: 0,
        fitMode: "contain",
      });

      setCompressedSize(compressedBytes.byteLength);

      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(compressedBytes, `${baseName}_Compressed.pdf`);
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to compress PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const getEstRatio = () => {
    if (level === "low") return "~15-30% reduction";
    if (level === "medium") return "~40-60% reduction";
    return "~70-85% reduction";
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Minimize2 className="w-5 h-5 text-rose-600" /> Compress & Optimize PDF
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Shrink file sizes for fast web uploads, email attachments, or archiving without sacrificing readability.
        </p>
      </div>

      {/* File Size Comparison Card */}
      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Original File Size
          </span>
          <span className="text-lg font-bold text-slate-900">{formatBytes(activeFile.size)}</span>
        </div>

        <Zap className="w-6 h-6 text-rose-500 hidden sm:block" />

        <div className="text-right">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Estimated Reduction
          </span>
          <span className="text-sm font-bold text-rose-600">{getEstRatio()}</span>
          {compressedSize && (
            <span className="text-xs text-emerald-600 font-semibold block mt-0.5">
              Actual Output: {formatBytes(compressedSize)}
            </span>
          )}
        </div>
      </div>

      {/* Preset Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          {
            id: "low",
            title: "Less Compression",
            desc: "Highest visual quality with minor size optimization.",
            badge: "High Quality",
          },
          {
            id: "medium",
            title: "Recommended",
            desc: "Optimal balance between small file size and clear document quality.",
            badge: "Balanced",
          },
          {
            id: "high",
            title: "Maximum Compression",
            desc: "Smallest possible file size for strict upload limits.",
            badge: "Smallest Size",
          },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setLevel(item.id as any)}
            id={`btn-compress-level-${item.id}`}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              level === item.id
                ? "bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-xs"
                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900">{item.title}</span>
                {level === item.id && <CheckCircle className="w-4 h-4 text-rose-600" />}
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{item.desc}</p>
            </div>
            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold self-start">
              {item.badge}
            </span>
          </button>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          onClick={handleCompress}
          disabled={isProcessing}
          id="btn-execute-compress"
          className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-sm hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Optimizing PDF Pages...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Compress & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
