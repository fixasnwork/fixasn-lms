// ─────────────────────────────────────────────
// API: GET/POST Tryout Attempts (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { AttemptAnswer } from '@/lib/types';
import { isAvailable, isPackageAvailable } from '@/lib/availability';

/**
 * GET /api/tryout-attempts?userId=X
 * GET /api/tryout-attempts?userId=X&tryoutId=Y
 *
 * Fetches all attempts for a given user, ordered by createdAt DESC.
 * Optionally filters by tryoutId.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const userId = searchParams.get('userId');
  const tryoutId = searchParams.get('tryoutId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const whereClause: { userId: string; tryoutId?: number } = { userId };
  if (tryoutId) {
    whereClause.tryoutId = parseInt(tryoutId, 10);
  }

  const attempts = await prisma.tryoutAttempt.findMany({
    where: whereClause,
    include: { answers: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ attempts });
}

/**
 * POST /api/tryout-attempts
 *
 * Creates a new tryout attempt. Required fields: userId, userName, tryoutId.
 * Answers are stored as separate rows in the AttemptAnswer table.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate required fields at the boundary
  if (!body.userId || !body.userName || !body.tryoutId) {
    return NextResponse.json(
      { error: 'userId, userName, and tryoutId are required' },
      { status: 400 }
    );
  }

  const tryoutId = parseInt(body.tryoutId, 10);

  // ── Availability gate ──────────────────────────────────────────
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId, deletedAt: null },
      include: { packageTryouts: { include: { package: true } } },
    });

    if (!tryout) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
    }

    if (!isAvailable(tryout)) {
      return NextResponse.json(
        { error: 'tryout_unavailable', reason: 'out_of_window', retryable: true },
        { status: 403 }
      );
    }

    for (const pt of tryout.packageTryouts) {
      if (!isPackageAvailable(pt.package)) {
        return NextResponse.json(
          {
            error: 'tryout_unavailable',
            reason: 'package_closed',
            retryable: true,
          },
          { status: 403 }
        );
      }
    }

  // Convert answers to the correct format for the relation table
  let answerRows: Array<{ questionIndex: number; selectedOption: number }> = [];

  if (body.answers) {
    if (Array.isArray(body.answers)) {
      // Array format: [{ questionIndex: 0, selectedOption: 2 }]
      answerRows = body.answers.map((ans: AttemptAnswer) => ({
        questionIndex: ans.questionIndex,
        selectedOption: Math.max(-1, ans.selectedOption),
      }));
    } else {
      // Record format: {0: 2, 1: 3} (questionIndex → selectedOption)
      answerRows = Object.entries(body.answers).map(([idx, opt]) => ({
        questionIndex: parseInt(idx, 10),
        selectedOption: Math.max(-1, opt as number),
      }));
    }
  }

  const attempt = await prisma.tryoutAttempt.create({
    data: {
      userId: body.userId,
      userName: body.userName,
      tryoutId,
      twkScore: body.twkScore ?? 0,
      tiuScore: body.tiuScore ?? 0,
      tkpScore: body.tkpScore ?? 0,
      totalScore: body.totalScore ?? 0,
      answers: {
        create: answerRows,
      },
    },
    include: { answers: true },
  });

  return NextResponse.json({
    success: true,
    attempt,
  });
}
