import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('payment deployment switch', () => {
  it.each([
    [undefined, false], ['manual', false], ['midtrans', true], ['MIDTRANS', true], ['online', true], ['invalid', false],
  ])('selects the expected payment flow for %s', async (value, expected) => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_PAYMENT_MODE', value);
    const config = await import('./paymentMode');
    expect(config.IS_MIDTRANS_PAYMENT_ENABLED).toBe(expected);
  });
});
