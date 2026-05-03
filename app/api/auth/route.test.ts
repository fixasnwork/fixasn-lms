import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('GET /api/auth', () => {
  it('returns 401 when no session exists (unauthenticated)', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.authenticated).toBe(false);
  });
});
