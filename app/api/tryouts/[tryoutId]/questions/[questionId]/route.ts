import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import type { Question } from '@/lib/types';
import { isValidOptionWeight } from '@/lib/questionWeights';
import { validateQuestionTopic } from '@/lib/questionTopics';

interface QuestionOptionInput {
  optionIndex?: number;
  optionText?: string | null;
  optionImage?: string | null;
  tkpValue?: number | null;
}

interface QuestionInput {
  category?: string;
  topicId?: number | null;
  question?: string;
  questionImage?: string | null;
  correctAnswer?: number | null;
  explanation?: string | null;
  explanationImage?: string | null;
  options?: QuestionOptionInput[];
}

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function normalizeOptions(body: QuestionInput): QuestionOptionInput[] {
  return (body.options ?? [])
    .slice(0, 5)
    .map((option, index) => ({
      optionIndex: Number.isInteger(option.optionIndex) ? option.optionIndex : index,
      optionText: option.optionText?.trim() ? option.optionText : null,
      optionImage: option.optionImage || null,
      tkpValue: option.tkpValue ?? null,
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

  if (normalizeOptions(body).some((option) => option.tkpValue != null && !isValidOptionWeight(option.tkpValue))) {
    return 'Bobot jawaban harus bilangan bulat antara 0 dan 2147483647';
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
  topicId?: number | null;
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
    topicId: row.topicId ?? null,
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tryoutId: string; questionId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { tryoutId: tryoutIdParam, questionId: questionIdParam } = await params;
  const tryoutId = parseId(tryoutIdParam);
  const questionId = parseId(questionIdParam);
  if (!tryoutId || !questionId) {
    return NextResponse.json({ error: 'Valid tryoutId and questionId are required' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as QuestionInput;
    const validationError = validateQuestion(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const topicError = await validateQuestionTopic(body.topicId, body.category ?? 'TWK');
    if (topicError) return NextResponse.json({ error: topicError }, { status: 400 });

    const link = await prisma.tryoutQuestion.findUnique({
      where: { tryoutId_questionId: { tryoutId, questionId } },
      select: { id: true },
    });
    if (!link) {
      return NextResponse.json({ error: 'Question is not linked to this tryout' }, { status: 404 });
    }

    const options = normalizeOptions(body);
    const question = await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id: questionId },
        data: {
          category: body.category ?? 'TWK',
          topicId: body.topicId ?? null,
          question: body.question ?? '',
          questionImage: body.questionImage || null,
          correctAnswer: body.category === 'TKP' ? null : Number(body.correctAnswer),
          explanation: body.explanation || null,
          explanationImage: body.explanationImage || null,
        },
      });

      await tx.questionOption.deleteMany({ where: { questionId } });
      await tx.questionOption.createMany({
        data: options.map((option, index) => ({
          questionId,
          optionIndex: option.optionIndex ?? index,
          optionText: option.optionText ?? null,
          optionImage: option.optionImage ?? null,
          tkpValue: option.tkpValue ?? null,
        })),
      });

      return tx.question.findUniqueOrThrow({
        where: { id: questionId },
        include: { options: { orderBy: { optionIndex: 'asc' } } },
      });
    });

    return NextResponse.json({ success: true, question: mapQuestion(question) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tryoutId: string; questionId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { tryoutId: tryoutIdParam, questionId: questionIdParam } = await params;
  const tryoutId = parseId(tryoutIdParam);
  const questionId = parseId(questionIdParam);
  if (!tryoutId || !questionId) {
    return NextResponse.json({ error: 'Valid tryoutId and questionId are required' }, { status: 400 });
  }

  try {
    await prisma.tryoutQuestion.delete({
      where: { tryoutId_questionId: { tryoutId, questionId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
