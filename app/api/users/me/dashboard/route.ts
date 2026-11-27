// ─────────────────────────────────────────────
// API: GET /api/users/me/dashboard
//
// Aggregated per-user summary for the user dashboard.
//
// Per-tryout classification uses "latest attempt wins" semantics, matching the
// inProgressByTryout map in app/(user)/tryout/page.tsx and the resume API.
//
// Access comes from a direct trial, an available free package, or a paid purchase.
//
// Auth: requireActiveSession.
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import { getUserRank } from '@/lib/ranking';
import { isAvailable } from '@/lib/availability';
import { activeFreePackageWhere, activePaymentWhere } from '@/lib/packageAccess';
import type { DashboardOpenTryout, DashboardSummary } from '@/lib/types';

export const dynamic = 'force-dynamic';

const dashboardTryoutSelect = {
  id: true,
  name: true,
  sortOrder: true,
  startDate: true,
  endDate: true,
  deletedAt: true,
  _count: { select: { tryoutQuestions: true } },
} as const;

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

  const now = new Date();
  // Fetch verified, unexpired purchases. Package dates control sales only.
  const [payments, freeTryouts, allAttempts, rankResult] = await Promise.all([
    prisma.payment.findMany({
      where: {
        userId,
        ...activePaymentWhere(now),
        package: { deletedAt: null },
      },
      select: {
        package: {
          select: {
            packageTryouts: {
              select: {
                tryout: { select: dashboardTryoutSelect },
              },
            },
          },
        },
      },
    }),
    prisma.tryout.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isTrial: true },
          { packageTryouts: { some: { package: activeFreePackageWhere(now) } } },
        ],
      },
      select: dashboardTryoutSelect,
    }),
    prisma.tryoutAttempt.findMany({
      where: { userId, deletedAt: null },
      select: {
        tryoutId: true,
        finishedAt: true,
        timeLeftSeconds: true,
        twkScore: true,
        tiuScore: true,
        tkpScore: true,
        tryout: {
          select: {
            isTrial: true,
            deletedAt: true,
          },
        },
        _count: { select: { answers: { where: { selectedOption: { gte: 0 }, questionIndex: { gte: 0 } } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getUserRank(userId),
  ]);

  const paidTryouts = payments.flatMap(({ package: pkg }) =>
    pkg.packageTryouts.map(({ tryout }) => tryout).filter((tryout) => tryout.deletedAt === null),
  );
  const paidTryoutIds = new Set(paidTryouts.map(({ id }) => id));
  const activePaidTryouts = paidTryouts.filter((tryout) => isAvailable(tryout, now));
  const freeTryoutIds = new Set(freeTryouts.map(({ id }) => id));
  const activeTryoutIds = new Set([
    ...activePaidTryouts.map(({ id }) => id),
    ...freeTryouts.filter((tryout) => isAvailable(tryout, now)).map(({ id }) => id),
  ]);

  // ── 4. Keep only attempts for active tryouts.
  const activeAttempts = allAttempts.filter((a) => activeTryoutIds.has(a.tryoutId));

  // Select the newest attempt first, so a completed attempt hides older unfinished ones.
  const latestByTryout = new Map<number, (typeof allAttempts)[number]>();
  for (const a of allAttempts) {
    if (!latestByTryout.has(a.tryoutId)) {
      latestByTryout.set(a.tryoutId, a);
    }
  }

  const latestAttempts = [...latestByTryout.values()];
  const resumableAttempts = latestAttempts.filter(
    (a) => a.finishedAt === null &&
      (a.timeLeftSeconds != null || a._count.answers > 0) &&
      a.tryout.deletedAt === null &&
      (a.tryout.isTrial || freeTryoutIds.has(a.tryoutId) || paidTryoutIds.has(a.tryoutId)),
  );
  const resumableIds = new Set(resumableAttempts.map(({ tryoutId }) => tryoutId));
  const finishedIds = new Set(allAttempts.filter((attempt) => attempt.finishedAt !== null).map(({ tryoutId }) => tryoutId));
  const openById = new Map(activePaidTryouts.map((tryout) => [tryout.id, tryout]));
  for (const tryout of freeTryouts) {
    if (isAvailable(tryout, now)) openById.set(tryout.id, tryout);
  }
  const openTryouts = [...openById.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map<DashboardOpenTryout>((tryout) => {
      const latest = latestByTryout.get(tryout.id);
      const questionCount = tryout._count.tryoutQuestions;
      const status = resumableIds.has(tryout.id)
        ? 'in-progress'
        : finishedIds.has(tryout.id) ? 'finished' : 'not-started';
      return {
        tryoutId: tryout.id,
        name: tryout.name,
        status,
        answeredCount: status === 'in-progress' && latest ? Math.min(latest._count.answers, questionCount) : 0,
        questionCount,
      };
    });

  // Average the latest finished attempt per tryout. An unfinished retry keeps
  // the previous finished result until the retry is completed.
  const latestFinishedByTryout = new Map<number, (typeof allAttempts)[number]>();
  for (const a of activeAttempts) {
    if (a.finishedAt !== null && !latestFinishedByTryout.has(a.tryoutId)) {
      latestFinishedByTryout.set(a.tryoutId, a);
    }
  }
  const categoryTotals = [...latestFinishedByTryout.values()].reduce(
    (acc, a) => {
      acc.twk += a.twkScore;
      acc.tiu += a.tiuScore;
      acc.tkp += a.tkpScore;
      return acc;
    },
    { twk: 0, tiu: 0, tkp: 0 }
  );
  const finishedCount = latestFinishedByTryout.size;
  const categoryScores = finishedCount === 0
    ? { twk: 0, tiu: 0, tkp: 0 }
    : {
      twk: categoryTotals.twk / finishedCount,
      tiu: categoryTotals.tiu / finishedCount,
      tkp: categoryTotals.tkp / finishedCount,
    };

  const summary: DashboardSummary = {
    remainingTryouts: resumableAttempts.length,
    completedTryouts: [...finishedIds].filter((tryoutId) => activeTryoutIds.has(tryoutId) && !resumableIds.has(tryoutId)).length,
    openTryouts,
    rank: rankResult?.rank ?? null,
    totalScore: rankResult?.totalScore ?? 0,
    tryoutCount: rankResult?.tryoutCount ?? 0,
    categoryScores,
  };

  return NextResponse.json(summary);
}
