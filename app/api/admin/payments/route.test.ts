import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const mocks = vi.hoisted(() => ({ admin: vi.fn(), payments: vi.fn() }));
vi.mock('@/lib/adminAuth', () => ({ requireAdmin: mocks.admin }));
vi.mock('@/lib/adminPayments', async (original) => ({ ...await original<typeof import('@/lib/adminPayments')>(), getAdminPayments: mocks.payments }));
beforeEach(() => { vi.resetAllMocks(); mocks.admin.mockResolvedValue(null); mocks.payments.mockResolvedValue({ payments: [], total: 0, page: 1, pageSize: 20 }); });

describe('admin payment table endpoint', () => {
  it('applies source, status, search, and pagination before returning rows', async () => {
    const response = await GET(new NextRequest('https://fixasn.example/api/admin/payments?source=manual&status=pending&search=buyer&page=2'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.payments).toHaveBeenCalledWith({ source: 'manual', status: 'pending', access: 'all', search: 'buyer', page: 2 });
  });
  it.each([401, 403])('preserves admin guard response %s before any query', async (status) => {
    mocks.admin.mockResolvedValue(new Response(null, { status }));
    expect((await GET(new NextRequest('https://fixasn.example/api/admin/payments'))).status).toBe(status);
    expect(mocks.payments).not.toHaveBeenCalled();
  });
  it('rejects invalid filters', async () => {
    expect((await GET(new NextRequest('https://fixasn.example/api/admin/payments?source=other'))).status).toBe(400);
    expect(mocks.payments).not.toHaveBeenCalled();
  });
});
