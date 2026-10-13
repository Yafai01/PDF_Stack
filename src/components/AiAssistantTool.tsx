import React, { useEffect, useState } from "react";
import { Sparkles, FileText, MessageSquare, Tag, Send, RefreshCw } from "lucide-react";
import type { PdfFileItem, AiDocMetadata, AiChatMessage } from "../types";
import { extractTextFromPdf, errorMessage } from "../lib/pdfUtils";
import { Alert, Button, Panel, PanelHeader, Segmented, cx, inputClass } from "./ui";

interface AiAssistantToolProps {
  fileItems: PdfFileItem[];
}

type Payload = { textContent: string } | { pdfBase64: string };

// Keep the inline PDF fallback under the server's request limit.
const MAX_INLINE_PDF_BYTES = 15 * 1024 * 1024;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: (T & { error?: string }) | null = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (e.g. a proxy error page).
  }
  if (!res.ok || !data) throw new Error(data?.error || `Request failed (HTTP ${res.status}).`);
  return data;
}

function list(items?: string[]) {
  return items && items.length > 0 ? (
    <ul className="list-disc pl-5 space-y-0.5">
      {items.map((v, i) => (
        <li key={i}>{v}</li>
      ))}
    </ul>
  ) : (
    <p className="text-slate-400">None found</p>
  );
}

