// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/authContext';

vi.mock('@/auth', () => ({
  handlers: {
    GET: vi.fn(),
    POST: vi.fn(),
  },
}));

import { handlers } from '@/auth';
import { GET, POST } from './route';

describe('auth route request context', () => {
  it.each([
    ['GET', GET],
    ['POST', POST],
  ] as const)('%s preserves isolated IP context through async work', async (method, handle) => {
    vi.mocked(handlers[method]).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return Response.json({ ip: getAuthContext()?.ip });
    });

      const responses = await Promise.all(['192.0.2.1', '192.0.2.2'].map((ip) =>
        handle(new NextRequest('https://fixasn.com/api/auth/providers', {
          method,
          headers: { 'x-forwarded-for': ip },
        })),
      ));

      expect(await Promise.all(responses.map((response) => response.json()))).toEqual([
        { ip: '192.0.2.1' },
        { ip: '192.0.2.2' },
      ]);
      expect(getAuthContext()).toBeUndefined();
  });
});
