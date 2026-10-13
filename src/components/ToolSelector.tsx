import React from "react";
import {
  Combine,
  Scissors,
  LayoutGrid,
  Stamp,
  Hash,
  Minimize2,
  PenLine,
  Image,
  FileImage,
  Lock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { PdfToolCategory, ToolGroup, ToolMeta } from "../types";
import { cx } from "./ui";

export const TOOLS: ToolMeta[] = [
  { id: "merge", name: "Merge", group: "Organize", multiFile: true, shortDesc: "Combine several PDFs into one document, optionally picking page ranges." },
  { id: "split", name: "Split / extract", group: "Organize", shortDesc: "Extract a page range or hand-picked pages into a new PDF." },
  { id: "reorder", name: "Organize pages", group: "Organize", shortDesc: "Reorder, rotate, duplicate or delete pages." },
  { id: "watermark", name: "Watermark", group: "Edit", shortDesc: "Stamp text or an image on every page." },
  { id: "page-numbers", name: "Page numbers", group: "Edit", shortDesc: "Add page numbers or a custom footer/header label." },
  { id: "sign", name: "Sign", group: "Edit", shortDesc: "Place a drawn, typed or uploaded signature image on a page." },
  { id: "compress", name: "Compress", group: "Convert & optimize", shortDesc: "Reduce file size without rasterising text. Shows the real before/after size." },
  { id: "img-to-pdf", name: "Images to PDF", group: "Convert & optimize", ownInput: true, shortDesc: "Turn PNG, JPEG or WebP images into a PDF." },
  { id: "pdf-to-img", name: "PDF to PNG", group: "Convert & optimize", shortDesc: "Render each page as a PNG image." },
  { id: "protect", name: "Password protect", group: "Security", shortDesc: "Encrypt the PDF with AES-256 so it needs a password to open." },
  { id: "ai-assistant", name: "AI insights", group: "AI", shortDesc: "Summarise, extract key details or ask questions using Google Gemini (server-side)." },
];

export const TOOL_ICONS: Record<PdfToolCategory, LucideIcon> = {
  merge: Combine,
  split: Scissors,
  reorder: LayoutGrid,
  watermark: Stamp,
  "page-numbers": Hash,
  sign: PenLine,
  compress: Minimize2,
  "img-to-pdf": Image,
  "pdf-to-img": FileImage,
  protect: Lock,
  "ai-assistant": Sparkles,
};

const GROUPS: ToolGroup[] = ["Organize", "Edit", "Convert & optimize", "Security", "AI"];

interface ToolSelectorProps {
  activeTool: PdfToolCategory;
  onSelectTool: (tool: PdfToolCategory) => void;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({ activeTool, onSelectTool }) => (
  <nav aria-label="PDF tools" className="space-y-5">
    {GROUPS.map((group) => (
      <div key={group}>
        <h2 className="px-2 mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">{group}</h2>
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
          {TOOLS.filter((t) => t.group === group).map((tool) => {
            const Icon = TOOL_ICONS[tool.id];
            const isActive = activeTool === tool.id;
            return (
              <li key={tool.id}>
                <button
                  type="button"
                  id={`btn-tool-${tool.id}`}
                  onClick={() => onSelectTool(tool.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer",
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className={cx("w-4 h-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} aria-hidden="true" />
                  <span className="truncate">{tool.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>
);
