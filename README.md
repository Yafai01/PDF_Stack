# PDF Stack

A browser-based PDF toolkit: merge, split, organise, watermark, number, sign, compress, convert and password-protect PDFs, with optional AI summaries via Google Gemini.

All PDF processing runs locally in the browser with [pdf-lib](https://github.com/cantoo-scribe/pdf-lib) and [PDF.js](https://mozilla.github.io/pdf.js/). Files are never uploaded, except when you use **AI insights**, which sends the document text (or the PDF itself if it has no text layer) to this app's server, which forwards it to the Gemini API.

## Features

| Tool | What it does |
| --- | --- |
| Merge | Combine several PDFs, reorder them and optionally pick page ranges per file. |
| Split / extract | Extract a page range (`1-3, 5`) or hand-picked pages into a new PDF. |
| Organize pages | Reorder, rotate, duplicate or delete pages. |
| Watermark | Text or PNG/JPEG image watermark: centred, diagonal, corner or tiled. |
| Page numbers | `Page X of Y`, `Page X`, `X / Y` or a custom pattern with `{page}` / `{total}`. |
| Sign | Draw, type or upload a signature image and place it on a page. |
| Compress | Restructures the PDF (object streams, deflates uncompressed streams, optional metadata removal) and can re-encode JPEG images. Shows the real before/after size. |
| Images to PDF | PNG, JPEG or WebP images to a PDF (A4, Letter or image size). |
| PDF to PNG | Render each page as a PNG at 72 to 216 dpi. |
| Password protect | AES-256 encryption (PDF 2.0 standard security handler) with an open password, an optional owner password and print/copy/edit permissions. |
| AI insights | Summary, key-detail extraction and Q&A through Google Gemini (requires `GEMINI_API_KEY` on the server). |

## Limitations

- **Sign** places an image of your signature. It is not a cryptographic (certificate-based) digital signature.
- **Compress** never rasterises pages, so it keeps text searchable, but results depend on the file. PDFs that are already optimised may not get smaller; the app then says so and recommends keeping the original. Only plain RGB/Gray JPEG images are re-encoded; CMYK, ICC-based and other image types are left untouched.
- **Password protect**: the open password is real encryption. Permission flags (printing, copying, editing) are honoured by mainstream readers but are advisory by design in the PDF format.
- Password-protected PDFs cannot be used as input to the other tools; remove the password in a PDF reader first.
- Watermark and page-number text use the built-in Helvetica font, so only Latin (WinAnsi) characters are supported.
- Page previews are rendered for the first 30 pages of each document; later pages show a placeholder.
- Everything is held in browser memory, so very large PDFs (hundreds of MB) can be slow or fail.
- AI output can be wrong; verify important details. AI insights is unavailable without a Gemini API key.

## Tech stack

- React 19, TypeScript, Tailwind CSS 4, lucide-react icons
- `@cantoo/pdf-lib` (maintained pdf-lib fork with encryption support), `pdfjs-dist` 6
- Node.js / Express server: serves the app and proxies Gemini calls (`@google/genai`)
- Vite 6, esbuild, Vitest

## Project structure

```
server.ts                 Entry point: dev (Vite middleware) or production (static dist/) server
server/app.ts             Express app: /api/health and the Gemini proxy routes
src/App.tsx               Layout, tool navigation, shared document list
src/components/           One component per tool, plus ui.tsx (shared UI primitives)
src/lib/pdfOps.ts         Pure pdf-lib operations (merge, split, watermark, ...)
src/lib/pdfSecurity.ts    AES-256 encryption
src/lib/pdfCompress.ts    Compression
src/lib/pdfUtils.ts       Browser-only helpers (PDF.js rendering, downloads)
tests/                    Vitest unit and API tests
```

## Prerequisites

- Node.js 20 or newer (developed with Node 24)
- npm

## Setup

```bash
git clone https://github.com/Yafai01/PDF_Stack.git
cd PDF_Stack
npm ci
cp .env.example .env   # optional, only needed for AI insights
```

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | No | Google Gemini API key. Only read by the server and never sent to the browser. Without it, AI insights returns a "not configured" message and every other tool works normally. |
| `GEMINI_MODEL` | No | Gemini model id. Default: `gemini-3.6-flash`. |
| `PORT` | No | Server port. Default: `3000`. |
| `HOST` | No | Bind address. Default: `127.0.0.1` in development, `0.0.0.0` in production. |

Never commit `.env`; it is git-ignored.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (Express + Vite middleware) on http://localhost:3000 |
| `npm run build` | Build the client to `dist/` and the server to `build/server.cjs` |
| `npm start` | Run the production server (after `npm run build`) |
| `npm run typecheck` | TypeScript type check (`npm run lint` runs the same check) |
| `npm test` | Run the Vitest suite |

## Tests

`npm test` covers:

- encryption: the output cannot be opened without the password, opens with the user and owner passwords, and carries the requested permissions (verified by re-opening with PDF.js, an independent implementation);
- compression: real size reporting, text preserved, metadata removal, image re-encoding rules;
- PDF operations: page-range parsing, merge, split, page numbering, encrypted-input handling;
- the API: missing-key handling, input validation, and that upstream error details are not leaked.

## Deployment

Build with `npm run build`, then run `npm start` (or `node build/server.cjs --production`) with `GEMINI_API_KEY` set in the environment if you want AI insights. The server serves `dist/` and the `/api` routes from one process. Put it behind HTTPS; the AI routes have no authentication or rate limiting, so anyone who can reach the server can spend your Gemini quota.

## License

MIT. See [LICENSE](LICENSE).
