// ─────────────────────────────────────────────
// supabaseStorage
// Server-side helpers for the video PDF module pipeline. All calls
// use the supabaseServer client (service-role key) so they bypass RLS.
//
// Storage layout (Option B — two private buckets):
//   video-pdfs/videos/{videoId}/module.pdf      (original PDF; bucket is
//                                                private — never served
//                                                to clients directly;
//                                                only the watermarking
//                                                route fetches derived
//                                                assets)
//   pdf-pages/videos/{videoId}/page-N.png      (rendered pages; bucket
//                                                is private — pages are
//                                                un-watermarked; serving
//                                                them publicly would
//                                                bypass the
//                                                anti-extraction pipeline)
//
// Image uploads keep using the existing public `uploads` bucket via
// app/api/upload/route.ts — that path is unchanged.
//
// Anti-extraction contract:
//   The original PDF and every rendered page PNG are in private
//   buckets. Clients never receive a Supabase public URL for either.
//   The only path to view a page is
//   GET /api/videos/[id]/pdf/page/[n], which requires an active
//   session + hasAccess and composites a "Copyright Fix ASN Property"
//   watermark on the image before returning it. If either bucket is
//   ever made public, the per-page watermark can be bypassed by
//   hitting the bucket directly.
// ─────────────────────────────────────────────
import { supabaseServer } from "@/lib/supabaseServer";

export const BUCKET_PDF_PAGES = "pdf-pages";
// Private bucket for the original uploaded PDFs. The `uploads` bucket
// is the public bucket for image uploads; the original PDF must NOT
// live there because an authenticated user could otherwise construct
// a public URL and download the un-watermarked original.
export const BUCKET_VIDEO_PDFS = "video-pdfs";
export const ORIGINAL_PDF_PATH = (videoId: number): string =>
  `videos/${videoId}/module.pdf`;
export const PAGE_PATH = (videoId: number, pageNumber: number): string =>
  `videos/${videoId}/page-${pageNumber}.png`;

/**
 * Upload the original PDF (private path) to the `uploads` bucket.
 * Returns the storage path on success.
 */
export async function uploadOriginalPdf(
  videoId: number,
  buffer: Buffer,
  contentType: string
): Promise<{ path: string }> {
  const path = ORIGINAL_PDF_PATH(videoId);
  const { data, error } = await supabaseServer.storage
    .from(BUCKET_VIDEO_PDFS)
    .upload(path, buffer, {
      contentType,
      cacheControl: "31536000", // 1 year; the path is private
      upsert: true,
    });
  if (error) {
    throw new Error(`Failed to upload original PDF: ${error.message}`);
  }
  return { path: data.path };
}

/**
 * Upload one rendered page PNG to the `pdf-pages` bucket. Page index
 * is 1-based; the storage key is `videos/{videoId}/page-N.png`.
 */
export async function uploadPagePng(
  videoId: number,
  pageNumber: number,
  buffer: Buffer
): Promise<{ path: string }> {
  const path = PAGE_PATH(videoId, pageNumber);
  const { data, error } = await supabaseServer.storage
    .from(BUCKET_PAGES_BUCKET())
    .upload(path, buffer, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) {
    throw new Error(`Failed to upload page ${pageNumber}: ${error.message}`);
  }
  return { path: data.path };
}

let _bucketName: string | null = null;
function BUCKET_PAGES_BUCKET(): string {
  // Resolve bucket lazily; in tests we override this to a stub.
  if (_bucketName) return _bucketName;
  _bucketName = process.env.SUPABASE_PDF_PAGES_BUCKET || BUCKET_PDF_PAGES;
  return _bucketName;
}

/** Delete the original PDF and all rendered pages. */
export async function deleteAllPdfAssets(
  videoId: number,
  pageCount: number
): Promise<void> {
  const paths = [ORIGINAL_PDF_PATH(videoId)];
  for (let i = 1; i <= pageCount; i++) {
    paths.push(PAGE_PATH(videoId, i));
  }
  // Best-effort cleanup; we don't want a partial failure to block the
  // primary "remove the module" intent.
  await Promise.allSettled([
    supabaseServer.storage.from(BUCKET_VIDEO_PDFS).remove([ORIGINAL_PDF_PATH(videoId)]),
    pageCount > 0
      ? supabaseServer.storage.from(BUCKET_PAGES_BUCKET()).remove(
          Array.from({ length: pageCount }, (_, i) => PAGE_PATH(videoId, i + 1))
        )
      : Promise.resolve(),
  ]);
}

/**
 * Fetch a single rendered page PNG from the `pdf-pages` bucket. Returns
 * null if the file does not exist (treated as 404 by the route).
 */
export async function fetchPagePng(
  videoId: number,
  pageNumber: number
): Promise<Buffer | null> {
  const { data, error } = await supabaseServer.storage
    .from(BUCKET_PAGES_BUCKET())
    .download(PAGE_PATH(videoId, pageNumber));
  if (error) {
    if (/not found|404/i.test(error.message)) return null;
    throw new Error(`Failed to fetch page ${pageNumber}: ${error.message}`);
  }
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
