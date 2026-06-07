import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

function parseTryoutId(value: string): number | null {
  const tryoutId = Number(value);
  return Number.isInteger(tryoutId) && tryoutId > 0 ? tryoutId : null;
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

  const tryout = await prisma.tryout.findFirst({
    where: { id: tryoutId, deletedAt: null },
  });

  if (!tryout) {
    return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
  }

  return NextResponse.json({
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
    },
  });
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Date(String(value));
}

function isInvalidDate(date: Date | null | undefined): boolean {
  return !!date && !Number.isFinite(date.getTime());
}

function validateDateRange(startDate: Date | null | undefined, endDate: Date | null | undefined): string | null {
  if (isInvalidDate(startDate) || isInvalidDate(endDate)) {
    return 'startDate and endDate must be valid dates';
  }
  // Only validate range when both dates are set
  if (startDate && endDate) {
    if (startDate >= endDate) {
      return 'startDate must be before endDate';
    }
  }
  return null;
}

export async function PUT(
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
    const existing = await prisma.tryout.findFirst({
      where: { id: tryoutId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
    }

    const body = await request.json();

    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    const isTrial = body.isTrial !== undefined ? Boolean(body.isTrial) : existing.isTrial;
    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sortOrder;
    const durationMin = body.durationMin !== undefined ? Number(body.durationMin) : existing.durationMin;

    if (!name) {
      return NextResponse.json({ error: 'Tryout name cannot be empty' }, { status: 400 });
    }

    if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 300) {
      return NextResponse.json(
        { error: 'durationMin must be an integer between 1 and 300' },
        { status: 400 }
      );
    }

    const startDate = parseOptionalDate(body.startDate);
    const endDate = parseOptionalDate(body.endDate);

    const resolvedStartDate = startDate !== undefined ? startDate : existing.startDate;
    const resolvedEndDate = endDate !== undefined ? endDate : existing.endDate;
    const dateError = validateDateRange(
      resolvedStartDate ?? undefined,
      resolvedEndDate ?? undefined
    );
    if (dateError) {
      return NextResponse.json({ error: dateError }, { status: 400 });
    }

    const tryout = await prisma.tryout.update({
      where: { id: tryoutId },
      data: {
        name,
        isTrial,
        sortOrder,
        durationMin,
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
      },
    });

    return NextResponse.json({
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json();
    const durationMin = Number(body.durationMin);

    if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 300) {
      return NextResponse.json(
        { error: 'durationMin must be an integer between 1 and 300' },
        { status: 400 }
      );
    }

    const tryout = await prisma.tryout.update({
      where: { id: tryoutId },
      data: { durationMin },
    });

    return NextResponse.json({
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const existing = await prisma.tryout.findFirst({
      where: { id: tryoutId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
    }

    // Block deletion if linked attempt records exist
    const attemptCount = await prisma.tryoutAttempt.count({ where: { tryoutId } });
    if (attemptCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete tryout with existing attempt history. Remove it from packages instead.',
          links: { attempts: attemptCount },
        },
        { status: 409 }
      );
    }

    // Soft-delete tryout and unlink from packages
    await prisma.$transaction([
      prisma.packageTryout.deleteMany({ where: { tryoutId } }),
      prisma.tryout.update({
        where: { id: tryoutId },
        data: { deletedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
