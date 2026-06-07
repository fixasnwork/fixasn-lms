// ─────────────────────────────────────────────
// API: GET/PUT/DELETE single Package (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import type { PackageResponse } from '../route';

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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

  return NextResponse.json({ package: mapPackage(pkg) });
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
    const existing = await prisma.package.findFirst({
      where: { id: packageId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const body = await request.json();

    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    const description = body.description !== undefined ? String(body.description).trim() : existing.description;
    const price = body.price !== undefined ? Number(body.price) : existing.price;
    const isTrial = body.isTrial !== undefined ? Boolean(body.isTrial) : existing.isTrial;

    // Date fields: use body value if provided, else preserve existing
    let startDate: Date | null | undefined = undefined;
    let endDate: Date | null | undefined = undefined;
    if (body.startDate !== undefined) {
      startDate = body.startDate === null ? null : new Date(body.startDate);
    }
    if (body.endDate !== undefined) {
      endDate = body.endDate === null ? null : new Date(body.endDate);
    }

    // Resolve effective values for validation
    const effStart = startDate !== undefined ? startDate : existing.startDate;
    const effEnd = endDate !== undefined ? endDate : existing.endDate;

    if (!name) {
      return NextResponse.json({ error: 'Package name cannot be empty' }, { status: 400 });
    }

    // Validate range only when both dates are set
    if (effStart && effEnd) {
      if (!Number.isFinite(effStart.getTime()) || !Number.isFinite(effEnd.getTime())) {
        return NextResponse.json({ error: 'startDate and endDate must be valid dates' }, { status: 400 });
      }
      if (effStart >= effEnd) {
        return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
      }
    }

    const pkg = await prisma.package.update({
      where: { id: packageId },
      data: {
        name,
        description,
        price,
        isTrial,
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
      },
    });

    return NextResponse.json({ success: true, package: mapPackage(pkg) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'A package with this name already exists' }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const existing = await prisma.package.findFirst({
      where: { id: packageId, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }

    // Block deletion if linked records exist
    const [paymentCount, purchaseCount] = await Promise.all([
      prisma.payment.count({ where: { packageId } }),
      prisma.userPurchase.count({ where: { packageId } }),
    ]);

    if (paymentCount > 0 || purchaseCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete package with existing payment or purchase history. Deactivate it instead.',
          links: { payments: paymentCount, purchases: purchaseCount },
        },
        { status: 409 }
      );
    }

    // Soft-delete package and remove package-tryout links
    await prisma.$transaction([
      prisma.packageTryout.deleteMany({ where: { packageId } }),
      prisma.package.update({
        where: { id: packageId },
        data: { deletedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
