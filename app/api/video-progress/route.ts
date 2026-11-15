// ─────────────────────────────────────────────
// API: PATCH /api/video-progress
// User-facing video resume upsert. Records per-user playback state for
// a single video; `lastSecond` and `watchedSeconds` are server-coerced
// (Math.max) so a stale client cannot roll the row backwards.
// `completedAt` is set only when the body explicitly carries
// `completed: true` — never on percentage or seek heuristics.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { hasVideoPackageAccess } from '@/lib/packageAccessServer';
import prisma from "@/lib/prisma";
import { requireActiveSession } from "@/lib/routeAuth";
import { isAdminRole } from "@/lib/deviceSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PatchBody {
  videoId?: unknown;
  lastSecond?: unknown;
  watchedSecondsDelta?: unknown;
  completed?: unknown;
}

export async function PATCH(request: NextRequest) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  const session = auth.session;
  const role = (session.user as { role?: string }).role;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // videoId — required, positive integer
  const videoIdNum = Number(body.videoId);
  if (!Number.isInteger(videoIdNum) || videoIdNum <= 0) {
    return NextResponse.json(
      { error: "videoId must be a positive integer" },
      { status: 400 }
    );
  }

  // lastSecond — required, non-negative integer
  const lastSecond = Number(body.lastSecond);
  if (!Number.isInteger(lastSecond) || lastSecond < 0) {
    return NextResponse.json(
      { error: "lastSecond must be a non-negative integer" },
      { status: 400 }
    );
  }

  // watchedSecondsDelta — optional, non-negative integer; added to existing
  let watchedSecondsDelta = 0;
  if (body.watchedSecondsDelta !== undefined && body.watchedSecondsDelta !== null) {
    const parsed = Number(body.watchedSecondsDelta);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return NextResponse.json(
        { error: "watchedSecondsDelta must be a non-negative integer" },
        { status: 400 }
      );
    }
    watchedSecondsDelta = parsed;
  }

  // completed — optional boolean; only set completedAt when explicitly true
  const completed = body.completed === true;

  // Verify the video exists. Admins may write progress for any video
  // (including drafts) — useful for previews. Non-admin users may only
  // write progress for published, non-deleted videos.
  const video = await prisma.video.findUnique({
    where: { id: videoIdNum },
    select: { id: true, isPublished: true, deletedAt: true },
  });
  if (!video) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }
  if (!isAdminRole(role) && (!video.isPublished || video.deletedAt !== null)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  if (!isAdminRole(role) && !(await hasVideoPackageAccess(session.user.email))) {
    return NextResponse.json({ error: 'Masa akses paket berakhir atau belum aktif.' }, { status: 403 });
  }

  // Look up the caller's UUID id (VideoProgress.userId references User.id).
  const caller = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!caller) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Upsert with monotonic watchedSeconds and conditional completedAt.
  // We compute the new watchedSeconds in code rather than using a raw
  // `increment` so a regression-test can assert the Math.max semantics.
  const existing = await prisma.videoProgress.findUnique({
    where: { userId_videoId: { userId: caller.id, videoId: videoIdNum } },
    select: { watchedSeconds: true, completedAt: true },
  });
  const newWatchedSeconds = Math.max(
    existing?.watchedSeconds ?? 0,
    (existing?.watchedSeconds ?? 0) + watchedSecondsDelta
  );
  const newCompletedAt = completed
    ? existing?.completedAt ?? new Date()
    : existing?.completedAt ?? null;

  const saved = await prisma.videoProgress.upsert({
    where: { userId_videoId: { userId: caller.id, videoId: videoIdNum } },
    create: {
      userId: caller.id,
      videoId: videoIdNum,
      lastSecond,
      watchedSeconds: watchedSecondsDelta,
      completedAt: completed ? new Date() : null,
    },
    update: {
      lastSecond,
      watchedSeconds: newWatchedSeconds,
      completedAt: newCompletedAt,
    },
  });

  return NextResponse.json({
    success: true,
    progress: {
      lastSecond: saved.lastSecond,
      watchedSeconds: saved.watchedSeconds,
      completedAt: saved.completedAt ? saved.completedAt.toISOString() : null,
    },
  });
}
