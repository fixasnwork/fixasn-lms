import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { mapPaymentOrder, syncPaymentOrder } from '@/lib/paymentOrders';
import { PaymentError } from '@/lib/midtrans';

export async function GET(request: NextRequest) {
  const error = await requireAdmin();
  if (error) return error;
  const offset = Math.max(0, Number(request.nextUrl.searchParams.get('offset')) || 0);
  const orders = await prisma.paymentOrder.findMany({ orderBy: { createdAt: 'desc' }, take: 50, skip: Math.min(Math.floor(offset), 1_000_000) });
  return NextResponse.json({ orders: orders.map(mapPaymentOrder), hasMore: orders.length === 50 }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const error = await requireAdmin();
  if (error) return error;
  try {
    const body = await request.json();
    if (typeof body?.orderId !== 'string') return NextResponse.json({ error: 'Order tidak valid.' }, { status: 400 });
    const order = await prisma.paymentOrder.findUnique({ where: { orderId: body.orderId } });
    if (!order) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
    await syncPaymentOrder(order);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : 'Status belum dapat diperbarui.' }, { status: 502 });
  }
}
