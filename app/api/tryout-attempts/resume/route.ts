// ─────────────────────────────────────────────
// API: POST /api/tryout-attempts/resume
// Create a new attempt or resume an in-progress one
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { isAvailable } from '@/lib/availability';
import { hasTryoutAccess } from '@/lib/packageAccessServer';

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

  if (!(await hasTryoutAccess(session.user.email, tryoutId))) {
    return NextResponse.json({ error: 'Akses paket belum aktif atau sudah berakhir. Silakan beli paket atau tunggu verifikasi.' }, { status: 403 });
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
        timeLeftSeconds: latestAttempt.timeLeftSeconds ?? null,
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
      timeLeftSeconds: null,
    },
  });
}
