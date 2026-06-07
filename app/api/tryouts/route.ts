import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
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
  durationMin: number;
  startDate: Date | null;
  endDate: Date | null;
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
    durationMin: t.durationMin,
    questions: [],
    _questionCount: t._count.tryoutQuestions,
    startDate: t.startDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
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
  durationMin: number;
  startDate: Date | null;
  endDate: Date | null;
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
    durationMin: t.durationMin,
    questions,
    startDate: t.startDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
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
            data: {
              name: t.name,
              isTrial: t.isTrial,
              sortOrder: t.sortOrder,
              durationMin: t.isTrial ? 15 : 100,
            },
          });
        } else {
          const created = await prisma.tryout.create({
            data: {
              name: t.name,
              isTrial: t.isTrial,
              sortOrder: t.sortOrder,
              durationMin: t.isTrial ? 15 : 100,
            },
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
  durationMin: number;
  startDate: Date | null;
  endDate: Date | null;
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

function _isInvalidDate(date: Date | null): boolean {
  return !!date && !Number.isFinite(date.getTime());
}

function buildFullResponse(tryouts: {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  durationMin: number;
  startDate: Date | null;
  endDate: Date | null;
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

/* ── Route handlers ───────────────────────────────────────────────── */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const packageIdParam = searchParams.get('packageId');
  const includeQuestions = searchParams.get('include') === 'questions';
  const flatScope = searchParams.get('scope') === 'all';

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

    const lightInclude = {
      _count: { select: { tryoutQuestions: true } },
      packageTryouts: { select: { packageId: true } },
    };

    const fullInclude = {
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
      packageTryouts: { select: { packageId: true } },
    };

    let tryouts = await prisma.tryout.findMany({
      where: {
        ...(tryoutIds ? { id: { in: tryoutIds } } : {}),
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' as const },
      include: includeQuestions ? fullInclude : lightInclude,
    });

    if (tryouts.length === 0) {
      await seedFromDefaults();
      tryouts = await prisma.tryout.findMany({
        where: {
          ...(tryoutIds ? { id: { in: tryoutIds } } : {}),
          deletedAt: null,
        },
        orderBy: { sortOrder: 'asc' },
        include: includeQuestions ? fullInclude : lightInclude,
      });

      if (tryouts.length === 0) {
        return NextResponse.json({ tryouts: DEFAULT_PACKAGE_BANKS });
      }
    }

    if (flatScope) {
      const mapped = includeQuestions
        ? (tryouts as unknown as Parameters<typeof buildFullResponse>[0]).map(mapTryoutFull)
        : (tryouts as unknown as Parameters<typeof buildLightResponse>[0]).map(mapTryoutLight);
      return NextResponse.json({ tryouts: mapped });
    }

    const grouped = includeQuestions
      ? buildFullResponse(tryouts as unknown as Parameters<typeof buildFullResponse>[0])
      : buildLightResponse(tryouts as unknown as Parameters<typeof buildLightResponse>[0]);

    return NextResponse.json({ tryouts: grouped });
  } catch (error) {
    console.error('Error fetching tryouts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tryouts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const isTrial = Boolean(body.isTrial);
    const sortOrder = Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : 0;
    const durationMin = Number.isInteger(body.durationMin) ? Number(body.durationMin) : 100;

    const startDate: Date | null = body.startDate ? new Date(body.startDate) : null;
    const endDate: Date | null = body.endDate ? new Date(body.endDate) : null;

    if (!name) {
      return NextResponse.json({ error: 'Tryout name is required' }, { status: 400 });
    }

    if (durationMin < 1 || durationMin > 300) {
      return NextResponse.json({ error: 'durationMin must be between 1 and 300' }, { status: 400 });
    }

    // Validate dates only when both are provided
    if (startDate && endDate) {
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
        return NextResponse.json({ error: 'startDate and endDate must be valid dates' }, { status: 400 });
      }
      if (startDate >= endDate) {
        return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
      }
    } else if (startDate && !Number.isFinite(startDate.getTime())) {
      return NextResponse.json({ error: 'startDate must be a valid date' }, { status: 400 });
    } else if (endDate && !Number.isFinite(endDate.getTime())) {
      return NextResponse.json({ error: 'endDate must be a valid date' }, { status: 400 });
    }

    const tryout = await prisma.tryout.create({
      data: { name, isTrial, sortOrder, durationMin, startDate, endDate },
    });

    return NextResponse.json(
      {
        success: true,
        tryout: {
          id: tryout.id,
          name: tryout.name,
          isTrial: tryout.isTrial,
          sortOrder: tryout.sortOrder,
          durationMin: tryout.durationMin,
          startDate: tryout.startDate?.toISOString() ?? null,
          endDate: tryout.endDate?.toISOString() ?? null,
          createdAt: tryout.createdAt.toISOString(),
          updatedAt: tryout.updatedAt.toISOString(),
          questions: [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
