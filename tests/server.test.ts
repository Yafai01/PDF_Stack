import { afterEach, describe, expect, it } from "vitest";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { createApp, type GenerateClient } from "../server/app";

let server: Server | undefined;

async function start(getClient: () => GenerateClient | null) {
  const app = createApp({ getClient, model: "test-model" });
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

afterEach(async () => {
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const fakeClient = (generate: GenerateClient["models"]["generateContent"]): (() => GenerateClient) => () => ({
  models: { generateContent: generate },
});

describe("AI API routes", () => {
  it("returns 503 when no API key is configured", async () => {
    const base = await start(() => null);
    const res = await post(`${base}/api/gemini/summarize`, { textContent: "hello" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/not configured/i);

    const health = await (await fetch(`${base}/api/health`)).json();
    expect(health).toEqual({ status: "ok", aiConfigured: false });
  });

  it("validates input before calling the model", async () => {
    let called = false;
    const base = await start(
      fakeClient(async () => {
        called = true;
        return { text: "x" };
      })
    );
    expect((await post(`${base}/api/gemini/summarize`, {})).status).toBe(400);
    expect((await post(`${base}/api/gemini/chat`, { textContent: "doc" })).status).toBe(400);
    expect((await post(`${base}/api/gemini/summarize`, { pdfBase64: "not base64!!" })).status).toBe(400);
    const badJson = await fetch(`${base}/api/gemini/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    expect(badJson.status).toBe(400);
    expect(called).toBe(false);
  });

  it("proxies a summary request using the server-side model", async () => {
    let seenModel = "";
    const base = await start(
      fakeClient(async (args) => {
        seenModel = args.model;
        return { text: "Summary text" };
      })
    );
    const res = await post(`${base}/api/gemini/summarize`, { textContent: "Document body" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: "Summary text" });
    expect(seenModel).toBe("test-model");
  });

  it("does not leak upstream error details", async () => {
    const base = await start(
      fakeClient(async () => {
        throw new Error("upstream detail: key=abc123");
      })
    );
    const res = await post(`${base}/api/gemini/chat`, { textContent: "doc", question: "q?" });
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("abc123");
  });

  it("returns 502 when the model returns malformed metadata JSON", async () => {
    const base = await start(fakeClient(async () => ({ text: "{not json" })));
    const res = await post(`${base}/api/gemini/extract-metadata`, { textContent: "doc" });
    expect(res.status).toBe(502);
  });
});
