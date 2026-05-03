// ─────────────────────────────────────────────
// API: GET/POST/PUT Payments (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

function mapPayment(payment: {
  id: string;
  userId: string;
  packageId: number;
  status: string;
  proofUrl: string | null;
  blockReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: payment.id,
    userId: payment.userId,
    packageId: payment.packageId,
    status: payment.status,
    proofUrl: payment.proofUrl || null,
    blockReason: payment.blockReason || null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await auth();
  const searchParams = request.nextUrl.searchParams;

  // Admin sees all; users see their own
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';
  const userId = isAdmin ? null : searchParams.get('userId') || session?.user?.email || null;

  const payments = await prisma.payment.findMany({
    ...(userId ? { where: { userId } } : {}),
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ payments: payments.map(mapPayment) });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const session = await auth();

  if (!body.packageId) {
    return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
  }

  const userId = session?.user?.email || body.userId;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required (must be logged in or provided)' }, { status: 400 });
  }

  const data = await prisma.payment.create({
    data: {
      userId,
      packageId: parseInt(body.packageId, 10),
      status: 'pending',
      proofUrl: body.proofUrl || null,
    },
  });

  return NextResponse.json({
    success: true,
    payment: mapPayment(data),
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();

  if (!body.id) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }

  const data = await prisma.payment.update({
    where: { id: body.id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.proofUrl !== undefined ? { proofUrl: body.proofUrl } : {}),
      ...(body.blockReason !== undefined ? { blockReason: body.blockReason } : {}),
    },
  });

  return NextResponse.json({
    success: true,
    payment: mapPayment(data),
  });
}
