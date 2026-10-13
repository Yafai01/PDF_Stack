import express, { type NextFunction, type Request, type Response } from "express";
import { GoogleGenAI } from "@google/genai";

/** Default model; override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

const MAX_TEXT_CHARS = 200_000;
const MAX_QUESTION_CHARS = 2_000;
const MAX_HISTORY_TURNS = 20;
const MAX_HISTORY_CHARS = 20_000;
// ~15 MB of PDF once base64-decoded; requests above the JSON body limit are rejected earlier.
const MAX_PDF_BASE64_CHARS = 20 * 1024 * 1024;

type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Minimal interface of the Gemini client used here (lets tests inject a fake). */
export interface GenerateClient {
  models: {
    generateContent(args: {
      model: string;
      contents: { parts: Part[] };
      config?: Record<string, unknown>;
    }): Promise<{ text?: string }>;
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface AppOptions {
  /** Returns a Gemini client, or null when no API key is configured. */
  getClient?: () => GenerateClient | null;
  model?: string;
}

function defaultClientFactory(): GenerateClient | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey }) as unknown as GenerateClient;
}

/** Build the document part of a Gemini request from the client payload. */
export function buildDocumentPart(body: unknown, label: string): Part {
  const { pdfBase64, textContent } = (body ?? {}) as Record<string, unknown>;
  if (typeof textContent === "string" && textContent.trim()) {
    return { text: `${label}:\n${textContent.slice(0, MAX_TEXT_CHARS)}` };
  }
  if (typeof pdfBase64 === "string" && pdfBase64.length > 0) {
    const data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    if (data.length > MAX_PDF_BASE64_CHARS) throw new HttpError(413, "The PDF is too large for AI analysis.");
    if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new HttpError(400, "pdfBase64 must be base64-encoded.");
    return { inlineData: { mimeType: "application/pdf", data } };
  }
  throw new HttpError(400, "Missing document content: send textContent or pdfBase64.");
}

export function createApp(options: AppOptions = {}) {
  const getClient = options.getClient ?? defaultClientFactory;
  const model = options.model ?? (process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL);

  const app = express();
  app.disable("x-powered-by");
  app.use("/api", express.json({ limit: "25mb" }));

  const requireClient = (): GenerateClient => {
    const client = getClient();
    if (!client) {
      throw new HttpError(503, "AI features are not configured on this server (GEMINI_API_KEY is not set).");
    }
    return client;
  };

  const asyncRoute =
    (handler: (req: Request, res: Response) => Promise<void>) => (req: Request, res: Response, next: NextFunction) =>
      handler(req, res).catch(next);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", aiConfigured: getClient() !== null });
  });

  app.post(
    "/api/gemini/summarize",
    asyncRoute(async (req, res) => {
      const docPart = buildDocumentPart(req.body, "Document content");
      const ai = requireClient();
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            docPart,
            {
              text: "Provide a concise executive summary of this document, followed by key takeaways, main topics, and actionable items in clear bullet points.",
            },
          ],
        },
        config: {
          systemInstruction:
            "You are an expert document analyst. Format your response as plain text with short section headings and '-' bullet points. Do not invent facts that are not in the document.",
        },
      });
      res.json({ result: response.text ?? "" });
    })
  );

  app.post(
    "/api/gemini/chat",
    asyncRoute(async (req, res) => {
      const { question, history } = (req.body ?? {}) as Record<string, unknown>;
      if (typeof question !== "string" || !question.trim()) throw new HttpError(400, "Question is required.");
      if (question.length > MAX_QUESTION_CHARS) throw new HttpError(400, "Question is too long.");
      const docPart = buildDocumentPart(req.body, "Document content");
      const ai = requireClient();

      const parts: Part[] = [docPart];
      if (Array.isArray(history) && history.length > 0) {
        const formatted = history
          .slice(-MAX_HISTORY_TURNS)
          .filter((h): h is { role: string; text: string } => typeof h?.text === "string")
          .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
          .join("\n")
          .slice(-MAX_HISTORY_CHARS);
        if (formatted) parts.push({ text: `Prior conversation:\n${formatted}` });
      }
      parts.push({ text: `Question about the document: ${question}` });

      const response = await ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction:
            "You help a user understand a PDF document. Answer only from the provided document. If the answer is not in the document, say so clearly.",
        },
      });
      res.json({ answer: response.text ?? "" });
    })
  );

  app.post(
    "/api/gemini/extract-metadata",
    asyncRoute(async (req, res) => {
      const docPart = buildDocumentPart(req.body, "Document text");
      const ai = requireClient();
      const response = await ai.models.generateContent({
        model,
        contents: {
          parts: [
            docPart,
            {
              text: "Extract structured metadata: title, document type, key parties, dates mentioned, financial amounts, key topics, and action items. Use empty arrays when nothing is found.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          systemInstruction:
            "Return JSON with fields: documentTitle, documentCategory, primaryLanguage, datesFound (string[]), partiesInvolved (string[]), financialMetrics (string[]), keyActionItems (string[]), topicTags (string[]), shortSummary (string).",
        },
      });

      let metadata: unknown;
      try {
        metadata = JSON.parse(response.text || "{}");
      } catch {
        throw new HttpError(502, "The AI service returned an unreadable response. Please try again.");
      }
      res.json({ metadata });
    })
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found." });
  });

  // Central error handler: never leak upstream error details or stack traces.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const status = (err as { status?: number; type?: string })?.status;
    if ((err as { type?: string })?.type === "entity.too.large") {
      res.status(413).json({ error: "The document is too large to send for AI analysis." });
      return;
    }
    if (status === 400) {
      res.status(400).json({ error: "Invalid request body." });
      return;
    }
    console.error("Unhandled API error:", err instanceof Error ? err.message : err);
    res.status(502).json({ error: "The AI service request failed. Please try again later." });
  });

  return app;
}
