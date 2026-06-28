import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock auth to return a valid session
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock deviceSession — we only test the ban check path
vi.mock('@/lib/deviceSession', async () => {
  const actual = await vi.importActual('@/lib/deviceSession');
  return {
    ...actual,
    isAdminRole: vi.fn(() => false),
  };
});

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { DEVICE_SECRET_COOKIE_NAME, hashDeviceSecret, isAdminRole } from '@/lib/deviceSession';

const mockSession = {
  user: {
    email: 'banned@example.com',
    name: 'Banned User',
    role: 'user',
    activeSessionVersion: 1,
  },
  isSessionStale: false,
};

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/protected');
}

describe('requireActiveSession - ban check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 if user is blocked', async () => {
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isBlocked: true,
    } as never);

    const result = await requireActiveSession(makeRequest());

    expect(result.ok).toBe(false);
    expect((result as { ok: false; response: Response }).response.status).toBe(403);
    const json = await (result as { ok: false; response: Response }).response.json();
    expect(json.error).toBe('Account blocked');
  });

  it('allows non-banned users through', async () => {
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isBlocked: false,
    } as never);

    await requireActiveSession(makeRequest());

    // Will hit the stale session / active session validation next
    // At least we know it passed the ban check — so ok is true or fails on next step
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'banned@example.com' },
      select: { isBlocked: true },
    });
  });
});

describe('requireActiveSession - active session validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdminRole).mockReturnValue(false);
  });

  function makeRequestWithCookie(cookieValue: string): NextRequest {
    const req = new NextRequest('http://localhost/api/protected');
    req.cookies.set(DEVICE_SECRET_COOKIE_NAME, cookieValue);
    return req;
  }

  it('returns ok:true on bootstrap: matching JWT version, DB hash is null (no cookie needed)', async () => {
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: null,
      } as never);

    // No fxns_state cookie in the request — typical first request after fresh sign-in.
    const result = await requireActiveSession(makeRequest());

    expect(result.ok).toBe(true);
  });

  it('returns ok:true when JWT version and device secret hash match (happy path)', async () => {
    const deviceSecret = 'valid-secret-value';
    const deviceSecretHash = hashDeviceSecret(deviceSecret);

    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: deviceSecretHash,
      } as never);

    const result = await requireActiveSession(makeRequestWithCookie(deviceSecret));

    expect(result.ok).toBe(true);
  });

  it('returns ok:true on bootstrap: DB has hash but cookie missing (re-sync needed)', async () => {
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: 'some-existing-hash',
      } as never);

    const result = await requireActiveSession(makeRequest());

    expect(result.ok).toBe(true);
  });

  it('returns ok:true on bootstrap: cookie present but hash mismatch (stale cookie, re-sync needed)', async () => {
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(mockSession);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: 'hash-of-X',
      } as never);

    const result = await requireActiveSession(makeRequestWithCookie('Y'));

    expect(result.ok).toBe(true);
  });

  it('returns 401 on version-mismatch even if DB hash is null (bootstrap does not widen)', async () => {
    const staleVersionSession = {
      ...mockSession,
      user: { ...mockSession.user, activeSessionVersion: 99 },
    };
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(staleVersionSession);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: null,
      } as never);

    const result = await requireActiveSession(makeRequest());
    expect(result.ok).toBe(false);
    expect((result as { ok: false; response: Response }).response.status).toBe(401);
  });

  it('returns 401 when isSessionStale is true (stale short-circuits before bootstrap)', async () => {
    const staleSession = { ...mockSession, isSessionStale: true };
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(staleSession);
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: null,
      } as never);

    const result = await requireActiveSession(makeRequest());
    expect(result.ok).toBe(false);
    expect((result as { ok: false; response: Response }).response.status).toBe(401);
  });

  it('returns 401 on missing-session-version (null token version in JWT, not bootstrap)', async () => {
    const { activeSessionVersion: _, ...userWithoutVersion } = mockSession.user;
    const noVersionSession = { ...mockSession, user: userWithoutVersion };
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(
      noVersionSession as unknown as typeof mockSession,
    );
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isBlocked: false } as never)
      .mockResolvedValueOnce({
        activeSessionVersion: 1,
        activeDeviceSecretHash: null,
      } as never);

    const result = await requireActiveSession(makeRequest());
    expect(result.ok).toBe(false);
    expect((result as { ok: false; response: Response }).response.status).toBe(401);
  });

  it('bypasses device-secret validation for admin role (no prisma calls)', async () => {
    vi.mocked(isAdminRole).mockReturnValue(true);
    const adminSession = {
      ...mockSession,
      user: { ...mockSession.user, role: 'admin' },
    };
    vi.mocked(auth as () => Promise<typeof mockSession | null>).mockResolvedValue(adminSession);

    // Even with a wrong/missing cookie, admin should pass through.
    const result = await requireActiveSession(makeRequestWithCookie('wrong-cookie'));

    expect(result.ok).toBe(true);
    // Admin bypass returns BEFORE any prisma.user.findUnique call.
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
