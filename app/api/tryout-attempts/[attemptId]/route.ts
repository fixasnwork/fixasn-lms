// ─────────────────────────────────────────────
// API: GET/PUT /api/tryout-attempts/[attemptId]
// Fetch a single attempt with tryout + questions, or update scores
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Question, QuestionOption } from '@/lib/types';
import { requireActiveSession } from '@/lib/routeAuth';
import { hasTryoutAccess } from '@/lib/packageAccessServer';

/* ── Mappers (reuse logic from /api/tryouts) ── */
function mapOption(opt: {
  id: number;
  questionId: number;
  optionIndex: number;
  optionText: string | null;
  optionImage: string | null;
  tkpValue: number | null;
}): QuestionOption {
  return {
    id: opt.id,
    questionId: opt.questionId,
    optionIndex: opt.optionIndex,
    optionText: opt.optionText,
    optionImage: opt.optionImage,
    tkpValue: opt.tkpValue,
  };
}

function mapQuestion(q: {
  id: number;
  category: string;
  question: string;
  questionImage: string | null;
  correctAnswer: number | null;
  explanation: string | null;
  explanationImage: string | null;
  createdAt: Date;
  updatedAt: Date;
  options: {
    id: number;
    questionId: number;
    optionIndex: number;
    optionText: string | null;
    optionImage: string | null;
    tkpValue: number | null;
  }[];
}): Question {
  return {
    id: q.id,
    category: q.category as Question['category'],
    question: q.question,
    correctAnswer: q.correctAnswer,
    questionImage: q.questionImage,
    explanation: q.explanation,
    explanationImage: q.explanationImage,
    options: q.options.map(mapOption),
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = authResult.session;

  const { attemptId } = await params;

  const attempt = await prisma.tryoutAttempt.findUnique({
    where: { id: attemptId, userId: session.user.email, deletedAt: null },
    include: {
      answers: { orderBy: { questionIndex: 'asc' } },
      tryout: {
        include: {
          tryoutQuestions: {
            orderBy: { sortOrder: 'asc' },
            include: {
              question: {
                include: {
                  options: { orderBy: { optionIndex: 'asc' } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  if (!(await hasTryoutAccess(session.user.email, attempt.tryoutId))) {
    return NextResponse.json({ error: 'Masa akses paket berakhir atau belum aktif.' }, { status: 403 });
  }

  const questions = attempt.tryout.tryoutQuestions.map((tq) =>
    mapQuestion(tq.question)
  );

  // Convert stored answers back to Record<number, number>
  const answersRecord: Record<number, number> = {};
  // Sibling map for Ragu-ragu flag state per questionIndex
  const raguRaguRecord: Record<number, boolean> = {};
  for (const ans of attempt.answers) {
    answersRecord[ans.questionIndex] = ans.selectedOption;
    raguRaguRecord[ans.questionIndex] = ans.raguRagu;
  }

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      userId: attempt.userId,
      tryoutId: attempt.tryoutId,
      twkScore: attempt.twkScore,
      tiuScore: attempt.tiuScore,
      tkpScore: attempt.tkpScore,
      totalScore: attempt.totalScore,
      timeLeftSeconds: attempt.timeLeftSeconds ?? null,
      finishedAt: attempt.finishedAt?.toISOString() ?? null,
      answers: answersRecord,
      raguRagu: raguRaguRecord,
      createdAt: attempt.createdAt.toISOString(),
      updatedAt: attempt.updatedAt.toISOString(),
    },
    tryout: {
      id: attempt.tryout.id,
      name: attempt.tryout.name,
      isTrial: attempt.tryout.isTrial,
      sortOrder: attempt.tryout.sortOrder,
      durationMin: attempt.tryout.durationMin,
      questions,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ attemptId: string }> }
) {
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = authResult.session;

  const { attemptId } = await params;
  const body = await request.json();

  // Verify ownership
  const existing = await prisma.tryoutAttempt.findUnique({
    where: { id: attemptId, userId: session.user.email },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  }

  if (!(await hasTryoutAccess(session.user.email, existing.tryoutId))) {
    return NextResponse.json({ error: 'Masa akses paket berakhir atau belum aktif.' }, { status: 403 });
  }

  // Build answer rows
  const answerRows = body.answers
    ? Object.entries(body.answers).map(([idx, opt]) => ({
        where: { attemptId_questionIndex: { attemptId, questionIndex: parseInt(idx, 10) } },
        update: { selectedOption: Math.max(-1, opt as number) },
        create: {
          questionIndex: parseInt(idx, 10),
          selectedOption: Math.max(-1, opt as number),
          raguRagu: false,
        },
      }))
    : [];

  // Flag-only updates: write raguRagu without disturbing selectedOption.
  // Absent keys are no-op (do not clear existing flags implicitly).
  const flagRows = body.raguRaguFlags
    ? Object.entries(body.raguRaguFlags).map(([idx, flagged]) => ({
        where: { attemptId_questionIndex: { attemptId, questionIndex: parseInt(idx, 10) } },
        update: { raguRagu: Boolean(flagged) },
        create: {
          questionIndex: parseInt(idx, 10),
          selectedOption: -1,
          raguRagu: Boolean(flagged),
        },
      }))
    : [];

  const upsertRows = [...answerRows, ...flagRows];

  // Detect score-writing PUT: set finishedAt on first finish.
  // Only stamp when answers (or any score field) is provided by the client.
  // Only score fields signal a finish. Autosave sends { answers } only
  // and must NOT touch finishedAt. Flag-only sends { raguRaguFlags } only.
  const isScoreWrite =
    body.twkScore !== undefined ||
    body.tiuScore !== undefined ||
    body.tkpScore !== undefined ||
    body.totalScore !== undefined;

  // Clamp timer to [0, 86400] (24h safety upper bound — covers any realistic durationMin).
  // Only persist when the body actually carries the field; absent body = leave existing untouched.
  const clampTimer = (raw: unknown): number => {
    const n = Number(raw);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(86400, Math.trunc(n)));
  };
  const nextTimeLeftSeconds =
    body.timeLeftSeconds !== undefined
      ? clampTimer(body.timeLeftSeconds)
      : existing.timeLeftSeconds;

  const updated = await prisma.tryoutAttempt.update({
    where: { id: attemptId },
    data: {
      twkScore: body.twkScore ?? existing.twkScore,
      tiuScore: body.tiuScore ?? existing.tiuScore,
      tkpScore: body.tkpScore ?? existing.tkpScore,
      totalScore: body.totalScore ?? existing.totalScore,
      timeLeftSeconds: nextTimeLeftSeconds,
      finishedAt: isScoreWrite && !existing.finishedAt
        ? new Date()
        : undefined,
      answers: {
        upsert: upsertRows,
      },
    },
  });

  return NextResponse.json({
    success: true,
    attempt: {
      id: updated.id,
      totalScore: updated.totalScore,
      timeLeftSeconds: updated.timeLeftSeconds ?? null,
      finishedAt: updated.finishedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
