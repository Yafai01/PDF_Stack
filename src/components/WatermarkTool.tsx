import React, { useState } from "react";
import { Stamp, Image as ImageIcon, Type } from "lucide-react";
import type { PdfFileItem, WatermarkConfig } from "../types";
import { addWatermarkToPdf, downloadPdfBlob, baseFileName, errorMessage } from "../lib/pdfUtils";
import { ActionBar, Alert, Button, Label, Panel, PanelHeader, Section, Segmented, inputClass } from "./ui";

interface WatermarkToolProps {
  fileItems: PdfFileItem[];
}

const POSITIONS: { value: WatermarkConfig["position"]; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "diagonal", label: "Diagonal" },
  { value: "top-left", label: "Top left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "grid", label: "Tiled" },
];

export const WatermarkTool: React.FC<WatermarkToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
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
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Use a PNG or JPEG image for the watermark.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = (event) =>
      setConfig((prev) => ({ ...prev, type: "image", imageFile: file, imageDataUrl: event.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleApply = async () => {
    setIsProcessing(true);
    setError("");
    try {
      const bytes = await addWatermarkToPdf(activeFile.arrayBuffer, config);
      downloadPdfBlob(bytes, `${baseFileName(activeFile.name)}_watermarked.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not add the watermark."));
    } finally {
      setIsProcessing(false);
    }
  };

  const previewThumb = activeFile.pageThumbnails[0];
  const previewRotation = config.position === "diagonal" ? -Math.atan2(1.4, 1) * (180 / Math.PI) : -config.rotationDegrees;
  const previewAlign =
    config.position === "top-left"
      ? "items-start justify-start"
      : config.position === "bottom-right"
      ? "items-end justify-end"
      : "items-center justify-center";

  const set = <K extends keyof WatermarkConfig>(key: K, value: WatermarkConfig[K]) =>
    setConfig((prev) => ({ ...prev, [key]: value }));

  return (
    <Panel>
      <PanelHeader title="Watermark settings" description="The watermark is drawn on every page of the document." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <Segmented
            label="Watermark type"
            value={config.type}
            onChange={(v) => set("type", v)}
            options={[
              { value: "text", label: <><Type className="w-4 h-4" aria-hidden="true" /> Text</> },
              { value: "image", label: <><ImageIcon className="w-4 h-4" aria-hidden="true" /> Image</> },
            ]}
          />

          {config.type === "text" ? (
            <Section>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="input-watermark-text">Text</Label>
                  <input
                    id="input-watermark-text"
                    type="text"
                    value={config.text}
                    onChange={(e) => set("text", e.target.value)}
                    placeholder="e.g. CONFIDENTIAL, DRAFT"
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-500 mt-1">Latin characters only (built-in PDF font).</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="slider-watermark-fontsize">Font size: {config.fontSize} pt</Label>
                    <input
                      id="slider-watermark-fontsize"
                      type="range"
                      min="18"
                      max="96"
                      value={config.fontSize}
                      onChange={(e) => set("fontSize", parseInt(e.target.value, 10))}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <Label htmlFor="input-watermark-color">Colour</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="input-watermark-color"
                        type="color"
                        value={config.colorHex}
                        onChange={(e) => set("colorHex", e.target.value)}
                        className="w-9 h-9 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                      />
                      <span className="text-sm font-mono text-slate-600">{config.colorHex}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          ) : (
            <Section>
              <Label htmlFor="input-watermark-image">Image (PNG or JPEG)</Label>
              <input
                id="input-watermark-image"
                type="file"
                accept="image/png, image/jpeg"
                onChange={handleImageUpload}
                className="block text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
              />
              {config.imageDataUrl && <p className="text-xs text-slate-500 mt-2">Image loaded.</p>}
            </Section>
          )}

          <Section>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="slider-watermark-opacity">Opacity: {Math.round(config.opacity * 100)}%</Label>
                <input
                  id="slider-watermark-opacity"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={config.opacity}
                  onChange={(e) => set("opacity", parseFloat(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <Label htmlFor="slider-watermark-rotation">
                  Rotation: {config.position === "diagonal" ? "follows page diagonal" : `${config.rotationDegrees}°`}
                </Label>
                <input
                  id="slider-watermark-rotation"
                  type="range"
                  min="-90"
                  max="90"
                  value={config.rotationDegrees}
                  disabled={config.position === "diagonal"}
                  onChange={(e) => set("rotationDegrees", parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 disabled:opacity-40"
                />
              </div>
            </div>
            <div className="mt-4">
              <span className="block text-sm font-medium text-slate-700 mb-1.5">Position</span>
              <Segmented label="Position" value={config.position} onChange={(v) => set("position", v)} options={POSITIONS} />
            </div>
          </Section>
        </div>

        <div className="lg:col-span-5 flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 p-4">
          <span className="text-sm text-slate-600 mb-3">Approximate preview (page 1)</span>
          <div className="relative w-full max-w-[240px] aspect-[1/1.4] bg-white rounded border border-slate-300 overflow-hidden">
            {previewThumb ? (
              <img src={previewThumb} alt="Page 1 preview" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">No preview</div>
            )}
            <div className={`absolute inset-0 pointer-events-none flex p-3 ${previewAlign}`} aria-hidden="true">
              {config.type === "text" && config.text ? (
                <span
                  style={{
                    color: config.colorHex,
                    opacity: config.opacity,
                    transform: `rotate(${previewRotation}deg)`,
                    fontSize: `${Math.max(9, config.fontSize / 3.2)}px`,
                  }}
                  className="font-bold whitespace-nowrap"
                >
                  {config.text}
                </span>
              ) : config.type === "image" && config.imageDataUrl ? (
                <img
                  src={config.imageDataUrl}
                  alt=""
                  style={{ opacity: config.opacity, transform: `rotate(${previewRotation}deg)` }}
                  className="max-w-[40%] max-h-[40%] object-contain"
                />
              ) : null}
            </div>
          </div>
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
          loading={isProcessing}
          icon={<Stamp className="w-4 h-4" aria-hidden="true" />}
          id="btn-execute-watermark"
        >
          {isProcessing ? "Applying" : "Apply and download"}
        </Button>
      </ActionBar>
    </Panel>
  );
};
