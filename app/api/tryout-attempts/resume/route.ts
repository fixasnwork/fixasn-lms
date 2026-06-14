// ─────────────────────────────────────────────
// API: POST /api/tryout-attempts/resume
// Create a new attempt or resume an in-progress one
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { isAvailable, isPackageAvailable } from '@/lib/availability';

export async function POST(request: NextRequest) {
  const authResult = await requireActiveSession(request);
  if (!authResult.ok) {
    return authResult.response;
  }
  const session = authResult.session;

  const body = await request.json();
  const tryoutId = parseInt(body.tryoutId, 10);
  if (!tryoutId || isNaN(tryoutId)) {
    return NextResponse.json({ error: 'tryoutId is required' }, { status: 400 });
  }

  // Verify the tryout exists
  const tryout = await prisma.tryout.findUnique({
    where: { id: tryoutId, deletedAt: null },
  });
  if (!tryout) {
    return NextResponse.json({ error: 'Tryout not found' }, { status: 404 });
  }

  // Check if user has access to this tryout (trial = always accessible)
  let accessPayment: { package: { startDate: Date | string | null; endDate: Date | string | null } } | null = null;
  if (!tryout.isTrial) {
    const hasAccess = await prisma.payment.findFirst({
      where: {
        userId: session.user.email,
        status: { in: ['pending', 'verified'] },
        package: {
          packageTryouts: {
            some: { tryoutId },
          },
        },
      },
      select: { package: { select: { startDate: true, endDate: true } } },
    });
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied. Purchase a package to unlock this tryout.' }, { status: 403 });
    }
    accessPayment = hasAccess;
  }

  // Find the most recent attempt for this user + tryout
  const latestAttempt = await prisma.tryoutAttempt.findFirst({
    where: {
      userId: session.user.email,
      tryoutId,
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  // If the latest attempt has not been finished yet, it's in-progress → resume it.
  // Use finishedAt (not totalScore) since a zero-score finished attempt is valid.
  if (latestAttempt && !latestAttempt.finishedAt) {
    return NextResponse.json({
      success: true,
      attempt: {
        id: latestAttempt.id,
        tryoutId: latestAttempt.tryoutId,
        isNew: false,
      },
    });
  }

  // ── Availability gate (new attempts only; in-progress resumes are not blocked) ──
  if (!isAvailable(tryout)) {
      return NextResponse.json(
        { error: 'tryout_unavailable', reason: 'out_of_window', retryable: true },
        { status: 403 }
      );
    }

    // Only enforce the package date window on the package the user is actually
    // accessing the tryout through. Other linked packages may be inactive for
    // unrelated reasons (e.g. legacy product variants) and must not block
    // attempts from users who already paid for access via a different package.
    if (accessPayment && !isPackageAvailable(accessPayment.package)) {
      return NextResponse.json(
        {
          error: 'tryout_unavailable',
          reason: 'package_closed',
          retryable: true,
        },
        { status: 403 }
      );
    }

  // Otherwise, create a new blank attempt
  const newAttempt = await prisma.tryoutAttempt.create({
    data: {
      userId: session.user.email,
      userName: session.user.name || session.user.email,
      tryoutId,
      twkScore: 0,
      tiuScore: 0,
      tkpScore: 0,
      totalScore: 0,
    },
  });

  return NextResponse.json({
    success: true,
    attempt: {
      id: newAttempt.id,
      tryoutId: newAttempt.tryoutId,
      isNew: true,
    },
  });
}
