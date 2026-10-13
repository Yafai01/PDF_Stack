export type PdfToolCategory =
  | "merge"
  | "split"
  | "reorder"
  | "watermark"
  | "page-numbers"
  | "compress"
  | "sign"
  | "img-to-pdf"
  | "pdf-to-img"
  | "protect"
  | "ai-assistant";

export type ToolGroup = "Organize" | "Edit" | "Convert & optimize" | "Security" | "AI";

export interface ToolMeta {
  id: PdfToolCategory;
  name: string;
  shortDesc: string;
  group: ToolGroup;
  /** Works on several uploaded PDFs at once. */
  multiFile?: boolean;
  /** Takes its own (non-PDF) input instead of the shared PDF upload. */
  ownInput?: boolean;
}

export interface PdfFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
  pageCount: number;
  pageThumbnails: string[]; // base64 data URLs
}

export interface PageThumbnailItem {
  id: string; // fileId_pageIndex
  fileId: string;
  fileName: string;
  pageIndex: number; // 0-based
  displayPageNum: number; // 1-based
  originalIndex: number;
  rotation: number; // 0, 90, 180, 270
  isSelected: boolean;
  thumbnailUrl: string;
}

export interface WatermarkConfig {
  type: "text" | "image";
  text: string;
  fontSize: number;
  colorHex: string;
  opacity: number; // 0.1 to 1.0
  rotationDegrees: number; // -90 to 90
  position: "center" | "diagonal" | "bottom-right" | "top-left" | "grid";
  imageFile?: File | null;
  imageDataUrl?: string | null;
}

export interface PageNumberConfig {
  position: "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right";
  format: "page_x_of_y" | "page_x" | "x_slash_y" | "custom";
  customText?: string; // e.g. "Doc - Page {page}"
  fontSize: number;
  colorHex: string;
  marginPt: number; // margin from edge
  startFromPage: number; // page to start numbering
}

export interface SignaturePlacement {
  id: string;
  pageIndex: number;
  type: "draw" | "type" | "upload";
  dataUrl: string;
  xRatio: number; // 0 to 1 relative position
  yRatio: number; // 0 to 1 relative position
  widthPt: number;
  heightPt: number;
}

export interface ImageToPdfConfig {
  pageSize: "a4" | "letter" | "fit";
  orientation: "portrait" | "landscape" | "auto";
  marginPt: number; // 0, 10, 20, 36
  fitMode: "contain" | "stretch";
}

export interface ProtectConfig {
  userPassword: string;
  ownerPassword?: string;
  allowPrinting: boolean;
  allowCopying: boolean;
  allowModifying: boolean;
}

export interface AiDocMetadata {
  documentTitle?: string;
  documentCategory?: string;
  primaryLanguage?: string;
  datesFound?: string[];
  partiesInvolved?: string[];
  financialMetrics?: string[];
  keyActionItems?: string[];
  topicTags?: string[];
  shortSummary?: string;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}
