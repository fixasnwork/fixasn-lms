import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import {
  applyDeviceSecretCookie,
  clearDeviceSecretCookie,
  DEVICE_SECRET_COOKIE_NAME,
  generateDeviceSecret,
  getEmailFromSessionUser,
  getRoleFromSessionUser,
  hashDeviceSecret,
  isAdminRole,
  validateNonAdminActiveSession,
} from '@/lib/deviceSession';

export async function POST(request: NextRequest) {
  const session = await auth();
  const email = getEmailFromSessionUser(session?.user);
  const role = getRoleFromSessionUser(session?.user);

  if (!email) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    clearDeviceSecretCookie(response);
    return response;
  }

  if (isAdminRole(role)) {
    const response = NextResponse.json({ success: true, skipped: true });
    clearDeviceSecretCookie(response);
    return response;
  }

  const tokenSessionVersion = (session?.user as { activeSessionVersion?: number } | undefined)?.activeSessionVersion ?? null;
  const currentSecret = request.cookies.get(DEVICE_SECRET_COOKIE_NAME)?.value;
  const check = await validateNonAdminActiveSession({
    email,
    tokenSessionVersion,
    deviceSecret: currentSecret,
  });

  if (check.ok) {
    return NextResponse.json({ success: true, synced: true });
  }

  if (check.reason === 'missing-device-secret-hash' || check.reason === 'missing-device-secret-cookie' || check.reason === 'invalid-device-secret') {
    const newSecret = generateDeviceSecret();
    await prisma.user.update({
      where: { email },
      data: { activeDeviceSecretHash: hashDeviceSecret(newSecret) },
    });

    const response = NextResponse.json({ success: true, synced: true });
    applyDeviceSecretCookie(response, newSecret);
    return response;
  }

  const response = NextResponse.json(
    { error: 'Session invalidated by another login' },
    { status: 401 },
  );
  clearDeviceSecretCookie(response);
  return response;
}
