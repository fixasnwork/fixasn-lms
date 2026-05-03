// ─────────────────────────────────────────────
// API: GET/POST/PUT/DELETE Questions (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { QUESTIONS, QUESTIONS_B } from '@/data/questions';
import type { Question } from '@/lib/types';

/** Seed default questions + options from static data. */
async function seedDefaults(): Promise<boolean> {
  const allDefaults = [...QUESTIONS, ...QUESTIONS_B];

  // Insert questions
  const questionRows = allDefaults.map((q) => ({
    id: q.id,
    category: q.category,
    question: q.question,
    correctAnswer: q.correctAnswer ?? null,
  }));

  try {
    await prisma.question.createMany({
      data: questionRows,
      skipDuplicates: true,
    });

    // Insert options
    const optionRows = allDefaults.flatMap((q) =>
      q.options.map((text, idx) => ({
        questionId: q.id,
        optionIndex: idx,
        optionText: text,
        tkpValue: q.tkpValues?.[idx] ?? null,
      }))
    );

    if (optionRows.length > 0) {
      await prisma.questionOption.createMany({
        data: optionRows,
        skipDuplicates: true,
      });
    }

    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const set = searchParams.get('set'); // 'a', 'b', 'trial', or null for all

  try {
    const data = await prisma.question.findMany({
      orderBy: { id: 'asc' },
      include: {
        options: {
          orderBy: { optionIndex: 'asc' },
        },
      },
    });

    // Fallback: seed from defaults if DB is empty
    if (!data || data.length === 0) {
      await seedDefaults();

      // Return static defaults directly after seeding
      if (set === 'a') return NextResponse.json({ questions: QUESTIONS });
      if (set === 'b') return NextResponse.json({ questions: QUESTIONS_B });
      if (set === 'trial') {
        const trial = [
          ...QUESTIONS.filter((q) => q.category === 'TWK').slice(0, 3),
          ...QUESTIONS.filter((q) => q.category === 'TIU').slice(0, 4),
          ...QUESTIONS.filter((q) => q.category === 'TKP').slice(0, 3),
        ];
        return NextResponse.json({ questions: trial });
      }
      return NextResponse.json({ questions: [...QUESTIONS, ...QUESTIONS_B] });
    }

    const questions: Question[] = data.map((row) => ({
      id: row.id,
      category: row.category as Question['category'],
      question: row.question,
      correctAnswer: row.correctAnswer ?? null,
      questionImage: row.questionImage ?? null,
      explanation: row.explanation ?? null,
      explanationImage: row.explanationImage ?? null,
      options: row.options.map((opt) => ({
        id: opt.id,
        questionId: opt.questionId,
        optionIndex: opt.optionIndex,
        optionText: opt.optionText ?? '',
        optionImage: opt.optionImage ?? null,
        tkpValue: opt.tkpValue ?? null,
      })),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));

    // Filter by set
    if (set === 'a') {
      const setA = questions.filter((q) => q.id <= 55);
      return NextResponse.json({ questions: setA });
    }
    if (set === 'b') {
      const setB = questions.filter((q) => q.id > 55);
      return NextResponse.json({ questions: setB });
    }
    if (set === 'trial') {
      const trialQuestions = [
        ...questions.filter((q) => q.category === 'TWK').slice(0, 3),
        ...questions.filter((q) => q.category === 'TIU').slice(0, 4),
        ...questions.filter((q) => q.category === 'TKP').slice(0, 3),
      ];
      return NextResponse.json({ questions: trialQuestions });
    }

    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.question && !body.questionImage) {
      return NextResponse.json(
        { error: 'Question text or image is required' },
        { status: 400 }
      );
    }

    // Insert question
    const qData = await prisma.question.create({
      data: {
        category: body.category || 'TWK',
        question: body.question || '',
        correctAnswer: body.correctAnswer ?? null,
        questionImage: body.questionImage || null,
        explanation: body.explanation || null,
        explanationImage: body.explanationImage || null,
      },
    });

    // Insert options if provided
    const questionId = qData.id;
    if (body.options && Array.isArray(body.options)) {
      const optionRows = body.options.map((text: string, idx: number) => ({
        questionId,
        optionIndex: idx,
        optionText: text,
        tkpValue: body.tkpValues?.[idx] ?? null,
      }));

      await prisma.questionOption.createMany({
        data: optionRows,
      });
    }

    // Fetch the created question with options
    const createdQuestion = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        options: {
          orderBy: { optionIndex: 'asc' },
        },
      },
    });

    if (!createdQuestion) {
      return NextResponse.json(
        { error: 'Failed to fetch created question' },
        { status: 500 }
      );
    }

    const question: Question = {
      id: createdQuestion.id,
      category: createdQuestion.category as Question['category'],
      question: createdQuestion.question,
      correctAnswer: createdQuestion.correctAnswer ?? null,
      questionImage: createdQuestion.questionImage ?? null,
      explanation: createdQuestion.explanation ?? null,
      explanationImage: createdQuestion.explanationImage ?? null,
      options: createdQuestion.options.map((opt) => ({
        id: opt.id,
        questionId: opt.questionId,
        optionIndex: opt.optionIndex,
        optionText: opt.optionText ?? '',
        optionImage: opt.optionImage ?? null,
        tkpValue: opt.tkpValue ?? null,
      })),
      createdAt: createdQuestion.createdAt.toISOString(),
      updatedAt: createdQuestion.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Update question
    await prisma.question.update({
      where: { id: body.id },
      data: {
        category: body.category,
        question: body.question,
        correctAnswer: body.correctAnswer,
        questionImage: body.questionImage,
        explanation: body.explanation,
        explanationImage: body.explanationImage,
      },
    });

    // Update options if provided — delete existing and re-insert
    if (body.options && Array.isArray(body.options)) {
      await prisma.questionOption.deleteMany({
        where: { questionId: body.id },
      });

      const optionRows = body.options.map((text: string, idx: number) => ({
        questionId: body.id,
        optionIndex: idx,
        optionText: text,
        tkpValue: body.tkpValues?.[idx] ?? null,
      }));

      await prisma.questionOption.createMany({
        data: optionRows,
      });
    }

    // Re-fetch the updated question with options
    const updatedQuestion = await prisma.question.findUnique({
      where: { id: body.id },
      include: {
        options: {
          orderBy: { optionIndex: 'asc' },
        },
      },
    });

    if (!updatedQuestion) {
      return NextResponse.json(
        { error: 'Failed to fetch updated question' },
        { status: 500 }
      );
    }

    const question: Question = {
      id: updatedQuestion.id,
      category: updatedQuestion.category as Question['category'],
      question: updatedQuestion.question,
      correctAnswer: updatedQuestion.correctAnswer ?? null,
      questionImage: updatedQuestion.questionImage ?? null,
      explanation: updatedQuestion.explanation ?? null,
      explanationImage: updatedQuestion.explanationImage ?? null,
      options: updatedQuestion.options.map((opt) => ({
        id: opt.id,
        questionId: opt.questionId,
        optionIndex: opt.optionIndex,
        optionText: opt.optionText ?? '',
        optionImage: opt.optionImage ?? null,
        tkpValue: opt.tkpValue ?? null,
      })),
      createdAt: updatedQuestion.createdAt.toISOString(),
      updatedAt: updatedQuestion.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, question });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Options are deleted automatically via ON DELETE CASCADE
    await prisma.question.delete({
      where: { id: parseInt(id, 10) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
