// ─────────────────────────────────────────────
// Ranking data aggregation (Prisma type‑safe, no raw SQL)
// ─────────────────────────────────────────────
import prisma from '@/lib/prisma';
import { getInitials } from '@/lib/utils';

export interface RankingEntry {
  userId: string;
  name: string;
  avatar: string | null;
  initials: string;
  totalScore: number;
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
    orderBy: { createdAt: 'desc' },
  });

  if (attempts.length === 0) return [];

  // ── 2. Aggregate: max score per user per tryout, earliest updatedAt ─
  const userTryoutMax = new Map<string, Map<number, number>>();
  const userEarliestAt = new Map<string, Date>();

  for (const a of attempts) {
    if (!userTryoutMax.has(a.userId)) {
      userTryoutMax.set(a.userId, new Map());
    }
    const tryoutScores = userTryoutMax.get(a.userId)!;
    const currentMax = tryoutScores.get(a.tryoutId) ?? 0;
    tryoutScores.set(a.tryoutId, Math.max(currentMax, a.totalScore));

    // track earliest updatedAt per user (tie-breaker)
    const prev = userEarliestAt.get(a.userId);
    if (!prev || a.updatedAt < prev) {
      userEarliestAt.set(a.userId, a.updatedAt);
    }
  }

  // ── 3. Build user ranking list (totalScore, tryoutCount, user) ─────
  const userRankings: Array<{
    userId: string;
    name: string;
    avatar: string | null;
    totalScore: number;
    tryoutCount: number;
    earliestUpdatedAt: Date;
  }> = [];

  for (const [userId, tryoutScores] of userTryoutMax) {
    const totalScore = [...tryoutScores.values()].reduce((s, v) => s + v, 0);
    const tryoutCount = tryoutScores.size;
    // pick the first attempt's user info (same userId → same user)
    const userInfo = attempts.find((a) => a.userId === userId)!.user;

    userRankings.push({
      userId,
      name: userInfo.name,
      avatar: userInfo.avatar,
      totalScore,
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
      tryoutCount: r.tryoutCount,
      packages: (pkgMap.get(r.userId) ?? []).join(', '),
    }))
    .slice(0, 100);

  return rankings;
}
