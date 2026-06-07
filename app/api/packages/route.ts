// ─────────────────────────────────────────────
// API: GET/POST Packages (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface PackageResponse {
  id: number;
  name: string;
  description: string;
  price: number;
  isTrial: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  tryoutCount: number;
}

function mapPackage(pkg: {
  id: number;
  name: string;
  description: string;
  price: number;
  isTrial: boolean;
  tryoutCount: number;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): PackageResponse {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    price: pkg.price,
    isTrial: pkg.isTrial,
    startDate: pkg.startDate ? pkg.startDate.toISOString() : null,
    endDate: pkg.endDate ? pkg.endDate.toISOString() : null,
    tryoutCount: pkg.tryoutCount,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

export async function GET() {
  const data = await prisma.package.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
    include: { _count: { select: { packageTryouts: true } } },
  });

  const packages = data.map((pkg) =>
    mapPackage({
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      price: pkg.price,
      isTrial: pkg.isTrial,
      startDate: pkg.startDate,
      endDate: pkg.endDate,
      tryoutCount: Math.max(pkg.tryoutCount, pkg._count.packageTryouts),
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
    })
  );

  return NextResponse.json(
    { packages },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const price = Number(body.price) || 0;
    const description = String(body.description ?? '').trim();
    const isTrial = Boolean(body.isTrial);
    const startDate = body.startDate ? new Date(body.startDate) : null;
    const endDate = body.endDate ? new Date(body.endDate) : null;

    if (!name) {
      return NextResponse.json({ error: 'Package name is required' }, { status: 400 });
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

    const pkg = await prisma.package.create({
      data: { name, description, price, isTrial, startDate, endDate, tryoutCount: 0 },
    });

    return NextResponse.json({ success: true, package: mapPackage({ ...pkg, tryoutCount: 0 }) }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A package with this name already exists' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
