import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  Check,
  FolderOpen,
} from "lucide-react";
import type { PdfToolCategory, PdfFileItem } from "./types";
import { ToolSelector, TOOLS } from "./components/ToolSelector";
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

  const handleFilesAdded = (newItems: PdfFileItem[]) => {
    setFileItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveFile = (fileId: string) => {
    setFileItems((prev) => prev.filter((item) => item.id !== fileId));
  };

  const handleClearAllFiles = () => {
    setFileItems([]);
  };

  const activeToolMeta = TOOLS.find((t) => t.id === activeTool) || TOOLS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center font-bold text-xs text-white tracking-wider shadow-sm">
              PDF
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                PDF Tool Studio
              </h1>
              <span className="text-slate-400 font-normal text-xs hidden sm:inline">
                Professional
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center space-x-5 text-xs font-medium text-slate-300">
              <span className="text-white font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Workspace
              </span>
              <span className="text-slate-400 hover:text-white transition-colors cursor-default">
                Private Sandbox
              </span>
              <span className="text-slate-400 hover:text-white transition-colors cursor-default">
                Gemini AI Engine
              </span>
            </nav>

            <div className="flex items-center gap-3 border-l border-slate-800 pl-4 sm:pl-6">
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-slate-800/80 px-2.5 py-1 rounded border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5" /> Client Security Active
              </div>
              <button
                id="btn-pro-badge"
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-colors cursor-pointer flex items-center gap-1"
              >
                PRO EDITION
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tool Category Selector Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Select PDF Utility
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              11 Powerful PDF Tools
            </span>
          </div>

          <ToolSelector
            activeTool={activeTool}
            onSelectTool={(tool) => {
              setActiveTool(tool);
            }}
          />
        </div>

        {/* Current Active Tool Context Header */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 mb-6 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 border border-blue-500/30 text-[10px] font-bold uppercase tracking-widest mb-2">
                Active Utility: {activeToolMeta.name}
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                {activeToolMeta.name}
              </h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                {activeToolMeta.shortDesc}
              </p>
            </div>

            {fileItems.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold text-white shrink-0 self-start md:self-auto shadow-inner">
                <FolderOpen className="w-4 h-4 text-blue-400" />
                <span>
                  {fileItems.length} Document{fileItems.length > 1 ? "s" : ""} Loaded
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Global File Upload Dropzone (Show for non-images-to-pdf tools) */}
        {activeTool !== "img-to-pdf" && (
          <FileUploadArea
            multiple={activeTool === "merge"}
            fileItems={fileItems}
            onFilesAdded={handleFilesAdded}
            onRemoveFile={handleRemoveFile}
            onClearAll={handleClearAllFiles}
            label={
              activeTool === "merge"
                ? "Upload 2 or More PDF Files to Merge"
                : `Upload PDF File for ${activeToolMeta.name}`
            }
          />
        )}

        {/* Active Tool Dynamic Component Container */}
        {fileItems.length > 0 || activeTool === "img-to-pdf" ? (
          <div>
            {activeTool === "merge" && (
              <MergeTool
                fileItems={fileItems}
                onReorderFiles={(newOrder) => setFileItems(newOrder)}
              />
            )}
            {activeTool === "split" && <SplitTool fileItems={fileItems} />}
            {activeTool === "reorder" && <ReorderRotateTool fileItems={fileItems} />}
            {activeTool === "watermark" && <WatermarkTool fileItems={fileItems} />}
            {activeTool === "page-numbers" && <PageNumbersTool fileItems={fileItems} />}
            {activeTool === "compress" && <CompressTool fileItems={fileItems} />}
            {activeTool === "sign" && <SignTool fileItems={fileItems} />}
            {activeTool === "img-to-pdf" && <ImagesToPdfTool />}
            {activeTool === "pdf-to-img" && <PdfToImagesTool fileItems={fileItems} />}
            {activeTool === "protect" && <ProtectTool fileItems={fileItems} />}
            {activeTool === "ai-assistant" && <AiAssistantTool fileItems={fileItems} />}
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center shadow-xs mb-8">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Info className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 mb-1">
              No Document Uploaded Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please drag & drop your PDF file above or browse your computer to start using{" "}
              <span className="font-semibold text-slate-700">{activeToolMeta.name}</span>.
            </p>
          </div>
        )}

        {/* Features & Security Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-200/80">
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Privacy First</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your files stay on your machine. PDF operations run in browser WebAssembly & JavaScript.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Gemini AI Document Intelligence</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Summarize complex contracts, extract action items, and ask questions directly to your PDF.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5">
              <Check className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">Zero File Size Limits</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Process multi-hundred page documents with high-performance canvas page thumbnail rendering.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></div>
            System Online • Client-side Engine Active
          </div>
          <div className="hidden sm:block text-slate-400">• WebAssembly & pdf-lib Runtime</div>
        </div>
        <div className="flex items-center space-x-4">
          <span className="hover:text-blue-600 transition-colors cursor-default">Privacy Guarantee</span>
          <span className="text-slate-300">v2.4.1-stable</span>
        </div>
      </footer>
    </div>
  );
}
