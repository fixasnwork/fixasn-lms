import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), detail: vi.fn() }));
vi.mock('@/lib/routeAuth', () => ({ requireActiveSession: mocks.auth }));
vi.mock('@/lib/purchaseHistory', () => ({ getManualPurchase: mocks.detail }));
const request = new NextRequest('https://fixasn.example/api/purchases/manual/foreign-id');
const context = { params: Promise.resolve({ paymentId: 'foreign-id' }) };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ ok: true, session: { user: { email: 'me@example.com' } } });
});

describe('manual purchase detail privacy', () => {
  it('returns 404 for a missing or foreign purchase without exposing proof', async () => {
    mocks.detail.mockResolvedValue(null);
    const response = await GET(request, context);
    expect(response.status).toBe(404);
    expect(mocks.detail).toHaveBeenCalledWith('me@example.com', 'foreign-id');
    expect(await response.json()).not.toHaveProperty('proofUrl');
  });
  it('requires an active session before looking up proof', async () => {
    mocks.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await GET(request, context)).status).toBe(401);
    expect(mocks.detail).not.toHaveBeenCalled();
  });
  it('disables caching of successful proof responses', async () => {
    mocks.detail.mockResolvedValue({ purchase: { id: 'own-id' }, proofUrl: 'data:image/png;base64,cHJvb2Y=' });
    expect((await GET(request, context)).headers.get('Cache-Control')).toBe('no-store');
  });
});
