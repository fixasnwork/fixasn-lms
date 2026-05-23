import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export const DEVICE_SECRET_COOKIE_NAME = 'fxns_state';
export const STALE_SESSION_MESSAGE = 'Akun Anda telah masuk di perangkat lain. Silakan masuk kembali untuk melanjutkan.';
export const STALE_SESSION_REASON = 'device-replaced';

const DEVICE_SECRET_BYTES = 32;

export function generateDeviceSecret(): string {
  return crypto.randomBytes(DEVICE_SECRET_BYTES).toString('base64url');
}

export function hashDeviceSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}

export function getRoleFromSessionUser(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const role = (user as { role?: unknown }).role;
  return typeof role === 'string' ? role : null;
}

export function getEmailFromSessionUser(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null;
  const email = (user as { email?: unknown }).email;
  return typeof email === 'string' ? email : null;
}

export function getTokenSessionVersionFromSessionUser(user: unknown): number | null {
  if (!user || typeof user !== 'object') return null;
  const v = (user as { activeSessionVersion?: unknown }).activeSessionVersion;
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function buildLoginRedirectWithReason(request: NextRequest): URL {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('reason', STALE_SESSION_REASON);
  loginUrl.searchParams.set('message', STALE_SESSION_MESSAGE);
  return loginUrl;
}

export function applyDeviceSecretCookie(response: NextResponse, secret: string): void {
  response.cookies.set({
    name: DEVICE_SECRET_COOKIE_NAME,
    value: secret,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearDeviceSecretCookie(response: NextResponse): void {
  response.cookies.set({
    name: DEVICE_SECRET_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export type ActiveSessionCheck =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'missing-session-version'
        | 'version-mismatch'
        | 'missing-device-secret-cookie'
        | 'missing-device-secret-hash'
        | 'invalid-device-secret'
        | 'user-not-found';
    };

export async function validateNonAdminActiveSession(params: {
  email: string;
  tokenSessionVersion: number | null;
  deviceSecret: string | undefined;
}): Promise<ActiveSessionCheck> {
  const user = await prisma.user.findUnique({
    where: { email: params.email },
    select: {
      activeSessionVersion: true,
      activeDeviceSecretHash: true,
    },
  });

  if (!user) return { ok: false, reason: 'user-not-found' };

  if (params.tokenSessionVersion === null || user.activeSessionVersion === null) {
    return { ok: false, reason: 'missing-session-version' };
  }

  if (params.tokenSessionVersion !== user.activeSessionVersion) {
    return { ok: false, reason: 'version-mismatch' };
  }

  if (!user.activeDeviceSecretHash) {
    return { ok: false, reason: 'missing-device-secret-hash' };
  }

  if (!params.deviceSecret) {
    return { ok: false, reason: 'missing-device-secret-cookie' };
  }

  if (hashDeviceSecret(params.deviceSecret) !== user.activeDeviceSecretHash) {
    return { ok: false, reason: 'invalid-device-secret' };
  }

  return { ok: true };
}
