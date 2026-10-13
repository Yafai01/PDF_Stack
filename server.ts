import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createApp } from "./server/app";

dotenv.config({ quiet: true });

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");
// Bind to localhost in development so the AI proxy is not exposed to the LAN.
const HOST = process.env.HOST || (isProduction ? "0.0.0.0" : "127.0.0.1");

async function startServer() {
  const app = createApp();

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`PDF Stack running on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
      console.log("GEMINI_API_KEY is not set: AI Insights will be unavailable; all other tools work offline.");
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
