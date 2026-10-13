import React, { useEffect, useState } from "react";
import { Download, Minimize2 } from "lucide-react";
import type { PdfFileItem } from "../types";
import { compressPdf, createCanvasJpegReencoder, type CompressResult } from "../lib/pdfCompress";
import { baseFileName, downloadPdfBlob, errorMessage, formatBytes } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, Panel, PanelHeader, cx } from "./ui";

interface CompressToolProps {
  fileItems: PdfFileItem[];
}

type Level = "lossless" | "balanced" | "strong";

const LEVELS: { id: Level; title: string; desc: string; jpeg?: { quality: number; maxDimension: number } }[] = [
  {
    id: "lossless",
    title: "Lossless",
    desc: "Restructures the file (object streams, deflates uncompressed streams). Content is unchanged.",
  },
  {
    id: "balanced",
    title: "Balanced",
    desc: "Lossless steps plus re-encoding JPEG photos at quality 75, max 2000 px.",
    jpeg: { quality: 0.75, maxDimension: 2000 },
  },
  {
    id: "strong",
    title: "Strong",
    desc: "Lossless steps plus re-encoding JPEG photos at quality 55, max 1300 px. Visible softening likely.",
    jpeg: { quality: 0.55, maxDimension: 1300 },
  },
];

export const CompressTool: React.FC<CompressToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [level, setLevel] = useState<Level>("balanced");
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<CompressResult | null>(null);
  const [error, setError] = useState("");

  // A new document or new settings invalidate the previous result.
  useEffect(() => {
    setResult(null);
    setError("");
  }, [activeFile?.id, level, removeMetadata]);

  if (!activeFile) return null;

  const outputName = `${baseFileName(activeFile.name)}_compressed.pdf`;

  const handleCompress = async () => {
    setIsProcessing(true);
    setResult(null);
    setError("");
    try {
      const preset = LEVELS.find((l) => l.id === level)!;
      const res = await compressPdf(activeFile.arrayBuffer, {
        removeMetadata,
        reencodeJpeg: preset.jpeg ? createCanvasJpegReencoder(preset.jpeg.quality, preset.jpeg.maxDimension) : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(errorMessage(err, "Could not compress this PDF."));
    } finally {
      setIsProcessing(false);
    }
  };

  const savedPct = result ? ((result.originalSize - result.outputSize) / result.originalSize) * 100 : 0;

  return (
    <Panel>
      <PanelHeader
        title="Compress PDF"
        description="Text and vector graphics are kept as-is (never rasterised). How much a file shrinks depends on its content; already-optimised PDFs may not get smaller."
      />

      <fieldset>
        <legend className="text-sm font-medium text-slate-700 mb-2">Compression level</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LEVELS.map((item) => (
            <label
              key={item.id}
              className={cx(
                "flex flex-col gap-1 p-4 rounded-lg border cursor-pointer transition-colors",
                level === item.id ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-500" : "border-slate-200 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="compress-level"
                  value={item.id}
                  checked={level === item.id}
                  onChange={() => setLevel(item.id)}
                  className="accent-blue-600"
                  id={`btn-compress-level-${item.id}`}
                />
                <span className="text-sm font-medium text-slate-900">{item.title}</span>
              </span>
              <span className="text-xs text-slate-500 leading-relaxed">{item.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={removeMetadata}
          onChange={(e) => setRemoveMetadata(e.target.checked)}
          className="w-4 h-4 accent-blue-600"
        />
        Remove document metadata (title, author, creator, XMP)
      </label>

      <dl className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <dt className="text-xs text-slate-500">Original size</dt>
          <dd className="text-lg font-semibold text-slate-900 tabular-nums">{formatBytes(activeFile.size)}</dd>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <dt className="text-xs text-slate-500">Compressed size</dt>
          <dd className="text-lg font-semibold text-slate-900 tabular-nums">
            {result ? formatBytes(result.outputSize) : <span className="text-slate-400 font-normal text-sm">Not run yet</span>}
          </dd>
        </div>
      </dl>

      <div className="mt-4 space-y-3" aria-live="polite">
        {error && <Alert tone="error">{error}</Alert>}
        {result && result.isSmaller && (
          <Alert tone="success">
            Saved {formatBytes(result.originalSize - result.outputSize)} ({savedPct.toFixed(1)}% smaller).{" "}
            {result.imagesReencoded > 0 && `${result.imagesReencoded} image(s) re-encoded. `}
            {result.streamsDeflated > 0 && `${result.streamsDeflated} uncompressed stream(s) deflated.`}
          </Alert>
        )}
        {result && !result.isSmaller && (
          <Alert tone="warning">
            This PDF is already well optimised: the result would be {formatBytes(result.outputSize)}, which is not
            smaller than the original. Keep your original file{level !== "strong" ? ", or try a stronger level" : ""}.
          </Alert>
        )}
      </div>

      <ActionBar>
        {result && !result.isSmaller && (
          <Button variant="secondary" onClick={() => downloadPdfBlob(result.bytes, outputName)}>
            Download anyway
          </Button>
        )}
        {result && result.isSmaller ? (
          <Button
            variant="primary"
            icon={<Download className="w-4 h-4" aria-hidden="true" />}
            onClick={() => downloadPdfBlob(result.bytes, outputName)}
          >
            Download compressed PDF
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleCompress}
            loading={isProcessing}
            icon={<Minimize2 className="w-4 h-4" aria-hidden="true" />}
            id="btn-execute-compress"
          >
            {isProcessing ? "Compressing" : "Compress"}
          </Button>
        )}
      </ActionBar>
    </Panel>
  );
};
