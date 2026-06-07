// ─────────────────────────────────────────────
// API: GET/POST/PUT Payments (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPackageAvailable } from '@/lib/availability';
import { getEmailFromSessionUser, getRoleFromSessionUser, isAdminRole } from '@/lib/deviceSession';
import { requireActiveSession } from '@/lib/routeAuth';

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
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = authResult.session;
  const searchParams = request.nextUrl.searchParams;

  // Admin sees all; users see their own
  const isAdmin = isAdminRole(getRoleFromSessionUser(session.user));
  const userId = isAdmin ? null : searchParams.get('userId') || getEmailFromSessionUser(session.user);

  const payments = await prisma.payment.findMany({
    ...(userId ? { where: { userId } } : {}),
    orderBy: { createdAt: 'desc' },
  });

  // Enrich with user ban status for admin view
  const mapped = payments.map(mapPayment);
  if (isAdmin) {
    const emails = [...new Set(mapped.map((p) => p.userId))];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, isBlocked: true, blockedReason: true },
    });
    const userMap = new Map(users.map((u) => [u.email, { isBlocked: u.isBlocked, blockedReason: u.blockedReason }]));
    const enriched = mapped.map((p) => ({
      ...p,
      userIsBlocked: userMap.get(p.userId)?.isBlocked ?? false,
      userBlockedReason: userMap.get(p.userId)?.blockedReason ?? null,
    }));
    return NextResponse.json({ payments: enriched });
  }

  return NextResponse.json({ payments: mapped });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = authResult.session;

  if (!body.packageId) {
    return NextResponse.json({ error: 'packageId is required' }, { status: 400 });
  }

  const userId = getEmailFromSessionUser(session.user) || body.userId;

  if (!userId) {
    return NextResponse.json({ error: 'userId is required (must be logged in or provided)' }, { status: 400 });
  }

  const packageId = parseInt(body.packageId, 10);
  if (!Number.isInteger(packageId) || packageId <= 0) {
    return NextResponse.json({ error: 'Valid packageId is required' }, { status: 400 });
  }

  const pkg = await prisma.package.findFirst({
    where: { id: packageId, deletedAt: null },
  });

  if (!pkg || !isPackageAvailable(pkg)) {
    return NextResponse.json({ error: 'package_unavailable', reason: 'package_closed' }, { status: 403 });
  }

  const data = await prisma.payment.create({
    data: {
      userId,
      packageId,
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
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  const role = getRoleFromSessionUser(authResult.session.user);
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
