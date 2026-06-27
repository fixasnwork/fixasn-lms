import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from './route';

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn().mockResolvedValue(null),
}));

function makeGetReq(url: string): NextRequest {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

function makePostReq(body: Record<string, unknown>): NextRequest {
  return {
    json: async () => body,
    nextUrl: new URL('http://localhost/api/banks'),
  } as unknown as NextRequest;
}

describe('POST /api/banks', () => {
  it('returns 400 when required fields missing', async () => {
    const response = await POST(makePostReq({}));
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('required');
  });

  it('returns 400 when bankName empty', async () => {
    const response = await POST(makePostReq({ bankName: '', accountNumber: '123', accountHolder: 'Test' }));
    expect(response.status).toBe(400);
  });
});

describe('GET /api/banks', () => {
  it('returns banks (default scope)', async () => {
    const response = await GET(makeGetReq('http://localhost/api/banks'));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('banks');
  });

  it('returns all banks for admin scope', async () => {
    const response = await GET(makeGetReq('http://localhost/api/banks?scope=admin'));
    expect(response.status).toBe(200);
  });
});
