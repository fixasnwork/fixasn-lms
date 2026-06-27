// ─────────────────────────────────────────────
// API: GET/POST /api/admin/videos (Prisma-backed)
// Admin-only list + create for the Video Pembelajaran catalog.
// GET returns all non-deleted videos, including unpublished drafts,
// ordered by (category ASC, sortOrder ASC).
// POST validates and creates a single video; the server re-parses the
// youtubeId via parseYouTubeId so clients cannot bypass client-side
// validation with a malformed value.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { parseYouTubeId } from "@/lib/video";
import type { Video, VideoCategory } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_CATEGORIES: ReadonlyArray<VideoCategory> = ["TWK", "TIU", "TKP"];

/* ── Mappers ────────────────────────────────────────────────────── */
function mapVideo(v: {
  id: number;
  title: string;
  description: string | null;
  youtubeId: string;
  category: string;
  durationSec: number | null;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Video {
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    youtubeId: v.youtubeId,
    category: v.category as VideoCategory,
    durationSec: v.durationSec,
    sortOrder: v.sortOrder,
    isPublished: v.isPublished,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

/* ── GET /api/admin/videos ─────────────────────────────────────── */
export async function GET() {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const videos = await prisma.video.findMany({
      where: { deletedAt: null },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(
      { videos: videos.map(mapVideo) },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch videos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/* ── POST /api/admin/videos ────────────────────────────────────── */
export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();

    // title — required, non-empty after trim
    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    // description — optional, trimmed if provided
    const description =
      body.description === undefined || body.description === null
        ? null
        : String(body.description).trim() || null;

    // youtubeId — required, must pass parseYouTubeId + 11-char regex
    const rawYoutube =
      typeof body.youtubeId === "string" ? body.youtubeId : typeof body.youtubeUrl === "string" ? body.youtubeUrl : "";
    const parsedId = parseYouTubeId(rawYoutube);
    if (!parsedId) {
      return NextResponse.json(
        { error: "youtubeId must be a valid YouTube id or URL (11 chars after the v=, youtu.be/, /embed/, or /shorts/ path)" },
        { status: 400 }
      );
    }

    // category — required, must be one of the three allowed values
    const category = String(body.category ?? "").trim();
    if (!ALLOWED_CATEGORIES.includes(category as VideoCategory)) {
      return NextResponse.json(
        { error: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // durationSec — optional, must be a non-negative integer if provided
    let durationSec: number | null = null;
    if (body.durationSec !== undefined && body.durationSec !== null) {
      const parsed = Number(body.durationSec);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "durationSec must be a non-negative integer" },
          { status: 400 }
        );
      }
      durationSec = parsed;
    }

    // sortOrder — optional integer, default 0
    const sortOrder =
      body.sortOrder === undefined || body.sortOrder === null
        ? 0
        : Number.isInteger(Number(body.sortOrder))
          ? Number(body.sortOrder)
          : 0;

    // isPublished — optional boolean, default false
    const isPublished = body.isPublished === true;

    const video = await prisma.video.create({
      data: {
        title,
        description,
        youtubeId: parsedId,
        category,
        durationSec,
        sortOrder,
        isPublished,
      },
    });

    return NextResponse.json({ success: true, video: mapVideo(video) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
