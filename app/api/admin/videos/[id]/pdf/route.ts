// ─────────────────────────────────────────────
// API: POST/DELETE /api/admin/videos/[id]/pdf
// Admin-only PDF module lifecycle:
//   POST   — upload a new PDF (multer-style FormData), validate mime +
//            size + page count, render every page to PNG, upload both
//            original (private) and rendered pages (public), persist
//            pdfUrl + pdfPageCount on the Video row.
//   DELETE — remove the original PDF and every rendered page, then
//            null out pdfUrl + pdfPageCount on the Video row.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { renderPdfToPngs, PdfTooLargeError } from "@/lib/pdfPageRender";
import {
  uploadOriginalPdf,
  uploadPagePng,
  deleteAllPdfAssets,
} from "@/lib/supabaseStorage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_MIME = "application/pdf";
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/* ── POST: upload + render ─────────────────────────────────────── */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field 'file' is required" }, { status: 400 });
  }

  if (file.type !== ALLOWED_MIME) {
    return NextResponse.json(
      { error: "Hanya file PDF yang didukung" },
      { status: 415 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Ukuran file maksimal 20MB" },
      { status: 413 }
    );
  }

  const video = await prisma.video.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, pdfPageCount: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Page-count pre-check via a parse-only call would require a separate
  // pdfjs pass; we just attempt the render and let PdfTooLargeError
  // throw above 200 pages.
  let render;
  try {
    render = await renderPdfToPngs(buffer);
  } catch (err) {
    if (err instanceof PdfTooLargeError) {
      return NextResponse.json(
        { error: "Modul terlalu besar (maks 200 halaman)" },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: `Gagal memproses PDF: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 422 }
    );
  }

  // Delete prior pages (if any) so a re-upload doesn't leave orphans.
  if (video.pdfPageCount && video.pdfPageCount > 0) {
    try {
      await deleteAllPdfAssets(id, video.pdfPageCount);
    } catch (err) {
      // Non-fatal: continue with new render; orphans are a minor issue.

      console.error("[video pdf] prior cleanup failed:", err);
    }
  }

  // Upload the original PDF (private path) first; if this fails, no
  // page render metadata has been written.
  try {
    await uploadOriginalPdf(id, buffer, file.type);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload PDF gagal" },
      { status: 500 }
    );
  }

  // Upload each rendered page. We collect the first upload error and
  // bail; remaining pages stay un-uploaded and the admin can retry.
  let firstUploadError: string | null = null;
  for (let i = 0; i < render.pngBuffers.length; i++) {
    try {
      await uploadPagePng(id, i + 1, render.pngBuffers[i]);
    } catch (err) {
      firstUploadError = err instanceof Error ? err.message : "Upload halaman gagal";
      break;
    }
  }

  if (firstUploadError) {
    return NextResponse.json(
      { error: firstUploadError, pageCount: render.pngBuffers.length },
      { status: 500 }
    );
  }

  const persisted = await prisma.video.update({
    where: { id },
    data: {
      pdfUrl: `uploads/videos/${id}/module.pdf`,
      pdfPageCount: render.pngBuffers.length,
    },
    select: { id: true, pdfUrl: true, pdfPageCount: true },
  });

  // Per spec: partial-render failure is 422 + the failure list, with
  // pdfPageCount set to the count of successful pages. We already
  // updated pdfPageCount above; return 422 so the admin form can warn.
  if (render.failedPages.length > 0) {
    return NextResponse.json(
      {
        success: true,
        video: persisted,
        failedPages: render.failedPages,
        message: "Sebagian halaman gagal dirender",
      },
      { status: 422 }
    );
  }

  return NextResponse.json({ success: true, video: persisted });
}

/* ── DELETE: remove module ─────────────────────────────────────── */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const video = await prisma.video.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, pdfUrl: true, pdfPageCount: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (video.pdfUrl || (video.pdfPageCount && video.pdfPageCount > 0)) {
    try {
      await deleteAllPdfAssets(id, video.pdfPageCount ?? 0);
    } catch (err) {

      console.error("[video pdf] delete assets failed:", err);
    }
  }

  await prisma.video.update({
    where: { id },
    data: { pdfUrl: null, pdfPageCount: null },
  });

  return NextResponse.json({ success: true });
}
