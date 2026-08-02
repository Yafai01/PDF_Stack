import React, { useState } from "react";
import { FileImage, Download, Loader2, Image as ImageIcon } from "lucide-react";
import type { PdfFileItem } from "../types";
import { pdfToImages } from "../lib/pdfUtils";

interface PdfToImagesToolProps {
  fileItems: PdfFileItem[];
}

export const PdfToImagesTool: React.FC<PdfToImagesToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [extractedImages, setExtractedImages] = useState<{ pageIndex: number; dataUrl: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageScale, setImageScale] = useState(1.5); // 1.5x resolution standard

  if (!activeFile) return null;

  const handleExtractImages = async () => {
    setIsProcessing(true);
    setExtractedImages([]);

    try {
      const results = await pdfToImages(activeFile.arrayBuffer, imageScale);
      setExtractedImages(results);
    } catch (err) {
      console.error("Failed to extract images from PDF:", err);
      alert("Failed to convert PDF pages to images.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSingleImage = (pageIndex: number, dataUrl: string) => {
    const link = document.createElement("a");
    const baseName = activeFile.name.replace(/\.pdf$/i, "");
    link.href = dataUrl;
    link.download = `${baseName}_Page_${pageIndex + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAllImages = () => {
    extractedImages.forEach((img, idx) => {
      setTimeout(() => {
        handleDownloadSingleImage(img.pageIndex, img.dataUrl);
      }, idx * 250);
    });
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <FileImage className="w-5 h-5 text-teal-600" /> Export PDF Pages to PNG Images
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Document: <span className="font-semibold text-slate-700">{activeFile.name}</span> ({activeFile.pageCount} pages)
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 p-4 rounded-xl mb-6">
        <div>
          <label className="text-xs font-semibold text-slate-800 block mb-1">Image Quality / Resolution:</label>
          <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg text-xs font-medium">
            {[
              { label: "Standard (1x)", val: 1.0 },
              { label: "High Res (1.5x)", val: 1.5 },
              { label: "Ultra HD (2x)", val: 2.0 },
            ].map((res) => (
              <button
                key={res.val}
                onClick={() => setImageScale(res.val)}
                id={`btn-scale-${res.val}`}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  imageScale === res.val
                    ? "bg-teal-600 text-white shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExtractImages}
          disabled={isProcessing}
          id="btn-execute-pdf2img"
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-semibold shadow-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Rendering PNGs...
            </>
          ) : (
            <>
              <ImageIcon className="w-4 h-4" /> Extract {activeFile.pageCount} Page Images
            </>
          )}
        </button>
      </div>

      {/* Rendered Extracted Images Gallery */}
      {extractedImages.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-800 pb-2 border-b border-slate-100">
            <span>{extractedImages.length} PNG Pages Rendered</span>
            <button
              onClick={handleDownloadAllImages}
              id="btn-download-all-pngs"
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download All Pages (.PNG)
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[450px] overflow-y-auto p-1">
            {extractedImages.map((img) => (
              <div
                key={img.pageIndex}
                className="group relative bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex flex-col justify-between hover:border-teal-400 transition-all shadow-2xs"
              >
                <div className="text-[11px] font-mono font-semibold text-slate-600 mb-2">
                  Page {img.pageIndex + 1}
                </div>

                <div className="w-full h-40 bg-white rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center p-1 my-1">
                  <img src={img.dataUrl} alt={`Page ${img.pageIndex + 1}`} className="max-w-full max-h-full object-contain" />
                </div>

                <button
                  onClick={() => handleDownloadSingleImage(img.pageIndex, img.dataUrl)}
                  id={`btn-download-page-${img.pageIndex}`}
                  className="w-full mt-2 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Save PNG
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
