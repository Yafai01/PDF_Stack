import React, { useEffect, useState } from "react";
import { Download, FileImage } from "lucide-react";
import type { PdfFileItem } from "../types";
import { pdfToImages, downloadDataUrl, baseFileName, errorMessage } from "../lib/pdfUtils";
import { Alert, Button, Panel, PanelHeader, Segmented } from "./ui";

interface PdfToImagesToolProps {
  fileItems: PdfFileItem[];
}

export const PdfToImagesTool: React.FC<PdfToImagesToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [images, setImages] = useState<{ pageIndex: number; dataUrl: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [scale, setScale] = useState(1.5);
  const [error, setError] = useState("");

  useEffect(() => {
    setImages([]);
    setError("");
  }, [activeFile?.id]);

  if (!activeFile) return null;
  const base = baseFileName(activeFile.name);

  const handleRender = async () => {
    setIsProcessing(true);
    setImages([]);
    setError("");
    try {
      setImages(await pdfToImages(activeFile.arrayBuffer, scale, (done, total) => setProgress(`${done} of ${total}`)));
    } catch (err) {
      setError(errorMessage(err, "Could not render the pages."));
    } finally {
      setIsProcessing(false);
      setProgress("");
    }
  };

  const downloadAll = () =>
    images.forEach((img, idx) =>
      // Stagger downloads so browsers do not drop them.
      setTimeout(() => downloadDataUrl(img.dataUrl, `${base}_page_${img.pageIndex + 1}.png`), idx * 250)
    );

  return (
    <Panel>
      <PanelHeader
        title="Render pages"
        description={
          <>
            <span className="font-medium text-slate-700">{activeFile.name}</span> · {activeFile.pageCount} pages
          </>
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="block text-sm font-medium text-slate-700 mb-1.5">Resolution</span>
          <Segmented
            label="Resolution"
            value={scale}
            onChange={setScale}
            options={[
              { value: 1, label: "72 dpi" },
              { value: 1.5, label: "108 dpi" },
              { value: 2, label: "144 dpi" },
              { value: 3, label: "216 dpi" },
            ]}
          />
        </div>
        <Button
          variant="primary"
          onClick={handleRender}
          loading={isProcessing}
          icon={<FileImage className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-pdf2img"
        >
          {isProcessing ? `Rendering ${progress}` : `Render ${activeFile.pageCount} page${activeFile.pageCount === 1 ? "" : "s"}`}
        </Button>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      {images.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">{images.length} PNG images</span>
            <Button size="sm" onClick={downloadAll} icon={<Download className="w-3.5 h-3.5" aria-hidden="true" />} id="btn-download-all-pngs">
              Download all
            </Button>
          </div>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[480px] overflow-y-auto p-1">
            {images.map((img) => (
              <li key={img.pageIndex} className="rounded-lg border border-slate-200 bg-white p-2">
                <div className="h-40 bg-slate-50 rounded flex items-center justify-center overflow-hidden">
                  <img src={img.dataUrl} alt={`Page ${img.pageIndex + 1}`} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">Page {img.pageIndex + 1}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => downloadDataUrl(img.dataUrl, `${base}_page_${img.pageIndex + 1}.png`)}
                    aria-label={`Download page ${img.pageIndex + 1} as PNG`}
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" /> PNG
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};
