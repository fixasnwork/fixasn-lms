// Render test: build a minimal PDF and rasterize it via pdfjs-dist
// using @napi-rs/canvas as the Node canvas. Confirms the full server-side
// rendering pipeline works on this host.
import { createRequire } from "node:module";
import path from "node:path";
import url from "node:url";
import { createCanvas } from "@napi-rs/canvas";

const here = path.dirname(url.fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, "..", "package.json"));

function buildMinimalPdf() {
  const content = "BT /F1 24 Tf 100 700 Td (Hello PDF) Tj ET";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
    `4 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "binary"));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, "binary");
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(body, "binary");
}

async function main() {
  const pdfjs = require("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

  // Provide a Node canvas factory that uses @napi-rs/canvas.
  class NodeCanvasFactory {
    create(w, h) {
      const canvas = createCanvas(w, h);
      return { canvas, context: canvas.getContext("2d") };
    }
    reset(canvasAndContext, w, h) {
      canvasAndContext.canvas.width = w;
      canvasAndContext.canvas.height = h;
    }
    destroy(canvasAndContext) {
      canvasAndContext.canvas.width = 0;
      canvasAndContext.canvas.height = 0;
      canvasAndContext.canvas = null;
      canvasAndContext.context = null;
    }
  }

  const pdfBytes = buildMinimalPdf();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(pdfBytes),
    canvasFactory: new NodeCanvasFactory(),
    standardFontDataUrl: path.join(path.dirname(url.fileURLToPath(import.meta.url)), "..", "node_modules", "pdfjs-dist", "standard_fonts") + path.sep,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;

  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const w = Math.max(1, Math.ceil(viewport.width));
  const h = Math.max(1, Math.ceil(viewport.height));
  const factory = new NodeCanvasFactory();
  const ctx = factory.create(w, h);
  await page.render({ canvasContext: ctx.context, viewport, canvasFactory: factory }).promise;

  const png = ctx.canvas.toBuffer("image/png");
  await doc.cleanup();
  if (typeof doc.destroy === "function") doc.destroy();

  console.log(JSON.stringify({
    numPages: doc.numPages,
    pngBytes: png.length,
    viewport: { w, h },
  }, null, 2));
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
