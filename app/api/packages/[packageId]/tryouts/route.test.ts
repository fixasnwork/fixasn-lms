import { describe, it, expect, vi } from 'vitest';
import { GET, PUT } from './route';

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

function makeParams(packageId: string) {
  return { params: Promise.resolve({ packageId }) };
}

describe('GET /api/packages/[packageId]/tryouts', () => {
  it('returns 400 for invalid packageId', async () => {
    const response = await GET({} as Request, makeParams('abc'));
    expect(response.status).toBe(400);
  });

  it('returns 404 for non-existent package', async () => {
    const response = await GET({} as Request, makeParams('999999'));
    expect(response.status).toBe(404);
  });
});

describe('PUT /api/packages/[packageId]/tryouts', () => {
  it('returns 400 for invalid packageId', async () => {
    const req = { json: async () => ({ tryoutIds: [1] }) } as unknown as Request;
    const response = await PUT(req, makeParams('abc'));
    expect(response.status).toBe(400);
  });

  it('returns 400 when tryoutIds is not an array', async () => {
    const req = { json: async () => ({ tryoutIds: 'not-array' }) } as unknown as Request;
    const response = await PUT(req, makeParams('1'));
    expect(response.status).toBe(400);
  });

  it('returns 404 for non-existent package', async () => {
    const req = { json: async () => ({ tryoutIds: [1] }) } as unknown as Request;
    const response = await PUT(req, makeParams('999999'));
    expect(response.status).toBe(404);
  });
});
