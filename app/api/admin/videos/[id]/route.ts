// ─────────────────────────────────────────────
// API: GET/PUT/DELETE /api/admin/videos/[id] (Prisma-backed)
// Admin-only single-video operations:
//   GET    — fetch (incl. soft-deleted → 410-ish via 404, treats any row
//            whose deletedAt is set as "not found")
//   PUT    — partial update with per-field re-validation
//   DELETE — soft-delete (sets deletedAt = now()); subsequent GETs/POSTs
//            will skip this row
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { parseYouTubeId, mapVideo, ALLOWED_VIDEO_CATEGORIES } from "@/lib/video";
import type { VideoCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
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
  });

  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json({ video: mapVideo(video) });
}

export async function PUT(
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

  try {
    const existing = await prisma.video.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const body = await request.json();

    // title — optional, must be non-empty if provided
    let title: string = existing.title;
    if (body.title !== undefined) {
      const trimmed = String(body.title).trim();
      if (!trimmed) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }
      title = trimmed;
    }

    // description — optional, nullable
    let description: string | null = existing.description;
    if (body.description !== undefined) {
      if (body.description === null) {
        description = null;
      } else {
        const trimmed = String(body.description).trim();
        description = trimmed || null;
      }
    }

    // youtubeId — optional, must pass parseYouTubeId if provided
    let youtubeId: string = existing.youtubeId;
    if (body.youtubeId !== undefined || body.youtubeUrl !== undefined) {
      const raw =
        typeof body.youtubeId === "string"
          ? body.youtubeId
          : typeof body.youtubeUrl === "string"
            ? body.youtubeUrl
            : "";
      const parsedId = parseYouTubeId(raw);
      if (!parsedId) {
        return NextResponse.json(
          { error: "youtubeId must be a valid YouTube id or URL" },
          { status: 400 }
        );
      }
      youtubeId = parsedId;
    }

    // category — optional, must be allowed value if provided
    let category: string = existing.category;
    if (body.category !== undefined) {
      const candidate = String(body.category).trim();
      if (!ALLOWED_VIDEO_CATEGORIES.includes(candidate as VideoCategory)) {
        return NextResponse.json(
          { error: `category must be one of: ${ALLOWED_VIDEO_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }
      category = candidate;
    }

    // durationSec — optional, nullable, must be non-negative integer if set
    let durationSec: number | null = existing.durationSec;
    if (body.durationSec !== undefined) {
      if (body.durationSec === null) {
        durationSec = null;
      } else {
        const parsed = Number(body.durationSec);
        if (!Number.isInteger(parsed) || parsed < 0) {
          return NextResponse.json(
            { error: "durationSec must be a non-negative integer or null" },
            { status: 400 }
          );
        }
        durationSec = parsed;
      }
    }

    // sortOrder — optional integer, default to existing if not provided
    let sortOrder: number = existing.sortOrder;
    if (body.sortOrder !== undefined) {
      const parsed = Number(body.sortOrder);
      if (!Number.isInteger(parsed)) {
        return NextResponse.json(
          { error: "sortOrder must be an integer" },
          { status: 400 }
        );
      }
      sortOrder = parsed;
    }

    // isPublished — optional boolean
    const isPublished =
      body.isPublished !== undefined ? Boolean(body.isPublished) : existing.isPublished;

    const video = await prisma.video.update({
      where: { id },
      data: {
        title,
        description,
        youtubeId,
        category,
        durationSec,
        sortOrder,
        isPublished,
      },
    });

    return NextResponse.json({ success: true, video: mapVideo(video) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

  try {
    const existing = await prisma.video.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await prisma.video.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
