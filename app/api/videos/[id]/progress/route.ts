// ─────────────────────────────────────────────
// API: GET /api/videos/[id]/progress
// Returns the calling user's playback state for a single video. When no
// `VideoProgress` row exists (the user has not watched this video yet),
// returns `200 { progress: null }` rather than 404 — the "no progress
// yet" case is not an error, and surfacing it as a 404 makes it look
// like one in DevTools and forces every client to special-case 404.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveSession } from "@/lib/routeAuth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id: idParam } = await params;
  const videoId = parseId(idParam);
  if (!videoId) {
    return NextResponse.json({ error: "Valid id is required" }, { status: 400 });
  }

  const caller = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!caller) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const row = await prisma.videoProgress.findUnique({
    where: { userId_videoId: { userId: caller.id, videoId } },
    select: { lastSecond: true, watchedSeconds: true, completedAt: true },
  });

  if (!row) {
    // No progress yet — return 200 with `progress: null` instead of 404.
    // The client treats both shapes identically (null = no resume).
    return NextResponse.json({ progress: null });
  }

  return NextResponse.json({
    progress: {
      lastSecond: row.lastSecond,
      watchedSeconds: row.watchedSeconds,
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    },
  });
}
