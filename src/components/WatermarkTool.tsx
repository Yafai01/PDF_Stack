import React, { useState } from "react";
import { Stamp, Download, Loader2, Image as ImageIcon, Type, Sparkles } from "lucide-react";
import type { PdfFileItem, WatermarkConfig } from "../types";
import { addWatermarkToPdf, downloadPdfBlob } from "../lib/pdfUtils";

interface WatermarkToolProps {
  fileItems: PdfFileItem[];
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [isProcessing, setIsProcessing] = useState(false);

  const [config, setConfig] = useState<WatermarkConfig>({
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 48,
    colorHex: "#64748b",
    opacity: 0.35,
    rotationDegrees: -35,
    position: "center",
    imageDataUrl: null,
  });

  if (!activeFile) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        setConfig((prev) => ({
          ...prev,
          type: "image",
          imageFile: file,
          imageDataUrl: event.target?.result as string,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyWatermark = async () => {
    setIsProcessing(true);
    try {
      const watermarkedBytes = await addWatermarkToPdf(activeFile.arrayBuffer, config);
      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(watermarkedBytes, `${baseName}_Watermarked.pdf`);
    } catch (err) {
      console.error("Watermark generation failed:", err);
      alert("Failed to apply watermark to PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const previewThumb = activeFile.pageThumbnails[0];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Stamp className="w-5 h-5 text-purple-600" /> Add Watermark to PDF
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Stamp text or image watermarks onto all pages with custom opacity, rotation, and alignment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-7 space-y-4">
          {/* Watermark Type Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setConfig((prev) => ({ ...prev, type: "text" }))}
              id="btn-watermark-type-text"
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                config.type === "text"
                  ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Type className="w-4 h-4" /> Text Watermark
            </button>
            <button
              onClick={() => setConfig((prev) => ({ ...prev, type: "image" }))}
              id="btn-watermark-type-image"
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                config.type === "image"
                  ? "bg-purple-50 border-purple-500 text-purple-700 shadow-2xs"
                  : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ImageIcon className="w-4 h-4" /> Logo / Image Stamp
            </button>
          </div>

          {config.type === "text" ? (
            <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Watermark Text:</label>
                <input
                  type="text"
                  value={config.text}
                  onChange={(e) => setConfig((prev) => ({ ...prev, text: e.target.value }))}
                  placeholder="e.g. CONFIDENTIAL, DRAFT, APPROVED"
                  id="input-watermark-text"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Font Size ({config.fontSize}px):
                  </label>
                  <input
                    type="range"
                    min="18"
                    max="96"
                    value={config.fontSize}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, fontSize: parseInt(e.target.value) }))
                    }
                    id="slider-watermark-fontsize"
                    className="w-full accent-purple-600 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Text Color:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.colorHex}
                      onChange={(e) => setConfig((prev) => ({ ...prev, colorHex: e.target.value }))}
                      id="input-watermark-color"
                      className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    />
                    <span className="text-xs font-mono text-slate-600">{config.colorHex}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl text-center">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Upload Logo Image (PNG / JPG):</label>
              <input
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageUpload}
                id="input-watermark-image"
                className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
              />
              {config.imageDataUrl && (
                <p className="text-[11px] text-emerald-600 font-medium">✓ Image loaded successfully</p>
              )}
            </div>
          )}

          {/* Opacity, Rotation, and Alignment */}
          <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-4 rounded-xl">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Opacity ({Math.round(config.opacity * 100)}%):
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, opacity: parseFloat(e.target.value) }))
                  }
                  id="slider-watermark-opacity"
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Rotation ({config.rotationDegrees}°):
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={config.rotationDegrees}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, rotationDegrees: parseInt(e.target.value) }))
                  }
                  id="slider-watermark-rotation"
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Position Layout:</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-[11px]">
                {(["center", "diagonal", "top-left", "bottom-right", "grid"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setConfig((prev) => ({ ...prev, position: pos }))}
                    id={`btn-position-${pos}`}
                    className={`py-1.5 px-2 rounded-lg border capitalize font-medium cursor-pointer transition-all ${
                      config.position === pos
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs font-semibold"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {pos.replace("-", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Visual Preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between bg-slate-100/70 border border-slate-200 p-4 rounded-xl">
          <span className="text-xs font-semibold text-slate-600 mb-2">Live Page Overlay Preview</span>

          <div className="relative w-full max-w-[220px] aspect-[1/1.4] bg-white rounded-lg border border-slate-300 shadow-md overflow-hidden flex items-center justify-center p-2">
            {previewThumb ? (
              <img src={previewThumb} alt="Page Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-xs text-slate-400 font-mono text-center">Page 1</div>
            )}

            {/* Overlaid simulated watermark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              {config.type === "text" && config.text ? (
                <div
                  style={{
                    color: config.colorHex,
                    opacity: config.opacity,
                    transform: `rotate(${config.rotationDegrees}deg)`,
                    fontSize: `${Math.max(12, config.fontSize / 3.5)}px`,
                  }}
                  className="font-bold tracking-wider text-center select-none"
                >
                  {config.text}
                </div>
              ) : config.type === "image" && config.imageDataUrl ? (
                <img
                  src={config.imageDataUrl}
                  alt="Watermark Logo"
                  style={{
                    opacity: config.opacity,
                    transform: `rotate(${config.rotationDegrees}deg)`,
                  }}
                  className="max-w-[60%] max-h-[60%] object-contain"
                />
              ) : null}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Watermark will be rendered across all {activeFile.pageCount} pages.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 mt-6 flex justify-end">
        <button
          onClick={handleApplyWatermark}
          disabled={isProcessing}
          id="btn-execute-watermark"
          className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Watermarking Document...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Apply & Download Watermarked PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
