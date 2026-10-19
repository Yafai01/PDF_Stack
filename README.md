# PDF Stack

PDF Stack is a set of PDF tools that runs in the browser, built with **pdf-lib** and **pdfjs-dist**. It also has an optional AI assistant that uses **Google Gemini** to summarize documents, extract structured details and answer questions about them.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)

## Features

- **Merge PDFs**: combine several PDFs into one document, in the order you choose.
- **Split PDF**: extract a page range (for example `1-3, 5`) or split every page into its own file.
- **Organize & rotate**: reorder pages visually, delete pages, and rotate them.
- **Watermark**: stamp text or an image on every page, with adjustable opacity, rotation and position.
- **Page numbers**: add page numbers or a custom header or footer, such as `Page {page} of {total}`.
- **Compress**: makes a file smaller by turning each page into a compressed image at a low, medium or high level. The result is image-only, so text can no longer be selected.
- **Sign**: draw, type or upload a signature and place it on a page.
- **Images to PDF**: combine PNG, JPG and WebP images into one PDF.
- **PDF to PNG**: render pages as PNG images.
- **Protect (work in progress)**: the screen for passwords and permissions is built, but files are not encrypted yet. The current code only re-saves the document, because pdf-lib can't encrypt files.
- **AI assistant (Gemini)**:
  - a summary with key takeaways,
  - structured details as JSON (title, category, dates, parties, financial figures, action items, topics),
  - questions and answers about the document in a chat.

## Privacy

All editing, merging, splitting, rotating, watermarking, signing and compressing happens in the browser. A document only leaves your machine if you use the AI assistant. The assistant sends the document's text, or the PDF itself, to the Express server, which forwards it to the Gemini API.

## Tech stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion, Lucide icons
- **PDF engine**: `pdf-lib` (editing), `pdfjs-dist` (rendering and text extraction)
- **AI backend**: Node.js / Express with `@google/genai`
- **Build tooling**: Vite 6 for the client, esbuild for the server bundle

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm (a `bun.lock` is also included)

### Installation

```bash
git clone https://github.com/Yafai01/PDF_Stack.git
cd PDF_Stack
npm install
```

### Environment variables

Copy `.env.example` to `.env` and set your Gemini API key. You only need it for the AI assistant:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run

```bash
npm run dev
```

Then open http://localhost:3000.

### Production build

```bash
npm run build
NODE_ENV=production npm start   # node dist/server.cjs
```

## Project structure

```
server.ts               Express server: /api/health and /api/gemini/* endpoints, Vite middleware
src/App.tsx             App shell and tool switching
src/components/         One component per tool (Merge, Split, Watermark, Sign, ...)
src/lib/pdfUtils.ts     pdf-lib / pdf.js helpers
src/types.ts            Shared types
```
