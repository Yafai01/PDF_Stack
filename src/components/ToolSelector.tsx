import React from "react";
import {
  Combine,
  Scissors,
  RotateCw,
  Stamp,
  Hash,
  Minimize2,
  FileSignature,
  Image,
  FileImage,
  Lock,
  Sparkles,
} from "lucide-react";
import type { PdfToolCategory, ToolMeta } from "../types";

export const TOOLS: ToolMeta[] = [
  {
    id: "merge",
    name: "Merge",
    shortDesc: "Combine multiple PDF files into one document.",
    iconName: "Combine",
    color: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "split",
    name: "Split",
    shortDesc: "Separate pages or extract specific page ranges.",
    iconName: "Scissors",
    color: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    id: "reorder",
    name: "Organize",
    shortDesc: "Reorder, rotate, or delete individual pages visually.",
    iconName: "RotateCw",
    color: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "watermark",
    name: "Watermark",
    shortDesc: "Stamp custom text or brand logos with opacity.",
    iconName: "Stamp",
    color: "bg-purple-50 text-purple-600 border-purple-100",
  },
  {
    id: "page-numbers",
    name: "Numbering",
    shortDesc: "Add headers, footers, or 'Page X of Y' numbers.",
    iconName: "Hash",
    color: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
  {
    id: "compress",
    name: "Compress",
    shortDesc: "Reduce PDF file size for fast web & email upload.",
    iconName: "Minimize2",
    color: "bg-green-50 text-green-600 border-green-100",
  },
  {
    id: "sign",
    name: "Sign",
    shortDesc: "Draw or upload digital signatures onto any page.",
    iconName: "FileSignature",
    color: "bg-violet-50 text-violet-600 border-violet-100",
  },
  {
    id: "img-to-pdf",
    name: "Img to PDF",
    shortDesc: "Convert PNG, JPG, or WebP photos into a PDF.",
    iconName: "Image",
    color: "bg-sky-50 text-sky-600 border-sky-100",
  },
  {
    id: "pdf-to-img",
    name: "PDF to PNG",
    shortDesc: "Export PDF pages as high-resolution PNG images.",
    iconName: "FileImage",
    color: "bg-teal-50 text-teal-600 border-teal-100",
  },
  {
    id: "protect",
    name: "Encrypt",
    shortDesc: "Set password security and document restriction.",
    iconName: "Lock",
    color: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    id: "ai-assistant",
    name: "AI Insights",
    shortDesc: "Summarize, extract key data, or ask questions with AI.",
    iconName: "Sparkles",
    badge: "Gemini",
    color: "bg-indigo-50 text-indigo-600 border-indigo-100",
  },
];

interface ToolSelectorProps {
  activeTool: PdfToolCategory;
  onSelectTool: (tool: PdfToolCategory) => void;
}

export const ToolSelector: React.FC<ToolSelectorProps> = ({
  activeTool,
  onSelectTool,
}) => {
  const getIcon = (name: string) => {
    switch (name) {
      case "Combine":
        return <Combine className="w-5 h-5" />;
      case "Scissors":
        return <Scissors className="w-5 h-5" />;
      case "RotateCw":
        return <RotateCw className="w-5 h-5" />;
      case "Stamp":
        return <Stamp className="w-5 h-5" />;
      case "Hash":
        return <Hash className="w-5 h-5" />;
      case "Minimize2":
        return <Minimize2 className="w-5 h-5" />;
      case "FileSignature":
        return <FileSignature className="w-5 h-5" />;
      case "Image":
        return <Image className="w-5 h-5" />;
      case "FileImage":
        return <FileImage className="w-5 h-5" />;
      case "Lock":
        return <Lock className="w-5 h-5" />;
      case "Sparkles":
        return <Sparkles className="w-5 h-5" />;
      default:
        return <Combine className="w-5 h-5" />;
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2.5 mb-6">
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            id={`btn-tool-${tool.id}`}
            onClick={() => onSelectTool(tool.id)}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
              isActive
                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/30"
                : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs"
            }`}
          >
            {tool.badge && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold tracking-wider uppercase rounded bg-blue-600 text-white shadow-xs">
                {tool.badge}
              </span>
            )}
            <div
              className={`p-2 rounded-lg mb-1.5 transition-transform group-hover:scale-105 ${
                isActive
                  ? "bg-white/15 text-white"
                  : `${tool.color} border`
              }`}
            >
              {getIcon(tool.iconName)}
            </div>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider line-clamp-1 ${
                isActive ? "text-white" : "text-slate-800"
              }`}
            >
              {tool.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};
