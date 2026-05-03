import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_PACKAGE_BANKS } from '@/data/questions';
import type { Question, QuestionOption, Tryout } from '@/lib/types';

/* ── Mappers ─────────────────────────────────────────────────────────── */
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

/* Light mapper — metadata only (no questions, just count) */
function mapTryoutLight(t: {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { tryoutQuestions: number };
  packageTryouts: { packageId: number }[];
}): Tryout {
  return {
    id: t.id,
    name: t.name,
    isTrial: t.isTrial,
    sortOrder: t.sortOrder,
    questions: [], // light mode — questions not included
    _questionCount: t._count.tryoutQuestions,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/* Full mapper — includes all questions and options */
function mapTryoutFull(t: {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  tryoutQuestions: {
    sortOrder: number;
    question: {
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
    };
  }[];
  packageTryouts: { packageId: number }[];
}): Tryout {
  const questions = t.tryoutQuestions
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((tq) => mapQuestion(tq.question));

  return {
    id: t.id,
    name: t.name,
    isTrial: t.isTrial,
    sortOrder: t.sortOrder,
    questions,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/* ── Seeding from DEFAULT_PACKAGE_BANKS ──────────────────────────────── */
/* eslint-disable @typescript-eslint/no-explicit-any */
async function seedFromDefaults(): Promise<boolean> {
  try {
    const packages = await prisma.package.findMany();
    const pkgIdByName = new Map(packages.map((p) => [p.name, p.id]));

    for (const [pkgName, tryouts] of Object.entries(DEFAULT_PACKAGE_BANKS)) {
      const packageId = pkgIdByName.get(pkgName);
      if (packageId === undefined) continue;

      for (const t of tryouts) {
        const questions: any[] = (t as any).questions ?? [];

        const existing = await prisma.tryout.findFirst({
          where: { name: t.name, isTrial: t.isTrial, sortOrder: t.sortOrder },
        });

        let tryoutId: number;
        if (existing) {
          tryoutId = existing.id;
          await prisma.tryout.update({
            where: { id: existing.id },
            data: { name: t.name, isTrial: t.isTrial, sortOrder: t.sortOrder },
          });
        } else {
          const created = await prisma.tryout.create({
            data: { name: t.name, isTrial: t.isTrial, sortOrder: t.sortOrder },
          });
          tryoutId = created.id;
        }

        await prisma.packageTryout.upsert({
          where: { packageId_tryoutId: { packageId, tryoutId } },
          update: {},
          create: { packageId, tryoutId },
        });

        for (const q of questions) {
          const qExisting = await prisma.question.findFirst({
            where: { question: q.question, category: q.category },
          });

          let questionId: number;
          if (qExisting) {
            questionId = qExisting.id;
          } else {
            const created = await prisma.question.create({
              data: {
                category: q.category,
                question: q.question,
                correctAnswer: q.correctAnswer ?? null,
                questionImage: q.questionImage ?? null,
                explanation: q.explanation ?? null,
                explanationImage: q.explanationImage ?? null,
              },
            });
            questionId = created.id;
          }

          await prisma.tryoutQuestion.upsert({
            where: { tryoutId_questionId: { tryoutId, questionId } },
            update: {},
            create: { tryoutId, questionId, sortOrder: questions.indexOf(q) + 1 },
          });

          const opts: any[] = q.options ?? [];
          for (let oi = 0; oi < opts.length; oi++) {
            const opt = opts[oi];
            const optText = typeof opt === 'string' ? opt : opt.optionText ?? '';
            const tkpValue = typeof opt === 'string' ? (q.tkpValues?.[oi] ?? null) : (opt.tkpValue ?? null);

            await prisma.questionOption.upsert({
              where: { questionId_optionIndex: { questionId, optionIndex: oi } },
              update: { optionText: optText, tkpValue },
              create: {
                questionId,
                optionIndex: oi,
                optionText: optText,
                optionImage: typeof opt === 'string' ? null : (opt.optionImage ?? null),
                tkpValue,
              },
            });
          }
        }
      }
    }
    return true;
  } catch {
    return false;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ── Response builders ─────────────────────────────────────────────── */
function buildLightResponse(tryouts: {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  _count: { tryoutQuestions: number };
  packageTryouts: { packageId: number }[];
}[]): Record<string, Tryout[]> {
  const grouped: Record<string, Tryout[]> = {};
  for (const t of tryouts) {
    const mapped = mapTryoutLight(t);
    for (const pt of t.packageTryouts) {
      const key = String(pt.packageId);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapped);
    }
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return grouped;
}

function buildFullResponse(tryouts: {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  tryoutQuestions: {
    sortOrder: number;
    question: {
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
    };
  }[];
  packageTryouts: { packageId: number }[];
}[]): Record<string, Tryout[]> {
  const grouped: Record<string, Tryout[]> = {};
  for (const t of tryouts) {
    const mapped = mapTryoutFull(t);
    for (const pt of t.packageTryouts) {
      const key = String(pt.packageId);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(mapped);
    }
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return grouped;
}

/* ── Route handler ─────────────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const packageIdParam = searchParams.get('packageId');
  const includeQuestions = searchParams.get('include') === 'questions';

  try {
    let tryoutIds: number[] | undefined;

    if (packageIdParam) {
      const pkgId = parseInt(packageIdParam, 10);
      const mappings = await prisma.packageTryout.findMany({
        where: { packageId: pkgId },
        select: { tryoutId: true },
      });

      if (mappings.length === 0) {
        return NextResponse.json({ tryouts: DEFAULT_PACKAGE_BANKS });
      }

      tryoutIds = mappings.map((m) => m.tryoutId);
    }

    // Light query: metadata + question count only (fast)
    const lightInclude = {
      _count: { select: { tryoutQuestions: true } },
      packageTryouts: { select: { packageId: true } },
    };

    // Full query: all questions + options (heavy, only when needed)
    const fullInclude = {
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
      packageTryouts: { select: { packageId: true } },
    };

    let tryouts = await prisma.tryout.findMany({
      where: tryoutIds ? { id: { in: tryoutIds } } : undefined,
      orderBy: { sortOrder: 'asc' },
      include: includeQuestions ? fullInclude : lightInclude,
    });

    if (tryouts.length === 0) {
      await seedFromDefaults();
      tryouts = await prisma.tryout.findMany({
        where: tryoutIds ? { id: { in: tryoutIds } } : undefined,
        orderBy: { sortOrder: 'asc' },
        include: includeQuestions ? fullInclude : lightInclude,
      });

      if (tryouts.length === 0) {
        return NextResponse.json({ tryouts: DEFAULT_PACKAGE_BANKS });
      }
    }

    const grouped = includeQuestions
      ? buildFullResponse(tryouts as Parameters<typeof buildFullResponse>[0])
      : buildLightResponse(tryouts as Parameters<typeof buildLightResponse>[0]);

    return NextResponse.json({ tryouts: grouped });
  } catch (error) {
    console.error('Error fetching tryouts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tryouts' },
      { status: 500 }
    );
  }
}
