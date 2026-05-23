import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import {
  clearDeviceSecretCookie,
  DEVICE_SECRET_COOKIE_NAME,
  getEmailFromSessionUser,
  getRoleFromSessionUser,
  getTokenSessionVersionFromSessionUser,
  isAdminRole,
  STALE_SESSION_MESSAGE,
  validateNonAdminActiveSession,
} from '@/lib/deviceSession';

export type AuthenticatedResult =
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof auth>>> }
  | { ok: false; response: NextResponse };

export async function requireActiveSession(request: NextRequest): Promise<AuthenticatedResult> {
  const session = await auth();
  const email = getEmailFromSessionUser(session?.user);

  if (!session?.user || !email) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    clearDeviceSecretCookie(response);
    return { ok: false, response };
  }

  const role = getRoleFromSessionUser(session.user);
  if (isAdminRole(role)) {
    return { ok: true, session };
  }

  if ((session as { isSessionStale?: boolean }).isSessionStale === true) {
    const response = NextResponse.json({ error: STALE_SESSION_MESSAGE }, { status: 401 });
    clearDeviceSecretCookie(response);
    return { ok: false, response };
  }

  const activeCheck = await validateNonAdminActiveSession({
    email,
    tokenSessionVersion: getTokenSessionVersionFromSessionUser(session.user),
    deviceSecret: request.cookies.get(DEVICE_SECRET_COOKIE_NAME)?.value,
  });

  if (!activeCheck.ok) {
    const response = NextResponse.json({ error: STALE_SESSION_MESSAGE }, { status: 401 });
    clearDeviceSecretCookie(response);
    return { ok: false, response };
  }

  return { ok: true, session };
}

