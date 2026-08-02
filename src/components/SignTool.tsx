import React, { useRef, useState, useEffect } from "react";
import { FileSignature, Download, Trash2, PenTool, Type, Upload, Check, Loader2 } from "lucide-react";
import type { PdfFileItem, SignaturePlacement } from "../types";
import { applySignaturesToPdf, downloadPdfBlob } from "../lib/pdfUtils";

interface SignToolProps {
  fileItems: PdfFileItem[];
}

export const SignTool: React.FC<SignToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<"draw" | "type" | "upload">("draw");
  const [typedText, setTypedText] = useState("John Doe");
  const [isDrawing, setIsDrawing] = useState(false);

  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
  const [activePageNum, setActivePageNum] = useState(1); // 1-based
  const [createdSigDataUrl, setCreatedSigDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize signature drawing canvas
  useEffect(() => {
    if (activeTab === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [activeTab]);

  if (!activeFile) return null;

  // Drawing Handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const generateSignatureFromType = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "italic bold 42px 'Dancing Script', 'Brush Script MT', cursive, sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedText || "Signature", 200, 75);
    }
    return canvas.toDataURL("image/png");
  };

  const handleCreateSignature = () => {
    if (activeTab === "draw" && canvasRef.current) {
      const url = canvasRef.current.toDataURL("image/png");
      setCreatedSigDataUrl(url);
    } else if (activeTab === "type") {
      const url = generateSignatureFromType();
      setCreatedSigDataUrl(url);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCreatedSigDataUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlaceSignatureOnPage = () => {
    if (!createdSigDataUrl) return;

    const newPlacement: SignaturePlacement = {
      id: `sig-${Date.now()}`,
      pageIndex: activePageNum - 1,
      type: activeTab,
      dataUrl: createdSigDataUrl,
      xRatio: 0.35, // default center-bottom
      yRatio: 0.75,
      widthPt: 140,
      heightPt: 55,
    };

    setSignatures((prev) => [...prev, newPlacement]);
  };

  const handleRemoveSignature = (sigId: string) => {
    setSignatures((prev) => prev.filter((s) => s.id !== sigId));
  };

  const handleApply = async () => {
    if (signatures.length === 0) {
      alert("Please place at least one signature onto a page first.");
      return;
    }
    setIsProcessing(true);

    try {
      const bytes = await applySignaturesToPdf(activeFile.arrayBuffer, signatures);
      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      downloadPdfBlob(bytes, `${baseName}_Signed.pdf`);
    } catch (err) {
      console.error("Failed to sign PDF:", err);
      alert("Failed to apply signature onto PDF document.");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentThumb = activeFile.pageThumbnails[activePageNum - 1];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      <div className="pb-4 border-b border-slate-100 mb-5">
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <FileSignature className="w-5 h-5 text-violet-600" /> Digital Signatures & Annotations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Draw, type, or upload your signature and stamp it precisely onto document pages.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Signature Creator & Controls */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl space-y-3">
            {/* Tab switcher */}
            <div className="flex border-b border-slate-200 pb-2 gap-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab("draw")}
                id="btn-sig-tab-draw"
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === "draw"
                    ? "bg-violet-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Draw
              </button>
              <button
                onClick={() => setActiveTab("type")}
                id="btn-sig-tab-type"
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === "type"
                    ? "bg-violet-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <Type className="w-3.5 h-3.5" /> Type
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                id="btn-sig-tab-upload"
                className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === "upload"
                    ? "bg-violet-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload
              </button>
            </div>

            {activeTab === "draw" ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] text-slate-500">
                  <span>Sign below using mouse or touch:</span>
                  <button
                    onClick={clearCanvas}
                    id="btn-clear-sig-canvas"
                    className="text-red-600 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={120}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 bg-white border border-slate-300 rounded-lg cursor-crosshair touch-none"
                />
              </div>
            ) : activeTab === "type" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 block">Type Full Name:</label>
                <input
                  type="text"
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  id="input-typed-signature"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-serif italic text-slate-800 text-base"
                />
              </div>
            ) : (
              <div className="space-y-2 text-center py-2">
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={handleSignatureUpload}
                  id="input-sig-file"
                  className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-violet-100 file:text-violet-700 cursor-pointer"
                />
              </div>
            )}

            {activeTab !== "upload" && (
              <button
                onClick={handleCreateSignature}
                id="btn-generate-sig"
                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Set Created Signature
              </button>
            )}
          </div>

          {/* Target Page Selector & Stamp Button */}
          {createdSigDataUrl && (
            <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-900">Active Signature Ready</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-700 whitespace-nowrap">Target Page:</label>
                <select
                  value={activePageNum}
                  onChange={(e) => setActivePageNum(parseInt(e.target.value))}
                  id="select-target-page-num"
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  {Array.from({ length: activeFile.pageCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePlaceSignatureOnPage}
                id="btn-stamp-on-page"
                className="w-full py-2 bg-violet-600 text-white rounded-lg text-xs font-semibold hover:bg-violet-700 shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Place Signature on Page {activePageNum}
              </button>
            </div>
          )}

          {/* Signature Placements Summary */}
          {signatures.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              <span className="text-xs font-semibold text-slate-700 block mb-1">
                Placed Signatures ({signatures.length})
              </span>
              {signatures.map((sig, idx) => (
                <div
                  key={sig.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs"
                >
                  <span className="font-medium text-slate-800">
                    #{idx + 1} • Page {sig.pageIndex + 1}
                  </span>
                  <button
                    onClick={() => handleRemoveSignature(sig.id)}
                    id={`btn-remove-sig-${sig.id}`}
                    className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Page Preview Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between bg-slate-100/70 border border-slate-200 p-4 rounded-xl">
          <div className="flex justify-between items-center w-full text-xs font-semibold text-slate-600 mb-2">
            <span>Page {activePageNum} Preview</span>
            <span className="text-[11px] text-slate-400">
              {signatures.filter((s) => s.pageIndex === activePageNum - 1).length} Signature(s) on this page
            </span>
          </div>

          <div className="relative w-full max-w-[260px] aspect-[1/1.4] bg-white rounded-lg border border-slate-300 shadow-md overflow-hidden flex items-center justify-center p-2">
            {currentThumb ? (
              <img src={currentThumb} alt="Page Preview" className="w-full h-full object-contain" />
            ) : (
              <div className="text-xs text-slate-400 font-mono text-center">Page {activePageNum}</div>
            )}

            {/* Render signatures placed on current active page */}
            {signatures
              .filter((s) => s.pageIndex === activePageNum - 1)
              .map((sig) => (
                <div
                  key={sig.id}
                  style={{
                    left: `${sig.xRatio * 100}%`,
                    top: `${sig.yRatio * 100}%`,
                  }}
                  className="absolute w-28 h-12 border border-violet-400 bg-white/80 rounded p-1 shadow-xs transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                >
                  <img src={sig.dataUrl} alt="Signature" className="max-w-full max-h-full object-contain" />
                </div>
              ))}
          </div>

          <p className="text-[11px] text-slate-400 mt-3 text-center">
            Signatures will be permanently embedded into the PDF document layer.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 mt-6 flex justify-end">
        <button
          onClick={handleApply}
          disabled={isProcessing || signatures.length === 0}
          id="btn-execute-sign"
          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-semibold shadow-sm hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Embedding Signatures...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Sign & Download PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
};
