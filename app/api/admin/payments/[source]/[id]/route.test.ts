import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, PATCH } from './route';

const mocks = vi.hoisted(() => ({ admin: vi.fn(), action: vi.fn(), detail: vi.fn() }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/adminPayments', () => ({ applyAdminPaymentAction: mocks.action, getAdminPaymentDetail: mocks.detail }));
const context = { params: Promise.resolve({ source: 'manual', id: 'payment-id' }) };
beforeEach(() => { vi.resetAllMocks(); mocks.admin.mockResolvedValue(null); });

describe('admin payment details and actions', () => {
  it('guards proofs and mutation routes before accessing records', async () => {
    mocks.admin.mockResolvedValue(new Response(null, { status: 403 }));
    expect((await GET(new NextRequest('https://fixasn.example'), context)).status).toBe(403);
    expect((await PATCH(new NextRequest('https://fixasn.example', { method: 'PATCH', body: '{}' }), context)).status).toBe(403);
    expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.action).not.toHaveBeenCalled();
  });
  it('passes validated action processing to the server service', async () => {
    const response = await PATCH(new NextRequest('https://fixasn.example', { method: 'PATCH', body: JSON.stringify({ action: 'reject', reason: 'Bukti tidak sesuai' }) }), context);
    expect(response.status).toBe(200);
    expect(mocks.action).toHaveBeenCalledWith('manual', 'payment-id', 'reject', 'Bukti tidak sesuai');
  });
  it('disables caching for detail and proof responses', async () => {
    mocks.detail.mockResolvedValue({ payment: { id: 'payment-id' }, proofUrl: null });
    expect((await GET(new NextRequest('https://fixasn.example'), context)).headers.get('Cache-Control')).toBe('no-store');
  });
});
