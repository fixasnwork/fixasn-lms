import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), history: vi.fn() }));
vi.mock('@/lib/routeAuth', () => ({ requireActiveSession: mocks.auth }));
vi.mock('@/lib/purchaseHistory', async (original) => ({ ...await original<typeof import('@/lib/purchaseHistory')>(), getPurchaseHistory: mocks.history }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'me@example.com' } } });
  mocks.history.mockResolvedValue({ purchases: [], nextCursor: null });
});

describe('purchase history authentication', () => {
  it('uses the authenticated account and ignores supplied user IDs', async () => {
    const response = await GET(new NextRequest('https://fixasn.example/api/purchases?userId=other@example.com'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.history).toHaveBeenCalledWith('me@example.com', { manual: null, midtrans: null });
  });
  it('preserves stale/device-session authorization responses', async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await GET(new NextRequest('https://fixasn.example/api/purchases'))).status).toBe(401);
    expect(mocks.history).not.toHaveBeenCalled();
  });
  it('rejects malformed cursors before fetching data', async () => {
    expect((await GET(new NextRequest('https://fixasn.example/api/purchases?cursor=invalid'))).status).toBe(400);
    expect(mocks.history).not.toHaveBeenCalled();
  });
});
