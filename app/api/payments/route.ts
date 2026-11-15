// ─────────────────────────────────────────────
// API: GET/POST/PUT Payments (Prisma-backed)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isPackageAvailable } from '@/lib/availability';
import { accessExpiry } from '@/lib/packageAccess';
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
  accessDurationMonths: number | null;
  verifiedAt: Date | null;
  accessExpiresAt: Date | null;
}) {
  return {
    id: payment.id,
    userId: payment.userId,
    packageId: payment.packageId,
    status: payment.status,
    accessDurationMonths: payment.accessDurationMonths,
    verifiedAt: payment.verifiedAt?.toISOString() ?? null,
    accessExpiresAt: payment.accessExpiresAt?.toISOString() ?? null,
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

  // Admin sees all; users see their own
  const isAdmin = isAdminRole(getRoleFromSessionUser(session.user));
  const userId = isAdmin ? null : getEmailFromSessionUser(session.user);
  if (!isAdmin && !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, ...(userId ? { userId } : {}) },
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
      accessDurationMonths: pkg.accessDurationMonths,
      proofUrl: body.proofUrl || null,
    },
  });

  // Pending payments do not grant access; verification activates the purchase.

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

  if (body.status !== undefined && !['pending', 'verified', 'rejected', 'expired', 'blocked'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
  }

  const data = await prisma.$transaction(async (tx) => {
    // The update locks this payment row. Concurrent verifications read the
    // latest timestamp after the lock, so its access clock starts only once.
    const payment = await tx.payment.update({
      where: { id: body.id, deletedAt: null },
      data: {
        updatedAt: new Date(),
        ...(body.proofUrl !== undefined ? { proofUrl: body.proofUrl } : {}),
        ...(body.blockReason !== undefined ? { blockReason: body.blockReason } : {}),
      },
      include: { package: true },
    });
    if (body.status === 'verified') {
      const legacyVerified = payment.status === 'verified' && payment.accessDurationMonths === null;
      if (!payment.verifiedAt && !legacyVerified) {
        const now = new Date();
        const months = payment.accessDurationMonths ?? payment.package.accessDurationMonths;
        await tx.payment.update({
          where: { id: payment.id },
          data: { verifiedAt: now, accessDurationMonths: months, accessExpiresAt: accessExpiry(now, months) },
        });
      }
      await tx.userPurchase.upsert({
        where: { userId_packageId: { userId: payment.userId, packageId: payment.packageId } },
        create: { userId: payment.userId, packageId: payment.packageId, paymentId: payment.id },
        update: { paymentId: payment.id, deletedAt: null },
      });
    }
    // Access gates evaluate payment status directly. Revoking one payment
    // does not revoke a different active purchase of the same package.
    return tx.payment.update({
      where: { id: payment.id },
      data: { ...(body.status !== undefined ? { status: body.status } : {}) },
    });
  });

  return NextResponse.json({
    success: true,
    payment: mapPayment(data),
  });
}
