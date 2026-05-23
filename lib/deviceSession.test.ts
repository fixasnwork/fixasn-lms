import { describe, expect, it, vi } from 'vitest';
import {
  buildLoginRedirectWithReason,
  DEVICE_SECRET_COOKIE_NAME,
  generateDeviceSecret,
  hashDeviceSecret,
  STALE_SESSION_REASON,
  validateNonAdminActiveSession,
} from '@/lib/deviceSession';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

describe('deviceSession utils', () => {
  it('generateDeviceSecret returns a random value', () => {
    const a = generateDeviceSecret();
    const b = generateDeviceSecret();
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(20);
    expect(a).not.toBe(b);
  });

  it('hashDeviceSecret returns deterministic sha256 hash', () => {
    const v1 = hashDeviceSecret('abc');
    const v2 = hashDeviceSecret('abc');
    const v3 = hashDeviceSecret('xyz');
    expect(v1).toBe(v2);
    expect(v1).not.toBe(v3);
    expect(v1).toHaveLength(64);
  });

  it('buildLoginRedirectWithReason adds reason query params', () => {
    const request = new NextRequest('http://localhost/dashboard');
    const url = buildLoginRedirectWithReason(request);
    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('reason')).toBe(STALE_SESSION_REASON);
  });

  it('validateNonAdminActiveSession rejects missing cookie', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeSessionVersion: 3,
      activeDeviceSecretHash: hashDeviceSecret('real-secret'),
    } as never);

    const result = await validateNonAdminActiveSession({
      email: 'u@example.com',
      tokenSessionVersion: 3,
      deviceSecret: undefined,
    });
    expect(result).toEqual({ ok: false, reason: 'missing-device-secret-cookie' });
  });

  it('validateNonAdminActiveSession accepts matching version and secret', async () => {
    const secret = 'real-secret';
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      activeSessionVersion: 3,
      activeDeviceSecretHash: hashDeviceSecret(secret),
    } as never);

    const result = await validateNonAdminActiveSession({
      email: 'u@example.com',
      tokenSessionVersion: 3,
      deviceSecret: secret,
    });
    expect(result).toEqual({ ok: true });
  });

  it('exports neutral cookie key', () => {
    expect(DEVICE_SECRET_COOKIE_NAME).toBe('fxns_state');
  });
});
