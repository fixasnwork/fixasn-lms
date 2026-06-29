// ─────────────────────────────────────────────
// pdfPageRender
// Server-side PDF → PNG rasterization via `pdf-to-img` (a thin wrapper
// around pdfjs-dist + @napi-rs/canvas that bakes in the correct Node
// config: standardFontDataUrl, cMapUrl, cMapPacked, isEvalSupported).
//
// Pre-rendered at RENDER_SCALE = 2.5x so the user viewer can CSS-zoom
// in 1.5-2x without obvious pixelation. Higher resolutions are
// possible but cost linear storage growth.
//
// 200-page cap is enforced before any page is rendered (PdfTooLargeError).
// Per-page failures are isolated: the failed page number is appended
// to `failedPages` and the route surfaces 422 with the list.
// ─────────────────────────────────────────────
import { pdf } from "pdf-to-img";

export const MAX_PDF_PAGES = 200;
/** Native render scale. Higher = sharper zoom, more storage. */
export const RENDER_SCALE = 2.5;

export interface RenderResult {
  /** PNG buffers in page order (1-indexed callers must add 1 when naming). */
  pngBuffers: Buffer[];
  /** 1-indexed page numbers that failed to render. */
  failedPages: number[];
}

export class PdfTooLargeError extends Error {
  readonly pageCount: number;
  constructor(pageCount: number) {
    super(`PDF has ${pageCount} pages; maximum is ${MAX_PDF_PAGES}`);
    this.name = "PdfTooLargeError";
    this.pageCount = pageCount;
  }
}

/**
 * Rasterize every page of `pdfBuffer` to a PNG Buffer.
 *
 * The page count is read from the document header before any page is
 * rendered, so a 1000-page PDF that exceeds MAX_PDF_PAGES throws
 * PdfTooLargeError without paying the per-page cost. Per-page
 * render failures (corrupt stream, missing image, etc.) land in
 * `failedPages` and the route returns 422 with the partial result.
 */
export async function renderPdfToPngs(pdfBuffer: Buffer): Promise<RenderResult> {
  // `pdf-to-img` opens the document during the `pdf()` call. `length`
  // is the page count; reading it after `pdf()` returns means the
  // header has been parsed but no page has been rendered yet.
  const doc = await pdf(pdfBuffer, { scale: RENDER_SCALE });

  try {
    if (doc.length > MAX_PDF_PAGES) {
      throw new PdfTooLargeError(doc.length);
    }

    const pngBuffers: Buffer[] = [];
    const failedPages: number[] = [];

    for (let i = 1; i <= doc.length; i++) {
      try {
        const buf = await doc.getPage(i);
        pngBuffers.push(buf);
      } catch (err) {
        // Per-page failure: skip + log. The caller surfaces this as 422.
        console.error(
          `[pdfPageRender] page ${i} failed:`,
          err instanceof Error ? err.message : err
        );
        failedPages.push(i);
      }
    }

    return { pngBuffers, failedPages };
  } finally {
    if (!doc.isDestroyed) {
      await doc.destroy();
    }
  }
}
