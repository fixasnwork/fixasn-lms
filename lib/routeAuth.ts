import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Session } from 'next-auth';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
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

export type ActiveRouteSession = Session & {
  user: NonNullable<Session['user']> & {
    email: string;
    role?: string;
    activeSessionVersion?: number;
  };
  isSessionStale?: boolean;
};

export type AuthenticatedResult =
  | { ok: true; session: ActiveRouteSession }
  | { ok: false; response: NextResponse };

export async function requireActiveSession(request: NextRequest): Promise<AuthenticatedResult> {
  const session = (await auth()) as Session | null;
  const email = getEmailFromSessionUser(session?.user);

  if (!session?.user || !email) {
    const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    clearDeviceSecretCookie(response);
    return { ok: false, response };
  }

  const activeSession = session as ActiveRouteSession;
  const role = getRoleFromSessionUser(activeSession.user);
  if (isAdminRole(role)) {
    return { ok: true, session: activeSession };
  }

  // Check if user is banned
  const user = await prisma.user.findUnique({
    where: { email },
    select: { isBlocked: true },
  });
  if (user?.isBlocked) {
    const response = NextResponse.json({ error: 'Account blocked' }, { status: 403 });
    return { ok: false, response };
  }

  if (activeSession.isSessionStale === true) {
    const response = NextResponse.json({ error: STALE_SESSION_MESSAGE }, { status: 401 });
    clearDeviceSecretCookie(response);
    return { ok: false, response };
  }

  const activeCheck = await validateNonAdminActiveSession({
    email,
    tokenSessionVersion: getTokenSessionVersionFromSessionUser(activeSession.user),
    deviceSecret: request.cookies.get(DEVICE_SECRET_COOKIE_NAME)?.value,
  });

  if (!activeCheck.ok) {
    // Bootstrap exception: the device secret needs to be (re-)synced.
    // Covers three transient states that all resolve via a single call to
    // POST /api/auth/device-secret:
    //   - missing-device-secret-hash: fresh sign-in, hash not yet minted
    //   - missing-device-secret-cookie: cookie cleared/expired/lost
    //   - invalid-device-secret: stale cookie from a previous session
    // The user has a valid JWT (matching version), so the sync endpoint
    // will mint a fresh hash and cookie. The window is transient and does
    // not widen the attack surface: an attacker with a valid JWT can
    // already call the sync endpoint to obtain a new cookie.
    if (
      activeCheck.reason === 'missing-device-secret-hash' ||
      activeCheck.reason === 'missing-device-secret-cookie' ||
      activeCheck.reason === 'invalid-device-secret'
    ) {
      return { ok: true, session: activeSession };
    }
    const response = NextResponse.json({ error: STALE_SESSION_MESSAGE }, { status: 401 });
    clearDeviceSecretCookie(response);
    return { ok: false, response };
  }

  return { ok: true, session: activeSession };
}
