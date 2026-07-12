// ─────────────────────────────────────────────
// Ranking data aggregation (Prisma type‑safe, no raw SQL)
// ─────────────────────────────────────────────
import prisma from "@/lib/prisma";
import { getInitials } from "@/lib/utils";

export interface RankingEntry {
	userId: string;
	name: string;
	avatar: string | null;
	initials: string;
	totalScore: number;
	twkScore: number;
	tiuScore: number;
	tkpScore: number;
	tryoutCount: number;
	packages: string; // comma-separated, may be empty
}

/**
 * Fetch ranking data.
 * - For each user, only the highest score per tryout counts
 * - Those max scores are summed to get the user's ranking score
 * - Packages are fetched from UserPurchase → Package
 *
 * @param since Optional Date — only attempts created >= this date (soft delete ignored)
 * @returns Array sorted by totalScore DESC, max 100 entries
 */
export async function getRankingData(since?: Date): Promise<RankingEntry[]> {
	// ── 1. Fetch all attempts (with user info) ──────────────────────────
	const attempts = await prisma.tryoutAttempt.findMany({
		where: {
			deletedAt: null,
			...(since && { createdAt: { gte: since } }),
		},
		select: {
			userId: true,
			tryoutId: true,
			totalScore: true,
			twkScore: true,
			tiuScore: true,
			tkpScore: true,
			updatedAt: true,
			user: {
				select: {
					id: true,
					name: true,
					avatar: true,
					email: true,
				},
			},
		},
		orderBy: { createdAt: "desc" },
	});

	if (attempts.length === 0) return [];

	// ── 2. Aggregate: best attempt (by totalScore) per (user, tryout) ─
	// Approach A: sub-scores (TWK/TIU/TKP) come from the same attempt
	// that has the highest totalScore. This keeps the invariant that
	// sub-scores always add up to totalScore.
	interface BestAttempt {
		totalScore: number;
		twkScore: number;
		tiuScore: number;
		tkpScore: number;
		updatedAt: Date;
	}
	const userTryoutBest = new Map<string, Map<number, BestAttempt>>();
	const userEarliestAt = new Map<string, Date>();

	for (const a of attempts) {
		if (!userTryoutBest.has(a.userId)) {
			userTryoutBest.set(a.userId, new Map());
		}
		const tryoutBest = userTryoutBest.get(a.userId)!;
		const current = tryoutBest.get(a.tryoutId);
		// Replace if no current best, or this attempt has a higher totalScore
		if (!current || a.totalScore > current.totalScore) {
			tryoutBest.set(a.tryoutId, {
				totalScore: a.totalScore,
				twkScore: a.twkScore,
				tiuScore: a.tiuScore,
				tkpScore: a.tkpScore,
				updatedAt: a.updatedAt,
			});
		}

		// track earliest updatedAt per user (tie-breaker)
		const prev = userEarliestAt.get(a.userId);
		if (!prev || a.updatedAt < prev) {
			userEarliestAt.set(a.userId, a.updatedAt);
		}
	}

	// ── 3. Build user ranking list (sum each metric across tryouts) ──
	const userRankings: Array<{
		userId: string;
		name: string;
		avatar: string | null;
		totalScore: number;
		twkScore: number;
		tiuScore: number;
		tkpScore: number;
		tryoutCount: number;
		earliestUpdatedAt: Date;
	}> = [];

	for (const [userId, tryoutBest] of userTryoutBest) {
		let totalScore = 0;
		let twkScore = 0;
		let tiuScore = 0;
		let tkpScore = 0;
		for (const attempt of tryoutBest.values()) {
			totalScore += attempt.totalScore;
			twkScore += attempt.twkScore;
			tiuScore += attempt.tiuScore;
			tkpScore += attempt.tkpScore;
		}
		const tryoutCount = tryoutBest.size;
		// pick the first attempt's user info (same userId → same user)
		const userInfo = attempts.find((a) => a.userId === userId)!.user;

		userRankings.push({
			userId,
			name: userInfo.name,
			avatar: userInfo.avatar,
			totalScore,
			twkScore,
			tiuScore,
			tkpScore,
			tryoutCount,
			earliestUpdatedAt: userEarliestAt.get(userId)!,
		});
	}

	// ── 4. Fetch packages for all ranked users ──────────────────────────
	const userIds = userRankings.map((r) => r.userId);

	const purchases = await prisma.userPurchase.findMany({
		where: {
			userId: { in: userIds },
			deletedAt: null,
			package: { deletedAt: null },
		},
		include: {
			package: { select: { name: true } },
		},
	});

	// ── 5. Build packages map ───────────────────────────────────────────
	const pkgMap = new Map<string, string[]>();
	for (const p of purchases) {
		if (!pkgMap.has(p.userId)) pkgMap.set(p.userId, []);
		const names = pkgMap.get(p.userId)!;
		if (!names.includes(p.package.name)) {
			names.push(p.package.name);
		}
	}

	// ── 6. Sort, map, limit ─────────────────────────────────────────
	const rankings: RankingEntry[] = userRankings
		.sort((a, b) => {
			// primary: higher score first
			if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
			// tie-breaker: earlier attempt first
			return a.earliestUpdatedAt.getTime() - b.earliestUpdatedAt.getTime();
		})
		.map((r) => ({
			userId: r.userId,
			name: r.name,
			avatar: r.avatar,
			initials: getInitials(r.name),
			totalScore: r.totalScore,
			twkScore: r.twkScore,
			tiuScore: r.tiuScore,
			tkpScore: r.tkpScore,
			tryoutCount: r.tryoutCount,
			packages: (pkgMap.get(r.userId) ?? []).join(", "),
		}))
		.slice(0, 100);

	return rankings;
}

