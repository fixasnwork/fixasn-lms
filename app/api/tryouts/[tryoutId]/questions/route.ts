import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import type { Question } from '@/lib/types';

interface QuestionOptionInput {
  optionIndex?: number;
  optionText?: string | null;
  optionImage?: string | null;
  tkpValue?: number | null;
}

interface QuestionInput {
  category?: string;
  question?: string;
  questionImage?: string | null;
  correctAnswer?: number | null;
  explanation?: string | null;
  explanationImage?: string | null;
  options?: QuestionOptionInput[];
}

function parseTryoutId(value: string): number | null {
  const tryoutId = Number(value);
  return Number.isInteger(tryoutId) && tryoutId > 0 ? tryoutId : null;
}

function normalizeOptions(body: QuestionInput): QuestionOptionInput[] {
  return (body.options ?? [])
    .slice(0, 5)
    .map((option, index) => ({
      optionIndex: Number.isInteger(option.optionIndex) ? option.optionIndex : index,
      optionText: option.optionText?.trim() ? option.optionText : null,
      optionImage: option.optionImage || null,
      tkpValue: body.category === 'TKP' ? option.tkpValue ?? null : null,
    }))
    .filter((option) => option.optionText || option.optionImage);
}

function validateQuestion(body: QuestionInput) {
  const category = body.category ?? 'TWK';
  if (!['TWK', 'TIU', 'TKP'].includes(category)) {
    return 'category must be TWK, TIU, or TKP';
  }

  if (!body.question?.trim() && !body.questionImage) {
    return 'Question text or image is required';
  }

  if (normalizeOptions(body).length < 2) {
    return 'At least two options are required';
  }

  if (category !== 'TKP') {
    const correctAnswer = Number(body.correctAnswer);
    if (!Number.isInteger(correctAnswer) || correctAnswer < 0 || correctAnswer > 4) {
      return 'correctAnswer must be between 0 and 4';
    }
  }

  return null;
}

function mapQuestion(row: {
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
    id: row.id,
    category: row.category as Question['category'],
    question: row.question,
    questionImage: row.questionImage,
    correctAnswer: row.correctAnswer,
    explanation: row.explanation,
    explanationImage: row.explanationImage,
    options: row.options.map((option) => ({
      id: option.id,
      questionId: option.questionId,
      optionIndex: option.optionIndex,
      optionText: option.optionText,
      optionImage: option.optionImage,
      tkpValue: option.tkpValue,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tryoutId: string }> }
) {
  const { tryoutId: tryoutIdParam } = await params;
  const tryoutId = parseTryoutId(tryoutIdParam);
  if (!tryoutId) {
    return NextResponse.json({ error: 'Valid tryoutId is required' }, { status: 400 });
  }

  try {
    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId, deletedAt: null },
      select: { id: true },
    });
    if (!tryout) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
    }

    const tryoutWithQuestions = await prisma.tryout.findUnique({
      where: { id: tryoutId },
      include: {
        tryoutQuestions: {
          orderBy: { sortOrder: 'asc' as const },
          include: {
            question: {
              include: {
                options: { orderBy: { optionIndex: 'asc' as const } },
              },
            },
          },
        },
      },
    });

    if (!tryoutWithQuestions) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
    }

    const questions = tryoutWithQuestions.tryoutQuestions
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((tq) => mapQuestion(tq.question));

    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tryoutId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { tryoutId: tryoutIdParam } = await params;
  const tryoutId = parseTryoutId(tryoutIdParam);
  if (!tryoutId) {
    return NextResponse.json({ error: 'Valid tryoutId is required' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as QuestionInput;
    const validationError = validateQuestion(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const tryout = await prisma.tryout.findUnique({
      where: { id: tryoutId, deletedAt: null },
      select: { id: true },
    });
    if (!tryout) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
    }

    const options = normalizeOptions(body);

    const question = await prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: {
          category: body.category ?? 'TWK',
          question: body.question ?? '',
          questionImage: body.questionImage || null,
          correctAnswer: body.category === 'TKP' ? null : Number(body.correctAnswer),
          explanation: body.explanation || null,
          explanationImage: body.explanationImage || null,
          options: {
            create: options.map((option, index) => ({
              optionIndex: option.optionIndex ?? index,
              optionText: option.optionText ?? null,
              optionImage: option.optionImage ?? null,
              tkpValue: option.tkpValue ?? null,
            })),
          },
        },
        include: { options: { orderBy: { optionIndex: 'asc' } } },
      });

      const lastLink = await tx.tryoutQuestion.findFirst({
        where: { tryoutId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });

      await tx.tryoutQuestion.create({
        data: {
          tryoutId,
          questionId: created.id,
          sortOrder: (lastLink?.sortOrder ?? 0) + 1,
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, question: mapQuestion(question) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
