import React, { useEffect, useRef, useState } from "react";
import { PenLine, Trash2, Type, Upload, Download } from "lucide-react";
import type { PdfFileItem, SignaturePlacement } from "../types";
import { applySignaturesToPdf, downloadPdfBlob, baseFileName, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, IconButton, Label, Panel, PanelHeader, Section, Segmented, inputClass } from "./ui";

interface SignToolProps {
  fileItems: PdfFileItem[];
}

type Mode = "draw" | "type" | "upload";

const SIG_WIDTH_PT = 150;
const SIG_HEIGHT_PT = 60;

export const SignTool: React.FC<SignToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);

  const [mode, setMode] = useState<Mode>("draw");
  const [typedText, setTypedText] = useState("");
  const [signatures, setSignatures] = useState<SignaturePlacement[]>([]);
  const [pageNum, setPageNum] = useState(1);
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: 0.7, y: 0.85 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setSignatures([]);
    setPageNum(1);
  }, [activeFile?.id]);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  }, [mode]);

  if (!activeFile) return null;

  // Map pointer coordinates to canvas pixels (the canvas is CSS-scaled).
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const { x, y } = point(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInkRef.current = true;
  };

  const stopDrawing = () => {
    drawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
  };

  const typedSignature = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 200;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = "italic 64px 'Segoe Script', 'Brush Script MT', cursive";
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedText.trim(), 300, 100, 580);
    }
    return canvas.toDataURL("image/png");
  };

  const useSignature = () => {
    setError("");
    if (mode === "draw") {
      if (!hasInkRef.current || !canvasRef.current) {
        setError("Draw your signature first.");
        return;
      }
      setSigDataUrl(canvasRef.current.toDataURL("image/png"));
    } else if (mode === "type") {
      if (!typedText.trim()) {
        setError("Type your name first.");
        return;
      }
      setSigDataUrl(typedSignature());
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Use a PNG or JPEG image.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (ev) => setSigDataUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const placeSignature = () => {
    if (!sigDataUrl) return;
    setSignatures((prev) => [
      ...prev,
      {
        id: `sig-${Date.now()}`,
        pageIndex: pageNum - 1,
        type: mode,
        dataUrl: sigDataUrl,
        xRatio: pos.x,
        yRatio: pos.y,
        widthPt: SIG_WIDTH_PT,
        heightPt: SIG_HEIGHT_PT,
      },
    ]);
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width)),
      y: Math.min(0.97, Math.max(0.03, (e.clientY - rect.top) / rect.height)),
    });
  };

  const handleApply = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const bytes = await applySignaturesToPdf(activeFile.arrayBuffer, signatures);
      downloadPdfBlob(bytes, `${baseFileName(activeFile.name)}_signed.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not add the signature."));
    } finally {
      setIsProcessing(false);
    }
  };

  const currentThumb = activeFile.pageThumbnails[pageNum - 1];
  const pageSigs = signatures.filter((s) => s.pageIndex === pageNum - 1);

  return (
    <Panel>
      <PanelHeader
        title="Add a signature"
        description="Places your signature as an image on the page. This is a visual signature, not a cryptographic (certificate-based) digital signature."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <Section>
            <Segmented
              label="Signature input"
              value={mode}
              onChange={setMode}
              options={[
                { value: "draw", label: <><PenLine className="w-4 h-4" aria-hidden="true" /> Draw</> },
                { value: "type", label: <><Type className="w-4 h-4" aria-hidden="true" /> Type</> },
                { value: "upload", label: <><Upload className="w-4 h-4" aria-hidden="true" /> Upload</> },
              ]}
            />

            <div className="mt-4">
              {mode === "draw" && (
                <>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm text-slate-600">Sign with mouse, pen or finger</span>
                    <Button size="sm" variant="ghost" onClick={clearCanvas}>
                      Clear
                    </Button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={600}
                    height={200}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={stopDrawing}
                    onPointerCancel={stopDrawing}
                    aria-label="Signature drawing area"
                    className="w-full aspect-[3/1] bg-white border border-slate-300 rounded-lg cursor-crosshair touch-none"
                  />
                </>
              )}
              {mode === "type" && (
                <>
                  <Label htmlFor="input-typed-signature">Your name</Label>
                  <input
                    id="input-typed-signature"
                    type="text"
                    value={typedText}
                    onChange={(e) => setTypedText(e.target.value)}
                    placeholder="Full name"
                    className={inputClass}
                  />
                </>
              )}
              {mode === "upload" && (
                <>
                  <Label htmlFor="input-sig-file">Signature image (PNG or JPEG)</Label>
                  <input
                    id="input-sig-file"
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleUpload}
                    className="block text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                  />
                </>
              )}
            </div>

            {mode !== "upload" && (
              <Button className="mt-3 w-full" onClick={useSignature} id="btn-generate-sig">
                Use this signature
              </Button>
            )}
          </Section>

          {sigDataUrl && (
            <Section title="Place it">
              <div className="flex items-center gap-3 mb-3">
                <img src={sigDataUrl} alt="Current signature" className="h-10 max-w-[140px] object-contain bg-white border border-slate-200 rounded" />
                <div className="flex items-center gap-2">
                  <label htmlFor="select-target-page-num" className="text-sm text-slate-600">
                    Page
                  </label>
                  <select
                    id="select-target-page-num"
                    value={pageNum}
                    onChange={(e) => setPageNum(parseInt(e.target.value, 10))}
                    className={inputClass + " w-auto"}
                  >
                    {Array.from({ length: activeFile.pageCount }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">Click the page preview to choose where the signature goes.</p>
              <Button variant="primary" className="w-full" onClick={placeSignature} id="btn-stamp-on-page">
                Place on page {pageNum}
              </Button>
            </Section>
          )}

          {signatures.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-700 mb-1.5">Placed signatures</h3>
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {signatures.map((sig, idx) => (
                  <li key={sig.id} className="flex items-center justify-between px-3 py-1.5 text-sm text-slate-700">
                    {idx + 1}. Page {sig.pageIndex + 1}
                    <IconButton
                      label={`Remove signature ${idx + 1}`}
                      tone="danger"
                      onClick={() => setSignatures((prev) => prev.filter((s) => s.id !== sig.id))}
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-4">
          <span className="text-sm text-slate-600 mb-3">Page {pageNum} preview</span>
          <div
            onClick={handlePreviewClick}
            className="relative w-full max-w-[300px] aspect-[1/1.4] bg-white rounded border border-slate-300 overflow-hidden cursor-crosshair"
          >
            {currentThumb ? (
              <img src={currentThumb} alt={`Page ${pageNum}`} className="w-full h-full object-fill" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No preview</div>
            )}
            {pageSigs.map((sig) => (
              <img
                key={sig.id}
                src={sig.dataUrl}
                alt=""
                style={{ left: `${sig.xRatio * 100}%`, top: `${sig.yRatio * 100}%` }}
                className="absolute w-[25%] h-[7%] object-contain -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              />
            ))}
            {sigDataUrl && (
              <span
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
                className="absolute w-[25%] h-[7%] -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-blue-500 rounded pointer-events-none"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">Preview position is approximate.</p>
        </div>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <ActionBar>
        <Button
          variant="primary"
          onClick={handleApply}
          disabled={signatures.length === 0}
          loading={isProcessing}
          icon={<Download className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-sign"
        >
          {isProcessing ? "Signing" : "Sign and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
