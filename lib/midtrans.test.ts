import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMidtransStatus, mapMidtransStatus, midtransDate, verifyNotification } from './midtrans';
import { calculateAdminFee } from './paymentMethods';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Midtrans boundaries', () => {
  it('uses the separate signature secret when keys have rotated', () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'api-key');
    vi.stubEnv('MIDTRANS_SIGNATURE_SECRET_KEY', 'signing-secret');
    const data = { order_id: 'FX-1', status_code: '200', gross_amount: '100700.00' };
    const sign = (secret: string) => createHash('sha512').update(`FX-1200100700.00${secret}`).digest('hex');
    expect(verifyNotification({ ...data, signature_key: sign('signing-secret') })).toBe(true);
    expect(verifyNotification({ ...data, signature_key: sign('api-key') })).toBe(false);
    expect(verifyNotification({ ...data, signature_key: 'invalid' })).toBe(false);
    expect(verifyNotification(null)).toBe(false);
  });

  it('supports legacy merchant keys without a separate signing secret', () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'legacy');
    vi.stubEnv('MIDTRANS_SIGNATURE_SECRET_KEY', '');
    const signature_key = createHash('sha512').update('FX-1202100.00legacy').digest('hex');
    expect(verifyNotification({ order_id: 'FX-1', status_code: '202', gross_amount: '100.00', signature_key })).toBe(true);
  });

  it.each([
    ['settlement', undefined, 'paid'], ['capture', 'accept', 'paid'], ['capture', 'challenge', 'pending'],
    ['settlement', 'deny', 'pending'], ['pending', undefined, 'pending'], ['expire', undefined, 'expired'],
    ['refund', undefined, 'refunded'], ['partial_refund', undefined, 'partially_refunded'], ['unknown', undefined, null],
  ])('maps %s / %s safely', (transaction_status, fraud_status, expected) => {
    expect(mapMidtransStatus({ order_id: 'FX-1', gross_amount: '100', transaction_status, fraud_status })).toBe(expected);
  });

  it('treats missing Core status as an unsubmitted Snap checkout', async () => {
    vi.stubEnv('MIDTRANS_SERVER_KEY', 'key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status_code: '404' }), { status: 404 })));
    expect(await getMidtransStatus('FX-1')).toBeNull();
  });

  it('reads Midtrans timestamps in WIB independently of host timezone', () => {
    expect(midtransDate('2026-11-25 12:30:00')?.toISOString()).toBe('2026-11-25T05:30:00.000Z');
    expect(midtransDate('invalid')).toBeNull();
  });

  it('copies zonaapoteker fees and rounds percentage fees upward', () => {
    expect(calculateAdminFee(100000, 'qris')).toBe(700);
    expect(calculateAdminFee(100001, 'qris')).toBe(701);
    expect(calculateAdminFee(100000, 'gopay')).toBe(2000);
    expect(calculateAdminFee(100000, 'bni_va')).toBe(4000);
  });
});