/**
 * Single-user rank helper. Reuses the same scoring rule as `getRankingData`:
 * for each user, sum of max `totalScore` per `tryoutId`; rank = 1 + number of
 * other users with a strictly higher score, with ties broken by earliest
 * `updatedAt` (earlier wins).
 *
 * @param userId User identifier (email in this codebase — matches TryoutAttempt.userId).
 * @param since  Optional date — only attempts with `createdAt >= since` count.
 * @returns `{ rank, totalScore, tryoutCount }` or `null` if the user has no attempts.
 */
export interface UserRank {
	rank: number;
	totalScore: number;
	tryoutCount: number;
}

export async function getUserRank(
	userId: string,
	since?: Date,
): Promise<UserRank | null> {
	// Fetch all attempts (whole set) so we can rank against every user,
	// not just the target. Mirrors `getRankingData` selection.
	const attempts = await prisma.tryoutAttempt.findMany({
		where: {
			deletedAt: null,
			...(since && { createdAt: { gte: since } }),
		},
		select: {
			userId: true,
			tryoutId: true,
			totalScore: true,
			updatedAt: true,
		},
	});

	if (attempts.length === 0) return null;

	// Aggregate: per user → (per tryoutId → max totalScore) + earliest updatedAt
	const userTryoutMax = new Map<string, Map<number, number>>();
	const userEarliestAt = new Map<string, Date>();

	for (const a of attempts) {
		if (!userTryoutMax.has(a.userId)) {
			userTryoutMax.set(a.userId, new Map());
		}
		const tryoutScores = userTryoutMax.get(a.userId)!;
		const currentMax = tryoutScores.get(a.tryoutId) ?? 0;
		tryoutScores.set(a.tryoutId, Math.max(currentMax, a.totalScore));

		const prev = userEarliestAt.get(a.userId);
		if (!prev || a.updatedAt < prev) {
			userEarliestAt.set(a.userId, a.updatedAt);
		}
	}

	if (!userTryoutMax.has(userId)) return null;

	const myScores = userTryoutMax.get(userId)!;
	const myTotal = [...myScores.values()].reduce((s, v) => s + v, 0);
	const myEarliest = userEarliestAt.get(userId)!;

	// Count users who rank ahead of me.
	// ahead = strictly higher totalScore, OR (equal totalScore AND earlier updatedAt)
	let ahead = 0;
	for (const [otherId, otherScores] of userTryoutMax) {
		if (otherId === userId) continue;
		const otherTotal = [...otherScores.values()].reduce((s, v) => s + v, 0);
		if (otherTotal > myTotal) {
			ahead += 1;
		} else if (otherTotal === myTotal) {
			const otherEarliest = userEarliestAt.get(otherId)!;
			if (otherEarliest < myEarliest) ahead += 1;
		}
	}

	return {
		rank: ahead + 1,
		totalScore: myTotal,
		tryoutCount: myScores.size,
	};
}

