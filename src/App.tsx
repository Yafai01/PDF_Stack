import React, { useMemo, useState } from "react";
import { FileStack, ShieldCheck } from "lucide-react";
import type { PdfToolCategory, PdfFileItem } from "./types";
import { ToolSelector, TOOLS, TOOL_ICONS } from "./components/ToolSelector";
import { FileUploadArea } from "./components/FileUploadArea";
import { MergeTool } from "./components/MergeTool";
import { SplitTool } from "./components/SplitTool";
import { ReorderRotateTool } from "./components/ReorderRotateTool";
import { WatermarkTool } from "./components/WatermarkTool";
import { PageNumbersTool } from "./components/PageNumbersTool";
import { CompressTool } from "./components/CompressTool";
import { SignTool } from "./components/SignTool";
import { ImagesToPdfTool } from "./components/ImagesToPdfTool";
import { PdfToImagesTool } from "./components/PdfToImagesTool";
import { ProtectTool } from "./components/ProtectTool";
import { AiAssistantTool } from "./components/AiAssistantTool";

export default function App() {
  const [activeTool, setActiveTool] = useState<PdfToolCategory>("merge");
  const [fileItems, setFileItems] = useState<PdfFileItem[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const toolMeta = TOOLS.find((t) => t.id === activeTool) ?? TOOLS[0];
  const ToolIcon = TOOL_ICONS[toolMeta.id];
  const isMulti = Boolean(toolMeta.multiFile);

  const activeFile = useMemo(
    () => fileItems.find((f) => f.id === activeFileId) ?? fileItems[0],
    [fileItems, activeFileId]
  );
  // Single-file tools operate on the selected document only.
  const toolFiles = isMulti ? fileItems : activeFile ? [activeFile] : [];

  const handleFilesAdded = (newItems: PdfFileItem[]) => {
    setFileItems((prev) => [...prev, ...newItems]);
    if (!isMulti && newItems.length > 0) setActiveFileId(newItems[newItems.length - 1].id);
  };

  const handleRemoveFile = (fileId: string) => {
    setFileItems((prev) => prev.filter((item) => item.id !== fileId));
    if (activeFileId === fileId) setActiveFileId(null);
  };

  const handleClearAllFiles = () => {
    setFileItems([]);
    setActiveFileId(null);
  };

  const renderTool = () => {
    switch (activeTool) {
      case "merge":
        return <MergeTool fileItems={fileItems} onReorderFiles={setFileItems} />;
      case "split":
        return <SplitTool fileItems={toolFiles} />;
      case "reorder":
        return <ReorderRotateTool fileItems={toolFiles} />;
      case "watermark":
        return <WatermarkTool fileItems={toolFiles} />;
      case "page-numbers":
        return <PageNumbersTool fileItems={toolFiles} />;
      case "compress":
        return <CompressTool fileItems={toolFiles} />;
      case "sign":
        return <SignTool fileItems={toolFiles} />;
      case "img-to-pdf":
        return <ImagesToPdfTool />;
      case "pdf-to-img":
        return <PdfToImagesTool fileItems={toolFiles} />;
      case "protect":
        return <ProtectTool fileItems={toolFiles} />;
      case "ai-assistant":
        return <AiAssistantTool fileItems={toolFiles} />;
    }
  };

  const hasInput = toolMeta.ownInput || toolFiles.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:rounded-md focus:shadow"
      >
        Skip to content
      </a>

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <FileStack className="w-4 h-4" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-tight">PDF Stack</span>
          </div>
          <p className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-400" aria-hidden="true" />
            PDF processing runs in your browser
          </p>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 grid content-start gap-6 grid-cols-[minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <ToolSelector activeTool={activeTool} onSelectTool={setActiveTool} />
        </aside>

        <main id="main" className="min-w-0 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ToolIcon className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{toolMeta.name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">{toolMeta.shortDesc}</p>
            </div>
          </div>

          {!toolMeta.ownInput && (
            <FileUploadArea
              multiple={isMulti}
              fileItems={fileItems}
              activeFileId={isMulti ? null : activeFile?.id ?? null}
              onSelectActive={isMulti ? undefined : setActiveFileId}
              onFilesAdded={handleFilesAdded}
              onRemoveFile={handleRemoveFile}
              onClearAll={handleClearAllFiles}
              label={isMulti ? "Add PDF files to merge" : "Add a PDF"}
            />
          )}

          {hasInput && renderTool()}
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-slate-500 flex flex-col sm:flex-row gap-1 sm:justify-between">
          <span>Files are processed locally in your browser and are never uploaded, except by AI insights.</span>
          <span>AI insights sends document text (or the PDF) to the server, which forwards it to Google Gemini.</span>
        </div>
      </footer>
    </div>
  );
}
