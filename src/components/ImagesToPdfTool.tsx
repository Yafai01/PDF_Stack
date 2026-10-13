import React, { useEffect, useRef, useState } from "react";
import { Upload, ArrowLeft, ArrowRight, Trash2, Download } from "lucide-react";
import type { ImageToPdfConfig } from "../types";
import { imagesToPdf, downloadPdfBlob, formatBytes, fileToImageInput, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, IconButton, Label, Panel, PanelHeader, Section, inputClass } from "./ui";

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
}

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export const ImagesToPdfTool: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<ImageToPdfConfig>({
    pageSize: "a4",
    orientation: "auto",
    marginPt: 20,
    fitMode: "contain",
  });

  // Release object URLs when images are removed or the tool unmounts.
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  const addFiles = (files: File[]) => {
    const valid = files.filter((f) => ACCEPTED.includes(f.type));
    setError(valid.length < files.length ? "Some files were skipped: only PNG, JPEG and WebP images are supported." : "");
    setImages((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const remove = (id: string) =>
    setImages((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });

  const clearAll = () => {
    images.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImages([]);
  };

  const move = (index: number, delta: -1 | 1) =>
    setImages((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const handleConvert = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const inputs = await Promise.all(images.map((i) => fileToImageInput(i.file)));
      downloadPdfBlob(await imagesToPdf(inputs, config), "images.pdf");
    } catch (err) {
      setError(errorMessage(err, "Could not create a PDF from these images."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Panel>
      <PanelHeader title="Images" description="Each image becomes one page, in the order shown." />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        id="input-img2pdf-file"
      />

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          addFiles(Array.from(e.dataTransfer.files));
        }}
        className="rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center flex flex-col items-center gap-3"
      >
        <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <Upload className="w-5 h-5" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-500">Drag and drop PNG, JPEG or WebP images, or</p>
        <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
          Choose images
        </Button>
      </div>

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      {images.length > 0 && (
        <div className="mt-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">
              {images.length} image{images.length === 1 ? "" : "s"}
            </span>
            <Button size="sm" variant="ghost" onClick={clearAll} id="btn-clear-all-images">
              Clear all
            </Button>
          </div>

          <ol className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-80 overflow-y-auto p-1">
            {images.map((item, idx) => (
              <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-2 flex flex-col">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{idx + 1}</span>
                  <span>{formatBytes(item.file.size)}</span>
                </div>
                <div className="aspect-square bg-slate-50 rounded flex items-center justify-center overflow-hidden">
                  <img src={item.previewUrl} alt={item.file.name} className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-100">
                  <div className="flex">
                    <IconButton label={`Move image ${idx + 1} earlier`} onClick={() => move(idx, -1)} disabled={idx === 0}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </IconButton>
                    <IconButton
                      label={`Move image ${idx + 1} later`}
                      onClick={() => move(idx, 1)}
                      disabled={idx === images.length - 1}
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </IconButton>
                  </div>
                  <IconButton label={`Remove image ${idx + 1}`} tone="danger" onClick={() => remove(item.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              </li>
            ))}
          </ol>

          <Section>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="select-img2pdf-pagesize">Page size</Label>
                <select
                  id="select-img2pdf-pagesize"
                  value={config.pageSize}
                  onChange={(e) => setConfig((p) => ({ ...p, pageSize: e.target.value as ImageToPdfConfig["pageSize"] }))}
                  className={inputClass}
                >
                  <option value="a4">A4</option>
                  <option value="letter">US Letter</option>
                  <option value="fit">Match image size</option>
                </select>
              </div>
              <div>
                <Label htmlFor="select-img2pdf-orientation">Orientation</Label>
                <select
                  id="select-img2pdf-orientation"
                  value={config.orientation}
                  disabled={config.pageSize === "fit"}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, orientation: e.target.value as ImageToPdfConfig["orientation"] }))
                  }
                  className={inputClass + " disabled:bg-slate-100"}
                >
                  <option value="auto">Automatic (per image)</option>
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
              <div>
                <Label htmlFor="select-img2pdf-margin">Margin</Label>
                <select
                  id="select-img2pdf-margin"
                  value={config.marginPt}
                  onChange={(e) => setConfig((p) => ({ ...p, marginPt: parseInt(e.target.value, 10) }))}
                  className={inputClass}
                >
                  <option value={0}>None</option>
                  <option value={10}>Small (10 pt)</option>
                  <option value={20}>Medium (20 pt)</option>
                  <option value={36}>Large (36 pt)</option>
                </select>
              </div>
            </div>
          </Section>
        </div>
      )}

      <ActionBar>
        <Button
          variant="primary"
          onClick={handleConvert}
          disabled={images.length === 0}
          loading={isProcessing}
          icon={<Download className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-img2pdf"
        >
          {isProcessing ? "Creating PDF" : "Create PDF and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