// ─────────────────────────────────────────────
// Per-tryout ranking (pembahasan tab)
// ─────────────────────────────────────────────

/**
 * Fetch per-tryout leaderboard.
 * - For each user, only the best (max totalScore) finished attempt for THIS
 *   tryout counts
 * - Tie-breaker: earliest finishedAt
 * - Filters: deletedAt IS NULL, finishedAt IS NOT NULL
 *
 * @param tryoutId The tryout to rank for.
 * @param since    Optional Date — only attempts with `finishedAt >= since`
 *                 count (used by the weekly/monthly period filters).
 * @returns Array sorted by score DESC, then earliest finishedAt ASC.
 */
export async function getTryoutRanking(
	tryoutId: number,
	since?: Date,
): Promise<RankingEntry[]> {
	const attempts = await prisma.tryoutAttempt.findMany({
		where: {
			tryoutId,
			deletedAt: null,
			finishedAt: { not: null, ...(since && { gte: since }) },
		},
		select: {
			userId: true,
			tryoutId: true,
			totalScore: true,
			twkScore: true,
			tiuScore: true,
			tkpScore: true,
			finishedAt: true,
			user: {
				select: { id: true, name: true, avatar: true, email: true },
			},
		},
	});

	if (attempts.length === 0) return [];

	// Per-user best (by totalScore) + earliest finishedAt for the tryout.
	// Approach A: sub-scores come from the best attempt, so they always
	// add up to totalScore.
	const userBest = new Map<
		string,
		{
			score: number;
			twkScore: number;
			tiuScore: number;
			tkpScore: number;
			earliestFinishedAt: Date;
			name: string;
			avatar: string | null;
		}
	>();

	for (const a of attempts) {
		if (!a.finishedAt) continue; // satisfy TS — the where filter already excluded these
		const prev = userBest.get(a.userId);
		if (
			!prev ||
			a.totalScore > prev.score ||
			(a.totalScore === prev.score && a.finishedAt < prev.earliestFinishedAt)
		) {
			userBest.set(a.userId, {
				score: a.totalScore,
				twkScore: a.twkScore,
				tiuScore: a.tiuScore,
				tkpScore: a.tkpScore,
				earliestFinishedAt: a.finishedAt,
				name: a.user.name,
				avatar: a.user.avatar,
			});
		}
	}

	// Sort the map entries directly so the comparator can read `score` and
	// `earliestFinishedAt` from the captured tuple value (no Map.get, no
	// non-null assertions on a Map that we just built ourselves).
	const sortedEntries = [...userBest.entries()].sort(([, a], [, b]) => {
		if (b.score !== a.score) return b.score - a.score;
		// Tie-break: earlier finishedAt wins.
		return a.earliestFinishedAt.getTime() - b.earliestFinishedAt.getTime();
	});

	return sortedEntries.map(([userId, v]) => ({
		userId,
		name: v.name,
		avatar: v.avatar,
		initials: getInitials(v.name),
		totalScore: v.score,
		twkScore: v.twkScore,
		tiuScore: v.tiuScore,
		tkpScore: v.tkpScore,
		tryoutCount: 1, // one tryout by definition
		packages: "",
	}));
}

/**
 * Per-tryout rank helper for a single user. Returns the user's rank and
 * best score on this tryout, or `null` if the user has no finished attempt
 * for it.
 *
 * @param userId   User identifier (email in this codebase).
 * @param tryoutId Tryout identifier.
 * @param since    Optional Date — only attempts with `finishedAt >= since`.
 */
