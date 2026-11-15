// ─────────────────────────────────────────────
// API: GET /api/videos
// User-facing list with package-flag access derivation.
// ─────────────────────────────────────────────
//
// Access rules (per spec scenarios in
// openspec/changes/video-pembelajaran/specs/video-pembelajaran/spec.md):
//   1. Unauthenticated          → 401
//   2. Stale / blocked session  → 401 / 403 (handled by requireActiveSession)
//   3. Caller role = "admin"    → 200, hasAccess: true, full published list
//   4. Caller role = "user"     → derive from UserPurchase
//      a. No UserPurchase at all                          → hasAccess: false
//      b. Only purchases with package.includesVideoPembelajaran=false → hasAccess: false
//      c. Has at least one purchase (status NOT IN {rejected,expired}) of
//         a package with includesVideoPembelajaran=true   → hasAccess: true
//
// The single denial reason surfaced is "no_video_package" — collapsing
// cases (a) and (b) into one UX message, since both produce the same
// upgrade-banner behavior on the client.
// ─────────────────────────────────────────────
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hasVideoPackageAccess } from '@/lib/packageAccessServer';
import prisma from "@/lib/prisma";
import { requireActiveSession } from "@/lib/routeAuth";
import { isAdminRole } from "@/lib/deviceSession";
import type { VideoListResponse } from "@/lib/types";
import { mapPublicVideoWithProgress, mapVideoWithProgress } from "@/lib/video";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function GET(request: NextRequest) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;

  const email = auth.session.user.email;
  const role = (auth.session.user as { role?: string }).role;
  // VideoProgress.userId references User.id (UUID v7). The session only
  // carries email + role, so resolve the UUID once for the progress query.
  const caller = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  const userId = caller?.id;

  // Admins always see all published videos regardless of purchase state.
  // Admins also see `pdfUrl` (the original PDF storage path) so they can
  // manage the PDF via the admin UI; non-admin callers must NOT see it.
  if (isAdminRole(role)) {
    const videos = await prisma.video.findMany({
      where: { deletedAt: null, isPublished: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    const body: VideoListResponse = {
      // Admins get no per-user resume label. We use the admin mapper so
      // the admin catalog carries `pdfUrl`; user responses (below) use
      // the public mapper that strips it.
      videos: videos.map((v) => mapVideoWithProgress(v, null)),
      hasAccess: true,
      accessReason: null,
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const hasAccess = await hasVideoPackageAccess(email);
  if (!hasAccess) {
    // 200 with empty list + hasAccess:false — UI renders the upgrade banner.
    // 403 would force the client into error handling and lose the upsell
    // affordance; the contract deliberately returns 200 here.
    const body: VideoListResponse = {
      videos: [],
      hasAccess: false,
      accessReason: "no_video_package",
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const videos = await prisma.video.findMany({
    where: { deletedAt: null, isPublished: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });

  // Fetch the caller's progress for every video in one round-trip and
  // zip it onto each video. Admins never reach this branch (handled above);
  // the userId lookup falls back to email-derived match if the session has
  // no `id` (legacy/edge cases) — the progress sub-object will be null
  // in that fallback, which is the safe UI state.
  let progressByVideoId = new Map<number, { lastSecond: number; watchedSeconds: number; completedAt: Date | null }>();
  if (userId) {
    const rows = await prisma.videoProgress.findMany({
      where: { userId, videoId: { in: videos.map((v) => v.id) } },
      select: { videoId: true, lastSecond: true, watchedSeconds: true, completedAt: true },
    });
    progressByVideoId = new Map(rows.map((r) => [r.videoId, r]));
  }

  const body: VideoListResponse = {
    videos: videos.map((v) => {
      const p = progressByVideoId.get(v.id);
      const progress = p
        ? {
            lastSecond: p.lastSecond,
            watchedSeconds: p.watchedSeconds,
            completedAt: p.completedAt ? p.completedAt.toISOString() : null,
          }
        : null;
      // User-facing response: omit `pdfUrl` so the original PDF's
      // storage path is never sent to a non-admin caller.
      return mapPublicVideoWithProgress(v, progress);
    }),
    hasAccess: true,
    accessReason: null,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