export const AiAssistantTool: React.FC<AiAssistantToolProps> = ({ fileItems }) => {
  const activeFile = fileItems[0];
  const [tab, setTab] = useState<"summary" | "metadata" | "chat">("summary");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [busy, setBusy] = useState<"summary" | "metadata" | "chat" | null>(null);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AiDocMetadata | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [question, setQuestion] = useState("");

  useEffect(() => {
    setPayload(null);
    setSummary(null);
    setMetadata(null);
    setMessages([]);
    setError("");
  }, [activeFile?.id]);

  if (!activeFile) return null;

  // Prefer extracted text (smaller); fall back to the PDF itself for scanned documents.
  const getPayload = async (): Promise<Payload> => {
    if (payload) return payload;
    const text = await extractTextFromPdf(activeFile.arrayBuffer).catch(() => "");
    let next: Payload;
    if (text.replace(/--- Page \d+ ---/g, "").trim().length > 50) {
      next = { textContent: text };
    } else {
      if (activeFile.size > MAX_INLINE_PDF_BYTES) {
        throw new Error("This PDF has no text layer and is too large to send for AI analysis.");
      }
      next = { pdfBase64: arrayBufferToBase64(activeFile.arrayBuffer) };
    }
    setPayload(next);
    return next;
  };

  const run = async (kind: "summary" | "metadata") => {
    setBusy(kind);
    setError("");
    try {
      const body = await getPayload();
      if (kind === "summary") {
        setSummary((await postJson<{ result: string }>("/api/gemini/summarize", body)).result);
      } else {
        setMetadata((await postJson<{ metadata: AiDocMetadata }>("/api/gemini/extract-metadata", body)).metadata);
      }
    } catch (err) {
      setError(errorMessage(err, "The AI request failed."));
    } finally {
      setBusy(null);
    }
  };

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = question.trim();
    if (!text || busy) return;
    const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text, timestamp: now() }]);
    setQuestion("");
    setBusy("chat");
    setError("");
    try {
      const body = await getPayload();
      const { answer } = await postJson<{ answer: string }>("/api/gemini/chat", { ...body, question: text, history });
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: answer, timestamp: now() }]);
    } catch (err) {
      setError(errorMessage(err, "The AI request failed."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Panel>
      <PanelHeader
        title="AI insights"
        description={
          <>
            Uses Google Gemini through this app's server. The text of{" "}
            <span className="font-medium text-slate-700">{activeFile.name}</span> (or the PDF itself if it has no text
            layer) is sent to Google. AI output can be wrong; verify important details.
          </>
        }
      />

      <Segmented
        label="AI feature"
        value={tab}
        onChange={setTab}
        options={[
          { value: "summary", label: <><FileText className="w-4 h-4" aria-hidden="true" /> Summary</> },
          { value: "metadata", label: <><Tag className="w-4 h-4" aria-hidden="true" /> Key details</> },
          { value: "chat", label: <><MessageSquare className="w-4 h-4" aria-hidden="true" /> Ask</> },
        ]}
      />

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      <div className="mt-4">
        {tab === "summary" &&
          (summary === null ? (
            <div className="rounded-lg border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-600 mb-4">Generate a summary with key takeaways and action items.</p>
              <Button
                variant="primary"
                onClick={() => run("summary")}
                loading={busy === "summary"}
                icon={<Sparkles className="w-4 h-4" aria-hidden="true" />}
                id="btn-generate-ai-summary"
              >
                {busy === "summary" ? "Summarising" : "Summarise"}
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-5">
              <div className="flex justify-end mb-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => run("summary")}
                  loading={busy === "summary"}
                  icon={<RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
                >
                  Regenerate
                </Button>
              </div>
              <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{summary}</div>
            </div>
          ))}

        {tab === "metadata" &&
          (metadata === null ? (
            <div className="rounded-lg border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-600 mb-4">Extract parties, dates, amounts and action items.</p>
              <Button
                variant="primary"
                onClick={() => run("metadata")}
                loading={busy === "metadata"}
                icon={<Tag className="w-4 h-4" aria-hidden="true" />}
                id="btn-extract-metadata"
              >
                {busy === "metadata" ? "Extracting" : "Extract key details"}
              </Button>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-700">
              <div className="rounded-lg border border-slate-200 p-4 space-y-1">
                <dt className="font-medium text-slate-900">Document</dt>
                <dd>Title: {metadata.documentTitle || "Unknown"}</dd>
                <dd>Type: {metadata.documentCategory || "Unknown"}</dd>
                <dd>Language: {metadata.primaryLanguage || "Unknown"}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <dt className="font-medium text-slate-900 mb-1">Parties</dt>
                <dd>{list(metadata.partiesInvolved)}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <dt className="font-medium text-slate-900 mb-1">Dates</dt>
                <dd>{list(metadata.datesFound)}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <dt className="font-medium text-slate-900 mb-1">Amounts</dt>
                <dd>{list(metadata.financialMetrics)}</dd>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">
                <dt className="font-medium text-slate-900 mb-1">Action items</dt>
                <dd>{list(metadata.keyActionItems)}</dd>
              </div>
            </dl>
          ))}

        {tab === "chat" && (
          <div className="flex flex-col h-[420px] rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" aria-live="polite">
              {messages.length === 0 ? (
                <p className="h-full flex items-center justify-center text-sm text-slate-500 text-center">
                  Ask a question about this document, for example "What are the payment terms?"
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={cx("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cx(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                        msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-800"
                      )}
                    >
                      <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                      <span className={cx("block text-[11px] mt-1 text-right", msg.role === "user" ? "text-blue-100" : "text-slate-400")}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {busy === "chat" && <p className="text-sm text-slate-500">Thinking…</p>}
            </div>
            <form onSubmit={ask} className="p-2 bg-white border-t border-slate-200 flex gap-2">
              <label htmlFor="input-ai-chat-question" className="sr-only">
                Question
              </label>
              <input
                id="input-ai-chat-question"
                type="text"
                placeholder="Ask about this PDF"
                value={question}
                maxLength={2000}
                onChange={(e) => setQuestion(e.target.value)}
                className={inputClass}
              />
              <Button
                type="submit"
                variant="primary"
                disabled={!question.trim() || busy !== null}
                icon={<Send className="w-4 h-4" aria-hidden="true" />}
                id="btn-send-ai-question"
              >
                Ask
              </Button>
            </form>
          </div>
        )}
      </div>
    </Panel>
  );
};
