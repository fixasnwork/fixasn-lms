import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

function parseTryoutId(value: string): number | null {
  const tryoutId = Number(value);
  return Number.isInteger(tryoutId) && tryoutId > 0 ? tryoutId : null;
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
        createdAt: tryout.createdAt.toISOString(),
        updatedAt: tryout.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
