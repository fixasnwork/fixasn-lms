// ─────────────────────────────────────────────
// API: GET/PUT Package Tryout Assignments
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import type { Tryout } from '@/lib/types';

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function mapTryout(t: {
  id: number;
  name: string;
  isTrial: boolean;
  sortOrder: number;
  durationMin: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tryoutQuestions: number };
}): Tryout {
  return {
    id: t.id,
    name: t.name,
    isTrial: t.isTrial,
    sortOrder: t.sortOrder,
    durationMin: t.durationMin,
    questions: [],
    _questionCount: t._count?.tryoutQuestions ?? 0,
    startDate: t.startDate?.toISOString() ?? null,
    endDate: t.endDate?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const { packageId: packageIdParam } = await params;
  const packageId = parseId(packageIdParam);
  if (!packageId) {
    return NextResponse.json({ error: 'Valid packageId is required' }, { status: 400 });
  }

  const pkg = await prisma.package.findFirst({
    where: { id: packageId, deletedAt: null },
  });
  if (!pkg) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 });
  }

  const tryouts = await prisma.tryout.findMany({
    where: {
      packageTryouts: { some: { packageId } },
      deletedAt: null,
    },
    orderBy: { sortOrder: 'asc' as const },
    include: { _count: { select: { tryoutQuestions: true } } },
  });

  return NextResponse.json({ tryouts: tryouts.map(mapTryout) });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  const authError = await requireAdmin();
  if (authError) return authError;

  const { packageId: packageIdParam } = await params;
  const packageId = parseId(packageIdParam);
  if (!packageId) {
    return NextResponse.json({ error: 'Valid packageId is required' }, { status: 400 });
  }

  try {
    const pkg = await prisma.package.findFirst({
      where: { id: packageId, deletedAt: null },
    });
    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const body = await request.json();
    const tryoutIds: number[] = body.tryoutIds ?? [];

    if (!Array.isArray(tryoutIds)) {
      return NextResponse.json({ error: 'tryoutIds must be an array' }, { status: 400 });
    }

    // Validate all tryout IDs exist and are not deleted
    if (tryoutIds.length > 0) {
      const validTryouts = await prisma.tryout.findMany({
        where: { id: { in: tryoutIds }, deletedAt: null },
        select: { id: true },
      });
      const validIds = new Set(validTryouts.map((t) => t.id));
      const invalidIds = tryoutIds.filter((id) => !validIds.has(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: 'One or more tryouts not found or deleted', invalidTryoutIds: invalidIds },
          { status: 400 }
        );
      }
    }

    // Atomic replacement
    await prisma.$transaction([
      prisma.packageTryout.deleteMany({ where: { packageId } }),
      ...tryoutIds.map((tryoutId) =>
        prisma.packageTryout.create({ data: { packageId, tryoutId } })
      ),
      prisma.package.update({
        where: { id: packageId },
        data: { tryoutCount: tryoutIds.length },
      }),
    ]);

    const tryouts = await prisma.tryout.findMany({
      where: {
        id: { in: tryoutIds },
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' as const },
      include: { _count: { select: { tryoutQuestions: true } } },
    });

    return NextResponse.json({ success: true, tryouts: tryouts.map(mapTryout), tryoutCount: tryoutIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
