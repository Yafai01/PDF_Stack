# PDF Tool Studio Pro

An all-in-one, privacy-focused, client-side PDF editing & document intelligence suite powered by **pdf-lib**, **pdfjs-dist**, and **Google Gemini AI**.

---

## ✨ Features

- 📑 **Merge PDFs**: Combine multiple PDF files into a single ordered document.
- ✂️ **Split PDF**: Separate pages into individual files or extract custom page ranges.
- 🔄 **Organize & Rotate**: Visual page reordering, page deletion, and 90°/180°/270° rotation.
- 🔖 **Watermark**: Stamp custom text or brand logos with adjustable opacity, scale, and angle.
- 🔢 **Page Numbers**: Add headers, footers, or dynamic page numbering (`Page X of Y`).
- ⚡ **Compress PDF**: Optimize and shrink PDF file sizes for web, email attachments, or archiving.
- ✍️ **Digital Signatures**: Draw, type, or upload signatures and stamp them onto any page.
- 🖼️ **Images to PDF**: Convert PNG, JPG, or WebP photos into a clean PDF document.
- 📷 **PDF to PNG**: Render and export high-resolution PNG page images.
- 🔒 **Password Protect & Encrypt**: Apply security restrictions, user/owner passwords, and permissions.
- 🧠 **AI Document Intelligence**:
  - **Executive Summaries**: Instant bullet points and key takeaways powered by Gemini AI.
  - **Structured Key Insights**: Automatically extract entities, dates, categories, and financial metrics.
  - **Interactive Document Q&A**: Ask any question directly to your document context.

---

## 🔒 Privacy First

All PDF document transformations (merging, splitting, rotating, watermarking, signing, and compressing) run **100% locally in your browser** using WebAssembly and client-side JavaScript. Your documents never leave your device except when explicitly requesting AI processing via server-proxied Gemini API calls.

---

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons
- **PDF Engine**: `pdf-lib`, `pdfjs-dist` (PDF.js canvas rendering)
- **AI Backend**: Node.js / Express with `@google/genai` (Gemini Flash)
- **Build Tooling**: Vite, esbuild, TypeScript

---

## 💻 Getting Started Locally

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/pdf-tool-studio.git
   cd pdf-tool-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and add your Gemini API key (optional, for AI features):
   ```bash
   cp .env.example .env
   ```
   In `.env`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 📄 License

MIT License. Free to use, modify, and distribute.
