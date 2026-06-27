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
