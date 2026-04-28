import { describe, it, expect } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

describe('POST /api/auth', () => {
  it('returns user data for valid login', async () => {
    const response = await POST(makeRequest({ action: 'login', email: 'user@test.com' }));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.email).toBe('user@test.com');
    expect(data.role).toBe('user');
  });

  it('returns admin role for admin email', async () => {
    const response = await POST(makeRequest({ action: 'login', email: 'admin@fixasn.id' }));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.role).toBe('admin');
  });

  it('returns success for logout action', async () => {
    const response = await POST(makeRequest({ action: 'logout' }));
    const data = await response.json();

    expect(data.success).toBe(true);
  });

  it('returns 400 error for invalid action', async () => {
    const response = await POST(makeRequest({ action: 'invalid' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid action');
  });

  it('uses first email letter as avatar for regular users', async () => {
    const response = await POST(makeRequest({ action: 'login', email: 'john@test.com' }));
    const data = await response.json();

    expect(data.user.avatar).toBe('J');
  });

  it('uses AD as avatar for admin', async () => {
    const response = await POST(makeRequest({ action: 'login', email: 'admin@fixasn.id' }));
    const data = await response.json();

    expect(data.user.avatar).toBe('AD');
  });
});
