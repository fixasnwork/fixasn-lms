// ─────────────────────────────────────────────
// API: GET /api/tryouts/[tryoutId]/ranking
// Per-tryout leaderboard for the pembahasan Ranking tab.
//
// Auth: requireActiveSession (401 if missing/stale/banned).
// Authz: the caller must have at least one finished attempt for the
//        tryout (403 otherwise). This prevents probes of rankings for
//        tryouts the user never took.
//
// Response shape:
//   {
//     entries: RankingEntry[],
//     viewer: { rank, score } | null,
//     participantCount: number,
//     period: 'all' | 'weekly' | 'monthly'
//   }
//
// Caching: in-memory TTL (5 min) keyed by
//   (tryoutId, period) for the entries list, and
//   (tryoutId, period, userId) for the viewer's rank.
// Single-flight dedup is provided by withTtlCache.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireActiveSession } from "@/lib/routeAuth";
import {
	getTryoutRanking,
	getUserTryoutRank,
	periodSince,
	withTtlCache,
} from "@/lib/ranking";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type Period = "all" | "weekly" | "monthly";

function normalisePeriod(raw: string | null): Period {
	if (raw === "weekly" || raw === "monthly") return raw;
	return "all";
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ tryoutId: string }> },
) {
	const authResult = await requireActiveSession(request);
	if (!authResult.ok) {
		return authResult.response;
	}
	const session = authResult.session;
	const userId = session.user.email;

	// ── parse + validate params ──────────────────────────────────────
	const { tryoutId: tryoutIdRaw } = await params;
	const tryoutId = Number(tryoutIdRaw);
	if (!Number.isInteger(tryoutId) || tryoutId <= 0) {
		return NextResponse.json({ error: "Invalid tryoutId" }, { status: 400 });
	}

	const period = normalisePeriod(request.nextUrl.searchParams.get("period"));
	const since = periodSince(period);

	// ── authz: viewer must have a finished attempt for this tryout ───
	// Cached so concurrent ranking fetches don't slam the DB. Keyed by
	// (tryoutId, userId) — independent of the period filter because
	// access is a yes/no property, not a time-windowed one.
	const hasAccess = await withTtlCache(
		`tryout-access:${tryoutId}:${userId}`,
		CACHE_TTL_MS,
		async () => {
			const count = await prisma.tryoutAttempt.count({
				where: {
					tryoutId,
					userId,
					deletedAt: null,
					finishedAt: { not: null },
				},
			});
			return count > 0;
		},
	);

	if (!hasAccess) {
		return NextResponse.json(
			{ error: "You must finish this tryout before viewing its ranking." },
			{ status: 403 },
		);
	}

	// ── fetch entries + viewer rank in parallel (cache-hit safe) ─────
	const [entries, viewer] = await Promise.all([
		withTtlCache(
			`tryout-ranking:${tryoutId}:period:${period}`,
			CACHE_TTL_MS,
			() => getTryoutRanking(tryoutId, since),
		),
		withTtlCache(
			`tryout-viewer-rank:${tryoutId}:period:${period}:${userId}`,
			CACHE_TTL_MS,
			() => getUserTryoutRank(userId, tryoutId, since),
		),
	]);

	return NextResponse.json({
		entries,
		viewer,
		participantCount: entries.length,
		period,
	});
}
