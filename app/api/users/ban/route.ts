// ─────────────────────────────────────────────
// API: PUT /api/users/ban — Ban a user (admin only)
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { getRoleFromSessionUser, isAdminRole } from '@/lib/deviceSession';

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
  const { email, reason } = body;

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  await prisma.user.update({
    where: { email },
    data: {
      isBlocked: true,
      blockedAt: new Date(),
      blockedReason: reason || null,
    },
  });

  return NextResponse.json({ success: true });
}
