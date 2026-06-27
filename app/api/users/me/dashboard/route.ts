// ─────────────────────────────────────────────
// API: GET /api/users/me/dashboard
//
// Aggregated per-user summary for the user dashboard.
//
// Per-tryout classification uses "latest attempt wins" semantics, matching the
// inProgressByTryout map in app/(user)/tryout/page.tsx and the resume API.
//
// Attempt scope: only attempts for tryouts in packages the user ACTUALLY OWNS
// (UserPayment status = pending|verified → Package → PackageTryout → Tryout).
// This matches the tryout page's `ownedPkgIds` + `activeOwnedPkgIds` check
// so the two surfaces never disagree on which tryouts are in scope.
//
// Auth: requireActiveSession.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import { getUserRank } from '@/lib/ranking';
import { isAvailable } from '@/lib/availability';
import type { DashboardSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

type AttemptLite = {
  tryoutId: number;
  finishedAt: Date | null;
  createdAt: Date;
  twkScore: number;
  tiuScore: number;
  tkpScore: number;
};

export async function GET(request: NextRequest) {
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = authResult.session;
  const userId = getEmailFromSessionUser(session.user);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── 1. Fetch owned packages (via UserPayment, matching the tryout page)
  //       The tryout page builds `ownedPkgIds` from userPayments with
  //       status = 'pending' | 'verified'. We replicate that here plus
  //       the `isAvailable` date check (which the tryout page's
  //       `activeOwnedPkgIds` applies).
  const payments = await prisma.payment.findMany({
    where: {
      userId,
      status: { in: ['pending', 'verified'] },
      package: { deletedAt: null },
    },
    select: {
      package: {
        select: {
          startDate: true,
          endDate: true,
          packageTryouts: {
            select: {
              tryout: {
                select: {
                  id: true,
                  startDate: true,
                  endDate: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // ── 2. Build the set of tryoutIds the user currently owns AND are active.
  //     Use `isAvailable` directly (same as the tryout page's
  //     `isPackageAvailable` / `isAvailable(t)` checks). No null-date
  //     fallback — if a package/tryout has null dates, `isAvailable` returns
  //     false, matching the tryout page behavior.
  const activeTryoutIds = new Set<number>();
  for (const p of payments) {
    if (!isAvailable(p.package)) continue;
    for (const pt of p.package.packageTryouts) {
      if (pt.tryout.deletedAt !== null) continue;
      if (!isAvailable(pt.tryout)) continue;
      activeTryoutIds.add(pt.tryout.id);
    }
  }

  // ── 3. Fetch all non-deleted attempts. Run in parallel with rank.
  const [allAttempts, rankResult] = await Promise.all([
    prisma.tryoutAttempt.findMany({
      where: { userId, deletedAt: null },
      select: {
        tryoutId: true,
        finishedAt: true,
        createdAt: true,
        twkScore: true,
        tiuScore: true,
        tkpScore: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    getUserRank(userId),
  ]);

  // ── 4. Keep only attempts for active tryouts.
  const activeAttempts: AttemptLite[] = activeTryoutIds.size === 0
    ? []
    : allAttempts.filter((a) => activeTryoutIds.has(a.tryoutId));

  // ── 5. Latest attempt per tryoutId.
  const latestByTryout = new Map<number, AttemptLite>();
  for (const a of activeAttempts) {
    if (!latestByTryout.has(a.tryoutId)) {
      latestByTryout.set(a.tryoutId, a);
    }
  }

  // ── 6. Classify (latest-wins, deduped by tryoutId).
  let distinctInProgressTryouts = 0;
  let distinctFinishedTryouts = 0;
  for (const a of latestByTryout.values()) {
    if (a.finishedAt === null) {
      distinctInProgressTryouts++;
    } else {
      distinctFinishedTryouts++;
    }
  }

  // ── 7. categoryScores (finished attempts in active scope only).
  const categoryScores = activeAttempts.reduce(
    (acc, a) => {
      if (a.finishedAt === null) return acc;
      acc.twk += a.twkScore;
      acc.tiu += a.tiuScore;
      acc.tkp += a.tkpScore;
      return acc;
    },
    { twk: 0, tiu: 0, tkp: 0 }
  );

  const summary: DashboardSummary = {
    remainingTryouts: distinctInProgressTryouts,
    completedTryouts: distinctFinishedTryouts,
    rank: rankResult?.rank ?? null,
    totalScore: rankResult?.totalScore ?? 0,
    tryoutCount: rankResult?.tryoutCount ?? 0,
    categoryScores,
  };

  return NextResponse.json(summary);
}
