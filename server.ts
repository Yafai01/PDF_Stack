import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body parser limit for PDF base64 handling
app.use(express.json({ limit: "50mb" }));

// Initialize Gemini client lazily/safely
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// AI Summarize PDF / Document Endpoint
app.post("/api/gemini/summarize", async (req, res) => {
  try {
    const { pdfBase64, textContent, promptCustom } = req.body;
    const ai = getGeminiClient();

    const parts: any[] = [];

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
        },
      });
    } else if (textContent) {
      parts.push({
        text: `Document Content:\n${textContent}`,
      });
    } else {
      return res.status(400).json({ error: "Missing document content or PDF file." });
    }

    const defaultPrompt = promptCustom || "Provide a concise executive summary of this document, followed by key takeaways, main topics, and actionable items in clear bullet points.";
    parts.push({ text: defaultPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction: "You are an expert document analyst and PDF processing assistant. Format your response clearly using markdown with section headers, bold key terms, and scannable bullet points.",
      },
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/summarize:", error);
    res.status(500).json({ error: error?.message || "Failed to analyze document with AI." });
  }
});

// AI Q&A Chat with PDF Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { pdfBase64, textContent, question, history } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required." });
    }

    const ai = getGeminiClient();
    const parts: any[] = [];

    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
        },
      });
    } else if (textContent) {
      parts.push({
        text: `Document Content Context:\n${textContent.slice(0, 50000)}`,
      });
    }

    if (history && Array.isArray(history) && history.length > 0) {
      const historyFormatted = history
        .map((h: any) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`)
        .join("\n");
      parts.push({ text: `Prior Conversation History:\n${historyFormatted}` });
    }

    parts.push({ text: `Question about the document: ${question}` });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        systemInstruction: "You are an AI assistant helping a user analyze a PDF document. Answer the user's question accurately based on the provided PDF content. If the answer is not in the document, state so clearly while providing helpful context.",
      },
    });

    res.json({ answer: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    res.status(500).json({ error: error?.message || "Failed to process Q&A question." });
  }
});

// AI Extract Key Metadata (Dates, Parties, Money, Action items, etc)
app.post("/api/gemini/extract-metadata", async (req, res) => {
  try {
    const { pdfBase64, textContent } = req.body;
    const ai = getGeminiClient();

    const parts: any[] = [];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64.replace(/^data:application\/pdf;base64,/, ""),
        },
      });
    } else if (textContent) {
      parts.push({ text: `Document Text:\n${textContent}` });
    }

    parts.push({
      text: "Analyze this document and extract standard structured metadata including title, document type, key parties involved, dates mentioned, financial amounts, key topics, and action items.",
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        systemInstruction: "Extract structured details in JSON format with fields: documentTitle, documentCategory, primaryLanguage, datesFound (array of strings), partiesInvolved (array of strings), financialMetrics (array of strings or key amounts), keyActionItems (array of strings), topicTags (array of strings), shortSummary (string).",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ metadata: parsed });
  } catch (error: any) {
    console.error("Error in /api/gemini/extract-metadata:", error);
    res.status(500).json({ error: error?.message || "Failed to extract metadata." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
