import React, { useState } from "react";
import { Sparkles, FileText, MessageSquare, Tag, Calendar, DollarSign, Users, Send, Loader2, RefreshCw } from "lucide-react";
import type { PdfFileItem, AiDocMetadata, AiChatMessage } from "../types";
import { extractTextFromPdf } from "../lib/pdfUtils";

interface AiAssistantToolProps {
  fileItems: PdfFileItem[];
}

export const AiAssistantTool: React.FC<AiAssistantToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];

  const [activeSubTab, setActiveSubTab] = useState<"summary" | "metadata" | "chat">("summary");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [summaryResult, setSummaryResult] = useState<string | null>(null);

  const [metadataResult, setMetadataResult] = useState<AiDocMetadata | null>(null);

  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);

  if (!activeFile) return null;

  const getBase64OrText = async () => {
    // Try extracting plain text first
    const extractedText = await extractTextFromPdf(activeFile.arrayBuffer);
    if (extractedText && extractedText.length > 50) {
      return { textContent: extractedText };
    }
    // Fallback to base64 PDF
    const bytes = new Uint8Array(activeFile.arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const pdfBase64 = btoa(binary);
    return { pdfBase64 };
  };

  const handleGenerateSummary = async () => {
    setIsAnalyzing(true);
    setSummaryResult(null);

    try {
      const payload = await getBase64OrText();
      const res = await fetch("/api/gemini/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSummaryResult(data.result);
    } catch (err: any) {
      console.error("Failed to generate summary:", err);
      setSummaryResult(`Error: ${err?.message || "Failed to analyze document with AI."}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExtractMetadata = async () => {
    setIsAnalyzing(true);
    setMetadataResult(null);

    try {
      const payload = await getBase64OrText();
      const res = await fetch("/api/gemini/extract-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMetadataResult(data.metadata);
    } catch (err: any) {
      console.error("Failed to extract metadata:", err);
      alert(err?.message || "Failed to extract metadata.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuestion.trim() || isChatSending) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: inputQuestion.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    const questionText = inputQuestion;
    setInputQuestion("");
    setIsChatSending(true);

    try {
      const payload = await getBase64OrText();
      const history = chatMessages.map((m) => ({ role: m.role, text: m.text }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          question: questionText,
          history,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: data.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: AiChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: `Sorry, I encountered an error: ${err?.message || "Failed to get response."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" /> AI Document Intelligence
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Powered by Gemini AI • Active file: <span className="font-semibold text-slate-700">{activeFile.name}</span>
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveSubTab("summary")}
            id="btn-ai-subtab-summary"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "summary"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> AI Summary
          </button>
          <button
            onClick={() => setActiveSubTab("metadata")}
            id="btn-ai-subtab-metadata"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "metadata"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600"
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Key Insights
          </button>
          <button
            onClick={() => setActiveSubTab("chat")}
            id="btn-ai-subtab-chat"
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === "chat"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Ask Document
          </button>
        </div>
      </div>

      {/* Tab 1: AI Summary */}
      {activeSubTab === "summary" && (
        <div className="space-y-4">
          {!summaryResult && (
            <div className="bg-indigo-50/60 border border-indigo-100 p-6 rounded-2xl text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-3 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Generate Instant Executive Summary
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                Extract key bullet points, main topics, and essential findings from this {activeFile.pageCount}-page PDF automatically.
              </p>
              <button
                onClick={handleGenerateSummary}
                disabled={isAnalyzing}
                id="btn-generate-ai-summary"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Analyzing Document...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" /> Summarize PDF
                  </>
                )}
              </button>
            </div>
          )}

          {summaryResult && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 relative">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-4">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" /> Executive AI Summary
                </span>
                <button
                  onClick={handleGenerateSummary}
                  disabled={isAnalyzing}
                  id="btn-re-summarize"
                  className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>

              <div className="text-xs leading-relaxed text-slate-700 whitespace-pre-line font-sans space-y-2">
                {summaryResult}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Key Metadata Extractor */}
      {activeSubTab === "metadata" && (
        <div className="space-y-4">
          {!metadataResult && (
            <div className="bg-indigo-50/60 border border-indigo-100 p-6 rounded-2xl text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center mb-3 shadow-sm">
                <Tag className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">
                Extract Structured Metadata & Key Metrics
              </h3>
              <p className="text-xs text-slate-500 max-w-md mb-4">
                Automatically identify key parties, dates, financial figures, action items, and topic tags.
              </p>
              <button
                onClick={handleExtractMetadata}
                disabled={isAnalyzing}
                id="btn-extract-metadata"
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-xs hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Extracting Insights...
                  </>
                ) : (
                  <>
                    <Tag className="w-4 h-4" /> Extract Structured Insights
                  </>
                )}
              </button>
            </div>
          )}

          {metadataResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* General Details */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5 text-xs">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2">
                    Document Profile
                  </h4>
                  <p>
                    <span className="font-semibold text-slate-500">Title:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {metadataResult.documentTitle || "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Category:</span>{" "}
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold text-[10px]">
                      {metadataResult.documentCategory || "General Document"}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-500">Language:</span>{" "}
                    <span className="font-medium text-slate-800">
                      {metadataResult.primaryLanguage || "English"}
                    </span>
                  </p>
                </div>

                {/* Parties Involved */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Parties & Entities Mentioned
                  </h4>
                  {metadataResult.partiesInvolved && metadataResult.partiesInvolved.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {metadataResult.partiesInvolved.map((p, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded bg-white border border-slate-200 font-medium text-slate-700"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No specific parties detected.</p>
                  )}
                </div>

                {/* Dates Mentioned */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Key Dates Found
                  </h4>
                  {metadataResult.datesFound && metadataResult.datesFound.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {metadataResult.datesFound.map((d, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 font-mono font-medium"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No explicit dates detected.</p>
                  )}
                </div>

                {/* Financial Amounts */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Financial Figures
                  </h4>
                  {metadataResult.financialMetrics && metadataResult.financialMetrics.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {metadataResult.financialMetrics.map((f, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">No financial metrics found.</p>
                  )}
                </div>
              </div>

              {/* Action Items */}
              {metadataResult.keyActionItems && metadataResult.keyActionItems.length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl text-xs space-y-2">
                  <h4 className="font-bold text-indigo-900">Key Action Items / Follow-ups</h4>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    {metadataResult.keyActionItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Interactive Q&A Chat */}
      {activeSubTab === "chat" && (
        <div className="flex flex-col h-[400px] border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
          {/* Chat message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Ask anything about this document</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  "What is the agreement date?", "Summarize section 2", "List all deliverables"
                </p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs shadow-2xs ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                    <span
                      className={`text-[9px] block mt-1 text-right ${
                        msg.role === "user" ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))
            )}
            {isChatSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" /> Analyzing document context...
                </div>
              </div>
            )}
          </div>

          {/* Chat input box */}
          <form onSubmit={handleSendChatMessage} className="p-2.5 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              placeholder="Ask a question about this PDF..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              id="input-ai-chat-question"
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isChatSending || !inputQuestion.trim()}
              id="btn-send-ai-question"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> Ask
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
