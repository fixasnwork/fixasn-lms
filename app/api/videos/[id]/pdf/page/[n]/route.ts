// ─────────────────────────────────────────────
// API: GET /api/videos/[id]/pdf/page/[n]
// Authed + hasAccess-gated route that returns a single rendered PDF
// page as a PNG with the static watermark composited on top. The
// original PDF binary is never served from this route.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { hasVideoPackageAccess } from '@/lib/packageAccessServer';
import prisma from "@/lib/prisma";
import { requireActiveSession } from "@/lib/routeAuth";
import { isAdminRole } from "@/lib/deviceSession";
import { fetchPagePng } from "@/lib/supabaseStorage";
import { compositeWatermark } from "@/lib/pdfWatermark";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parsePositiveInt(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; n: string }> }
) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const role = (session.user as { role?: string }).role;

  const { id: idParam, n: nParam } = await params;
  const videoId = parsePositiveInt(idParam);
  const page = parsePositiveInt(nParam);
  if (!videoId) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }
  if (!page) {
    return NextResponse.json({ error: "Valid page number is required" }, { status: 400 });
  }

  // Look up the video and verify it has a PDF attached.
  const video = await prisma.video.findFirst({
    where: { id: videoId, deletedAt: null },
    select: { id: true, pdfPageCount: true, pdfUrl: true },
  });
  if (!video || !video.pdfUrl || !video.pdfPageCount) {
    return NextResponse.json({ error: "PDF not found" }, { status: 404 });
  }
  if (page < 1 || page > video.pdfPageCount) {
    return NextResponse.json({ error: "Page out of range" }, { status: 404 });
  }

  // Admins bypass the package gate (they curate the catalog).
  if (!isAdminRole(role)) {
    const hasAccess = await hasVideoPackageAccess(session.user.email);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Akses video pembelajaran tidak ditemukan" },
        { status: 403 }
      );
    }
  }

  // Fetch the rendered page from Supabase Storage. The storage path
  // could be the `pdf-pages` bucket; we treat 404 as "page not yet
  // rendered" rather than exposing the error.
  const png = await fetchPagePng(videoId, page);
  if (!png) {
    return NextResponse.json({ error: "Page asset missing" }, { status: 404 });
  }

  let watermarked: Buffer;
  try {
    watermarked = await compositeWatermark(png);
  } catch (err) {
    return NextResponse.json(
      { error: `Watermark failed: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 500 }
    );
  }

  return new NextResponse(new Uint8Array(watermarked), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      // Short cache: the overlay is identical for every request, but
      // a 5-minute window gives breathing room for bot traffic while
      // staying close to fresh for the user.
      "Cache-Control": "private, max-age=300",
    },
  });
}
