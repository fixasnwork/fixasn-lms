// Real-PDF tests for `lib/pdfPageRender.ts`.
//
// This is the test coverage that was missing in the prior implementation:
// the route tests fully mocked `renderPdfToPngs`, so the actual renderer
// was never exercised. These tests build a minimal valid PDF in-memory
// and verify that text content actually appears in the rendered output.

import { describe, it, expect } from "vitest";
import { renderPdfToPngs, MAX_PDF_PAGES, PdfTooLargeError, RENDER_SCALE } from "./pdfPageRender";
import sharp from "sharp";

/**
 * Build a minimal 1-page PDF with a few lines of black text on a
 * default-white page. Uses only ASCII content so it does not depend
 * on the CMap loader.
 */
function buildPdf(text: string, { pageCount = 1 }: { pageCount?: number } = {}): Buffer {
  const content = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const pageRefs = Array.from({ length: pageCount }, (_, i) => `${3 + i} 0 R`).join(" ");
  const objs: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    `2 0 obj\n<< /Type /Pages /Kids [${pageRefs}] /Count ${pageCount} >>\nendobj\n`,
  ];
  for (let i = 0; i < pageCount; i++) {
    objs.push(
      `${3 + i} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${3 + pageCount + i} 0 R /Resources << /Font << /F1 ${3 + 2 * pageCount + i} 0 R >> >> >>\nendobj\n`
    );
  }
  for (let i = 0; i < pageCount; i++) {
    objs.push(
      `${3 + pageCount + i} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`
    );
  }
  for (let i = 0; i < pageCount; i++) {
    objs.push(
      `${3 + 2 * pageCount + i} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
    );
  }
  let body = "%PDF-1.4\n";
  const offs = [0];
  for (const o of objs) {
    offs.push(Buffer.byteLength(body, "binary"));
    body += o;
  }
  const xref = Buffer.byteLength(body, "binary");
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    body += `${String(offs[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "binary");
}

describe("pdfPageRender constants", () => {
  it("exports the expected render scale (2.5x for zoom headroom)", () => {
    expect(RENDER_SCALE).toBe(2.5);
  });

  it("exports a 200-page cap", () => {
    expect(MAX_PDF_PAGES).toBe(200);
  });
});

describe("renderPdfToPngs", () => {
  it("returns one PNG buffer per page for a 1-page PDF", async () => {
    const pdf = buildPdf("Hello PDF", { pageCount: 1 });
    const result = await renderPdfToPngs(pdf);
    expect(result.failedPages).toEqual([]);
    expect(result.pngBuffers).toHaveLength(1);
    expect(result.pngBuffers[0]!.length).toBeGreaterThan(0);
  });

  it("renders text content visibly (not a blank canvas)", async () => {
    const pdf = buildPdf("VISIBLE TEXT CONTENT", { pageCount: 1 });
    const result = await renderPdfToPngs(pdf);
    const buf = result.pngBuffers[0]!;
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    let nearBlack = 0;
    for (let p = 0; p < data.length; p += info.channels) {
      const r = data[p] ?? 0;
      const g = data[p + 1] ?? 0;
      const b = data[p + 2] ?? 0;
      if (r < 30 && g < 30 && b < 30) nearBlack++;
    }
    // A real render of 18pt text on a 612x792 page should produce at
    // least a few thousand dark pixels. The old buggy implementation
    // produced ~1000; the working baseline is 3000+.
    expect(nearBlack).toBeGreaterThan(2500);
  });

  it("renders at 2.5x scale (image is 1530x1980 for a 612x792 page)", async () => {
    const pdf = buildPdf("scale test", { pageCount: 1 });
    const result = await renderPdfToPngs(pdf);
    const meta = await sharp(result.pngBuffers[0]!).metadata();
    // 612 * 2.5 = 1530, 792 * 2.5 = 1980
    expect(meta.width).toBe(1530);
    expect(meta.height).toBe(1980);
  });

  it("handles multi-page PDFs", async () => {
    const pdf = buildPdf("page text", { pageCount: 3 });
    const result = await renderPdfToPngs(pdf);
    expect(result.failedPages).toEqual([]);
    expect(result.pngBuffers).toHaveLength(3);
  });

  it("throws PdfTooLargeError when the PDF exceeds the page cap", async () => {
    // 201 pages — over the 200 cap.
    const pdf = buildPdf("too big", { pageCount: 201 });
    await expect(renderPdfToPngs(pdf)).rejects.toBeInstanceOf(PdfTooLargeError);
  });

  it("rejects an invalid PDF buffer with an error", async () => {
    const bogus = Buffer.from("not a pdf at all");
    await expect(renderPdfToPngs(bogus)).rejects.toBeTruthy();
  });
});
