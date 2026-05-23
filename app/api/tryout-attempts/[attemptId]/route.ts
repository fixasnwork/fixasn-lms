// ─────────────────────────────────────────────
// API: GET/PUT /api/tryout-attempts/[attemptId]
// Fetch a single attempt with tryout + questions, or update scores
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Question, QuestionOption } from '@/lib/types';
import { requireActiveSession } from '@/lib/routeAuth';

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

  const questions = attempt.tryout.tryoutQuestions.map((tq) =>
    mapQuestion(tq.question)
  );

  // Convert stored answers back to Record<number, number>
  const answersRecord: Record<number, number> = {};
  for (const ans of attempt.answers) {
    answersRecord[ans.questionIndex] = ans.selectedOption;
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
      answers: answersRecord,
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

  // Build answer rows
  const answerRows = body.answers
    ? Object.entries(body.answers).map(([idx, opt]) => ({
        where: { attemptId_questionIndex: { attemptId, questionIndex: parseInt(idx, 10) } },
        update: { selectedOption: Math.max(-1, opt as number) },
        create: {
          questionIndex: parseInt(idx, 10),
          selectedOption: Math.max(-1, opt as number),
        },
      }))
    : [];

  const updated = await prisma.tryoutAttempt.update({
    where: { id: attemptId },
    data: {
      twkScore: body.twkScore ?? existing.twkScore,
      tiuScore: body.tiuScore ?? existing.tiuScore,
      tkpScore: body.tkpScore ?? existing.tkpScore,
      totalScore: body.totalScore ?? existing.totalScore,
      answers: {
        upsert: answerRows,
      },
    },
  });

  return NextResponse.json({
    success: true,
    attempt: {
      id: updated.id,
      totalScore: updated.totalScore,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}
