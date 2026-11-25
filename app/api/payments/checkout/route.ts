import { NextRequest, NextResponse } from 'next/server';
import { requireActiveSession } from '@/lib/routeAuth';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import { createPaymentOrder, mapPaymentOrder } from '@/lib/paymentOrders';
import { PaymentError } from '@/lib/midtrans';

export async function POST(request: NextRequest) {
  const result = await requireActiveSession(request);
  if (!result.ok) return result.response;
  const email = getEmailFromSessionUser(result.session.user);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const order = await createPaymentOrder(email, result.session.user?.name ?? 'Peserta FIX ASN', body?.packageId, body?.paymentMethod);
    return NextResponse.json({ order: mapPaymentOrder(order) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : error instanceof SyntaxError ? 'Permintaan tidak valid.' : 'Checkout belum tersedia. Silakan coba lagi.' },
      { status: error instanceof PaymentError ? error.status : error instanceof SyntaxError ? 400 : 500 });
  }
}