export async function getUserTryoutRank(
	userId: string,
	tryoutId: number,
	since?: Date,
): Promise<{
	rank: number;
	score: number;
	twkScore: number;
	tiuScore: number;
	tkpScore: number;
} | null> {
	const attempts = await prisma.tryoutAttempt.findMany({
		where: {
			tryoutId,
			deletedAt: null,
			finishedAt: { not: null, ...(since && { gte: since }) },
		},
		select: {
			userId: true,
			totalScore: true,
			twkScore: true,
			tiuScore: true,
			tkpScore: true,
			finishedAt: true,
		},
	});

	if (attempts.length === 0) return null;

	// Per-user best (max totalScore; tie-break earliest finishedAt).
	// Approach A: sub-scores come from the same best attempt.
	const userBest = new Map<
		string,
		{
			score: number;
			twkScore: number;
			tiuScore: number;
			tkpScore: number;
			earliestFinishedAt: Date;
		}
	>();
	for (const a of attempts) {
		if (!a.finishedAt) continue;
		const prev = userBest.get(a.userId);
		if (
			!prev ||
			a.totalScore > prev.score ||
			(a.totalScore === prev.score && a.finishedAt < prev.earliestFinishedAt)
		) {
			userBest.set(a.userId, {
				score: a.totalScore,
				twkScore: a.twkScore,
				tiuScore: a.tiuScore,
				tkpScore: a.tkpScore,
				earliestFinishedAt: a.finishedAt,
			});
		}
	}

	const mine = userBest.get(userId);
	if (!mine) return null;

	// Count users who rank ahead of me
	let ahead = 0;
	for (const [otherId, other] of userBest) {
		if (otherId === userId) continue;
		if (other.score > mine.score) {
			ahead += 1;
		} else if (
			other.score === mine.score &&
			other.earliestFinishedAt < mine.earliestFinishedAt
		) {
			ahead += 1;
		}
	}

	return {
		rank: ahead + 1,
		score: mine.score,
		twkScore: mine.twkScore,
		tiuScore: mine.tiuScore,
		tkpScore: mine.tkpScore,
	};
}

/**
 * Period → lookback window. `all` returns undefined (no filter).
 * Unknown values fall back to `all` (defensive — the route layer also
 * normalises this, but the helper is callable directly from tests).
 */
export function periodSince(
	period: string | null | undefined,
): Date | undefined {
	if (period === "weekly")
		return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	if (period === "monthly")
		return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	return undefined;
}

// ─────────────────────────────────────────────
// In-memory TTL cache with single-flight dedup
// ─────────────────────────────────────────────

interface CacheEntry<T> {
	data: T;
	expiresAt: number;
}
const ttlCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

/**
 * Caches the result of `compute` under `key` for `ttlMs`. Concurrent
 * callers for the same key share a single invocation of `compute`
 * (single-flight dedup). Process-local — multi-instance deploys do NOT
 * share state; entries will diverge until TTL expires.
 */
export function withTtlCache<T>(
	key: string,
	ttlMs: number,
	compute: () => Promise<T>,
): Promise<T> {
	const now = Date.now();
	const hit = ttlCache.get(key) as CacheEntry<T> | undefined;
	if (hit && hit.expiresAt > now) {
		return Promise.resolve(hit.data);
	}

	// Reuse an in-flight promise if one exists for this key
	const existing = inFlight.get(key) as Promise<T> | undefined;
	if (existing) return existing;

	const p = compute()
		.then((data) => {
			ttlCache.set(key, { data, expiresAt: Date.now() + ttlMs });
			return data;
		})
		.finally(() => {
			inFlight.delete(key);
		});

	inFlight.set(key, p);
	return p;
}

/** Test-only: drop everything. Not exported in normal builds. */
export function __resetRankingCache(): void {
	ttlCache.clear();
	inFlight.clear();
}
