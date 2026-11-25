import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveSession } from '@/lib/routeAuth';
import { getEmailFromSessionUser } from '@/lib/deviceSession';
import { mapPaymentOrder, syncPaymentOrder } from '@/lib/paymentOrders';

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  const auth = await requireActiveSession(request);
  if (!auth.ok) return auth.response;
  const email = getEmailFromSessionUser(auth.session.user);
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { orderId } = await context.params;
  const order = await prisma.paymentOrder.findFirst({ where: { orderId, userId: email } });
  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan.' }, { status: 404 });
  let syncUnavailable = false;
  try { await syncPaymentOrder(order); } catch { syncUnavailable = true; }
  const latest = await prisma.paymentOrder.findUniqueOrThrow({ where: { id: order.id } });
  return NextResponse.json({ order: mapPaymentOrder(latest), syncUnavailable }, { headers: { 'Cache-Control': 'no-store' } });
}
