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
import prisma from "@/lib/prisma";
import { requireActiveSession } from "@/lib/routeAuth";
import { isAdminRole } from "@/lib/deviceSession";
import type { Video, VideoCategory, VideoListResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DENIED_STATUSES: ReadonlyArray<string> = ["rejected", "expired"];

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

async function userHasVideoPackageAccess(email: string): Promise<boolean> {
  // Single query: join UserPurchase → Package, filter to video-enabled
  // packages, exclude rejected/expired payments, and confirm at least one
  // non-deleted row exists for this user.
  const qualifying = await prisma.userPurchase.findFirst({
    where: {
      userId: email,
      deletedAt: null,
      package: {
        is: { includesVideoPembelajaran: true, deletedAt: null },
      },
      // paymentId is optional (legacy / direct grants); only filter by
      // status when a payment row is linked.
      OR: [
        { paymentId: null },
        { payment: { is: { status: { notIn: [...DENIED_STATUSES] } } } },
      ],
    },
    select: { id: true },
  });
  return qualifying !== null;
}

export async function GET(request: NextRequest) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;

  const email = auth.session.user.email;
  const role = (auth.session.user as { role?: string }).role;

  // Admins always see all published videos regardless of purchase state.
  if (isAdminRole(role)) {
    const videos = await prisma.video.findMany({
      where: { deletedAt: null, isPublished: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    const body: VideoListResponse = {
      videos: videos.map(mapVideo),
      hasAccess: true,
      accessReason: null,
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  }

  const hasAccess = await userHasVideoPackageAccess(email);
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

  const body: VideoListResponse = {
    videos: videos.map(mapVideo),
    hasAccess: true,
    accessReason: null,
  };
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
