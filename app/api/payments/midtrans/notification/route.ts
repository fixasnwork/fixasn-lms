import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyNotification, PaymentError } from '@/lib/midtrans';
import { syncPaymentOrder } from '@/lib/paymentOrders';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const notification: unknown = await request.json();
    if (!verifyNotification(notification)) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    const order = await prisma.paymentOrder.findUnique({ where: { orderId: notification.order_id } });
    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    // Read the authoritative current status. The notification's signature alone
    // does not authenticate every payload field, and old notifications can replay.
    await syncPaymentOrder(order, true);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : 'Notifikasi belum dapat diproses.' },
      { status: error instanceof PaymentError ? error.status : error instanceof SyntaxError ? 400 : 500 });
  }
}
