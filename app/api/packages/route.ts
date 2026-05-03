// ─────────────────────────────────────────────
// API: GET/PUT Packages (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DEFAULT_PACKAGES } from '@/data/packages';

export async function GET() {
  const data = await prisma.package.findMany({ orderBy: { id: 'asc' } });

  const packages = data.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    price: pkg.price,
    isTrial: pkg.isTrial,
    isActive: pkg.isActive,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  }));

  // Fallback: if DB is empty, seed from defaults
  if (packages.length === 0) {
    await prisma.package.createMany({ data: DEFAULT_PACKAGES });
    return NextResponse.json({ packages: DEFAULT_PACKAGES });
  }

  return NextResponse.json({ packages });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!Array.isArray(body.packages)) {
    return NextResponse.json({ error: 'Invalid data: packages must be an array' }, { status: 400 });
  }

  const dbRows = body.packages.map((pkg: Record<string, unknown>) => ({
    id: pkg.id as string,
    name: pkg.name as string,
    description: (pkg.description as string) || '',
    price: (pkg.price as number) || 0,
    isTrial: Boolean(pkg.isTrial),
    isActive: Boolean(pkg.isActive),
  }));

  // Delete all and re-insert — simple full replacement
  await prisma.package.deleteMany();
  await prisma.package.createMany({ data: dbRows });

  const data = await prisma.package.findMany({ orderBy: { id: 'asc' } });

  const packages = data.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    price: pkg.price,
    isTrial: pkg.isTrial,
    isActive: pkg.isActive,
    createdAt: pkg.createdAt,
    updatedAt: pkg.updatedAt,
  }));

  return NextResponse.json({ success: true, packages });
}
