import { createHash, timingSafeEqual } from 'node:crypto';
import { getPaymentMethod } from '@/lib/paymentMethods';

export class PaymentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export interface MidtransStatus {
  order_id: string;
  gross_amount: string;
  transaction_id?: string;
  transaction_status?: string;
  status_code?: string;
  fraud_status?: string;
  currency?: string;
  settlement_time?: string;
  transaction_time?: string;
}

function serverKey() {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new PaymentError('Pembayaran belum tersedia. Hubungi admin.', 503);
  return key;
}
function origin(snap: boolean) {
  const sandbox = process.env.MIDTRANS_IS_PRODUCTION !== 'true';
  return `https://${snap ? 'app' : 'api'}${sandbox ? '.sandbox' : ''}.midtrans.com`;
}
export function paymentAppUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new PaymentError('Alamat aplikasi belum dikonfigurasi.', 503);
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol)) throw new PaymentError('Alamat aplikasi tidak valid.', 503);
  return url.origin;
}
export function verifyNotification(value: unknown): value is MidtransStatus & { signature_key: string } {
  if (!value || typeof value !== 'object') return false;
  const data = value as Record<string, unknown>;
  if (!['order_id', 'status_code', 'gross_amount', 'signature_key'].every((key) => typeof data[key] === 'string')) return false;
  if (!/^[a-f0-9]{128}$/i.test(data.signature_key as string)) return false;
  const secret = process.env.MIDTRANS_SIGNATURE_SECRET_KEY || serverKey();
  const expected = createHash('sha512').update(`${data.order_id}${data.status_code}${data.gross_amount}${secret}`).digest();
  return timingSafeEqual(expected, Buffer.from(data.signature_key as string, 'hex'));
}

export function mapMidtransStatus(data: MidtransStatus): string | null {
  switch (data.transaction_status) {
    case 'settlement': return data.fraud_status && data.fraud_status !== 'accept' ? 'pending' : 'paid';
    case 'capture': return data.fraud_status === 'accept' ? 'paid' : 'pending';
    case 'pending': return 'pending';
    case 'deny': return 'denied';
    case 'expire': return 'expired';
    case 'cancel': return 'cancelled';
    case 'failure': return 'failed';
    case 'refund': return 'refunded';
    case 'partial_refund': return 'partially_refunded';
    default: return null;
  }
}

export function midtransDate(value?: string) {
  if (!value) return null;
  // Midtrans transaction timestamps are in WIB, regardless of server timezone.
  const date = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}+07:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function midtransFetch(path: string, snap: boolean, body?: object) {
  const response = await fetch(`${origin(snap)}${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Basic ${Buffer.from(`${serverKey()}:`).toString('base64')}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, data: await response.json() };
}

export async function createSnapCheckout(order: {
  orderId: string; packageName: string; amount: number; adminFee: number; totalAmount: number;
  paymentMethod: string; createdAt: Date;
}, customer: { email: string; name: string }) {
  const method = getPaymentMethod(order.paymentMethod);
  if (!method) throw new PaymentError('Metode pembayaran tidak valid.');
  const statusUrl = `${paymentAppUrl()}/payment/${order.orderId}`;
  const orderTime = new Date(order.createdAt.getTime() + 7 * 3600_000).toISOString().slice(0, 19).replace('T', ' ') + ' +0700';
  const { response, data } = await midtransFetch('/snap/v1/transactions', true, {
    transaction_details: { order_id: order.orderId, gross_amount: order.totalAmount },
    item_details: [
      { id: 'PACKAGE', name: order.packageName.slice(0, 50), price: order.amount, quantity: 1 },
      ...(order.adminFee ? [{ id: 'ADMIN', name: `Biaya Admin ${method.label}`.slice(0, 50), price: order.adminFee, quantity: 1 }] : []),
    ],
    customer_details: { first_name: customer.name.slice(0, 50), email: customer.email },
    enabled_payments: [method.snapCode],
    callbacks: { finish: statusUrl, unfinish: statusUrl, error: statusUrl },
    expiry: { start_time: orderTime, unit: 'hours', duration: 24 },
  });
  if (!response.ok || typeof data.token !== 'string' || typeof data.redirect_url !== 'string') {
    // 4xx validation errors are definitive; duplicate order/timeout errors are not.
    throw new PaymentError('Checkout belum berhasil disiapkan. Cek status pembayaran sebelum mencoba lagi.', response.status === 400 ? 422 : 502);
  }
  const redirect = new URL(data.redirect_url);
  if (redirect.origin !== origin(true)) throw new PaymentError('Alamat pembayaran tidak valid.', 502);
  return { snapToken: data.token as string, snapRedirectUrl: redirect.href };
}

export async function getMidtransStatus(orderId: string): Promise<MidtransStatus | null> {
  const { response, data } = await midtransFetch(`/v2/${encodeURIComponent(orderId)}/status`, false);
  // Snap orders have no Core API status until a payment method is submitted.
  if (response.status === 404 || data.status_code === '404') return null;
  if (!response.ok || !data.order_id || !data.transaction_status) throw new PaymentError('Status pembayaran belum bisa diperbarui.', 502);
  return data as MidtransStatus;
}
